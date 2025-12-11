package com.dohatec.oms.datascraper.scheduler;

import com.dohatec.oms.datascraper.service.scraper.DsexIndexScraper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduler for DSEX index shares scraping
 * Runs daily to fetch the list of trading codes in the DSEX index
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "scraper.schedule", name = "enabled", havingValue = "true", matchIfMissing = true)
public class DsexIndexScheduler {

    private final DsexIndexScraper dsexIndexScraper;

    /**
     * Scrape DSEX index shares trading codes
     * Scheduled to run daily at 3:00 PM Dhaka time (after market close)
     * Cron expression: "0 0 15 * * SUN-THU"
     * - 0: seconds
     * - 0: minutes
     * - 15: hours (3:00 PM)
     * - *: day of month
     * - *: month
     * - SUN-THU: day of week (Sunday to Thursday)
     */
    @Scheduled(cron = "${scraper.schedule.dsex-index-cron:0 0 15 * * SUN-THU}",
            zone = "${scraper.schedule.timezone:Asia/Dhaka}")
    public void scrapeDsexIndexShares() {
        try {
            log.info("=== DSEX index shares scraping started ===");
            dsexIndexScraper.scrapeDsexIndexShares();
            log.info("=== DSEX index shares scraping completed ===");
        } catch (Exception e) {
            log.error("DSEX index shares scraping failed", e);
            // Don't rethrow - let the scheduler continue
        }
    }
}

