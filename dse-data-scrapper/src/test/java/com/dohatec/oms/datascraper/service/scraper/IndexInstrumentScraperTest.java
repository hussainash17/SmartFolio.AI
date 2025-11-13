package com.dohatec.oms.datascraper.service.scraper;

import com.dohatec.oms.datascraper.config.ScraperProperties;
import com.dohatec.oms.datascraper.dto.MarketTotals;
import com.dohatec.oms.datascraper.repository.BenchmarkDataRepository;
import com.dohatec.oms.datascraper.repository.BenchmarkRepository;
import com.dohatec.oms.datascraper.service.ScraperLogService;
import com.dohatec.oms.datascraper.util.HtmlParserUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.web.client.RestTemplate;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class IndexInstrumentScraperTest {

    private TestableIndexInstrumentScraper scraper;

    @BeforeEach
    void setUp() {
        ScraperProperties scraperProperties = new ScraperProperties();
        scraperProperties.getSchedule().setTimezone("Asia/Dhaka");
        scraper = new TestableIndexInstrumentScraper(
                Mockito.mock(RestTemplate.class),
                scraperProperties,
                new HtmlParserUtil(),
                Mockito.mock(BenchmarkRepository.class),
                Mockito.mock(BenchmarkDataRepository.class),
                Mockito.mock(ScraperLogService.class)
        );
    }

    @Test
    void parseIndexSnapshots_extractsThreeIndexes() throws Exception {
        String html = """
                <div class="col-md-6 col-xs-12 col-sm-12 LeftColHome ">
                    <div class="_row">
                        <h2 class="Bodyheading">Last update on Nov 10, 2025 at 2:35 PM </h2>
                        <div class="midrow">
                            <div class="m_col-1">DSE<font size="+1">X</font> Index</div>
                            <div class="m_col-2"> 4860.75150 </div>
                            <div class="m_col-3">
                              -39.17490            </div>
                            <div class="m_col-4">
                              -0.7995%            </div>
                            <div class="m_col-5"><img src="assets/images/downArrow.jpg"></div>
                        </div>
                        <div class="midrow" style="margin-top:1px;">
                            <div class="m_col-1">DSE<font size="+1">S</font> Index</div>
                            <div class="m_col-2"> 1010.70845 </div>
                            <div class="m_col-3">
                              -11.89900            </div>
                            <div class="m_col-4">
                              -1.16359%            </div>
                            <div class="m_col-5"><img src="assets/images/downArrow.jpg"></div>
                        </div>
                        <div class="midrow" style="margin-top:1px;">
                            <div class="m_col-1">DS30 Index</div>
                            <div class="m_col-2"> 1910.30549 </div>
                            <div class="m_col-3">
                              -18.49257            </div>
                            <div class="m_col-4">
                              -0.95876%            </div>
                            <div class="m_col-5"><img src="assets/images/downArrow.jpg"></div>
                        </div>
                        <div class="midrow mt10 mol_col-wid-cus">
                            <div class="m_col-wid colorgreen">Total Trade</div>
                            <div class="m_col-wid1 colorgreen">Total Volume</div>
                            <div class="m_col-wid2 colorgreen">Total Value in Taka (mn)</div>
                        </div>
                        <div class="midrow mol_col-wid-cus" style="margin-top:1px;">
                            <div class="m_col-wid colorlight">
                              143900            </div>
                            <div class="m_col-wid1 colorlight">
                              123823602            </div>
                            <div class="m_col-wid2 colorlight">
                              3563.317            </div>
                        </div>
                    </div>
                </div>
                """;

        List<?> snapshots = scraper.parse(html);
        assertEquals(3, snapshots.size(), "Expected three index snapshots");

        Map<String, BigDecimal> valuesById = extractMetric(snapshots, "value");
        assertEquals(new BigDecimal("4860.75150"), valuesById.get("DSEX"));
        assertEquals(new BigDecimal("1010.70845"), valuesById.get("DSES"));
        assertEquals(new BigDecimal("1910.30549"), valuesById.get("DS30"));

        Map<String, BigDecimal> changeById = extractMetric(snapshots, "change");
        assertEquals(new BigDecimal("-39.17490"), changeById.get("DSEX"));
        assertEquals(new BigDecimal("-11.89900"), changeById.get("DSES"));
        assertEquals(new BigDecimal("-18.49257"), changeById.get("DS30"));

        Map<String, BigDecimal> percentById = extractMetric(snapshots, "percentChange");
        assertEquals(new BigDecimal("-0.7995"), percentById.get("DSEX"));
        assertEquals(new BigDecimal("-1.16359"), percentById.get("DSES"));
        assertEquals(new BigDecimal("-0.95876"), percentById.get("DS30"));

        MarketTotals totals = getMarketTotals(snapshots, "DSEX");
        assertNotNull(totals, "Expected market totals for DSEX snapshot");
        assertEquals(143900L, totals.trades());
        assertEquals(123823602L, totals.volume());
        assertEquals(new BigDecimal("3563.317"), totals.totalValue());

        assertNull(getMarketTotals(snapshots, "DSES"), "Only DSEX should carry market totals");
        assertNull(getMarketTotals(snapshots, "DS30"), "Only DSEX should carry market totals");
    }

    private Map<String, BigDecimal> extractMetric(List<?> snapshots, String fieldName) throws Exception {
        Map<String, BigDecimal> map = new HashMap<>();
        for (Object snapshot : snapshots) {
            Object metadata = getField(snapshot, "metadata");
            assertTrue(metadata instanceof Enum<?>);
            String id = ((Enum<?>) metadata).name();
            BigDecimal value = (BigDecimal) getField(snapshot, fieldName);
            map.put(id, value);
        }
        return map;
    }

    private MarketTotals getMarketTotals(List<?> snapshots, String indexId) throws Exception {
        for (Object snapshot : snapshots) {
            Object metadata = getField(snapshot, "metadata");
            if (metadata instanceof Enum<?> enumValue && enumValue.name().equals(indexId)) {
                return (MarketTotals) getField(snapshot, "marketTotals");
            }
        }
        return null;
    }

    private Object getField(Object target, String name) throws Exception {
        Field field = target.getClass().getDeclaredField(name);
        field.setAccessible(true);
        return field.get(target);
    }

    private static class TestableIndexInstrumentScraper extends IndexInstrumentScraper {

        TestableIndexInstrumentScraper(RestTemplate restTemplate,
                                       ScraperProperties scraperProperties,
                                       HtmlParserUtil htmlParserUtil,
                                       BenchmarkRepository benchmarkRepository,
                                       BenchmarkDataRepository benchmarkDataRepository,
                                       ScraperLogService scraperLogService) {
            super(restTemplate, scraperProperties, htmlParserUtil, benchmarkRepository, benchmarkDataRepository, scraperLogService);
        }

        List<?> parse(String html) {
            return super.parseIndexSnapshots(html);
        }
    }
}

