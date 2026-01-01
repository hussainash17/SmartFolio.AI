package com.dohatec.oms.datascraper.scheduler;

import com.dohatec.oms.datascraper.service.scraper.MarketSummaryAndIndexScraper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduler that triggers market summary and index scraping.
 * Uses the merged scraper that fetches data once and stores in both tables:
 * - marketsummary table (market-wide statistics)
 * - benchmark_data table (individual index data)
 * 
 * Runs every day Sunday to Thursday at 2:30 PM Dhaka time.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "scraper.schedule", name = "enabled", havingValue = "true", matchIfMissing = true)
public class MarketSummaryScheduler {

    private final MarketSummaryAndIndexScraper marketSummaryAndIndexScraper;

    /**
     * Scrape market summary and index data.
     * Scheduled to run Sunday to Thursday every 60 seconds 2:30 PM Dhaka time.
     * Cron expression: "0 30 14 * * SUN-THU"
     * - 0: seconds
     * - 30: minutes (2:30 PM = 14:30)
     * - 14: hours (2:30 PM = 14:30)
     * - *: day of month
     * - *: month
     * - SUN-THU: day of week (Sunday to Thursday)
     */
    @Scheduled(cron = "${scraper.schedule.market-summary-cron:0 */1 10-14 * * SUN-THU}", zone = "${scraper.schedule.timezone:Asia/Dhaka}")
    public void scrapeMarketSummary() {
        try {
            log.debug("Starting scheduled market summary and index scraping");
            marketSummaryAndIndexScraper.scrapeMarketSummaryAndIndices();
        } catch (Exception ex) {
            log.error("Scheduled market summary and index scraping failed", ex);
        }
    }
}
