package com.dohatec.oms.datascraper.service.scraper;

import com.dohatec.oms.datascraper.config.ScraperProperties;
import com.dohatec.oms.datascraper.dto.MarketTotals;
import com.dohatec.oms.datascraper.exception.NetworkException;
import com.dohatec.oms.datascraper.model.Benchmark;
import com.dohatec.oms.datascraper.model.BenchmarkData;
import com.dohatec.oms.datascraper.model.ScraperLog;
import com.dohatec.oms.datascraper.repository.BenchmarkDataRepository;
import com.dohatec.oms.datascraper.repository.BenchmarkRepository;
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
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

/**
 * Service responsible for scraping index instruments from the DSE homepage.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class IndexInstrumentScraper {

    private static final String SCRAPER_TYPE = "INDEX";

    private final RestTemplate restTemplate;
    private final ScraperProperties scraperProperties;
    private final HtmlParserUtil htmlParserUtil;
    private final BenchmarkRepository benchmarkRepository;
    private final BenchmarkDataRepository benchmarkDataRepository;
    private final ScraperLogService scraperLogService;

    /**
     * Scrape and persist index instrument data.
     */
    @Transactional
    public void scrapeIndexInstruments() {
        ScraperLog scraperLog = scraperLogService.startLog(SCRAPER_TYPE);

        try {
            String html = fetchHtml();
            List<IndexSnapshot> snapshots = parseIndexSnapshots(html);

            int successCount = persistSnapshots(snapshots);
            int failureCount = snapshots.size() - successCount;

            String status = failureCount == 0 ? "SUCCESS" : (successCount > 0 ? "PARTIAL" : "FAILED");
            scraperLogService.completeLog(scraperLog, status, successCount, failureCount);

            log.info("Index instrument scraping completed. Success: {}, Failed: {}", successCount, failureCount);
        } catch (Exception ex) {
            log.error("Index instrument scraping failed", ex);
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
                throw new NetworkException("Empty response when fetching index instruments", url);
            }
            return html;
        } catch (Exception ex) {
            throw new NetworkException("Failed to fetch index instruments from DSE", url, ex);
        }
    }

    /**
     * Parse index snapshots from HTML.
     */
    protected List<IndexSnapshot> parseIndexSnapshots(String html) {
        List<IndexSnapshot> snapshots = new ArrayList<>();

        Document document = Jsoup.parse(html);
        Elements rows = document.select("div.LeftColHome div._row div.midrow");
        MarketTotals marketTotals = parseMarketTotals(document);

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

            MarketTotals totals = (metadata == IndexMetadata.DSEX) ? marketTotals : null;
            snapshots.add(new IndexSnapshot(metadata, value, change, percentChange, totals));
        }

        log.debug("Parsed {} index snapshots", snapshots.size());
        return snapshots;
    }

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
     * Persist parsed snapshots into benchmark tables.
     */
    protected int persistSnapshots(List<IndexSnapshot> snapshots) {
        int storedCount = 0;
        ZoneId zoneId = ZoneId.of(scraperProperties.getSchedule().getTimezone());
        LocalDate today = LocalDate.now(zoneId);
        OffsetDateTime now = OffsetDateTime.now(zoneId);

        for (IndexSnapshot snapshot : snapshots) {
            try {
                Benchmark benchmark = ensureBenchmark(snapshot.metadata(), now);
                upsertBenchmarkData(snapshot, benchmark, today, now);
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
        BenchmarkData data = benchmarkDataRepository.findByBenchmarkAndDate(benchmark, date)
                .orElseGet(() -> BenchmarkData.builder()
                        .benchmark(benchmark)
                        .date(date)
                        .openValue(snapshot.value())      // first tick of the day
                        .build());

        BigDecimal price = snapshot.value();

        if (data.getOpenValue() == null) {
            data.setOpenValue(price);
        }
        data.setHighValue(max(data.getHighValue(), price));
        data.setLowValue(min(data.getLowValue(), price));
        data.setCloseValue(price);                        // last tick seen so far

        MarketTotals totals = snapshot.marketTotals();
        if (totals != null) {
            data.setVolume(totals.volume());
            data.setTrades(totals.trades());
            data.setTotalValue(totals.totalValue());
        }
        benchmarkDataRepository.save(data);
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
        if (a == null) return b;
        if (b == null) return a;
        return a.max(b);
    }

    private BigDecimal min(BigDecimal a, BigDecimal b) {
        if (a == null) return b;
        if (b == null) return a;
        return a.min(b);
    }

    /**
     * Internal record for holding a parsed index snapshot.
     */
    protected record IndexSnapshot(
            IndexMetadata metadata,
            BigDecimal value,
            BigDecimal change,
            BigDecimal percentChange,
            MarketTotals marketTotals
    ) {}

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
                "DS30", DS30
        );

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

