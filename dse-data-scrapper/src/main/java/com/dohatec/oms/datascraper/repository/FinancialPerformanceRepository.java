package com.dohatec.oms.datascraper.repository;

import com.dohatec.oms.datascraper.model.FinancialPerformance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository interface for FinancialPerformance entity
 * Provides database operations for financial performance data
 */
@Repository
public interface FinancialPerformanceRepository extends JpaRepository<FinancialPerformance, UUID> {

    /**
     * Find financial performance by company ID and year
     * @param companyId the company UUID
     * @param year the year
     * @return Optional containing the financial performance if found
     */
    Optional<FinancialPerformance> findByCompanyIdAndYear(UUID companyId, Integer year);

    /**
     * Find all financial performance for a company
     * @param companyId the company UUID
     * @return list of financial performance
     */
    List<FinancialPerformance> findByCompanyId(UUID companyId);

    /**
     * Find all financial performance for a company ordered by year descending
     * @param companyId the company UUID
     * @return list of financial performance
     */
    List<FinancialPerformance> findByCompanyIdOrderByYearDesc(UUID companyId);

    /**
     * Find financial performance for a year range
     * @param companyId the company UUID
     * @param startYear start year
     * @param endYear end year
     * @return list of financial performance
     */
    @Query("SELECT f FROM FinancialPerformance f WHERE f.companyId = :companyId AND f.year BETWEEN :startYear AND :endYear ORDER BY f.year DESC")
    List<FinancialPerformance> findByCompanyIdAndYearBetween(
        @Param("companyId") UUID companyId,
        @Param("startYear") Integer startYear,
        @Param("endYear") Integer endYear
    );

    /**
     * Find financial performance for a specific year (all companies)
     * @param year the year
     * @return list of financial performance
     */
    List<FinancialPerformance> findByYear(Integer year);

    /**
     * Get latest financial performance for a company
     * @param companyId the company UUID
     * @return Optional containing the latest financial performance
     */
    @Query("SELECT f FROM FinancialPerformance f WHERE f.companyId = :companyId ORDER BY f.year DESC LIMIT 1")
    Optional<FinancialPerformance> findLatestByCompanyId(@Param("companyId") UUID companyId);

    /**
     * Get latest N years of financial performance for a company
     * @param companyId the company UUID
     * @param limit number of years
     * @return list of financial performance
     */
    @Query("SELECT f FROM FinancialPerformance f WHERE f.companyId = :companyId ORDER BY f.year DESC LIMIT :limit")
    List<FinancialPerformance> findLatestNByCompanyId(@Param("companyId") UUID companyId, @Param("limit") int limit);

    /**
     * Find companies with positive profit for a year
     * @param year the year
     * @return list of financial performance
     */
    @Query("SELECT f FROM FinancialPerformance f WHERE f.year = :year AND f.profit IS NOT NULL AND f.profit > 0")
    List<FinancialPerformance> findProfitableCompaniesForYear(@Param("year") Integer year);

    /**
     * Check if financial performance exists for a company and year
     * @param companyId the company UUID
     * @param year the year
     * @return true if exists, false otherwise
     */
    boolean existsByCompanyIdAndYear(UUID companyId, Integer year);

    /**
     * Delete financial performance for a company and year
     * @param companyId the company UUID
     * @param year the year
     */
    void deleteByCompanyIdAndYear(UUID companyId, Integer year);
}

