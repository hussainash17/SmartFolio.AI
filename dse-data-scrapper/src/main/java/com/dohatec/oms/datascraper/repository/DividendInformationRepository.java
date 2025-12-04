package com.dohatec.oms.datascraper.repository;

import com.dohatec.oms.datascraper.model.DividendInformation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Repository interface for DividendInformation entity
 * Provides database operations for dividend data
 */
@Repository
public interface DividendInformationRepository extends JpaRepository<DividendInformation, UUID> {

    /**
     * Find dividend information by company ID and year
     * 
     * @param companyId the company UUID
     * @param year      the year
     * @return Optional containing the dividend information if found
     */
    Optional<DividendInformation> findByCompanyIdAndYear(UUID companyId, Integer year);

    /**
     * Find top dividend information for a company ordered by year descending
     * 
     * @param companyId the company UUID
     * @return Optional containing the latest dividend information
     */
    Optional<DividendInformation> findTopByCompanyIdOrderByYearDesc(UUID companyId);

    /**
     * Find all dividend information for a company
     * 
     * @param companyId the company UUID
     * @return list of dividend information
     */
    List<DividendInformation> findByCompanyId(UUID companyId);

    /**
     * Find all dividend information for a company ordered by year descending
     * 
     * @param companyId the company UUID
     * @return list of dividend information
     */
    List<DividendInformation> findByCompanyIdOrderByYearDesc(UUID companyId);

    /**
     * Find dividend information for a company and specific years
     * 
     * @param companyId the company UUID
     * @param years     set of years
     * @return list of dividend information
     */
    List<DividendInformation> findByCompanyIdAndYearIn(UUID companyId, Set<Integer> years);

    /**
     * Find dividend information for a year range
     * 
     * @param companyId the company UUID
     * @param startYear start year
     * @param endYear   end year
     * @return list of dividend information
     */
    @Query("SELECT d FROM DividendInformation d WHERE d.companyId = :companyId AND d.year BETWEEN :startYear AND :endYear ORDER BY d.year DESC")
    List<DividendInformation> findByCompanyIdAndYearBetween(
            @Param("companyId") UUID companyId,
            @Param("startYear") Integer startYear,
            @Param("endYear") Integer endYear);

    /**
     * Find dividend information for a specific year (all companies)
     * 
     * @param year the year
     * @return list of dividend information
     */
    List<DividendInformation> findByYear(Integer year);

    /**
     * Find companies that paid cash dividend in a year
     * 
     * @param year the year
     * @return list of dividend information
     */
    @Query("SELECT d FROM DividendInformation d WHERE d.year = :year AND d.cashDividend IS NOT NULL AND d.cashDividend > 0")
    List<DividendInformation> findCashDividendPayersForYear(@Param("year") Integer year);

    /**
     * Check if dividend information exists for a company and year
     * 
     * @param companyId the company UUID
     * @param year      the year
     * @return true if exists, false otherwise
     */
    boolean existsByCompanyIdAndYear(UUID companyId, Integer year);

    /**
     * Delete dividend information for a company and year
     * 
     * @param companyId the company UUID
     * @param year      the year
     */
    void deleteByCompanyIdAndYear(UUID companyId, Integer year);
}
