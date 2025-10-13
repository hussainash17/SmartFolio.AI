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
     * Different tables have different structures
     * @param table the table element
     * @param index the table index
     * @return parsed data map
     */
    private Map<String, String> parseTable(Element table, int index) {
        try {
            // Parse based on table index and structure
            return switch (index) { // Trading Code & Scrip Code
                // Market data (Last Trading Price, etc.)
                // Capital info (Authorized Capital, etc.)
                // Dividend information
                // Financial statement links
                case 0, 1, 2, 3, 9, 12 -> // Contact information
                        htmlParserUtil.parseKeyValueTable(table);
                case 11 -> // Loan status (complex structure)
                        parseLoanStatusTable(table);
                case 10 -> // Listing year & shareholding pattern
                        parseShareholdingTable(table);
                case 4 -> // Quarterly performance (complex header table)
                        parseQuarterlyPerformanceTable(table); // Daily P/E ratio table (skip or simple parse)
                case 5, 6 -> // Daily P/E ratio table (skip or simple parse)
                        new HashMap<>(); // Skip daily P/E tables

                case 7 -> {
                    log.debug("Parsing financial performance table at index 7");
                    yield htmlParserUtil.parseFinancialPerformanceTable(table);
                }
                case 8 -> // Dividend yield table with years
                        parseDividendYieldTable(table);
                default ->
                    // Default to key-value parsing
                        htmlParserUtil.parseKeyValueTable(table);
            };
        } catch (Exception e) {
            log.warn("Failed to parse table at index {}: {}", index, e.getMessage());
            return new HashMap<>();
        }
    }
    
    /**
     * Parse quarterly performance table (Table 4)
     * This table has a complex header structure with quarterly data
     * 
     * Table structure:
     * - Row 0: "Particulars" and "Unaudited/Audited" headers
     * - Row 1: Quarter names (Q1, Q2, Half Yearly, Q3, 9 Months, Annual)
     * - Row 2: "Ending on" labels
     * - Row 3: Dates in YYYYMM format (202409, 202412, 202503, etc.)
     * - Rows 4+: Data sections (EPS, Market Price, etc.)
     * 
     * @param table the table element
     * @return parsed data map with quarterly information
     */
    private Map<String, String> parseQuarterlyPerformanceTable(Element table) {
        Map<String, String> data = new HashMap<>();
        try {
            Elements rows = table.select("tbody tr");
            
            if (rows.size() < 4) {
                log.warn("Quarterly performance table has insufficient rows");
                return data;
            }
            
            // Parse header structure to map quarter names to dates
            // Row 1 (index 1): Quarter names
            // Row 3 (index 3): Quarter dates
            Element quarterNamesRow = rows.get(1);
            Element quarterDatesRow = rows.get(3);
            
            Elements quarterNameCells = quarterNamesRow.select("td");
            Elements quarterDateCells = quarterDatesRow.select("td");
            
            // Map to store quarter info: quarterIndex -> {name, date}
            Map<Integer, QuarterInfo> quarterMap = new HashMap<>();
            
            // Parse quarter names and dates (starting from column 1, column 0 is "Particulars")
            int dateColumnIndex = 0;
            for (int i = 1; i < quarterNameCells.size(); i++) {
                Element nameCell = quarterNameCells.get(i);
                String quarterName = htmlParserUtil.cleanText(nameCell.text());
                
                // Skip if header (not a quarter name)
                if (quarterName.isEmpty() || quarterName.equals("Unaudited / Audited")) {
                    continue;
                }
                
                // Get corresponding date from row 3
                // Handle rowspan/colspan by tracking actual data column position
                String quarterDate = "";
                if (dateColumnIndex < quarterDateCells.size()) {
                    Element dateCell = quarterDateCells.get(dateColumnIndex);
                    quarterDate = htmlParserUtil.cleanText(dateCell.text());
                    
                    // If date cell is empty, try to extract from previous rows (merged cells)
                    if (quarterDate.isEmpty() && i >= 2) {
                        // Look for merged cell in row 2
                        Element row2 = rows.get(2);
                        Elements row2Cells = row2.select("td");
                        if (i - 1 < row2Cells.size()) {
                            String merged = htmlParserUtil.cleanText(row2Cells.get(i - 1).text());
                            if (merged.matches(".*\\d{6}.*")) {
                                quarterDate = merged.replaceAll("[^0-9]", "");
                            }
                        }
                    }
                    dateColumnIndex++;
                }
                
                // Only store valid quarters with dates (Q1, Q2, Q3, and optionally Q4)
                if (quarterName.matches("Q[1-4]") && quarterDate.matches("\\d{6}")) {
                    quarterMap.put(i, new QuarterInfo(quarterName, quarterDate));
                    log.debug("Found quarter: {} -> {}", quarterName, quarterDate);
                } else if (quarterName.contains("Half Yearly") || quarterName.contains("9 Months") || 
                          quarterName.contains("Annual")) {
                    // Store cumulative periods separately if needed for reference
                    if (quarterDate.matches("\\d{6}")) {
                        quarterMap.put(i, new QuarterInfo(quarterName, quarterDate));
                    }
                }
            }
            
            // Now parse data rows
            String currentSection = "";
            for (int rowIdx = 4; rowIdx < rows.size(); rowIdx++) {
                Element row = rows.get(rowIdx);
                Elements cells = row.select("td");
                
                if (cells.isEmpty()) {
                    continue;
                }
                
                String firstCellText = htmlParserUtil.cleanText(cells.get(0).text());
                
                // Check if this is a section header row (colspan=7 or similar)
                if (cells.get(0).hasAttr("colspan")) {
                    currentSection = firstCellText;
                    log.debug("Found section: {}", currentSection);
                    continue;
                }
                
                // Parse data rows
                String rowLabel = firstCellText;
                
                // Extract values for each quarter column
                for (int colIdx = 1; colIdx < cells.size(); colIdx++) {
                    if (quarterMap.containsKey(colIdx)) {
                        QuarterInfo quarterInfo = quarterMap.get(colIdx);
                        String value = htmlParserUtil.cleanText(cells.get(colIdx).text());
                        
                        if (!htmlParserUtil.isEmpty(value)) {
                            // Create composite key: Section_RowLabel_QuarterName_Date
                            String key = String.format("%s_%s_%s_%s", 
                                currentSection.replaceAll("\\s+", "_"),
                                rowLabel.replaceAll("\\s+", "_"),
                                quarterInfo.name,
                                quarterInfo.date
                            );
                            data.put(key, value);
                            log.debug("Stored: {} = {}", key, value);
                        }
                    }
                }
            }
            
            log.debug("Parsed quarterly performance table with {} quarters and {} data points",
                     quarterMap.size(), data.size());
        } catch (Exception e) {
            log.error("Failed to parse quarterly performance table", e);
        }
        return data;
    }
    
    /**
     * Helper class to store quarter information
     */
    private static class QuarterInfo {
        String name;  // Q1, Q2, Q3, Q4, Half Yearly, etc.
        String date;  // YYYYMM format
        
        QuarterInfo(String name, String date) {
            this.name = name;
            this.date = date;
        }
    }
    
    /**
     * Parse loan status table (Table 12)
     * This table has a complex structure with headers, rowspan, and multiple sections
     * 
     * Table structure:
     * - Row 1: "Present Operational Status" with value
     * - Row 2: Header "Present Loan Status as on [Date]"
     * - Row 3-4: Short-term and Long-term loan values (with rowspan in first cell)
     * - Row 5: "Latest Dividend Status (%)"
     * - Row 6: Header "Latest Credit Rating Status"
     * - Row 7-8: Short-term and Long-term credit rating (with rowspan)
     * - Row 9: "OTC/Delisting/Relisting"
     * 
     * @param table the table element
     * @return parsed data map with loan information
     */
    private Map<String, String> parseLoanStatusTable(Element table) {
        Map<String, String> data = new HashMap<>();
        try {
            Elements rows = table.select("tbody tr");
            
            for (int i = 0; i < rows.size(); i++) {
                Element row = rows.get(i);
                Elements cells = row.select("td");
                
                if (cells.isEmpty()) {
                    continue;
                }
                
                // Check if this is a header row (colspan=3 or colspan=2)
                if (cells.get(0).hasAttr("colspan")) {
                    String headerText = htmlParserUtil.cleanText(cells.get(0).text());
                    
                    // Extract date from loan status header
                    if (headerText.contains("Present Loan Status")) {
                        // Extract date: "Present Loan Status as on December 31, 2024"
                        String datePattern = ".*as on (.+)";
                        if (headerText.matches(datePattern)) {
                            String dateStr = headerText.replaceAll(datePattern, "$1");
                            data.put("Loan_Status_Date", dateStr);
                        }
                    }
                    
                    // Store header text for context
                    data.put("Section_" + i, headerText);
                    continue;
                }
                
                // Parse data rows
                // Handle rows with 2 cells (key-value) or 3 cells (empty/nbsp, key, value)
                String key = null;
                String value = null;
                
                if (cells.size() == 3) {
                    // Format: [rowspan cell or &nbsp;] | [Key] | [Value]
                    key = htmlParserUtil.cleanText(cells.get(1).text());
                    value = htmlParserUtil.cleanText(cells.get(2).text());
                } else if (cells.size() == 2) {
                    // Format: [Key] | [Value]
                    key = htmlParserUtil.cleanText(cells.get(0).text());
                    value = htmlParserUtil.cleanText(cells.get(1).text());
                }
                
                // Store key-value pairs with normalized keys
                if (key != null && !key.isEmpty()) {
                    // Normalize key names
                    String normalizedKey = normalizeKey(key);
                    data.put(normalizedKey, value != null ? value : "");
                    
                    log.debug("Parsed loan status field: {} = {}", normalizedKey, value);
                }
            }
            
            log.debug("Parsed loan status table with {} data points", data.size());
        } catch (Exception e) {
            log.error("Failed to parse loan status table", e);
        }
        return data;
    }
    
    /**
     * Normalize key names for loan status fields
     * Converts various formats to standardized field names
     * 
     * @param key the original key text
     * @return normalized key
     */
    private String normalizeKey(String key) {
        // Remove special characters and normalize
        String normalized = key.replaceAll("\\(mn\\)", "")
                               .replaceAll("\\(%\\)", "")
                               .replaceAll("[()]", "")
                               .trim()
                               .replaceAll("\\s+", "_");
        
        // Handle specific field mappings
        return switch (normalized.toLowerCase()) {
            case "short-term_loan", "short_term_loan" -> "Short_Term_Loan";
            case "long-term_loan", "long_term_loan" -> "Long_Term_Loan";
            case "present_operational_status" -> "Operational_Status";
            case "latest_dividend_status" -> "Latest_Dividend_Status";
            case "short-term", "short_term" -> "Credit_Rating_Short_Term";
            case "long-term", "long_term" -> "Credit_Rating_Long_Term";
            case "otc/delisting/relisting" -> "OTC_Delisting_Relisting";
            default -> normalized;
        };
    }
    
    /**
     * Parse dividend yield table (Table 8)
     * Contains Year, P/E ratios, Dividend %, Dividend Yield %
     * @param table the table element
     * @return parsed data map with year-based keys
     */
    private Map<String, String> parseDividendYieldTable(Element table) {
        Map<String, String> data = new HashMap<>();
        try {
            Elements rows = table.select("tbody tr");
            
            // Skip header rows (first 4 rows are headers based on the structure)
            for (int i = 4; i < rows.size(); i++) {
                Element row = rows.get(i);
                Elements cells = row.select("td");
                
                if (cells.size() >= 9) {
                    String year = htmlParserUtil.cleanText(cells.get(0).text());
                    
                    // Skip invalid rows
                    if (htmlParserUtil.isEmpty(year) || !year.matches("\\d{4}")) {
                        continue;
                    }
                    
                    // Extract data
                    String peRatioBasicOriginal = htmlParserUtil.cleanText(cells.get(2).text());
                    String peRatioBasicRestated = htmlParserUtil.cleanText(cells.get(3).text());
                    String dividendPercent = htmlParserUtil.cleanText(cells.get(7).text());
                    String dividendYield = htmlParserUtil.cleanText(cells.get(8).text());
                    
                    // Store with year suffix
                    if (!htmlParserUtil.isEmpty(peRatioBasicOriginal)) {
                        data.put("PE_Ratio_Basic_Original_" + year, peRatioBasicOriginal);
                    }
                    if (!htmlParserUtil.isEmpty(peRatioBasicRestated)) {
                        data.put("PE_Ratio_Basic_Restated_" + year, peRatioBasicRestated);
                    }
                    if (!htmlParserUtil.isEmpty(dividendPercent)) {
                        data.put("Dividend_Percent_" + year, dividendPercent);
                    }
                    if (!htmlParserUtil.isEmpty(dividendYield)) {
                        data.put("Dividend_Yield_" + year, dividendYield);
                    }
                }
            }
            
            log.debug("Parsed dividend yield table with {} years", data.size() / 4);
        } catch (Exception e) {
            log.warn("Failed to parse dividend yield table: {}", e.getMessage());
        }
        return data;
    }
    
    /**
     * Parse shareholding table (Table 10)
     * Contains Listing Year, Market Category, and Shareholding Pattern
     * @param table the table element
     * @return parsed data map
     */
    private Map<String, String> parseShareholdingTable(Element table) {
        Map<String, String> data = new HashMap<>();
        try {
            Elements rows = table.select("tbody tr");
            
            for (Element row : rows) {
                Elements cells = row.select("td");
                
                if (cells.size() >= 2) {
                    String key = htmlParserUtil.cleanText(cells.get(0).text());
                    
                    // Check if this row contains shareholding pattern (nested table)
                    if (key.contains("Share Holding Percentage")) {
                        // Extract year from the key
                        String year = extractYearFromText(key);
                        data.put("Shareholding_Pattern_Year", year);
                        
                        // Parse nested table with shareholding percentages
                        Element nestedTable = cells.get(1).selectFirst("table");
                        if (nestedTable != null) {
                            Elements nestedCells = nestedTable.select("td");
                            
                            for (Element nestedCell : nestedCells) {
                                String cellText = htmlParserUtil.cleanText(nestedCell.text());
                                
                                // Extract shareholding type and percentage
                                // Format: "Sponsor/Director: 31.00"
                                if (cellText.contains(":")) {
                                    String[] parts = cellText.split(":");
                                    if (parts.length == 2) {
                                        String shareType = parts[0].trim();
                                        String percentage = parts[1].trim();
                                        data.put("Shareholding_" + shareType.replace("/", "_"), percentage);
                                    }
                                }
                            }
                        }
                    } else {
                        // Regular key-value pair
                        String value = htmlParserUtil.cleanText(cells.get(1).text());
                        data.put(key, value);
                    }
                }
            }
            
            log.debug("Parsed shareholding table with {} entries", data.size());
        } catch (Exception e) {
            log.warn("Failed to parse shareholding table: {}", e.getMessage());
        }
        return data;
    }
    
    /**
     * Extract year from text like "Share Holding Percentage [as on Dec 31, 2024 (year ended)]"
     * @param text the text containing year
     * @return extracted year or current year
     */
    private String extractYearFromText(String text) {
        try {
            java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("(\\d{4})");
            java.util.regex.Matcher matcher = pattern.matcher(text);
            if (matcher.find()) {
                return matcher.group(1);
            }
        } catch (Exception e) {
            log.debug("Could not extract year from text: {}", text);
        }
        return String.valueOf(java.time.Year.now().getValue());
    }
}
