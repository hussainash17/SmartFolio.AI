package com.dohatec.oms.datascraper.model;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "news")
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class News {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "title")
    private String title;

    @Column(name = "content")
    private String content;

    @Column(name = "summary")
    private String summary;

    @Column(name = "source")
    private String source;

    @Column(name = "source_url")
    private String sourceUrl;

    @Column(name = "author")
    private String author;

    @Column(name = "category")
    private String category;

    // Stored as JSON in DB; keep as String in entity for simplicity
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "tags")
    private String tags;

    @Column(name = "sentiment")
    private String sentiment;

    @Column(name = "sentiment_score")
    private BigDecimal sentimentScore;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    @Column(name = "is_active")
    private Boolean isActive;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
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
        if (isActive == null) {
            isActive = true;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}