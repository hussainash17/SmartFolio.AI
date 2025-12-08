package com.dohatec.oms.datascraper.scheduler;

import com.dohatec.oms.datascraper.service.scraper.StockNowScraperService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduler for scraping Upcoming Events (AGM/EGM etc)
 * Runs every day at 4:30 PM Dhaka time
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "scraper.schedule", name = "enabled", havingValue = "true", matchIfMissing = true)
public class EventScheduler {

    private final StockNowScraperService stockNowScraperService;

    /**
     * Scrape upcoming events at 4:30 PM everyday
     */
    @Scheduled(cron = "0 30 16 * * *", zone = "${scraper.schedule.timezone:Asia/Dhaka}")
    public void scrapeEvents() {
        try {
            log.info("=== Upcoming events scraping started ===");
            stockNowScraperService.scrapeEvents();
            log.info("=== Upcoming events scraping completed ===");
        } catch (Exception e) {
            log.error("Upcoming events scraping failed", e);
        }
    }
}
