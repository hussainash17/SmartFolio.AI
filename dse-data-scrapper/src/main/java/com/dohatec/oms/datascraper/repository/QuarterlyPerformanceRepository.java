package com.dohatec.oms.datascraper.repository;

import com.dohatec.oms.datascraper.model.QuarterlyPerformance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository interface for QuarterlyPerformance entity
 * Provides database operations for quarterly performance data
 */
@Repository
public interface QuarterlyPerformanceRepository extends JpaRepository<QuarterlyPerformance, UUID> {

    /**
     * Find quarterly performance by company ID, quarter, and date
     * @param companyId the company UUID
     * @param date the date
     * @param quarter the quarter
     * @return Optional containing the quarterly performance if found
     */
    Optional<QuarterlyPerformance> findByCompanyIdAndDateAndQuarter(UUID companyId, LocalDate date, String quarter);

    /**
     * Find all quarterly performance for a company
     * @param companyId the company UUID
     * @return list of quarterly performance
     */
    List<QuarterlyPerformance> findByCompanyId(UUID companyId);

    /**
     * Find all quarterly performance for a company ordered by date descending
     * @param companyId the company UUID
     * @return list of quarterly performance
     */
    List<QuarterlyPerformance> findByCompanyIdOrderByDateDesc(UUID companyId);

    /**
     * Find quarterly performance for a specific quarter
     * @param companyId the company UUID
     * @param quarter the quarter (e.g., "Q1", "Q2", "Half Yearly")
     * @return list of quarterly performance
     */
    List<QuarterlyPerformance> findByCompanyIdAndQuarter(UUID companyId, String quarter);

    /**
     * Find quarterly performance for a date range
     * @param companyId the company UUID
     * @param startDate start date
     * @param endDate end date
     * @return list of quarterly performance
     */
    List<QuarterlyPerformance> findByCompanyIdAndDateBetween(UUID companyId, LocalDate startDate, LocalDate endDate);

    /**
     * Find quarterly performance by quarter for all companies
     * @param quarter the quarter
     * @return list of quarterly performance
     */
    List<QuarterlyPerformance> findByQuarter(String quarter);

    /**
     * Find quarterly performance by date for all companies
     * @param date the date
     * @return list of quarterly performance
     */
    List<QuarterlyPerformance> findByDate(LocalDate date);

    /**
     * Check if quarterly performance exists
     * @param companyId the company UUID
     * @param date the date
     * @param quarter the quarter
     * @return true if exists, false otherwise
     */
    boolean existsByCompanyIdAndDateAndQuarter(UUID companyId, LocalDate date, String quarter);

    /**
     * Get latest quarterly performance for a company
     * @param companyId the company UUID
     * @return Optional containing the latest quarterly performance
     */
    @Query("SELECT q FROM QuarterlyPerformance q WHERE q.companyId = :companyId ORDER BY q.date DESC LIMIT 1")
    Optional<QuarterlyPerformance> findLatestByCompanyId(@Param("companyId") UUID companyId);

    /**
     * Get latest N quarterly performance records for a company
     * @param companyId the company UUID
     * @param limit number of records
     * @return list of quarterly performance
     */
    @Query("SELECT q FROM QuarterlyPerformance q WHERE q.companyId = :companyId ORDER BY q.date DESC LIMIT :limit")
    List<QuarterlyPerformance> findLatestNByCompanyId(@Param("companyId") UUID companyId, @Param("limit") int limit);
}

