package com.dohatec.oms.datascraper.service.scraper;

import com.dohatec.oms.datascraper.config.ScraperProperties;
import com.dohatec.oms.datascraper.dto.MarketTotals;
import com.dohatec.oms.datascraper.exception.NetworkException;
import com.dohatec.oms.datascraper.model.MarketSummary;
import com.dohatec.oms.datascraper.model.ScraperLog;
import com.dohatec.oms.datascraper.repository.MarketSummaryRepository;
import com.dohatec.oms.datascraper.service.ScraperLogService;
import com.dohatec.oms.datascraper.util.HtmlParserUtil;
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

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Locale;

/**
 * Service responsible for scraping market summary data from the DSE homepage.
 * Uses the same parser as IndexInstrumentScraper to parse index summary and trades.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MarketSummaryScraper {

    private static final String SCRAPER_TYPE = "MARKET_SUMMARY";

    private final RestTemplate restTemplate;
    private final ScraperProperties scraperProperties;
    private final HtmlParserUtil htmlParserUtil;
    private final MarketSummaryRepository marketSummaryRepository;
    private final ScraperLogService scraperLogService;

    /**
     * Scrape and persist market summary data.
     */
    @Transactional
    public void scrapeMarketSummary() {
        ScraperLog scraperLog = scraperLogService.startLog(SCRAPER_TYPE);

        try {
            String html = fetchHtml();
            MarketSummary marketSummary = parseMarketSummary(html);

            if (marketSummary != null) {
                marketSummaryRepository.save(marketSummary);
                scraperLogService.completeLog(scraperLog, "SUCCESS", 1, 0);
                log.info("Market summary scraping completed successfully");
            } else {
                scraperLogService.completeLog(scraperLog, "FAILED", 0, 1, "Failed to parse market summary");
                log.error("Failed to parse market summary from HTML");
            }
        } catch (Exception ex) {
            log.error("Market summary scraping failed", ex);
            scraperLogService.completeLog(scraperLog, "FAILED", 0, 1, ex.getMessage());
            throw ex;
        }
    }

    /**
     * Fetch the DSE homepage HTML.
     */
    @Retryable(
            retryFor = {NetworkException.class, Exception.class},
            maxAttempts = 3,
            backoff = @Backoff(delay = 1000L, multiplier = 2.0)
    )
    protected String fetchHtml() {
        String url = scraperProperties.getDse().getMarketSummaryUrl();
        try {
            String html = restTemplate.getForObject(url, String.class);
            if (html == null || html.isEmpty()) {
                throw new NetworkException("Empty response when fetching market summary", url);
            }
            return html;
        } catch (Exception ex) {
            throw new NetworkException("Failed to fetch market summary from DSE", url, ex);
        }
    }

    /**
     * Parse market summary from HTML.
     * Uses the same parser logic as IndexInstrumentScraper for index summary and trades.
     */
    protected MarketSummary parseMarketSummary(String html) {
        try {
            Document document = Jsoup.parse(html);
            ZoneId zoneId = ZoneId.of(scraperProperties.getSchedule().getTimezone());
            LocalDateTime now = LocalDateTime.now(zoneId);

            // Parse market totals (reuse logic from IndexInstrumentScraper)
            MarketTotals marketTotals = parseMarketTotals(document);

            // Parse index data (DSEX, DSES, DS30)
            IndexData indexData = parseIndexData(document);

            // Parse advancers, decliners, unchanged
            StockMovementData movementData = parseStockMovementData(document);

            // Build MarketSummary entity
            MarketSummary.MarketSummaryBuilder builder = MarketSummary.builder()
                    .date(now)
                    .timestamp(now);

            // Set market totals
            if (marketTotals != null) {
                builder.totalTrades(marketTotals.trades() != null ? marketTotals.trades().intValue() : 0)
                       .totalVolume(marketTotals.volume())
                       .totalTurnover(marketTotals.totalValue() != null ? marketTotals.totalValue() : BigDecimal.ZERO);
            } else {
                builder.totalTrades(0)
                       .totalTurnover(BigDecimal.ZERO);
            }

            // Set DSE index data (DSEX)
            if (indexData.dsex != null) {
                builder.dseIndex(indexData.dsex.value)
                       .dseIndexChange(indexData.dsex.change)
                       .dseIndexChangePercent(indexData.dsex.percentChange);
            }

            // Set CSE index data (if available, typically DSES or DS30)
            // Note: CSE index might not be available on DSE page, leaving as null
            // If CSE data is available elsewhere, it can be added here

            // Set stock movement data
            builder.advancers(movementData.advancers != null ? movementData.advancers : 0)
                   .decliners(movementData.decliners != null ? movementData.decliners : 0)
                   .unchanged(movementData.unchanged != null ? movementData.unchanged : 0);

            return builder.build();
        } catch (Exception e) {
            log.error("Failed to parse market summary", e);
            return null;
        }
    }

    /**
     * Parse market totals (reused from IndexInstrumentScraper logic).
     */
    private MarketTotals parseMarketTotals(Document document) {
        try {
            Element totalsHeader = null;
            for (Element header : document.select("div.midrow.mt10.mol_col-wid-cus")) {
                String headerText = htmlParserUtil.getTextSafely(header).toLowerCase(Locale.ROOT);
                if (headerText.contains("total trade")) {
                    totalsHeader = header;
                    break;
                }
            }

            if (totalsHeader == null) {
                log.warn("Market totals header row not found in HTML");
                return null;
            }

            Element totalsRow = totalsHeader.nextElementSibling();
            while (totalsRow != null && !totalsRow.classNames().contains("mol_col-wid-cus")) {
                totalsRow = totalsRow.nextElementSibling();
            }

            if (totalsRow == null) {
                log.warn("Market totals data row not found after header");
                return null;
            }

            Element tradesElement = totalsRow.selectFirst(".m_col-wid");
            Element volumeElement = totalsRow.selectFirst(".m_col-wid1");
            Element valueElement = totalsRow.selectFirst(".m_col-wid2");

            if (tradesElement == null || volumeElement == null || valueElement == null) {
                log.warn("Market totals columns missing in HTML");
                return null;
            }

            Long trades = htmlParserUtil.parseLong(htmlParserUtil.getTextSafely(tradesElement));
            Long volume = htmlParserUtil.parseLong(htmlParserUtil.getTextSafely(volumeElement));
            BigDecimal totalValue = htmlParserUtil.parseNumeric(htmlParserUtil.getTextSafely(valueElement));

            return new MarketTotals(trades, volume, totalValue);
        } catch (Exception e) {
            log.error("Failed to parse market totals", e);
            return null;
        }
    }

    /**
     * Parse index data (DSEX, DSES, DS30) from HTML.
     * Reuses the same parsing logic as IndexInstrumentScraper.
     */
    private IndexData parseIndexData(Document document) {
        IndexData indexData = new IndexData();

        Elements rows = document.select("div.LeftColHome div._row div.midrow");
        for (Element row : rows) {
            Element nameElement = row.selectFirst(".m_col-1");
            Element valueElement = row.selectFirst(".m_col-2");
            Element changeElement = row.selectFirst(".m_col-3");
            Element percentElement = row.selectFirst(".m_col-4");

            if (nameElement == null || valueElement == null || changeElement == null || percentElement == null) {
                continue;
            }

            String rawName = normalizeIndexName(htmlParserUtil.cleanText(nameElement.text()));
            BigDecimal value = htmlParserUtil.parseNumeric(valueElement.text());
            BigDecimal change = htmlParserUtil.parseNumeric(changeElement.text());
            BigDecimal percentChange = htmlParserUtil.parseNumeric(percentElement.text());

            if (value == null) {
                continue;
            }

            // Identify index type
            if (rawName.contains("DSEX")) {
                indexData.dsex = new IndexInfo(value, change, percentChange);
            } else if (rawName.contains("DSES")) {
                // DSES can be used if needed
            } else if (rawName.contains("DS30")) {
                // DS30 can be used if needed
            }
        }

        return indexData;
    }

    /**
     * Parse advancers, decliners, and unchanged stock counts from HTML.
     * Searches for these values in common DSE homepage locations.
     */
    private StockMovementData parseStockMovementData(Document document) {
        StockMovementData movementData = new StockMovementData();

        // First, try to find in specific div structures with class names
        Elements movementDivs = document.select("div[class*='advancer'], div[class*='decliner'], div[class*='unchanged'], " +
                "div[class*='Advancer'], div[class*='Decliner'], div[class*='Unchanged']");
        for (Element div : movementDivs) {
            String className = div.className().toLowerCase(Locale.ROOT);
            String text = htmlParserUtil.getTextSafely(div);
            Integer count = extractNumberFromText(text);
            
            if (count != null) {
                if (className.contains("advancer") && movementData.advancers == null) {
                    movementData.advancers = count;
                } else if (className.contains("decliner") && movementData.decliners == null) {
                    movementData.decliners = count;
                } else if (className.contains("unchanged") && movementData.unchanged == null) {
                    movementData.unchanged = count;
                }
            }
        }

        // If not found, search in summary sections and tables
        if (movementData.advancers == null || movementData.decliners == null || movementData.unchanged == null) {
            // Search in summary sections
            Elements summarySections = document.select("div.summary, div.market-summary, div.LeftColHome, div.RightColHome");
            for (Element section : summarySections) {
                String text = htmlParserUtil.getTextSafely(section).toLowerCase(Locale.ROOT);
                
                // Look for patterns like "Advancers: 123" or "123 Advancers" or "Advancers 123"
                if (text.contains("advancer") && movementData.advancers == null) {
                    Integer count = extractNumberFromText(text);
                    if (count != null) {
                        movementData.advancers = count;
                    }
                }
                
                if (text.contains("decliner") && movementData.decliners == null) {
                    Integer count = extractNumberFromText(text);
                    if (count != null) {
                        movementData.decliners = count;
                    }
                }
                
                if (text.contains("unchanged") && movementData.unchanged == null) {
                    Integer count = extractNumberFromText(text);
                    if (count != null) {
                        movementData.unchanged = count;
                    }
                }
            }
        }

        // Log if any values are missing
        if (movementData.advancers == null || movementData.decliners == null || movementData.unchanged == null) {
            log.warn("Could not parse all stock movement data. Advancers: {}, Decliners: {}, Unchanged: {}",
                    movementData.advancers, movementData.decliners, movementData.unchanged);
        }

        return movementData;
    }

    /**
     * Extract a number from text that might contain labels.
     */
    private Integer extractNumberFromText(String text) {
        if (text == null || text.isEmpty()) {
            return null;
        }

        // Try to find numbers in the text
        String cleaned = text.replaceAll("[^0-9]", " ");
        String[] parts = cleaned.trim().split("\\s+");
        
        for (String part : parts) {
            if (!part.isEmpty()) {
                try {
                    return Integer.parseInt(part);
                } catch (NumberFormatException e) {
                    // Continue to next part
                }
            }
        }

        return null;
    }

    /**
     * Normalize index name (reused from IndexInstrumentScraper logic).
     */
    private String normalizeIndexName(String text) {
        if (text == null) {
            return null;
        }
        return text
                .replaceAll("\\s+", "")
                .replace("Index", "")
                .replaceAll("[^A-Za-z0-9]", "")
                .toUpperCase(Locale.ROOT);
    }

    /**
     * Internal class to hold index data.
     */
    private static class IndexData {
        IndexInfo dsex;
    }

    /**
     * Internal class to hold index information.
     */
    private static class IndexInfo {
        final BigDecimal value;
        final BigDecimal change;
        final BigDecimal percentChange;

        IndexInfo(BigDecimal value, BigDecimal change, BigDecimal percentChange) {
            this.value = value;
            this.change = change;
            this.percentChange = percentChange;
        }
    }

    /**
     * Internal class to hold stock movement data.
     */
    private static class StockMovementData {
        Integer advancers;
        Integer decliners;
        Integer unchanged;
    }
}

