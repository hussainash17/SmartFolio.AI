package com.dohatec.oms.datascraper.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "stocknews")
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockNews {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "news_id", nullable = false)
    private UUID newsId;

    @Column(name = "stock_id", nullable = false)
    private UUID stockId; // references company.id

    @Column(name = "relevance_score")
    private BigDecimal relevanceScore;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}