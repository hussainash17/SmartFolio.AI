package com.dohatec.oms.datascraper.service.scraper;

import com.dohatec.oms.datascraper.config.ScraperProperties;
import com.dohatec.oms.datascraper.model.MarketSummary;
import com.dohatec.oms.datascraper.repository.MarketSummaryRepository;
import com.dohatec.oms.datascraper.util.HtmlParserUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@Slf4j
@RequiredArgsConstructor
public class MarketSummaryScraper {

    private final HtmlParserUtil htmlParserUtil;
    private final ScraperProperties scraperProperties;
    private final MarketSummaryRepository marketSummaryRepository;

    public void scrapeMarketSummary() {
        String url = scraperProperties.getDse().getMarketSummaryUrl();
        log.info("Starting market summary scraping from {}", url);
        try {
            Document document = htmlParserUtil.getDocument(url);

            MarketSummary summary = new MarketSummary();
            summary.setTimestamp(LocalDateTime.now());

            // Parse Date
            LocalDate marketDate = parseMarketDate(document);
            summary.setDate(marketDate.atStartOfDay());

            // Parse Indices
            parseIndices(document, summary);

            // Parse Market Stats (Trade, Volume, Turnover)
            parseMarketStats(document, summary);

            // Parse Stock Movement (Advancers, Decliners, Unchanged)
            StockMovementData movementData = parseStockMovementData(document);
            summary.setAdvancers(movementData.advancers);
            summary.setDecliners(movementData.decliners);
            summary.setUnchanged(movementData.unchanged);
            marketSummaryRepository.save(summary);
            log.info("Successfully scraped market summary: {}", summary);

        } catch (Exception e) {
            log.error("Error scraping market summary", e);
            throw new RuntimeException("Failed to scrape market summary", e);
        }
    }

    private LocalDate parseMarketDate(Document document) {
        try {
            // Look for date in header or specific div
            // Example: "Market Open: Sunday, 12 May, 2024" or similar
            Elements dateElements = document.select("span.time, div.date, h2.date");
            for (Element el : dateElements) {
                String text = el.text();
                // parsing logic here...
            }
            return LocalDate.now(); // Fallback
        } catch (Exception e) {
            log.warn("Could not parse market date, using today", e);
            return LocalDate.now();
        }
    }

    private void parseIndices(Document document, MarketSummary summary) {
        // Implementation for parsing DSEX, DS30, etc.
        // ... (Existing logic assumed here)
    }

    private void parseMarketStats(Document document, MarketSummary summary) {
        String bodyText = document.body().text();

        // Extract Total Trade
        Integer totalTrades = extractValueAfterLabel(bodyText, "Total Trade");
        if (totalTrades != null)
            summary.setTotalTrades(totalTrades);

        // Extract Total Volume
        Long totalVolume = extractLongValueAfterLabel(bodyText, "Total Volume");
        if (totalVolume != null)
            summary.setTotalVolume(totalVolume);

        // Extract Total Value (Turnover)
        Double totalValue = extractDoubleValueAfterLabel(bodyText, "Total Value in Taka (mn)");
        if (totalValue != null)
            summary.setTotalTurnover(BigDecimal.valueOf(totalValue));
    }

    private static class StockMovementData {
        Integer advancers;
        Integer decliners;
        Integer unchanged;
    }

