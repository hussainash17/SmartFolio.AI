package com.dohatec.oms.datascraper.scheduler;

import com.dohatec.oms.datascraper.config.ScraperProperties;
import com.dohatec.oms.datascraper.service.scraper.DailyOHLCAggregator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduler for daily OHLC aggregation
 * Runs at end of trading day to aggregate intraday ticks
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "scraper.schedule", name = "enabled", havingValue = "true", matchIfMissing = true)
public class DailyAggregationScheduler {

    private final DailyOHLCAggregator dailyOHLCAggregator;
    private final ScraperProperties scraperProperties;

    /**
     * Aggregate daily OHLC at 3:30 PM (after market close)
     * Runs Monday to Thursday
     */
    @Scheduled(cron = "${scraper.schedule.daily-aggregation-cron:0 30 15 * * MON-THU}", 
               zone = "${scraper.schedule.timezone:Asia/Dhaka}")
    public void aggregateDailyOHLC() {
        try {
            log.info("=== Daily OHLC aggregation started ===");
            dailyOHLCAggregator.aggregateToday();
            log.info("=== Daily OHLC aggregation completed ===");
        } catch (Exception e) {
            log.error("Daily OHLC aggregation failed", e);
            // Don't rethrow - let the scheduler continue
        }
    }
}

