package com.dohatec.oms.datascraper.service.scraper;

import com.dohatec.oms.datascraper.config.ScraperProperties;
import com.dohatec.oms.datascraper.dto.MarketTotals;
import com.dohatec.oms.datascraper.exception.NetworkException;
import com.dohatec.oms.datascraper.model.Benchmark;
import com.dohatec.oms.datascraper.model.BenchmarkData;
import com.dohatec.oms.datascraper.model.MarketSummary;
import com.dohatec.oms.datascraper.model.ScraperLog;
import com.dohatec.oms.datascraper.repository.BenchmarkDataRepository;
import com.dohatec.oms.datascraper.repository.BenchmarkRepository;
import com.dohatec.oms.datascraper.repository.MarketSummaryRepository;
import com.dohatec.oms.datascraper.service.ScraperLogService;
import com.dohatec.oms.datascraper.util.HtmlParserUtil;
import lombok.Getter;
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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Merged scraper that combines MarketSummary and IndexInstrument scraping.
 * Fetches HTML once from DSE homepage and stores data in both:
 * - marketsummary table (market-wide statistics)
 * - benchmark_data table (individual index data: DSEX, DSES, DS30)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MarketSummaryAndIndexScraper {

    private static final String SCRAPER_TYPE = "MARKET_SUMMARY_AND_INDEX";

    private final RestTemplate restTemplate;
    private final ScraperProperties scraperProperties;
    private final HtmlParserUtil htmlParserUtil;
    private final MarketSummaryRepository marketSummaryRepository;
    private final BenchmarkRepository benchmarkRepository;
    private final BenchmarkDataRepository benchmarkDataRepository;
    private final ScraperLogService scraperLogService;

    /**
     * Scrape and persist both market summary and index data.
     * This is the main entry point that combines both functionalities.
     */
    @Transactional
    public void scrapeMarketSummaryAndIndices() {
        ScraperLog scraperLog = scraperLogService.startLog(SCRAPER_TYPE);

        try {
            String html = fetchHtml();
            Document document = Jsoup.parse(html);

            ZoneId zoneId = ZoneId.of(scraperProperties.getSchedule().getTimezone());
            LocalDate marketDate = LocalDate.now(zoneId);
            LocalDateTime now = LocalDateTime.now(zoneId);
            OffsetDateTime nowOffset = OffsetDateTime.now(zoneId);

            // Parse all data from the document
            MarketTotals marketTotals = parseMarketTotals(document);
            List<IndexSnapshot> indexSnapshots = parseIndexSnapshots(document);
            StockMovementData movementData = parseStockMovementData(document);

            // Store MarketSummary
            MarketSummary marketSummary = persistMarketSummary(marketTotals, indexSnapshots, movementData, marketDate,
                    now);
            log.info("Successfully saved market summary: {}", marketSummary);

            // Store individual index data in benchmark_data table
            int indexSuccessCount = persistIndexSnapshots(indexSnapshots, marketDate, nowOffset);
            log.info("Successfully saved {} index snapshots", indexSuccessCount);

            scraperLogService.completeLog(scraperLog, "SUCCESS", 1 + indexSuccessCount, 0);
            log.info("Market summary and index scraping completed successfully");

        } catch (Exception ex) {
            log.error("Market summary and index scraping failed", ex);
            scraperLogService.completeLog(scraperLog, "FAILED", 0, 1, ex.getMessage());
            throw ex;
        }
    }

    private MarketSummary persistMarketSummary(MarketTotals marketTotals, List<IndexSnapshot> indexSnapshots,
            StockMovementData movementData, LocalDate marketDate, LocalDateTime now) {
        MarketSummary marketSummary = marketSummaryRepository.findByDate(marketDate)
                .orElseGet(() -> {
                    MarketSummary s = new MarketSummary();
                    s.setDate(marketDate);
                    return s;
                });

        updateMarketSummary(marketSummary, now, marketTotals, indexSnapshots, movementData);
        return marketSummaryRepository.save(marketSummary);
    }

    /**
     * Fetch the DSE homepage HTML.
     */
    @Retryable(retryFor = { NetworkException.class,
            Exception.class }, maxAttempts = 3, backoff = @Backoff(delay = 1000L, multiplier = 2.0))
    protected String fetchHtml() {
        String url = scraperProperties.getDse().getMarketSummaryUrl();
        try {
            String html = restTemplate.getForObject(url, String.class);
            if (html == null || html.isEmpty()) {
                throw new NetworkException("Empty response when fetching market summary and indices", url);
            }
            return html;
        } catch (Exception ex) {
            throw new NetworkException("Failed to fetch market summary and indices from DSE", url, ex);
        }
    }

    /**
     * Parse market totals (trades, volume, turnover) from HTML.
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
     * Parse index snapshots (DSEX, DSES, DS30) from HTML.
     */
    private List<IndexSnapshot> parseIndexSnapshots(Document document) {
        List<IndexSnapshot> snapshots = new ArrayList<>();
        MarketTotals marketTotals = parseMarketTotals(document);

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
            IndexMetadata metadata = IndexMetadata.fromLabel(rawName);

            if (metadata == null) {
                continue;
            }

            BigDecimal value = htmlParserUtil.parseNumeric(valueElement.text());
            BigDecimal change = htmlParserUtil.parseNumeric(changeElement.text());
            BigDecimal percentChange = htmlParserUtil.parseNumeric(percentElement.text());

            if (value == null) {
                log.debug("Skipping index {} due to missing value", rawName);
                continue;
            }

            // Market totals are associated with DSEX
            MarketTotals totals = (metadata == IndexMetadata.DSEX) ? marketTotals : null;
            snapshots.add(new IndexSnapshot(metadata, value, change, percentChange, totals));
        }

        log.debug("Parsed {} index snapshots", snapshots.size());
        return snapshots;
    }

    /**
     * Parse stock movement data (advancers, decliners, unchanged).
     */
    private StockMovementData parseStockMovementData(Document document) {
        StockMovementData movementData = new StockMovementData();
        String bodyText = document.body().text();

        // The text often appears as: "Issues Advanced Issues declined Issues Unchanged
        // 34 307 44"
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

        // Fallback: Try individual extraction
        log.debug("Sequential extraction failed, trying fallback for stock movement data");
        movementData.advancers = extractValueAfterLabel(bodyText, "Issues Advanced");
        movementData.decliners = extractValueAfterLabel(bodyText, "Issues declined");
        movementData.unchanged = extractValueAfterLabel(bodyText, "Issues Unchanged");

        return movementData;
    }

    /**
     * Update MarketSummary entity with parsed data.
     */
    private void updateMarketSummary(
            MarketSummary summary,
            LocalDateTime now,
            MarketTotals marketTotals,
            List<IndexSnapshot> indexSnapshots,
            StockMovementData movementData) {

        summary.setTimestamp(now);

        // Set market totals
        if (marketTotals != null) {
            summary.setTotalTrades(marketTotals.trades() != null ? marketTotals.trades().intValue() : 0);
            summary.setTotalVolume(marketTotals.volume());
            summary.setTotalTurnover(marketTotals.totalValue() != null ? marketTotals.totalValue() : BigDecimal.ZERO);
        } else {
            summary.setTotalTrades(0);
            summary.setTotalTurnover(BigDecimal.ZERO);
        }

        // Set index data (find DSEX for dse_index fields)
        IndexSnapshot dsexSnapshot = indexSnapshots.stream()
                .filter(s -> s.metadata() == IndexMetadata.DSEX)
                .findFirst()
                .orElse(null);

        if (dsexSnapshot != null) {
            summary.setDseIndex(dsexSnapshot.value());
            summary.setDseIndexChange(dsexSnapshot.change());
            summary.setDseIndexChangePercent(dsexSnapshot.percentChange());
        }

        // Note: CSE index is typically not available on DSE page
        // If needed, it can be added from another source

        // Set stock movement data
        summary.setAdvancers(movementData.advancers != null ? movementData.advancers : 0);
        summary.setDecliners(movementData.decliners != null ? movementData.decliners : 0);
        summary.setUnchanged(movementData.unchanged != null ? movementData.unchanged : 0);
    }

    /**
     * Persist index snapshots into benchmark_data table.
     */
    private int persistIndexSnapshots(List<IndexSnapshot> snapshots, LocalDate date, OffsetDateTime now) {
        int storedCount = 0;

        for (IndexSnapshot snapshot : snapshots) {
            try {
                Benchmark benchmark = ensureBenchmark(snapshot.metadata(), now);
                upsertBenchmarkData(snapshot, benchmark, date, now);
                storedCount++;
            } catch (Exception ex) {
                log.error("Failed to persist index snapshot for {}", snapshot.metadata().getId(), ex);
            }
        }

        return storedCount;
    }

    private Benchmark ensureBenchmark(IndexMetadata metadata, OffsetDateTime now) {
        return benchmarkRepository.findById(metadata.getId())
                .orElseGet(() -> {
                    Benchmark benchmark = Benchmark.builder()
                            .id(metadata.getId())
                            .name(metadata.getName())
                            .ticker(metadata.getTicker())
                            .description(metadata.getDescription())
                            .assetClass(metadata.getAssetClass())
                            .region(metadata.getRegion())
                            .dataSource(metadata.getDataSource())
                            .active(true)
                            .createdAt(now)
                            .build();
                    return benchmarkRepository.save(benchmark);
                });
    }

    private void upsertBenchmarkData(IndexSnapshot snapshot,
            Benchmark benchmark,
            LocalDate date,
            OffsetDateTime now) {
        // Find existing record for this benchmark and date
        Optional<BenchmarkData> existingOpt = benchmarkDataRepository.findByBenchmarkAndDate(benchmark, date);

        BenchmarkData data;
        boolean isNew = existingOpt.isEmpty();

        if (isNew) {
            // Create new record
            data = BenchmarkData.builder()
                    .benchmark(benchmark)
                    .date(date)
                    .openValue(snapshot.value())
                    .closeValue(snapshot.value())
                    .highValue(snapshot.value())
                    .lowValue(snapshot.value())
                    .build();
        } else {
            // Update existing record
            data = existingOpt.get();

            // Update OHLC values (for intraday updates)
            if (data.getOpenValue() == null) {
                data.setOpenValue(snapshot.value());
            }
            data.setHighValue(max(data.getHighValue(), snapshot.value()));
            data.setLowValue(min(data.getLowValue(), snapshot.value()));
            data.setCloseValue(snapshot.value()); // Always update close to latest value
        }

        // Always store daily return (percentage change) from scraped data
        if (snapshot.percentChange() != null) {
            data.setDailyReturn(snapshot.percentChange());
        } else if (snapshot.change() != null && snapshot.value() != null) {
            // Calculate percentage change from absolute change if percentChange is not
            // available
            BigDecimal previousValue = snapshot.value().subtract(snapshot.change());
            if (previousValue.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal calculatedPercent = snapshot.change()
                        .divide(previousValue, 6, java.math.RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100));
                data.setDailyReturn(calculatedPercent);
            }
        }

        // Market totals are associated with DSEX (only set if not already set or if
        // updating)
        MarketTotals totals = snapshot.marketTotals();
        if (totals != null) {
            data.setVolume(totals.volume());
            data.setTrades(totals.trades());
            data.setTotalValue(totals.totalValue());

        }

        // Save or update the record
        benchmarkDataRepository.save(data);
        log.debug("{} benchmark data for {} on {}: close={}, daily_return={}%",
                isNew ? "Created" : "Updated",
                benchmark.getId(),
                date,
                data.getCloseValue(),
                data.getDailyReturn());
    }

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

    private BigDecimal max(BigDecimal a, BigDecimal b) {
        if (a == null)
            return b;
        if (b == null)
            return a;
        return a.max(b);
    }

    private BigDecimal min(BigDecimal a, BigDecimal b) {
        if (a == null)
            return b;
        if (b == null)
            return a;
        return a.min(b);
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

    private Integer extractValueAfterLabel(String text, String label) {
        try {
            int labelIndex = text.toLowerCase(Locale.ROOT).indexOf(label.toLowerCase(Locale.ROOT));
            if (labelIndex == -1)
                return null;

            int startIndex = labelIndex + label.length();
            StringBuilder numberStr = new StringBuilder();
            boolean foundDigit = false;

            for (int i = startIndex; i < Math.min(startIndex + 50, text.length()); i++) {
                char c = text.charAt(i);
                if (Character.isDigit(c)) {
                    numberStr.append(c);
                    foundDigit = true;
                } else if (foundDigit && c != ',' && c != '.') {
                    break;
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

    /**
     * Internal record for holding a parsed index snapshot.
     */
    protected record IndexSnapshot(
            IndexMetadata metadata,
            BigDecimal value,
            BigDecimal change,
            BigDecimal percentChange,
            MarketTotals marketTotals) {
    }

    /**
     * Internal class to hold stock movement data.
     */
    private static class StockMovementData {
        Integer advancers;
        Integer decliners;
        Integer unchanged;
    }

    /**
     * Enum representing metadata for each DSE index.
     */
    @Getter
    private enum IndexMetadata {
        DSEX("DSEX", "DSEX", "DSEX Index", "DSE Broad Index", "EQUITY_INDEX", "BD", "DSE"),
        DSES("DSES", "DSES", "DSES Index", "DSE Shariah Index", "EQUITY_INDEX", "BD", "DSE"),
        DS30("DS30", "DS30", "DS30 Index", "DSE 30 Index", "EQUITY_INDEX", "BD", "DSE");

        private static final Map<String, IndexMetadata> LABEL_TO_METADATA = Map.of(
                "DSEX", DSEX,
                "DSES", DSES,
                "DS30", DS30);

        private final String id;
        private final String ticker;
        private final String name;
        private final String description;
        private final String assetClass;
        private final String region;
        private final String dataSource;

        IndexMetadata(String id,
                String ticker,
                String name,
                String description,
                String assetClass,
                String region,
                String dataSource) {
            this.id = id;
            this.ticker = ticker;
            this.name = name;
            this.description = description;
            this.assetClass = assetClass;
            this.region = region;
            this.dataSource = dataSource;
        }

        static IndexMetadata fromLabel(String label) {
            if (label == null) {
                return null;
            }
            return LABEL_TO_METADATA.get(label);
        }
    }
}
