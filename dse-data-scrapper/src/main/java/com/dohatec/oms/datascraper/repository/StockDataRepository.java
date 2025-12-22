package com.dohatec.oms.datascraper.repository;

import com.dohatec.oms.datascraper.model.StockData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository interface for StockData entity
 * Provides database operations for real-time stock data
 */
@Repository
public interface StockDataRepository extends JpaRepository<StockData, UUID> {

    /**
     * Find stock data by company ID
     *
     * @param companyId the company UUID
     * @return Optional containing the stock data if found
     */
    Optional<StockData> findByCompanyId(UUID companyId);

    /**
     * Find all stock data
     *
     * @return list of stock data for all companies
     */
    List<StockData> findAll();

    /**
     * Find stock data updated after a specific timestamp
     *
     * @param timestamp the timestamp
     * @return list of stock data
     */
    List<StockData> findByTimestampAfter(LocalDateTime timestamp);

    /**
     * Find stock data by timestamp range
     *
     * @param startTime start timestamp
     * @param endTime   end timestamp
     * @return list of stock data
     */
    List<StockData> findByTimestampBetween(LocalDateTime startTime, LocalDateTime endTime);

    /**
     * Find stock data ordered by change percent descending (top gainers)
     *
     * @return list of stock data
     */
    @Query("SELECT s FROM StockData s ORDER BY s.changePercent DESC")
    List<StockData> findTopGainers();

    /**
     * Find stock data ordered by change percent ascending (top losers)
     *
     * @return list of stock data
     */
    @Query("SELECT s FROM StockData s ORDER BY s.changePercent ASC")
    List<StockData> findTopLosers();

    /**
     * Find stock data ordered by volume descending (most active)
     *
     * @return list of stock data
     */
    @Query("SELECT s FROM StockData s ORDER BY s.volume DESC")
    List<StockData> findMostActive();

    /**
     * Delete old stock data (cleanup operation)
     *
     * @param timestamp cutoff timestamp
     */
    @Modifying
    @Query("DELETE FROM StockData s WHERE s.timestamp < :timestamp")
    void deleteByTimestampBefore(@Param("timestamp") LocalDateTime timestamp);

    /**
     * Check if stock data exists for a company
     *
     * @param companyId the company UUID
     * @return true if exists, false otherwise
     */
    boolean existsByCompanyId(UUID companyId);

    /**
     * Count stock data records
     *
     * @return count of records
     */
    long count();

    /**
     * Find latest stock data for a company by timestamp
     */
    Optional<StockData> findTopByCompanyIdOrderByTimestampDesc(UUID companyId);

    /**
     * Find stock data with null open price
     * Used by OpenPriceScraper to identify stocks needing open price update
     *
     * @return list of stock data with null open price
     */
    @Query("SELECT s FROM StockData s WHERE s.openPrice IS NULL")
    List<StockData> findByOpenPriceIsNull();

    /**
     * Find stock data by trading date or null trading date
     *
     * @param tradingDate the trading date
     * @return list of stock data
     */
    @Query("SELECT sd FROM StockData sd WHERE sd.tradingDate = :tradingDate OR sd.tradingDate IS NULL")
    List<StockData> findByTradingDate(@Param("tradingDate") LocalDate tradingDate);

    /**
     * Find stock data by trading date where open price is null
     *
     * @param tradingDate the trading date
     * @return list of stock data
     */
    List<StockData> findByTradingDateAndOpenPriceIsNull(java.time.LocalDate tradingDate);

    /**
     * Find stock data by trading date and updated before a specific time
     *
     * @param tradingDate   the trading date
     * @param updatedBefore timestamp to compare against
     * @return list of stock data
     */
    @Query("SELECT sd FROM StockData sd WHERE " +
            "(sd.tradingDate = :tradingDate OR sd.tradingDate IS NULL) AND " +
            "(sd.updatedAt < :updatedBefore OR sd.updatedAt IS NULL)")
    List<StockData> findByTradingDateAndUpdatedAtBefore(
            @Param("tradingDate") LocalDate tradingDate,
            @Param("updatedBefore") LocalDateTime updatedBefore);
}
