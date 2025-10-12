package com.dohatec.oms.datascraper.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entity representing shareholding pattern for a company
 * Maps to the 'shareholding_pattern' table in the database
 * Exact mapping to database schema
 */
@Getter
@Setter
@Entity
@Table(name = "shareholding_pattern")
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShareholdingPattern {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "company_id", nullable = false)
    private UUID companyId;

    @Column(name = "date", nullable = false)
    private LocalDate date;

    @Column(name = "sponsor_director")
    private BigDecimal sponsorDirector;

    @Column(name = "government")
    private BigDecimal government;

    @Column(name = "institute")
    private BigDecimal institute;

    @Column(name = "foreign_holder")
    private BigDecimal foreignHolder;

    @Column(name = "public_holder")
    private BigDecimal publicHolder;

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
        return "ShareholdingPattern{" +
                "id=" + id +
                ", companyId=" + companyId +
                ", date=" + date +
                ", sponsorDirector=" + sponsorDirector +
                ", government=" + government +
                '}';
    }
}
