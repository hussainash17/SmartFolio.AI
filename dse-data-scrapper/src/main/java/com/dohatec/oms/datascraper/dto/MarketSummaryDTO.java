package com.dohatec.oms.datascraper.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO for market summary data
 * Contains aggregated market statistics
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MarketSummaryDTO {
    private Integer totalTrades;
    private Long totalVolume;
    private BigDecimal totalTurnover;
    
    private BigDecimal dseIndex;
    private BigDecimal dseIndexChange;
    private BigDecimal dseIndexChangePercent;
    
    private BigDecimal cseIndex;
    private BigDecimal cseIndexChange;
    private BigDecimal cseIndexChangePercent;
    
    private Integer advancers;
    private Integer decliners;
    private Integer unchanged;
}

