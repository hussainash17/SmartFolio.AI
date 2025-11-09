package com.dohatec.oms.datascraper.scheduler;

import com.dohatec.oms.datascraper.config.ScraperProperties;
import com.dohatec.oms.datascraper.service.scraper.DseNewsScraper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduler for scraping DSE news
 * Runs every 30 seconds
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "scraper.schedule", name = "enabled", havingValue = "true", matchIfMissing = true)
public class DseNewsScheduler {

    private final DseNewsScraper dseNewsScraper;

    /**
     * Scrape DSE news every 60 seconds
     */
    @Scheduled(cron = "${scraper.schedule.news-cron:0/60 * * * * *}",
            zone = "${scraper.schedule.timezone:Asia/Dhaka}")
    public void scrapeNews() {
        try {
            log.info("=== DSE news scraping started ===");
            dseNewsScraper.scrapeTodayNews();
            log.info("=== DSE news scraping completed ===");
        } catch (Exception e) {
            log.error("DSE news scraping failed", e);
            // Do not rethrow to allow scheduler continuation
        }
    }
}