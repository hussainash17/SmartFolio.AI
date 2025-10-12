package com.dohatec.oms.datascraper.repository;

import com.dohatec.oms.datascraper.model.MarketSummary;
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
 * Repository interface for MarketSummary entity
 * Provides database operations for market summary data
 */
@Repository
public interface MarketSummaryRepository extends JpaRepository<MarketSummary, UUID> {

    /**
     * Find market summary by date
     * @param date the date
     * @return Optional containing the market summary if found
     */
    Optional<MarketSummary> findByDate(LocalDateTime date);

    /**
     * Find market summaries for a date range
     * @param startDate start date
     * @param endDate end date
     * @return list of market summaries
     */
    List<MarketSummary> findByDateBetween(LocalDateTime startDate, LocalDateTime endDate);

    /**
     * Find all market summaries ordered by date descending
     * @return list of market summaries
     */
    List<MarketSummary> findAllByOrderByDateDesc();

    /**
     * Find all market summaries ordered by timestamp descending
     * @return list of market summaries
     */
    List<MarketSummary> findAllByOrderByTimestampDesc();

    /**
     * Get latest market summary
     * @return Optional containing the latest market summary
     */
    @Query("SELECT m FROM MarketSummary m ORDER BY m.date DESC, m.timestamp DESC LIMIT 1")
    Optional<MarketSummary> findLatest();

    /**
     * Get latest N market summaries
     * @param limit number of records
     * @return list of market summaries
     */
    @Query("SELECT m FROM MarketSummary m ORDER BY m.date DESC, m.timestamp DESC LIMIT :limit")
    List<MarketSummary> findLatestN(@Param("limit") int limit);

    /**
     * Get market summaries from last N days
     * @param cutoffDate cutoff date
     * @return list of market summaries
     */
    @Query("SELECT m FROM MarketSummary m WHERE m.date >= :cutoffDate ORDER BY m.date DESC")
    List<MarketSummary> findFromDate(@Param("cutoffDate") LocalDateTime cutoffDate);

    /**
     * Check if market summary exists for a date
     * @param date the date
     * @return true if exists, false otherwise
     */
    boolean existsByDate(LocalDateTime date);

    /**
     * Delete market summaries before a specific date (cleanup operation)
     * @param date cutoff date
     */
    @Modifying
    @Query("DELETE FROM MarketSummary m WHERE m.date < :date")
    void deleteByDateBefore(@Param("date") LocalDateTime date);
}

