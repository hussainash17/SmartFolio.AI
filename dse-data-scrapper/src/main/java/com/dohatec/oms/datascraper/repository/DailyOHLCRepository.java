package com.dohatec.oms.datascraper.repository;

import com.dohatec.oms.datascraper.model.DailyOHLC;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository interface for DailyOHLC entity
 * Provides database operations for daily OHLC data
 */
@Repository
public interface DailyOHLCRepository extends JpaRepository<DailyOHLC, UUID> {

    /**
     * Find daily OHLC by company ID and date
     * @param companyId the company UUID
     * @param date the date
     * @return Optional containing the daily OHLC if found
     */
    Optional<DailyOHLC> findByCompanyIdAndDate(UUID companyId, LocalDateTime date);

    /**
     * Find all daily OHLC for a company
     * @param companyId the company UUID
     * @return list of daily OHLC
     */
    List<DailyOHLC> findByCompanyId(UUID companyId);

    /**
     * Find daily OHLC for a company ordered by date descending
     * @param companyId the company UUID
     * @return list of daily OHLC
     */
    List<DailyOHLC> findByCompanyIdOrderByDateDesc(UUID companyId);

    /**
     * Find daily OHLC for a date range
     * @param companyId the company UUID
     * @param startDate start date
     * @param endDate end date
     * @return list of daily OHLC
     */
    List<DailyOHLC> findByCompanyIdAndDateBetween(UUID companyId, LocalDateTime startDate, LocalDateTime endDate);

    /**
     * Find daily OHLC for a specific date (all companies)
     * @param date the date
     * @return list of daily OHLC
     */
    List<DailyOHLC> findByDate(LocalDateTime date);

    /**
     * Find daily OHLC for a date range (all companies)
     * @param startDate start date
     * @param endDate end date
     * @return list of daily OHLC
     */
    List<DailyOHLC> findByDateBetween(LocalDateTime startDate, LocalDateTime endDate);

    /**
     * Check if daily OHLC exists for a company and date
     * @param companyId the company UUID
     * @param date the date
     * @return true if exists, false otherwise
     */
    boolean existsByCompanyIdAndDate(UUID companyId, LocalDateTime date);

    /**
     * Get latest daily OHLC for a company
     * @param companyId the company UUID
     * @return Optional containing the latest daily OHLC
     */
    @Query("SELECT d FROM DailyOHLC d WHERE d.companyId = :companyId ORDER BY d.date DESC LIMIT 1")
    Optional<DailyOHLC> findLatestByCompanyId(@Param("companyId") UUID companyId);

    /**
     * Get latest N daily OHLC records for a company
     * @param companyId the company UUID
     * @param limit number of records
     * @return list of daily OHLC
     */
    @Query("SELECT d FROM DailyOHLC d WHERE d.companyId = :companyId ORDER BY d.date DESC LIMIT :limit")
    List<DailyOHLC> findLatestNByCompanyId(@Param("companyId") UUID companyId, @Param("limit") int limit);

    /**
     * Delete daily OHLC for a company and date
     * @param companyId the company UUID
     * @param date the date
     */
    void deleteByCompanyIdAndDate(UUID companyId, LocalDateTime date);
}

