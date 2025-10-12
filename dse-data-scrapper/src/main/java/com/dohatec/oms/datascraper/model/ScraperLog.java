package com.dohatec.oms.datascraper.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entity representing scraper execution logs
 * Maps to the 'scraper_log' table in the database
 * Exact mapping to database schema
 */
@Getter
@Setter
@Entity
@Table(name = "scraper_log")
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScraperLog {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "scraper_type", nullable = false)
    private String scraperType;

    @Column(name = "status", nullable = false)
    private String status;

    @Column(name = "companies_processed")
    private Integer companiesProcessed;

    @Column(name = "companies_failed")
    private Integer companiesFailed;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "host_ip")
    private String hostIp;

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (startedAt == null) {
            startedAt = LocalDateTime.now();
        }
        if (status == null) {
            status = "RUNNING";
        }
    }

    /**
     * Calculate and set duration when scraper completes
     */
    public void complete() {
        this.completedAt = LocalDateTime.now();
        if (this.startedAt != null) {
            this.durationSeconds = (int) java.time.Duration.between(startedAt, completedAt).getSeconds();
        }
    }

    @Override
    public String toString() {
        return "ScraperLog{" +
                "id=" + id +
                ", scraperType='" + scraperType + '\'' +
                ", status='" + status + '\'' +
                ", companiesProcessed=" + companiesProcessed +
                ", companiesFailed=" + companiesFailed +
                ", durationSeconds=" + durationSeconds +
                '}';
    }
}
