package com.dohatec.oms.datascraper.service;

import com.dohatec.oms.datascraper.model.ScraperLog;
import com.dohatec.oms.datascraper.repository.ScraperLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Service for managing scraper execution logs
 * Tracks scraper runs, performance metrics, and errors
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ScraperLogService {

    private final ScraperLogRepository scraperLogRepository;

    /**
     * Start a new scraper log entry
     * @param scraperType the type of scraper (e.g., "REALTIME", "FUNDAMENTAL")
     * @return ScraperLog entity
     */
    @Transactional
    public ScraperLog startLog(String scraperType) {
        ScraperLog scraperLog = ScraperLog.builder()
                .scraperType(scraperType)
                .status("RUNNING")
                .startedAt(LocalDateTime.now())
                .hostIp(getHostIp())
                .companiesProcessed(0)
                .companiesFailed(0)
                .build();

        scraperLog = scraperLogRepository.save(scraperLog);
        
        log.info("Started scraper log: type={}, id={}", scraperType, scraperLog.getId());
        
        return scraperLog;
    }

    /**
     * Complete a scraper log entry with success status
     * @param scraperLog the scraper log
     * @param status the final status (e.g., "SUCCESS", "FAILED", "PARTIAL")
     * @param companiesProcessed number of companies processed
     * @param companiesFailed number of companies failed
     */
    @Transactional
    public void completeLog(ScraperLog scraperLog, String status, 
                           Integer companiesProcessed, Integer companiesFailed) {
        completeLog(scraperLog, status, companiesProcessed, companiesFailed, null);
    }

    /**
     * Complete a scraper log entry with error message
     * @param scraperLog the scraper log
     * @param status the final status
     * @param companiesProcessed number of companies processed
     * @param companiesFailed number of companies failed
     * @param errorMessage the error message (if any)
     */
    @Transactional
    public void completeLog(ScraperLog scraperLog, String status, 
                           Integer companiesProcessed, Integer companiesFailed, 
                           String errorMessage) {
        scraperLog.setStatus(status);
        scraperLog.setCompaniesProcessed(companiesProcessed);
        scraperLog.setCompaniesFailed(companiesFailed);
        scraperLog.setErrorMessage(errorMessage);
        scraperLog.complete(); // Sets completedAt and calculates duration

        scraperLogRepository.save(scraperLog);
        
        log.info("Completed scraper log: type={}, status={}, processed={}, failed={}, duration={}s",
                scraperLog.getScraperType(), status, companiesProcessed, companiesFailed, 
                scraperLog.getDurationSeconds());
    }

    /**
     * Update scraper log with progress
     * @param scraperLog the scraper log
     * @param companiesProcessed number of companies processed
     * @param companiesFailed number of companies failed
     */
    @Transactional
    public void updateProgress(ScraperLog scraperLog, 
                              Integer companiesProcessed, Integer companiesFailed) {
        scraperLog.setCompaniesProcessed(companiesProcessed);
        scraperLog.setCompaniesFailed(companiesFailed);
        scraperLogRepository.save(scraperLog);
    }

    /**
     * Get latest scraper log by type
     * @param scraperType the scraper type
     * @return ScraperLog or null if not found
     */
    public ScraperLog getLatestLog(String scraperType) {
        return scraperLogRepository.findLatestByScraperType(scraperType).orElse(null);
    }

    /**
     * Get last N runs for a scraper type
     * @param scraperType the scraper type
     * @param limit number of logs to retrieve
     * @return list of scraper logs
     */
    public List<ScraperLog> getLastNRuns(String scraperType, int limit) {
        return scraperLogRepository.findLastNRunsByScraperType(scraperType, limit);
    }

    /**
     * Get average duration for successful runs
     * @param scraperType the scraper type
     * @return average duration in seconds
     */
    public Double getAverageDuration(String scraperType) {
        return scraperLogRepository.getAverageDurationByScraperType(scraperType);
    }

    /**
     * Get host IP address
     * @return host IP or "unknown"
     */
    private String getHostIp() {
        try {
            return InetAddress.getLocalHost().getHostAddress();
        } catch (UnknownHostException e) {
            log.warn("Failed to get host IP address", e);
            return "unknown";
        }
    }

    /**
     * Cleanup old logs (older than specified days)
     * @param daysToKeep number of days to keep
     * @return number of deleted records
     */
    @Transactional
    public long cleanupOldLogs(int daysToKeep) {
        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(daysToKeep);
        
        long countBefore = scraperLogRepository.count();
        scraperLogRepository.deleteByStartedAtBefore(cutoffDate);
        long countAfter = scraperLogRepository.count();
        
        long deleted = countBefore - countAfter;
        log.info("Cleaned up {} old scraper logs (older than {} days)", deleted, daysToKeep);
        
        return deleted;
    }
}

