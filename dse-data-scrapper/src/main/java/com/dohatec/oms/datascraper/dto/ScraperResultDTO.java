package com.dohatec.oms.datascraper.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * DTO for scraper execution result
 * Used to track scraper performance and errors
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScraperResultDTO {
    private String scraperType;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private Integer totalProcessed;
    private Integer successCount;
    private Integer failureCount;
    private List<String> errors;
    private boolean success;
    
    public void addError(String error) {
        if (this.errors == null) {
            this.errors = new ArrayList<>();
        }
        this.errors.add(error);
    }
    
    public Long getDurationSeconds() {
        if (startTime != null && endTime != null) {
            return java.time.Duration.between(startTime, endTime).getSeconds();
        }
        return null;
    }
}

