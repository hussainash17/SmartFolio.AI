package com.dohatec.oms.datascraper.scheduler;

import com.dohatec.oms.datascraper.config.ScraperProperties;
import com.dohatec.oms.datascraper.model.ScraperLog;
import com.dohatec.oms.datascraper.service.PortfolioValuationService;
import com.dohatec.oms.datascraper.service.ScraperLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.ZoneId;

@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "scraper.schedule", name = "enabled", havingValue = "true", matchIfMissing = true)
public class PortfolioDailyValuationScheduler {

    private final PortfolioValuationService valuationService;
    private final ScraperLogService scraperLogService;
    private final ScraperProperties scraperProperties;

    /**
     * Calculate portfolio daily valuations at 2:30 PM Dhaka
     */
    @Scheduled(cron = "${scraper.schedule.portfolio-valuation-cron:0 30 15 * * MON-THU}",
            zone = "${scraper.schedule.timezone:Asia/Dhaka}")
    public void runDailyPortfolioValuation() {
        ScraperLog logEntry = null;
        try {
            log.info("=== Portfolio daily valuation started ===");
            logEntry = scraperLogService.startLog("PORTFOLIO_VALUATION");

            LocalDate valuationDate = LocalDate.now(ZoneId.of(scraperProperties.getSchedule().getTimezone()));
            int processed = valuationService.calculateAndSaveDailyValuations(valuationDate);

            scraperLogService.completeLog(logEntry, "SUCCESS", processed, 0);
            log.info("=== Portfolio daily valuation completed: processed={} ===", processed);
        } catch (Exception e) {
            log.error("Portfolio daily valuation failed", e);
            if (logEntry != null) {
                scraperLogService.completeLog(logEntry, "FAILED", 0, 0, e.getMessage());
            }
        }
    }
}

