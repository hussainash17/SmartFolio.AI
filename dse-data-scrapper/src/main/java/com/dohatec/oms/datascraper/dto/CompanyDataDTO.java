package com.dohatec.oms.datascraper.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * DTO for company fundamental data scraped from DSE
 * Used for transferring parsed company data between layers
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompanyDataDTO {
    private String tradingCode;
    private String companyName;
    
    // All parsed data as key-value pairs
    private Map<String, String> dataMap;
    
    // Parsing metadata
    private int tablesProcessed;
    private boolean success;
    private String errorMessage;
}

