package com.dohatec.oms.datascraper.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entity representing quarterly performance metrics for a company
 * Maps to the 'quarterly_performance' table in the database
 * Exact mapping to database schema
 */
@Getter
@Setter
@Entity
@Table(name = "quarterly_performance")
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuarterlyPerformance {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "company_id", nullable = false)
    private UUID companyId;

    @Column(name = "quarter", nullable = false)
    private String quarter;

    @Column(name = "date", nullable = false)
    private LocalDate date;

    @Column(name = "eps_basic")
    private BigDecimal epsBasic;

    @Column(name = "eps_diluted")
    private BigDecimal epsDiluted;

    @Column(name = "market_price_end_period")
    private BigDecimal marketPriceEndPeriod;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (updatedAt == null) {
            updatedAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    @Override
    public String toString() {
        return "QuarterlyPerformance{" +
                "id=" + id +
                ", companyId=" + companyId +
                ", quarter='" + quarter + '\'' +
                ", date=" + date +
                ", epsBasic=" + epsBasic +
                '}';
    }
}
