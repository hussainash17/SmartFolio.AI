package com.dohatec.oms.datascraper.scheduler;

import com.dohatec.oms.datascraper.service.scraper.MarketSummaryScraper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduler that triggers market summary scraping.
 * Runs every day Sunday to Thursday at 2:30 PM Dhaka time.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "scraper.schedule", name = "enabled", havingValue = "true", matchIfMissing = true)
public class MarketSummaryScheduler {

    private final MarketSummaryScraper marketSummaryScraper;

    /**
     * Scrape market summary data.
     * Scheduled to run Sunday to Thursday at 2:30 PM Dhaka time.
     * Cron expression: "0 30 14 * * SUN-THU"
     * - 0: seconds
     * - 30: minutes (2:30 PM = 14:30)
     * - 14: hours (2:30 PM = 14:30)
     * - *: day of month
     * - *: month
     * - SUN-THU: day of week (Sunday to Thursday)
     */
   @Scheduled(cron = "${scraper.schedule.market-summary-cron:0 30 14 * * SUN-THU}",
           zone = "${scraper.schedule.timezone:Asia/Dhaka}")
    public void scrapeMarketSummary() {
        try {
            log.debug("Starting scheduled market summary scraping");
            marketSummaryScraper.scrapeMarketSummary();
        } catch (Exception ex) {
            log.error("Scheduled market summary scraping failed", ex);
        }
    }
}

