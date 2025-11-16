package com.dohatec.oms.datascraper.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "benchmark_data",
        uniqueConstraints = @UniqueConstraint(columnNames = {"benchmark_id", "date"}))
public class BenchmarkData {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(nullable = false, updatable = false)
    private Integer id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "benchmark_id", nullable = false)
    private Benchmark benchmark;

    @Column(nullable = false)
    private LocalDate date;

    @Column(name = "open_value")
    private BigDecimal openValue;
    @Column(name = "high_value")
    private BigDecimal highValue;
    @Column(name = "low_value")
    private BigDecimal lowValue;
    @Column(name = "close_value", nullable = false)
    private BigDecimal closeValue;
    @Column(name = "volume")
    private Long volume;
    @Column(name = "trades")
    private Long trades;
    @Column(name = "total_value")
    private BigDecimal totalValue;

    @Column(name = "daily_return")
    private BigDecimal dailyReturn;

    @Column(name = "cumulative_return")
    private BigDecimal cumulativeReturn;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }
}

