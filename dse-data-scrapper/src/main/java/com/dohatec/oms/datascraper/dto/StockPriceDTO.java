package com.dohatec.oms.datascraper.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO for stock price data scraped from DSE
 * Used for transferring data between scraper and processor layers
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockPriceDTO {
    private String tradingCode;
    private BigDecimal lastTradePrice;
    private BigDecimal high;
    private BigDecimal low;
    private BigDecimal closingPrice;
    private BigDecimal ycp; // Yesterday's closing price
    private BigDecimal change;
    private BigDecimal changePercent;
    private Long volume;
    private BigDecimal value; // Turnover
    private Integer trade; // Number of trades
    private BigDecimal openPrice;
    private BigDecimal marketCap;
}

