package com.dohatec.oms.datascraper.repository;

import com.dohatec.oms.datascraper.model.IntradayTick;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Repository interface for IntradayTick entity
 * Provides database operations for intraday tick data
 */
@Repository
public interface IntradayTickRepository extends JpaRepository<IntradayTick, UUID> {

    /**
     * Find intraday ticks by company ID
     * @param companyId the company UUID
     * @return list of intraday ticks
     */
    List<IntradayTick> findByCompanyId(UUID companyId);

    /**
     * Find intraday ticks by company ID for a specific date range
     * @param companyId the company UUID
     * @param startTime start timestamp
     * @param endTime end timestamp
     * @return list of intraday ticks ordered by timestamp
     */
    List<IntradayTick> findByCompanyIdAndTimestampBetweenOrderByTimestampAsc(
        UUID companyId,
        LocalDateTime startTime,
        LocalDateTime endTime
    );

    /**
     * Find intraday ticks for a timestamp range (all companies)
     * @param startTime start timestamp
     * @param endTime end timestamp
     * @return list of intraday ticks
     */
    List<IntradayTick> findByTimestampBetween(LocalDateTime startTime, LocalDateTime endTime);

    /**
     * Find intraday ticks by company ID ordered by timestamp descending
     * @param companyId the company UUID
     * @return list of intraday ticks
     */
    List<IntradayTick> findByCompanyIdOrderByTimestampDesc(UUID companyId);

    /**
     * Get latest intraday tick for a company
     * @param companyId the company UUID
     * @return list with single element (latest tick)
     */
    @Query("SELECT i FROM IntradayTick i WHERE i.companyId = :companyId ORDER BY i.timestamp DESC LIMIT 1")
    List<IntradayTick> findLatestByCompanyId(@Param("companyId") UUID companyId);

    /**
     * Get latest N ticks for a company
     * @param companyId the company UUID
     * @param limit number of ticks
     * @return list of latest ticks
     */
    @Query("SELECT i FROM IntradayTick i WHERE i.companyId = :companyId ORDER BY i.timestamp DESC LIMIT :limit")
    List<IntradayTick> findLatestNByCompanyId(@Param("companyId") UUID companyId, @Param("limit") int limit);

    /**
     * Count intraday ticks for a company
     * @param companyId the company UUID
     * @return count of ticks
     */
    long countByCompanyId(UUID companyId);

    /**
     * Count intraday ticks for a date range
     * @param startTime start timestamp
     * @param endTime end timestamp
     * @return count of ticks
     */
    long countByTimestampBetween(LocalDateTime startTime, LocalDateTime endTime);

    /**
     * Delete old intraday ticks (cleanup operation)
     * @param timestamp cutoff timestamp
     */
    @Modifying
    @Query("DELETE FROM IntradayTick i WHERE i.timestamp < :timestamp")
    void deleteByTimestampBefore(@Param("timestamp") LocalDateTime timestamp);

    /**
     * Delete intraday ticks for a specific company
     * @param companyId the company UUID
     */
    @Modifying
    void deleteByCompanyId(UUID companyId);
}

