package com.dohatec.oms.datascraper.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entity representing loan status for a company
 * Maps to the 'loan_status' table in the database
 * Exact mapping to database schema
 */
@Getter
@Setter
@Entity
@Table(name = "loan_status")
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoanStatus {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "company_id", nullable = false)
    private UUID companyId;

    @Column(name = "short_term_loan")
    private BigDecimal shortTermLoan;

    @Column(name = "long_term_loan")
    private BigDecimal longTermLoan;

    @Column(name = "total_loan")
    private BigDecimal totalLoan;

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
        calculateTotalLoan();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
        calculateTotalLoan();
    }

    private void calculateTotalLoan() {
        BigDecimal shortTerm = shortTermLoan != null ? shortTermLoan : BigDecimal.ZERO;
        BigDecimal longTerm = longTermLoan != null ? longTermLoan : BigDecimal.ZERO;
        this.totalLoan = shortTerm.add(longTerm);
    }

    @Override
    public String toString() {
        return "LoanStatus{" +
                "id=" + id +
                ", companyId=" + companyId +
                ", shortTermLoan=" + shortTermLoan +
                ", longTermLoan=" + longTermLoan +
                ", totalLoan=" + totalLoan +
                '}';
    }
}
