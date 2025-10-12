package com.dohatec.oms.datascraper.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entity representing dividend information for a company
 * Maps to the 'dividend_information' table in the database
 * Exact mapping to database schema
 */
@Getter
@Setter
@Entity
@Table(name = "dividend_information")
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DividendInformation {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "company_id", nullable = false)
    private UUID companyId;

    @Column(name = "year", nullable = false)
    private Integer year;

    @Column(name = "cash_dividend")
    private BigDecimal cashDividend;

    @Column(name = "stock_dividend")
    private String stockDividend;

    @Column(name = "right_issue")
    private String rightIssue;

    @Column(name = "nav")
    private BigDecimal nav;

    @Column(name = "yield_percentage")
    private BigDecimal yieldPercentage;

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
        return "DividendInformation{" +
                "id=" + id +
                ", companyId=" + companyId +
                ", year=" + year +
                ", cashDividend=" + cashDividend +
                ", stockDividend='" + stockDividend + '\'' +
                '}';
    }
}
