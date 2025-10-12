package com.dohatec.oms.datascraper.service.scraper;

import com.dohatec.oms.datascraper.model.Company;
import com.dohatec.oms.datascraper.model.DailyOHLC;
import com.dohatec.oms.datascraper.model.IntradayTick;
import com.dohatec.oms.datascraper.model.ScraperLog;
import com.dohatec.oms.datascraper.repository.CompanyRepository;
import com.dohatec.oms.datascraper.repository.DailyOHLCRepository;
import com.dohatec.oms.datascraper.repository.IntradayTickRepository;
import com.dohatec.oms.datascraper.service.ScraperLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
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

    private final IntradayTickRepository intradayTickRepository;
    private final DailyOHLCRepository dailyOHLCRepository;
    private final CompanyRepository companyRepository;
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
        List<IntradayTick> ticks = intradayTickRepository
                .findByCompanyIdAndTimestampBetweenOrderByTimestampAsc(companyId, startTime, endTime);

        if (ticks.isEmpty()) {
            log.debug("No ticks found for company: {}", companyId);
            return;
        }

        // Check if OHLC already exists for today
        if (dailyOHLCRepository.existsByCompanyIdAndDate(companyId, startTime)) {
            log.debug("Daily OHLC already exists for company: {}", companyId);
            return;
        }

        // Calculate OHLC
        BigDecimal open = ticks.get(0).getPrice();
        BigDecimal close = ticks.get(ticks.size() - 1).getPrice();
        BigDecimal high = ticks.stream()
                .map(IntradayTick::getPrice)
                .max(BigDecimal::compareTo)
                .orElse(open);
        BigDecimal low = ticks.stream()
                .map(IntradayTick::getPrice)
                .min(BigDecimal::compareTo)
                .orElse(open);

        // Calculate volume
        Long totalVolume = ticks.stream()
                .map(tick -> tick.getVolume() != null ? tick.getVolume() : 0L)
                .reduce(0L, Long::sum);

        // Calculate change
        BigDecimal change = close.subtract(open);
        BigDecimal changePercent = BigDecimal.ZERO;
        if (open.compareTo(BigDecimal.ZERO) != 0) {
            changePercent = change.divide(open, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
        }

        // Create DailyOHLC
        DailyOHLC dailyOHLC = DailyOHLC.builder()
                .companyId(companyId)
                .date(startTime)
                .openPrice(open)
                .high(high)
                .low(low)
                .closePrice(close)
                .volume(totalVolume)
                .turnover(BigDecimal.ZERO) // TODO: Calculate turnover if needed
                .tradesCount(ticks.size())
                .change(change)
                .changePercent(changePercent)
                .build();

        dailyOHLCRepository.save(dailyOHLC);

        log.info("Aggregated OHLC for company: {} with {} ticks", companyId, ticks.size());
    }
}

