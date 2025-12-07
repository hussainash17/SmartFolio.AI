package com.dohatec.oms.datascraper.service.scraper;

import com.dohatec.oms.datascraper.model.Company;
import com.dohatec.oms.datascraper.model.DailyOHLC;
import com.dohatec.oms.datascraper.model.ScraperLog;
import com.dohatec.oms.datascraper.model.StockData;
import com.dohatec.oms.datascraper.repository.CompanyRepository;
import com.dohatec.oms.datascraper.repository.DailyOHLCRepository;
import com.dohatec.oms.datascraper.repository.StockDataRepository;
import com.dohatec.oms.datascraper.service.ScraperLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Service for aggregating intraday ticks into daily OHLC data
 * Runs at end of trading day to create daily candles
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DailyOHLCAggregator {

    private final DailyOHLCRepository dailyOHLCRepository;
    private final CompanyRepository companyRepository;
    private final StockDataRepository stockDataRepository;
    private final ScraperLogService scraperLogService;

    /**
     * Aggregate today's intraday ticks into daily OHLC
     */
    @Transactional
    public void aggregateToday() {
        ScraperLog scraperLog = scraperLogService.startLog("DAILY_OHLC");

        try {
            log.info("Starting daily OHLC aggregation...");

            LocalDate today = LocalDate.now();
            LocalDateTime startOfDay = today.atStartOfDay();
            LocalDateTime endOfDay = today.atTime(23, 59, 59);

            List<Company> companies = companyRepository.findByIsActiveTrue();
            log.info("Found {} active companies to aggregate", companies.size());

            int successCount = 0;
            int failureCount = 0;

            for (Company company : companies) {
                try {
                    aggregateForCompany(company.getId(), startOfDay, endOfDay);
                    successCount++;
                } catch (Exception e) {
                    failureCount++;
                    log.error("Failed to aggregate OHLC for: {}", company.getTradingCode(), e);
                }
            }

            String status = failureCount == 0 ? "SUCCESS" : (successCount > 0 ? "PARTIAL" : "FAILED");
            scraperLogService.completeLog(scraperLog, status, successCount, failureCount);

            log.info("Daily OHLC aggregation completed. Success: {}, Failed: {}",
                    successCount, failureCount);

        } catch (Exception e) {
            log.error("Daily OHLC aggregation failed", e);
            scraperLogService.completeLog(scraperLog, "FAILED", 0, 0, e.getMessage());
            throw e;
        }
    }

    /**
     * Aggregate OHLC for a specific company
     *
     * @param companyId the company UUID
     * @param startTime start of day
     * @param endTime   end of day
     */
    private void aggregateForCompany(UUID companyId, LocalDateTime startTime, LocalDateTime endTime) {
        // Fetch latest StockData for the company
        StockData stockData = stockDataRepository.findByCompanyId(companyId)
                .orElse(null);

        if (stockData == null) {
            log.debug("No stock data found for company: {}", companyId);
            return;
        }

        // Check if OHLC already exists for today
        // We use the date from StockData or just "today" since this job runs daily
        LocalDate dataDate = stockData.getTimestamp().toLocalDate();
        LocalDateTime dayStart = dataDate.atStartOfDay();
        LocalDateTime dayEnd = dataDate.atTime(23, 59, 59);

        // Safety check: ensure we are aggregating data for target day/range if required
        // But usually StockData is "current", so we just take what's there if it
        // matches today
        if (dataDate.isBefore(startTime.toLocalDate())) {
            log.debug("Stock data is old (date: {}) for company: {}, skipping aggregation for today", dataDate,
                    companyId);
            return;
        }

        List<DailyOHLC> existingOHLC = dailyOHLCRepository.findByCompanyIdAndDateBetween(companyId, dayStart, dayEnd);
        if (!existingOHLC.isEmpty()) {
            log.debug("Daily OHLC already exists for company: {} on date: {}", companyId, dataDate);
            return;
        }

        // Create DailyOHLC from StockData
        DailyOHLC dailyOHLC = DailyOHLC.builder()
                .id(UUID.randomUUID())
                .companyId(companyId)
                .date(dayStart) // Store as start of day
                .openPrice(stockData.getOpenPrice() != null ? stockData.getOpenPrice() : BigDecimal.ZERO)
                .high(stockData.getHigh() != null ? stockData.getHigh() : BigDecimal.ZERO)
                .low(stockData.getLow() != null ? stockData.getLow() : BigDecimal.ZERO)
                .closePrice(stockData.getLastTradePrice() != null ? stockData.getLastTradePrice() : BigDecimal.ZERO) // Close
                                                                                                                     // is
                                                                                                                     // last
                                                                                                                     // trade
                                                                                                                     // price
                .volume(stockData.getVolume() != null ? stockData.getVolume() : 0L)
                .turnover(stockData.getTurnover() != null ? stockData.getTurnover() : BigDecimal.ZERO)
                .tradesCount(stockData.getTradesCount() != null ? stockData.getTradesCount() : 0)
                .change(stockData.getChange() != null ? stockData.getChange() : BigDecimal.ZERO)
                .changePercent(stockData.getChangePercent() != null ? stockData.getChangePercent() : BigDecimal.ZERO)
                .build();

        dailyOHLCRepository.save(dailyOHLC);

        log.info("Migrated StockData to DailyOHLC for company: {}", companyId);
    }
}
