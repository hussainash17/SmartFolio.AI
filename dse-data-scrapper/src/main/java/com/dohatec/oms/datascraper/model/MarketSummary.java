package com.dohatec.oms.datascraper.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entity representing overall market summary statistics
 * Maps to the 'marketsummary' table in the database
 * Exact mapping to database schema
 */
@Getter
@Setter
@Entity
@Table(name = "marketsummary")
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MarketSummary {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "date", nullable = false)
    private LocalDateTime date;

    @Column(name = "total_trades", nullable = false)
    private Integer totalTrades;

    @Column(name = "total_volume")
    private Long totalVolume;

    @Column(name = "total_turnover", nullable = false)
    private BigDecimal totalTurnover;

    @Column(name = "dse_index")
    private BigDecimal dseIndex;

    @Column(name = "dse_index_change")
    private BigDecimal dseIndexChange;

    @Column(name = "dse_index_change_percent")
    private BigDecimal dseIndexChangePercent;

    @Column(name = "cse_index")
    private BigDecimal cseIndex;

    @Column(name = "cse_index_change")
    private BigDecimal cseIndexChange;

    @Column(name = "cse_index_change_percent")
    private BigDecimal cseIndexChangePercent;

    @Column(name = "advancers", nullable = false)
    private Integer advancers;

    @Column(name = "decliners", nullable = false)
    private Integer decliners;

    @Column(name = "unchanged", nullable = false)
    private Integer unchanged;

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
        return "MarketSummary{" +
                "id=" + id +
                ", date=" + date +
                ", totalTrades=" + totalTrades +
                ", totalVolume=" + totalVolume +
                ", dseIndex=" + dseIndex +
                ", timestamp=" + timestamp +
                '}';
    }
}
