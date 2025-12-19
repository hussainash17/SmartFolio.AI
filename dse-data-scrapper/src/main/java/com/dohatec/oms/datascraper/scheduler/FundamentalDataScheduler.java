package com.dohatec.oms.datascraper.scheduler;

import com.dohatec.oms.datascraper.config.ScraperProperties;
import com.dohatec.oms.datascraper.service.scraper.FundamentalDataScraper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduler for fundamental data scraping
 * Runs daily after market close
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "scraper.schedule", name = "enabled", havingValue = "true", matchIfMissing = true)
public class FundamentalDataScheduler {

    private final FundamentalDataScraper fundamentalDataScraper;

    /**
     * Scrape fundamental data daily at 4:00 PM (after market close)
     * Runs Monday to Thursday
     */
//    @Scheduled(cron = "${scraper.schedule.fundamental-cron:0 0 16 * * MON-THU}",
//               zone = "${scraper.schedule.timezone:Asia/Dhaka}")
    @Bean
    public void scrapeFundamentalData() {
        try {
            log.info("=== Fundamental data scraping started ===");
            fundamentalDataScraper.scrapeFundamentalData();
            log.info("=== Fundamental data scraping completed ===");
        } catch (Exception e) {
            log.error("Fundamental data scraping failed", e);
            // Don't rethrow - let the scheduler continue
        }
    }
}