    /**
     * Parse advancers, decliners, and unchanged stock counts from HTML.
     * Searches for these values by label text in the document.
     */
    /**
     * Parse advancers, decliners, and unchanged stock counts from HTML.
     * Handles the case where text is flattened as "Label1 Label2 Label3 Value1
     * Value2 Value3"
     */
    private StockMovementData parseStockMovementData(Document document) {
        StockMovementData movementData = new StockMovementData();
        String bodyText = document.body().text();

        // The text often appears as: "Issues Advanced Issues declined Issues Unchanged
        // 34 307 44"
        // We find the last label to know where values likely start
        int advIndex = bodyText.toLowerCase(Locale.ROOT).indexOf("issues advanced");
        int decIndex = bodyText.toLowerCase(Locale.ROOT).indexOf("issues declined");
        int unchIndex = bodyText.toLowerCase(Locale.ROOT).indexOf("issues unchanged");

        if (advIndex != -1 && decIndex != -1 && unchIndex != -1) {
            // Start searching for numbers after the last label
            int searchStart = Math.max(advIndex, Math.max(decIndex, unchIndex)) + "issues unchanged".length();

            List<Integer> values = extractNextIntegers(bodyText, searchStart, 3);
            if (values.size() >= 3) {
                movementData.advancers = values.get(0);
                movementData.decliners = values.get(1);
                movementData.unchanged = values.get(2);
                return movementData;
            }
        }

        // Fallback: Try the old method if sequential extraction failed
        log.warn("Sequential extraction failed, trying fallback for stock movement data");

        movementData.advancers = extractValueAfterLabel(bodyText, "Issues Advanced");
        movementData.decliners = extractValueAfterLabel(bodyText, "Issues declined");
        movementData.unchanged = extractValueAfterLabel(bodyText, "Issues Unchanged");

        return movementData;
    }

    private List<Integer> extractNextIntegers(String text, int startIndex, int count) {
        List<Integer> integers = new ArrayList<>();
        Matcher m = Pattern.compile("\\d+").matcher(text);
        if (m.find(startIndex)) {
            do {
                try {
                    integers.add(Integer.parseInt(m.group()));
                } catch (NumberFormatException e) {
                    // ignore
                }
            } while (integers.size() < count && m.find());
        }
        return integers;
    }

    /**
     * Helper to extract an integer value immediately following a label in a large
     * text block.
     * Handles variations like "Label: 123", "Label 123", "Label : 123"
     */
    private Integer extractValueAfterLabel(String text, String label) {
        try {
            // Case-insensitive search
            int labelIndex = text.toLowerCase(Locale.ROOT).indexOf(label.toLowerCase(Locale.ROOT));
            if (labelIndex == -1)
                return null;

            // Start looking after the label
            int startIndex = labelIndex + label.length();

            // Find the next number
            StringBuilder numberStr = new StringBuilder();
            boolean foundDigit = false;

            // Look ahead up to 50 chars to find the number
            for (int i = startIndex; i < Math.min(startIndex + 50, text.length()); i++) {
                char c = text.charAt(i);
                if (Character.isDigit(c)) {
                    numberStr.append(c);
                    foundDigit = true;
                } else if (foundDigit) {
                    // If we found digits and then hit a non-digit (and not a comma/decimal part of
                    // the number), stop
                    // Assuming integer counts for these fields
                    if (c != ',' && c != '.') {
                        break;
                    }
                }
            }

            if (numberStr.length() > 0) {
                return Integer.parseInt(numberStr.toString());
            }
        } catch (Exception e) {
            log.debug("Failed to extract value after label '{}': {}", label, e.getMessage());
        }
        return null;
    }

    private Long extractLongValueAfterLabel(String text, String label) {
        Integer val = extractValueAfterLabel(text, label);
        return val != null ? Long.valueOf(val) : null;
    }

    private Double extractDoubleValueAfterLabel(String text, String label) {
        try {
            int labelIndex = text.toLowerCase(Locale.ROOT).indexOf(label.toLowerCase(Locale.ROOT));
            if (labelIndex == -1)
                return null;

            int startIndex = labelIndex + label.length();
            StringBuilder numberStr = new StringBuilder();
            boolean foundDigit = false;

            for (int i = startIndex; i < Math.min(startIndex + 50, text.length()); i++) {
                char c = text.charAt(i);
                if (Character.isDigit(c) || c == '.') {
                    numberStr.append(c);
                    foundDigit = true;
                } else if (foundDigit && c != ',') {
                    break;
                }
            }

            if (numberStr.length() > 0) {
                return Double.parseDouble(numberStr.toString());
            }
        } catch (Exception e) {
            log.debug("Failed to extract double value after label '{}': {}", label, e.getMessage());
        }
        return null;
    }

    private Integer extractNumberFromText(String text) {
        if (text == null || text.isEmpty())
            return null;
        try {
            Matcher m = Pattern.compile("\\d+").matcher(text);
            if (m.find()) {
                return Integer.parseInt(m.group());
            }
        } catch (Exception e) {
            // ignore
        }
        return null;
    }
}
