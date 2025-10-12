package com.dohatec.oms.datascraper.repository;

import com.dohatec.oms.datascraper.model.LoanStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository interface for LoanStatus entity
 * Provides database operations for loan status data
 */
@Repository
public interface LoanStatusRepository extends JpaRepository<LoanStatus, UUID> {

    /**
     * Find loan status by company ID
     * @param companyId the company UUID
     * @return Optional containing the loan status if found
     */
    Optional<LoanStatus> findByCompanyId(UUID companyId);

    /**
     * Check if loan status exists for a company
     * @param companyId the company UUID
     * @return true if exists, false otherwise
     */
    boolean existsByCompanyId(UUID companyId);

    /**
     * Find companies with total loan greater than a threshold
     * @param threshold the threshold amount
     * @return list of loan status
     */
    @Query("SELECT l FROM LoanStatus l WHERE l.totalLoan > :threshold ORDER BY l.totalLoan DESC")
    List<LoanStatus> findByTotalLoanGreaterThan(@Param("threshold") BigDecimal threshold);

    /**
     * Find companies with short term loan greater than a threshold
     * @param threshold the threshold amount
     * @return list of loan status
     */
    @Query("SELECT l FROM LoanStatus l WHERE l.shortTermLoan > :threshold ORDER BY l.shortTermLoan DESC")
    List<LoanStatus> findByShortTermLoanGreaterThan(@Param("threshold") BigDecimal threshold);

    /**
     * Find companies with long term loan greater than a threshold
     * @param threshold the threshold amount
     * @return list of loan status
     */
    @Query("SELECT l FROM LoanStatus l WHERE l.longTermLoan > :threshold ORDER BY l.longTermLoan DESC")
    List<LoanStatus> findByLongTermLoanGreaterThan(@Param("threshold") BigDecimal threshold);

    /**
     * Find companies with any non-zero loan
     * @return list of loan status
     */
    @Query("SELECT l FROM LoanStatus l WHERE l.totalLoan IS NOT NULL AND l.totalLoan > 0")
    List<LoanStatus> findCompaniesWithLoans();

    /**
     * Find companies with no loans
     * @return list of loan status
     */
    @Query("SELECT l FROM LoanStatus l WHERE l.totalLoan IS NULL OR l.totalLoan = 0")
    List<LoanStatus> findCompaniesWithoutLoans();

    /**
     * Get top N companies by total loan
     * @param limit number of companies
     * @return list of loan status
     */
    @Query("SELECT l FROM LoanStatus l ORDER BY l.totalLoan DESC LIMIT :limit")
    List<LoanStatus> findTopByTotalLoan(@Param("limit") int limit);

    /**
     * Delete loan status for a company
     * @param companyId the company UUID
     */
    void deleteByCompanyId(UUID companyId);
}

