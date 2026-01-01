package com.dohatec.oms.datascraper.service.scraper;

import com.dohatec.oms.datascraper.config.ScraperProperties;
import com.dohatec.oms.datascraper.model.Company;
import com.dohatec.oms.datascraper.model.ScraperLog;
import com.dohatec.oms.datascraper.repository.CompanyRepository;
import com.dohatec.oms.datascraper.service.ScraperLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for scraping DSEX index shares from DSE website
 * Extracts trading codes of companies that are part of the DSEX index
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DsexIndexSharesScraper {

    private static final String DSEX_INDEX_URL = "https://dsebd.org/dseX_share.php";

    private final RestTemplate restTemplate;
    private final CompanyRepository companyRepository;
    private final ScraperLogService scraperLogService;
    private final ScraperProperties scraperProperties;

    /**
     * Scrape DSEX index shares trading codes
     * This is the main entry point for DSEX index data collection
     */
    @Transactional
    public void scrapeDsexIndexShares() {
        ScraperLog scraperLog = scraperLogService.startLog("DSEX_INDEX");

        try {
            log.info("Starting DSEX index shares scraping...");

            // Fetch HTML from DSE
            String html = fetchHtml();

            // Parse trading codes from HTML
            List<String> tradingCodes = parseTradingCodes(html);

            log.info("Parsed {} trading codes from DSEX index", tradingCodes.size());

            // Update company table with DSEX index flags
            int updatedCount = updateCompanyDsexFlags(tradingCodes);

            // Complete scraper log
            scraperLogService.completeLog(scraperLog, "SUCCESS", updatedCount, tradingCodes.size() - updatedCount);

            log.info("DSEX index shares scraping completed. Updated {} companies out of {} trading codes found",
                    updatedCount, tradingCodes.size());

        } catch (Exception e) {
            log.error("DSEX index shares scraping failed", e);
            scraperLogService.completeLog(scraperLog, "FAILED", 0, 0, e.getMessage());
            throw e;
        }
    }

    /**
     * Fetch HTML content from DSE DSEX index page
     *
     * @return HTML content as string
     */
    @Retryable(retryFor = { Exception.class }, maxAttempts = 3, backoff = @Backoff(delay = 1000, multiplier = 2.0))
    private String fetchHtml() {
        try {
            log.debug("Fetching HTML from: {}", DSEX_INDEX_URL);

            String html = restTemplate.getForObject(DSEX_INDEX_URL, String.class);

            if (html == null || html.isEmpty()) {
                throw new IllegalStateException("Empty response from DSE website");
            }

            return html;

        } catch (Exception e) {
            log.error("Failed to fetch HTML from: {}", DSEX_INDEX_URL, e);
            throw new IllegalStateException("Failed to fetch HTML from DSE website", e);
        }
    }

    /**
     * Parse trading codes from HTML content
     * Looks for links with pattern displayCompany.php?name=TRADINGCODE
     *
     * @param html the HTML content
     * @return list of trading codes
     */
    private List<String> parseTradingCodes(String html) {
        Set<String> tradingCodes = new HashSet<>();

        try {
            Document doc = Jsoup.parse(html);

            // Find all links that contain trading codes
            // Pattern: <a href="displayCompany.php?name=TRADINGCODE">
            // We only look inside div.table-responsive to avoid picking up ticker/header
            // links
            Elements links = doc.select("div.table-responsive a[href*='displayCompany.php']");

            for (Element link : links) {
                // Use text() instead of href to avoid URL parsing issues with special
                // characters like '&'
                // Example: <a href="...?name=KAY&QUE">KAY&QUE</a> -> text is "KAY&QUE"
                String tradingCode = link.text();

                // Clean up the code
                if (tradingCode != null) {
                    tradingCode = tradingCode.trim().toUpperCase();
                    if (!tradingCode.isEmpty()) {
                        tradingCodes.add(tradingCode);
                    }
                }
            }

        } catch (Exception e) {
            log.error("Failed to parse trading codes from HTML", e);
        }

        // Sort and return as list
        return tradingCodes.stream().sorted().collect(Collectors.toList());
    }

    /**
     * Update company table with DSEX index flags
     * Sets is_dsex to true for companies in the DSEX index list
     * Sets is_dsex = false for companies not in the list
     * Uses batch update for efficiency
     *
     * @param dsexTradingCodes list of trading codes in DSEX index
     * @return number of companies successfully updated
     */
    private int updateCompanyDsexFlags(List<String> dsexTradingCodes) {
        try {
            // Convert to uppercase set for case-insensitive matching
            Set<String> dsexCodesSet = dsexTradingCodes.stream()
                    .map(String::toUpperCase)
                    .collect(Collectors.toSet());

            log.info("Updating DSEX index flags for {} trading codes", dsexCodesSet.size());

            // Fetch all companies in one query
            List<Company> allCompanies = companyRepository.findAll();
            log.info("Fetched {} companies from database", allCompanies.size());

            // Create a map of trading code (uppercase) to company for fast lookup
            Map<String, Company> companyMap = new HashMap<>();
            for (Company company : allCompanies) {
                if (company.getTradingCode() != null) {
                    companyMap.put(company.getTradingCode().toUpperCase(), company);
                }
            }

            int updatedToTrue = 0;
            int updatedToFalse = 0;
            int notFoundCount = 0;
            List<Company> companiesToUpdate = new ArrayList<>();

            // Track which companies are in the DSEX index
            Set<String> foundCodes = new HashSet<>();

            // Set is_dsex = true for companies in the DSEX list
            for (String tradingCode : dsexTradingCodes) {
                String upperCode = tradingCode.toUpperCase();
                Company company = companyMap.get(upperCode);

                if (company != null) {
                    foundCodes.add(upperCode);
                    if (company.getIsDsex() == null || !company.getIsDsex()) {
                        company.setIsDsex(true);
                        companiesToUpdate.add(company);
                        updatedToTrue++;
                        log.debug("Marked {} to is_dsex=true", tradingCode);
                    }
                } else {
                    notFoundCount++;
                    log.warn("Company not found for trading code: {}", tradingCode);
                }
            }

            // Set is_dsex = false for companies not in the DSEX list
            // This ensures accurate state if a company was removed from the index
            for (Company company : allCompanies) {
                String tradingCode = company.getTradingCode();
                if (tradingCode != null) {
                    String upperCode = tradingCode.toUpperCase();
                    if (!foundCodes.contains(upperCode)) {
                        // Company is not in DSEX index
                        if (company.getIsDsex() != null && company.getIsDsex()) {
                            company.setIsDsex(false);
                            companiesToUpdate.add(company);
                            updatedToFalse++;
                            log.debug("Marked {} to is_dsex=false (removed from index)", tradingCode);
                        }
                    }
                }
            }

            // Batch save all updates
            if (!companiesToUpdate.isEmpty()) {
                log.info("Batch saving {} company updates ({} set to true, {} set to false)",
                        companiesToUpdate.size(), updatedToTrue, updatedToFalse);
                companyRepository.saveAll(companiesToUpdate);
                log.info("Successfully batch updated {} companies", companiesToUpdate.size());
            } else {
                log.info("No companies need to be updated");
            }

            int totalUpdated = updatedToTrue + updatedToFalse;
            log.info("DSEX index update completed. Updated: {} ({} to true, {} to false), Not found: {}",
                    totalUpdated, updatedToTrue, updatedToFalse, notFoundCount);

            return totalUpdated;

        } catch (Exception e) {
            log.error("Failed to update company DSEX flags", e);
            throw e;
        }
    }

    /**
     * Get list of DSEX index trading codes
     *
     * @return list of trading codes
     */
    public List<String> getDsexIndexTradingCodes() {
        try {
            String html = fetchHtml();
            return parseTradingCodes(html);
        } catch (Exception e) {
            log.error("Failed to get DSEX index trading codes", e);
            return new ArrayList<>();
        }
    }
}
