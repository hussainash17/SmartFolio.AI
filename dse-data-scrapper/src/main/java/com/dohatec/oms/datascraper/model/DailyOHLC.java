package com.dohatec.oms.datascraper.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entity representing daily OHLC (Open, High, Low, Close) data for a company
 * Maps to the 'dailyohlc' table in the database
 * Exact mapping to database schema
 */
@Getter
@Setter
@Entity
@Table(name = "dailyohlc")
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DailyOHLC {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "company_id")
    private UUID companyId;

    @Column(name = "date", nullable = false)
    private LocalDateTime date;

    @Column(name = "open_price", nullable = false)
    private BigDecimal openPrice;

    @Column(name = "high", nullable = false)
    private BigDecimal high;

    @Column(name = "low", nullable = false)
    private BigDecimal low;

    @Column(name = "close_price", nullable = false)
    private BigDecimal closePrice;

    @Column(name = "volume")
    private Long volume;

    @Column(name = "turnover", nullable = false)
    private BigDecimal turnover;

    @Column(name = "trades_count", nullable = false)
    private Integer tradesCount;

    @Column(name = "change", nullable = false)
    private BigDecimal change;

    @Column(name = "change_percent", nullable = false)
    private BigDecimal changePercent;

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = UUID.randomUUID();
        }
    }

    @Override
    public String toString() {
        return "DailyOHLC{" +
                "id=" + id +
                ", companyId=" + companyId +
                ", date=" + date +
                ", openPrice=" + openPrice +
                ", high=" + high +
                ", low=" + low +
                ", closePrice=" + closePrice +
                '}';
    }
}
