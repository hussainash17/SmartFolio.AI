package com.dohatec.oms.datascraper.repository;

import com.dohatec.oms.datascraper.model.Company;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository interface for Company entity
 * Provides database operations for company data
 */
@Repository
public interface CompanyRepository extends JpaRepository<Company, UUID> {

    /**
     * Find company by trading code
     * @param tradingCode the trading code
     * @return Optional containing the company if found
     */
    Optional<Company> findByTradingCode(String tradingCode);

    /**
     * Find company by trading code (case-insensitive)
     * @param tradingCode the trading code
     * @return Optional containing the company if found
     */
    Optional<Company> findByTradingCodeIgnoreCase(String tradingCode);

    /**
     * Check if a company exists by trading code
     * @param tradingCode the trading code
     * @return true if exists, false otherwise
     */
    boolean existsByTradingCode(String tradingCode);

    /**
     * Find all active companies
     * @return list of active companies
     */
    List<Company> findByIsActiveTrue();

    /**
     * Find all inactive companies
     * @return list of inactive companies
     */
    List<Company> findByIsActiveFalse();

    /**
     * Find companies by sector
     * @param sector the sector name
     * @return list of companies in the sector
     */
    List<Company> findBySector(String sector);

    /**
     * Find companies by market category
     * @param marketCategory the market category
     * @return list of companies
     */
    List<Company> findByMarketCategory(String marketCategory);

    /**
     * Get all trading codes for active companies
     * @return list of all trading codes
     */
    @Query("SELECT c.tradingCode FROM Company c WHERE c.isActive = true")
    List<String> findAllActiveTradingCodes();

    /**
     * Get company ID by trading code
     * @param tradingCode the trading code
     * @return Optional containing the UUID if found
     */
    @Query("SELECT c.id FROM Company c WHERE c.tradingCode = :tradingCode")
    Optional<UUID> findIdByTradingCode(@Param("tradingCode") String tradingCode);

    /**
     * Count active companies
     * @return count of active companies
     */
    long countByIsActiveTrue();

    /**
     * Find companies by sector and active status
     * @param sector the sector
     * @param isActive active status
     * @return list of companies
     */
    List<Company> findBySectorAndIsActive(String sector, Boolean isActive);
}

