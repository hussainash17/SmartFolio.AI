package com.dohatec.oms.datascraper.repository;

import com.dohatec.oms.datascraper.model.ScraperLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository interface for ScraperLog entity
 * Provides database operations for scraper execution logs
 */
@Repository
public interface ScraperLogRepository extends JpaRepository<ScraperLog, UUID> {

    /**
     * Find scraper logs by type
     * @param scraperType the scraper type (e.g., "REALTIME", "FUNDAMENTAL")
     * @return list of scraper logs
     */
    List<ScraperLog> findByScraperType(String scraperType);

    /**
     * Find scraper logs by status
     * @param status the status (e.g., "SUCCESS", "FAILED")
     * @return list of scraper logs
     */
    List<ScraperLog> findByStatus(String status);

    /**
     * Find scraper logs by type and status
     * @param scraperType the scraper type
     * @param status the status
     * @return list of scraper logs
     */
    List<ScraperLog> findByScraperTypeAndStatus(String scraperType, String status);

    /**
     * Find scraper logs for a date range
     * @param startDate start date
     * @param endDate end date
     * @return list of scraper logs
     */
    List<ScraperLog> findByStartedAtBetween(LocalDateTime startDate, LocalDateTime endDate);

    /**
     * Find scraper logs after a specific date
     * @param date the date
     * @return list of scraper logs
     */
    List<ScraperLog> findByStartedAtAfter(LocalDateTime date);

    /**
     * Find all scraper logs ordered by started time descending
     * @return list of scraper logs
     */
    List<ScraperLog> findAllByOrderByStartedAtDesc();

    /**
     * Find scraper logs by type ordered by started time descending
     * @param scraperType the scraper type
     * @return list of scraper logs
     */
    List<ScraperLog> findByScraperTypeOrderByStartedAtDesc(String scraperType);

    /**
     * Get latest scraper log by type
     * @param scraperType the scraper type
     * @return Optional containing the latest scraper log
     */
    @Query("SELECT s FROM ScraperLog s WHERE s.scraperType = :scraperType ORDER BY s.startedAt DESC LIMIT 1")
    Optional<ScraperLog> findLatestByScraperType(@Param("scraperType") String scraperType);

    /**
     * Get last N runs for a scraper type
     * @param scraperType the scraper type
     * @param limit the number of logs to retrieve
     * @return list of scraper logs
     */
    @Query("SELECT s FROM ScraperLog s WHERE s.scraperType = :scraperType ORDER BY s.startedAt DESC LIMIT :limit")
    List<ScraperLog> findLastNRunsByScraperType(@Param("scraperType") String scraperType, @Param("limit") int limit);

    /**
     * Count logs by scraper type and status
     * @param scraperType the scraper type
     * @param status the status
     * @return count of logs
     */
    long countByScraperTypeAndStatus(String scraperType, String status);

    /**
     * Count failed runs by scraper type
     * @param scraperType the scraper type
     * @return count of failed runs
     */
    @Query("SELECT COUNT(s) FROM ScraperLog s WHERE s.scraperType = :scraperType AND s.status = 'FAILED'")
    long countFailedRunsByScraperType(@Param("scraperType") String scraperType);

    /**
     * Count successful runs by scraper type
     * @param scraperType the scraper type
     * @return count of successful runs
     */
    @Query("SELECT COUNT(s) FROM ScraperLog s WHERE s.scraperType = :scraperType AND s.status = 'SUCCESS'")
    long countSuccessfulRunsByScraperType(@Param("scraperType") String scraperType);

    /**
     * Get average duration for successful runs
     * @param scraperType the scraper type
     * @return average duration in seconds
     */
    @Query("SELECT AVG(s.durationSeconds) FROM ScraperLog s WHERE s.scraperType = :scraperType AND s.status = 'SUCCESS' AND s.durationSeconds IS NOT NULL")
    Double getAverageDurationByScraperType(@Param("scraperType") String scraperType);

    /**
     * Get minimum duration for successful runs
     * @param scraperType the scraper type
     * @return minimum duration in seconds
     */
    @Query("SELECT MIN(s.durationSeconds) FROM ScraperLog s WHERE s.scraperType = :scraperType AND s.status = 'SUCCESS' AND s.durationSeconds IS NOT NULL")
    Integer getMinDurationByScraperType(@Param("scraperType") String scraperType);

    /**
     * Get maximum duration for successful runs
     * @param scraperType the scraper type
     * @return maximum duration in seconds
     */
    @Query("SELECT MAX(s.durationSeconds) FROM ScraperLog s WHERE s.scraperType = :scraperType AND s.status = 'SUCCESS' AND s.durationSeconds IS NOT NULL")
    Integer getMaxDurationByScraperType(@Param("scraperType") String scraperType);

    /**
     * Delete scraper logs before a specific date (cleanup operation)
     * @param date cutoff date
     */
    @Modifying
    @Query("DELETE FROM ScraperLog s WHERE s.startedAt < :date")
    void deleteByStartedAtBefore(@Param("date") LocalDateTime date);
}

