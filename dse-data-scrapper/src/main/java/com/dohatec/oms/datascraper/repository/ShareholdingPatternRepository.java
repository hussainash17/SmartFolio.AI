package com.dohatec.oms.datascraper.repository;

import com.dohatec.oms.datascraper.model.ShareholdingPattern;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository interface for ShareholdingPattern entity
 * Provides database operations for shareholding pattern data
 */
@Repository
public interface ShareholdingPatternRepository extends JpaRepository<ShareholdingPattern, UUID> {

    /**
     * Find shareholding pattern by company ID and date
     * @param companyId the company UUID
     * @param date the date
     * @return Optional containing the shareholding pattern if found
     */
    Optional<ShareholdingPattern> findByCompanyIdAndDate(UUID companyId, LocalDate date);

    /**
     * Find all shareholding patterns for a company
     * @param companyId the company UUID
     * @return list of shareholding patterns
     */
    List<ShareholdingPattern> findByCompanyId(UUID companyId);

    /**
     * Find all shareholding patterns for a company ordered by date descending
     * @param companyId the company UUID
     * @return list of shareholding patterns
     */
    List<ShareholdingPattern> findByCompanyIdOrderByDateDesc(UUID companyId);

    /**
     * Find shareholding patterns for a date range
     * @param companyId the company UUID
     * @param startDate start date
     * @param endDate end date
     * @return list of shareholding patterns
     */
    List<ShareholdingPattern> findByCompanyIdAndDateBetween(UUID companyId, LocalDate startDate, LocalDate endDate);

    /**
     * Find shareholding patterns for a specific date (all companies)
     * @param date the date
     * @return list of shareholding patterns
     */
    List<ShareholdingPattern> findByDate(LocalDate date);

    /**
     * Check if shareholding pattern exists for a company and date
     * @param companyId the company UUID
     * @param date the date
     * @return true if exists, false otherwise
     */
    boolean existsByCompanyIdAndDate(UUID companyId, LocalDate date);

    /**
     * Get latest shareholding pattern for a company
     * @param companyId the company UUID
     * @return Optional containing the latest shareholding pattern
     */
    @Query("SELECT s FROM ShareholdingPattern s WHERE s.companyId = :companyId ORDER BY s.date DESC LIMIT 1")
    Optional<ShareholdingPattern> findLatestByCompanyId(@Param("companyId") UUID companyId);

    /**
     * Get latest N shareholding patterns for a company
     * @param companyId the company UUID
     * @param limit number of records
     * @return list of shareholding patterns
     */
    @Query("SELECT s FROM ShareholdingPattern s WHERE s.companyId = :companyId ORDER BY s.date DESC LIMIT :limit")
    List<ShareholdingPattern> findLatestNByCompanyId(@Param("companyId") UUID companyId, @Param("limit") int limit);

    /**
     * Delete shareholding pattern for a company and date
     * @param companyId the company UUID
     * @param date the date
     */
    void deleteByCompanyIdAndDate(UUID companyId, LocalDate date);
}

