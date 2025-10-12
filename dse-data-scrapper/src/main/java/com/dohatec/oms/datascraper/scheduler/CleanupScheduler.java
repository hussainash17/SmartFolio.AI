package com.dohatec.oms.datascraper.scheduler;

import com.dohatec.oms.datascraper.service.ScraperLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduler for periodic cleanup tasks
 * Cleans up old logs and temporary data
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "scraper.schedule", name = "enabled", havingValue = "true", matchIfMissing = true)
public class CleanupScheduler {

    private final ScraperLogService scraperLogService;

    /**
     * Cleanup old scraper logs (runs monthly on 1st day at 2:00 AM)
     * Keeps logs for 90 days
     */
    @Scheduled(cron = "${scraper.schedule.cleanup-cron:0 0 2 1 * *}", 
               zone = "${scraper.schedule.timezone:Asia/Dhaka}")
    public void cleanupOldLogs() {
        try {
            log.info("=== Cleanup: Starting old log cleanup ===");
            long deleted = scraperLogService.cleanupOldLogs(90);
            log.info("=== Cleanup: Deleted {} old log entries ===", deleted);
        } catch (Exception e) {
            log.error("Cleanup failed", e);
        }
    }
}

