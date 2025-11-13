package com.dohatec.oms.datascraper.scheduler;

import com.dohatec.oms.datascraper.service.scraper.IndexInstrumentScraper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduler that triggers index instrument scraping.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "scraper.schedule", name = "enabled", havingValue = "true", matchIfMissing = true)
public class IndexInstrumentScheduler {

    private final IndexInstrumentScraper indexInstrumentScraper;

    @Scheduled(cron = "${scraper.schedule.index-cron:0/30 * * * * *}",
            zone = "${scraper.schedule.timezone:Asia/Dhaka}")
    public void scrapeIndexes() {
        try {
            log.debug("Starting scheduled index instrument scraping");
            indexInstrumentScraper.scrapeIndexInstruments();
        } catch (Exception ex) {
            log.error("Scheduled index instrument scraping failed", ex);
        }
    }
}

