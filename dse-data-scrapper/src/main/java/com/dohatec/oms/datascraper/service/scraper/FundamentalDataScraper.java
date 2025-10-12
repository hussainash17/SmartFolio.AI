package com.dohatec.oms.datascraper.service.scraper;

import com.dohatec.oms.datascraper.config.ScraperProperties;
import com.dohatec.oms.datascraper.dto.CompanyDataDTO;
import com.dohatec.oms.datascraper.exception.NetworkException;
import com.dohatec.oms.datascraper.model.Company;
import com.dohatec.oms.datascraper.model.ScraperLog;
import com.dohatec.oms.datascraper.repository.CompanyRepository;
import com.dohatec.oms.datascraper.service.ScraperLogService;
import com.dohatec.oms.datascraper.service.processor.FundamentalDataProcessor;
import com.dohatec.oms.datascraper.util.HtmlParserUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;

/**
 * Service for scraping fundamental data from DSE company pages
 * Uses parallel processing with batch saving for optimal performance
 * 
 * Architecture:
 * - Scrapes 10 companies in parallel (async)
 * - Saves data in batches of 20 companies (transactional)
 * - Continues on individual failures
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FundamentalDataScraper {

    private final RestTemplate restTemplate;
    private final CompanyRepository companyRepository;
    private final FundamentalDataProcessor fundamentalDataProcessor;
    private final HtmlParserUtil htmlParserUtil;
    private final ScraperLogService scraperLogService;
    private final ScraperProperties scraperProperties;

    /**
     * Scrape fundamental data for all active companies
     * Uses parallel processing and batch saving
     */
    public void scrapeFundamentalData() {
        ScraperLog scraperLog = scraperLogService.startLog("FUNDAMENTAL");
        
        try {
            log.info("Starting fundamental data scraping with parallel processing...");
            
            List<Company> companies = companyRepository.findByIsActiveTrue();
            log.info("Found {} active companies to scrape", companies.size());
            
            int batchSize = scraperProperties.getBatch().getBatchSize();
            int successCount = 0;
            int failureCount = 0;
            
            // Split companies into batches
            List<List<Company>> batches = splitIntoBatches(companies, batchSize);
            log.info("Split into {} batches of {} companies each", batches.size(), batchSize);
            
            // Process each batch
            for (int i = 0; i < batches.size(); i++) {
                List<Company> batch = batches.get(i);
                log.info("Processing batch {}/{} with {} companies", i + 1, batches.size(), batch.size());
                
                try {
                    // Scrape companies in parallel and save as batch
                    int[] batchResults = processBatch(batch);
                    successCount += batchResults[0];
                    failureCount += batchResults[1];
                    
                    log.info("Batch {}/{} completed. Success: {}, Failed: {}", 
                            i + 1, batches.size(), batchResults[0], batchResults[1]);
                    
                } catch (Exception e) {
                    log.error("Batch {} failed completely", i + 1, e);
                    failureCount += batch.size();
                }
            }
            
            String status = failureCount == 0 ? "SUCCESS" : (successCount > 0 ? "PARTIAL" : "FAILED");
            scraperLogService.completeLog(scraperLog, status, successCount, failureCount);
            
            log.info("Fundamental data scraping completed. Total Success: {}, Total Failed: {}", 
                    successCount, failureCount);
            
        } catch (Exception e) {
            log.error("Fundamental data scraping failed", e);
            scraperLogService.completeLog(scraperLog, "FAILED", 0, 0, e.getMessage());
            throw e;
        }
    }

    /**
     * Process a batch of companies
     * Scrapes in parallel (10 at a time) and saves as batch
     * @param batch list of companies in the batch
     * @return array [successCount, failureCount]
     */
    private int[] processBatch(List<Company> batch) {
        int concurrency = scraperProperties.getBatch().getThreadPoolSize();
        int successCount = 0;
        int failureCount = 0;
        
        // Split batch into sub-batches for parallel processing
        List<List<Company>> subBatches = splitIntoBatches(batch, concurrency);
        
        // Collect all successfully scraped data
        List<CompanyDataDTO> allScrapedData = new ArrayList<>();
        
        // Process each sub-batch in parallel
        for (List<Company> subBatch : subBatches) {
            try {
                List<CompanyDataDTO> scrapedData = scrapeCompaniesInParallel(subBatch);
                allScrapedData.addAll(scrapedData);
                
            } catch (Exception e) {
                log.error("Sub-batch processing failed", e);
            }
        }
        
        // Separate successful and failed results
        List<CompanyDataDTO> successfulData = allScrapedData.stream()
                .filter(CompanyDataDTO::isSuccess)
                .collect(Collectors.toList());
        
        List<CompanyDataDTO> failedData = allScrapedData.stream()
                .filter(dto -> !dto.isSuccess())
                .toList();
        
        // Save all successful data in one batch transaction
        if (!successfulData.isEmpty()) {
            try {
                // Map CompanyDataDTO back to Company entities
                Map<String, Company> companyMap = batch.stream()
                        .collect(Collectors.toMap(Company::getTradingCode, c -> c));
                
                List<Company> successfulCompanies = successfulData.stream()
                        .map(dto -> companyMap.get(dto.getTradingCode()))
                        .filter(Objects::nonNull)
                        .collect(Collectors.toList());
                
                fundamentalDataProcessor.processFundamentalDataBatch(successfulCompanies, successfulData);
                successCount = successfulData.size();
                
                log.info("Batch save completed: {} companies saved", successCount);
                
            } catch (Exception e) {
                log.error("Batch save failed", e);
                failureCount = successfulData.size();
            }
        }
        
        failureCount += failedData.size();
        
        return new int[]{successCount, failureCount};
    }

    /**
     * Scrape multiple companies in parallel using @Async
     * @param companies list of companies to scrape
     * @return list of scraped company data
     */
    private List<CompanyDataDTO> scrapeCompaniesInParallel(List<Company> companies) {
        log.info("Scraping {} companies in parallel...", companies.size());
        
        // Create async tasks for all companies
        List<CompletableFuture<CompanyDataDTO>> futures = companies.stream()
                .map(this::scrapeCompanyDataAsync)
                .toList();
        
        // Wait for all tasks to complete
        CompletableFuture<Void> allFutures = CompletableFuture.allOf(
                futures.toArray(new CompletableFuture[0])
        );
        
        try {
            // Wait for completion
            allFutures.get();
            
            // Collect results
            List<CompanyDataDTO> results = futures.stream()
                    .map(future -> {
                        try {
                            return future.get();
                        } catch (InterruptedException | ExecutionException e) {
                            log.error("Failed to get async result", e);
                            return null;
                        }
                    })
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());
            
            log.info("Parallel scraping completed. Scraped {}/{} companies successfully", 
                    results.size(), companies.size());
            
            return results;
            
        } catch (InterruptedException | ExecutionException e) {
            log.error("Parallel scraping interrupted", e);
            Thread.currentThread().interrupt();
            return Collections.emptyList();
        }
    }

    /**
     * Scrape fundamental data for a single company asynchronously
     * This method runs in a separate thread from the async executor pool
     * @param company the company to scrape
     * @return CompletableFuture with CompanyDataDTO
     */
    @Async
    public CompletableFuture<CompanyDataDTO> scrapeCompanyDataAsync(Company company) {
        try {
            log.debug("Async scraping started for: {}", company.getTradingCode());
            
            // Fetch HTML
            String html = fetchCompanyHtml(company.getTradingCode());
            
            // Parse data
            CompanyDataDTO companyData = parseCompanyData(html, company.getTradingCode());
            
            log.debug("Async scraping completed for: {}", company.getTradingCode());
            
            return CompletableFuture.completedFuture(companyData);
            
        } catch (Exception e) {
            log.error("Async scraping failed for: {}", company.getTradingCode(), e);
            
            // Return failed DTO
            CompanyDataDTO failedDTO = CompanyDataDTO.builder()
                    .tradingCode(company.getTradingCode())
                    .success(false)
                    .errorMessage(e.getMessage())
                    .build();
            
            return CompletableFuture.completedFuture(failedDTO);
        }
    }

    /**
     * Split list into batches of specified size
     * @param list the list to split
     * @param batchSize the batch size
     * @return list of batches
     */
    private <T> List<List<T>> splitIntoBatches(List<T> list, int batchSize) {
        List<List<T>> batches = new ArrayList<>();
        
        for (int i = 0; i < list.size(); i += batchSize) {
            int end = Math.min(i + batchSize, list.size());
            batches.add(new ArrayList<>(list.subList(i, end)));
        }
        
        return batches;
    }

    /**
     * Fetch company HTML from DSE website
     * @param tradingCode the trading code
     * @return HTML content
     */
    @Retryable(
        retryFor = {NetworkException.class, Exception.class},
        maxAttempts = 3,
        backoff = @Backoff(delay = 2000, multiplier = 2.0)
    )
    private String fetchCompanyHtml(String tradingCode) {
        String url = String.format(scraperProperties.getDse().getCompanyDetailUrl(), tradingCode);
        
        try {
            log.debug("Fetching company HTML from: {}", url);
            
            String html = restTemplate.getForObject(url, String.class);
            
            if (html == null || html.isEmpty()) {
                throw new NetworkException("Empty response from DSE website", url);
            }
            
            return html;
            
        } catch (Exception e) {
            log.error("Failed to fetch company HTML from: {}", url, e);
            throw new NetworkException("Failed to fetch company HTML", url, e);
        }
    }

    /**
     * Parse company data from HTML
     * @param html the HTML content
     * @param tradingCode the trading code
     * @return CompanyDataDTO
     */
    private CompanyDataDTO parseCompanyData(String html, String tradingCode) {
        try {
            Document document = Jsoup.parse(html);
            
            // Extract company name
            String companyName = null;
            Element nameElement = document.selectFirst("h2.BodyHead.topBodyHead i");
            if (nameElement != null) {
                companyName = nameElement.text();
            }
            
            // Extract last AGM date
            Element agmElement = document.selectFirst("h2.BodyHead.topBodyHead div.pull-left i");
            String lastAgmDate = agmElement != null ? agmElement.text() : null;
            
            // Parse all tables
            Map<String, String> dataMap = new HashMap<>();
            if (companyName != null) {
                dataMap.put("Company Name", companyName);
            }
            if (lastAgmDate != null) {
                dataMap.put("Last AGM Date", lastAgmDate);
            }
            
            // Select all tables
            Elements tables = document.select("table.table.table-bordered.background-white");
            int tablesProcessed = 0;
            
            for (int i = 0; i < tables.size(); i++) {
                Element table = tables.get(i);
                Map<String, String> tableData = parseTable(table, i);
                if (tableData != null && !tableData.isEmpty()) {
                    dataMap.putAll(tableData);
                    tablesProcessed++;
                }
            }
            
            return CompanyDataDTO.builder()
                    .tradingCode(tradingCode)
                    .companyName(companyName)
                    .dataMap(dataMap)
                    .tablesProcessed(tablesProcessed)
                    .success(true)
                    .build();
            
        } catch (Exception e) {
            log.error("Failed to parse company data for: {}", tradingCode, e);
            return CompanyDataDTO.builder()
                    .tradingCode(tradingCode)
                    .success(false)
                    .errorMessage(e.getMessage())
                    .build();
        }
    }

    /**
     * Parse a table based on its index
     * @param table the table element
     * @param index the table index
     * @return parsed data map
     */
    private Map<String, String> parseTable(Element table, int index) {
        try {
            // Use HtmlParserUtil for common parsing patterns
            return htmlParserUtil.parseKeyValueTable(table);
        } catch (Exception e) {
            log.warn("Failed to parse table at index: {}", index, e);
            return new HashMap<>();
        }
    }
}
