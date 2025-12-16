package com.dohatec.oms.datascraper.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entity representing real-time stock data snapshot
 * Maps to the 'stockdata' table in the database
 * Exact mapping to database schema
 */
@Getter
@Setter
@Entity
@Table(name = "stockdata")
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockData {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "company_id")
    private UUID companyId;

    @Column(name = "last_trade_price", nullable = false)
    private BigDecimal lastTradePrice;

    @Column(name = "change", nullable = false)
    private BigDecimal change;

    @Column(name = "change_percent", nullable = false)
    private BigDecimal changePercent;

    @Column(name = "high", nullable = false)
    private BigDecimal high;

    @Column(name = "low", nullable = false)
    private BigDecimal low;

    @Column(name = "open_price", nullable = false)
    private BigDecimal openPrice;

    @Column(name = "previous_close", nullable = false)
    private BigDecimal previousClose;

    @Column(name = "closed_price", nullable = false)
    private BigDecimal closedPrice;

    @Column(name = "volume")
    private Long volume;

    @Column(name = "turnover", nullable = false)
    private BigDecimal turnover;

    @Column(name = "trades_count", nullable = false)
    private Integer tradesCount;

    @Column(name = "market_cap")
    private BigDecimal marketCap;

    @Column(name = "timestamp", nullable = false)
    private LocalDateTime timestamp;

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (timestamp == null) {
            timestamp = LocalDateTime.now();
        }
    }

    @Override
    public String toString() {
        return "StockData{" +
                "id=" + id +
                ", companyId=" + companyId +
                ", lastTradePrice=" + lastTradePrice +
                ", change=" + change +
                ", changePercent=" + changePercent +
                ", timestamp=" + timestamp +
                '}';
    }
}
