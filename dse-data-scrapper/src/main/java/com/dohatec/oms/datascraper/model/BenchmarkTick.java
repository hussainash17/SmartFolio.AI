package com.dohatec.oms.datascraper.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.GenericGenerator;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "benchmark_tick")
public class BenchmarkTick {

    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "benchmark_id", nullable = false)
    private String benchmarkId;

    @Column(name = "tick_time", nullable = false)
    private OffsetDateTime tickTime;

    @Column(name = "value", nullable = false)
    private BigDecimal value;

    @Column(name = "volume_delta", nullable = false)
    private Long volumeDelta;

    @Column(name = "turnover_delta", nullable = false)
    private BigDecimal turnoverDelta;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }
}
