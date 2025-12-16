package com.dohatec.oms.datascraper.scheduler;

import com.dohatec.oms.datascraper.service.scraper.RealTimeMarketScraper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduler for real-time market data scraping
 * Runs every 1 minute during market hours
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "scraper.schedule", name = "enabled", havingValue = "true", matchIfMissing = true)
public class RealTimeMarketScheduler {

    private final RealTimeMarketScraper realTimeMarketScraper;

    /**
     * Scrape real-time market data every 1 minute during market hours
     * DSE trading hours: 10:00 AM - 2:30 PM (Monday to Thursday)
     */
//    @Scheduled(cron = "${scraper.schedule.realtime-cron:0 */1 10-15 * * SUN-THU}",
//            zone = "${scraper.schedule.timezone:Asia/Dhaka}")
    @Bean
    public void scrapeRealTimeData() {
        try {
            log.info("=== Real-time market data scraping started ===");
            realTimeMarketScraper.scrapeMarketData();
            log.info("=== Real-time market data scraping completed ===");
        } catch (Exception e) {
            log.error("Real-time market data scraping failed", e);
            // Don't rethrow - let the scheduler continue
        }
    }
}

