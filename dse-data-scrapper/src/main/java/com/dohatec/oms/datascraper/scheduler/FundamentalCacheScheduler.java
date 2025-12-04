package com.dohatec.oms.datascraper.scheduler;

import com.dohatec.oms.datascraper.service.FundamentalCacheService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "scraper.schedule", name = "enabled", havingValue = "true", matchIfMissing = true)
public class FundamentalCacheScheduler {

    private final FundamentalCacheService fundamentalCacheService;

    /**
     * Update fundamental cache daily at 5:00 PM (after market close and scraping)
     * Runs Monday to Thursday
     */
    @Scheduled(cron = "${scraper.schedule.fundamental-cache-cron:0 0 17 * * MON-THU}", zone = "${scraper.schedule.timezone:Asia/Dhaka}")
    public void updateFundamentalCache() {
        try {
            log.info("=== Fundamental cache update started ===");
            fundamentalCacheService.updateFundamentalCache();
            log.info("=== Fundamental cache update completed ===");
        } catch (Exception e) {
            log.error("Fundamental cache update failed", e);
        }
    }
}
