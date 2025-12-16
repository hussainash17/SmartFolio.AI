package com.dohatec.oms.datascraper.scheduler;

import com.dohatec.oms.datascraper.service.scraper.OpenPriceScraper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduler for scraping open price from market depth
 * Runs every 60 seconds
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "scraper.schedule", name = "enabled", havingValue = "true", matchIfMissing = true)
public class OpenPriceUpdateScheduler {

    private final OpenPriceScraper openPriceScraper;

    /**
     * Scrape open price from market depth url every 60 seconds
     */
    @Scheduled(cron = "${scraper.schedule.open-price-cron:0 */5 10-13 * * SUN-THU}", zone = "${scraper.schedule.timezone:Asia/Dhaka}")
    public void setOpenPriceScraper() {
        try {
            log.info("=== Open Price Scheduler started ===");
            openPriceScraper.scrapeOpenPrices();
            log.info("=== Open Price Scheduler completed ===");
        } catch (Exception e) {
            log.error("Open Price Scheduler failed", e);
            // Do not rethrow to allow scheduler continuation
        }
    }
}