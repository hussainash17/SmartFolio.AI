package com.dohatec.oms.datascraper.service.scraper;

import com.dohatec.oms.datascraper.config.ScraperProperties;
import com.dohatec.oms.datascraper.dto.StockPriceDTO;
import com.dohatec.oms.datascraper.model.Company;
import com.dohatec.oms.datascraper.model.StockData;
import com.dohatec.oms.datascraper.repository.CompanyRepository;
import com.dohatec.oms.datascraper.repository.StockDataRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service for scraping open prices from DSE AJAX API
 * Runs during market hours (10am-2pm Sun-Thu) to fetch open prices
 * for stocks where open_price is null in StockData table
 */
@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "scraper.schedule", name = "enabled", havingValue = "true", matchIfMissing = true)
public class OpenPriceScraper {

    private static final String AJAX_URL = "https://dsebd.org/ajax/load-instrument.php";
    private static final String REFERER_URL = "https://dsebd.org/mkt_depth_3.php";

    private final RestTemplate restTemplate;
    private final CompanyRepository companyRepository;
    private final StockDataRepository stockDataRepository;
    private final ScraperProperties scraperProperties;

    /**
     * Scheduled task to scrape open prices during market hours
     * Runs every 5 minutes, Sunday to Thursday, 10:00 AM to 1:59 PM Dhaka timezone
     */
    private static final int AGGRESSIVE_UPDATE_MINUTES = 30; // First 30 mins
    private static final int MODERATE_UPDATE_MINUTES = 60; // Up to 60 mins

    /**
     * Scheduled task to scrape open prices during market hours
     * Runs every 5 minutes, Sunday to Thursday, 10:00 AM to 1:59 PM Dhaka timezone
     */
    @Transactional
    public void scrapeOpenPrices() {
        try {
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime marketOpen = now.withHour(10).withMinute(0).withSecond(0);
            long minutesSinceOpen = ChronoUnit.MINUTES.between(marketOpen, now);

            log.info("=== Open Price Scraper started. Minutes since market open: {} ===", minutesSinceOpen);

            // Determine which stocks need updates based on time windows
            List<StockData> stocksToUpdate = getStocksNeedingUpdate(minutesSinceOpen);

            if (stocksToUpdate.isEmpty()) {
                log.info("No stocks need open price update at this time");
                return;
            }

            log.info("Found {} stocks to update", stocksToUpdate.size());

            // Parallel processing with company data pre-fetched
            Map<UUID, Company> companyMap = companyRepository.findAllById(
                    stocksToUpdate.stream().map(StockData::getCompanyId).collect(Collectors.toList()))
                    .stream().collect(Collectors.toMap(Company::getId, c -> c));

            List<StockData> updatedStocks = stocksToUpdate.parallelStream()
                    .map(stockData -> processStockData(stockData, companyMap))
                    .filter(Optional::isPresent)
                    .map(Optional::get)
                    .collect(Collectors.toList());

            if (!updatedStocks.isEmpty()) {
                stockDataRepository.saveAll(updatedStocks);
                log.info("Successfully updated {} stocks", updatedStocks.size());
            }

            log.info("=== Open Price Scraper completed ===");

        } catch (Exception e) {
            log.error("Open Price Scraper failed", e);
        }
    }

    /**
     * Smart selection: Which stocks need updates based on time since market open
     */
    private List<StockData> getStocksNeedingUpdate(long minutesSinceOpen) {
        LocalDate today = LocalDate.now();

        if (minutesSinceOpen < 0) {
            // Before market open - update stocks from today if any exist
            return stockDataRepository.findByTradingDate(today);
        } else if (minutesSinceOpen <= AGGRESSIVE_UPDATE_MINUTES) {
            // First 30 mins: Update ALL stocks (aggressive correction window)
            return stockDataRepository.findByTradingDate(today);
        } else if (minutesSinceOpen <= MODERATE_UPDATE_MINUTES) {
            // 30-60 mins: Update only stocks updated in last 15 mins (moderate window)
            LocalDateTime fifteenMinutesAgo = LocalDateTime.now().minusMinutes(15);
            return stockDataRepository.findByTradingDateAndUpdatedAtBefore(today, fifteenMinutesAgo);
        } else {
            // After 60 mins: Prices are stable, only update null prices
            return stockDataRepository.findByTradingDateAndOpenPriceIsNull(today);
        }
    }

