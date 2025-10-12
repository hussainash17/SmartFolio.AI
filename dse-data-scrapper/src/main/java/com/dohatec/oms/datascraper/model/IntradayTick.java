package com.dohatec.oms.datascraper.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entity representing intraday tick data for a company
 * Maps to the 'intradaytick' table in the database
 * Exact mapping to database schema
 */
@Getter
@Setter
@Entity
@Table(name = "intradaytick")
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IntradayTick {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "company_id")
    private UUID companyId;

    @Column(name = "price", nullable = false)
    private BigDecimal price;

    @Column(name = "volume")
    private Long volume;

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
        return "IntradayTick{" +
                "id=" + id +
                ", companyId=" + companyId +
                ", price=" + price +
                ", volume=" + volume +
                ", timestamp=" + timestamp +
                '}';
    }
}
