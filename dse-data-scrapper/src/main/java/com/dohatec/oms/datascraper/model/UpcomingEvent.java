package com.dohatec.oms.datascraper.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.time.ZonedDateTime;
import java.util.UUID;

/**
 * Entity representing Upcoming Events from StockNow API
 * Maps to the 'upcoming_events' table in the database
 */
@Getter
@Setter
@Entity
@Table(name = "upcoming_events")
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpcomingEvent {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "code", nullable = false)
    private String code;

    @Column(name = "post_date")
    private ZonedDateTime postDate;

    @Column(name = "timestamp")
    private Long timestamp;

    @Column(name = "date")
    private String date;

    @Column(name = "time")
    private String time;

    @Column(name = "type")
    private String type;

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
}
