package com.dohatec.oms.datascraper.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entity representing financial performance metrics for a company
 * Maps to the 'financial_performance' table in the database
 * Exact mapping to database schema
 */
@Getter
@Setter
@Entity
@Table(name = "financial_performance")
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FinancialPerformance {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "company_id", nullable = false)
    private UUID companyId;

    @Column(name = "year", nullable = false)
    private Integer year;

    @Column(name = "eps_basic")
    private BigDecimal epsBasic;

    @Column(name = "eps_diluted")
    private BigDecimal epsDiluted;

    @Column(name = "nav_per_share")
    private BigDecimal navPerShare;

    @Column(name = "profit")
    private BigDecimal profit;

    @Column(name = "total_comprehensive_income")
    private BigDecimal totalComprehensiveIncome;

    @Column(name = "pe_ratio")
    private BigDecimal peRatio;

    @Column(name = "pb_ratio")
    private BigDecimal pbRatio;

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
        return "FinancialPerformance{" +
                "id=" + id +
                ", companyId=" + companyId +
                ", year=" + year +
                ", epsBasic=" + epsBasic +
                ", navPerShare=" + navPerShare +
                '}';
    }
}