    private Optional<StockData> processStockData(StockData stockData,
            java.util.Map<java.util.UUID, Company> companyMap) {
        try {
            Company company = companyMap.get(stockData.getCompanyId());
            if (company == null) {
                log.warn("Company not found for StockData: {}", stockData.getCompanyId());
                return Optional.empty();
            }

            String tradingCode = company.getTradingCode();
            BigDecimal newOpenPrice = fetchOpenPrice(tradingCode);

            if (newOpenPrice != null) {
                BigDecimal oldOpenPrice = stockData.getOpenPrice();

                // Only update if price changed or was null
                if (oldOpenPrice == null || !oldOpenPrice.equals(newOpenPrice)) {
                    stockData.setOpenPrice(newOpenPrice);
                    stockData.setUpdatedAt(java.time.LocalDateTime.now()); // Track update time

                    if (oldOpenPrice != null) {
                        log.info("CORRECTED open price for {}: {} -> {}",
                                tradingCode, oldOpenPrice, newOpenPrice);
                    } else {
                        log.debug("Set open price for {}: {}", tradingCode, newOpenPrice);
                    }

                    return Optional.of(stockData);
                }
            }

            return Optional.empty();
        } catch (Exception e) {
            log.error("Error processing stock data: {}", stockData.getCompanyId(), e);
            return Optional.empty();
        }
    }

    /**
     * Fetch open price for a symbol from DSE AJAX API
     *
     * @param symbol the trading code
     * @return the open price or null if not found
     */
    private BigDecimal fetchOpenPrice(String symbol) {
        try {
            // Build HTTP headers (following DseNewsScraper pattern)
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            headers.set(HttpHeaders.ACCEPT, "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
            headers.set(HttpHeaders.ACCEPT_LANGUAGE, "en-US,en;q=0.9");
            headers.set(HttpHeaders.REFERER, REFERER_URL);
            headers.set(HttpHeaders.USER_AGENT, scraperProperties.getHttp().getUserAgent());
            headers.set("X-Requested-With", "XMLHttpRequest");
            headers.set("Origin", "https://dsebd.org");

            // Build form data
            MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
            formData.add("inst", symbol);

            HttpEntity<MultiValueMap<String, String>> requestEntity = new HttpEntity<>(formData, headers);

            // Make POST request
            ResponseEntity<String> response = restTemplate.exchange(
                    AJAX_URL,
                    HttpMethod.POST,
                    requestEntity,
                    String.class);

            if (!response.getStatusCode().is2xxSuccessful()) {
                log.warn("AJAX request failed for {}: {}", symbol, response.getStatusCode());
                return null;
            }

            String html = response.getBody();
            if (html == null || html.isBlank()) {
                log.warn("Empty response for symbol: {}", symbol);
                return null;
            }

            return parseOpenPrice(html, symbol);

        } catch (Exception e) {
            log.error("Failed to fetch open price for {}: {}", symbol, e.getMessage());
            return null;
        }
    }

    /**
     * Parse open price from HTML response
     *
     * @param html   the HTML content
     * @param symbol the trading code (for logging)
     * @return the open price or null if not found
     */
    private BigDecimal parseOpenPrice(String html, String symbol) {
        try {
            Document doc = Jsoup.parse(html);
            String openPrice = doc.select("td:containsOwn(Open Price) + td")
                    .text()
                    .replace(": ", "");
            return new BigDecimal(openPrice);

        } catch (Exception e) {
            log.error("Error parsing HTML for {}: {}", symbol, e.getMessage());
            return null;
        }
    }

    /**
     * Parse price string to BigDecimal
     * Handles comma-separated numbers and removes BDT/currency symbols
     *
     * @param priceText the price text
     * @return the parsed BigDecimal or null
     */
    private BigDecimal parsePrice(String priceText) {
        try {
            if (priceText == null || priceText.isBlank() || priceText.equals("-") || priceText.equals("N/A")) {
                return null;
            }
            // Remove commas, currency symbols, and whitespace
            String cleaned = priceText
                    .replaceAll("[,\\s]", "")
                    .replaceAll("[^0-9.]", "");

            if (cleaned.isEmpty()) {
                return null;
            }

            return new BigDecimal(cleaned);
        } catch (NumberFormatException e) {
            log.debug("Could not parse price: {}", priceText);
            return null;
        }
    }
}
