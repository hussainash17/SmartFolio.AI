package com.dohatec.oms.datascraper.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

/**
 * Entity representing a benchmark or index instrument.
 * Maps to the 'benchmarks' table.
 */
@Getter
@Setter
@Entity
@Table(name = "benchmarks")
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Benchmark {

    @Id
    @Column(name = "id", nullable = false, length = 64)
    private String id;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "ticker", length = 64)
    private String ticker;

    @Column(name = "description")
    private String description;

    @Column(name = "asset_class")
    private String assetClass;

    @Column(name = "region")
    private String region;

    @Column(name = "data_source")
    private String dataSource;

    @Column(name = "is_active")
    private Boolean active;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
        if (active == null) {
            active = true;
        }
    }
}

