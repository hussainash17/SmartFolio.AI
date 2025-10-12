package com.dohatec.oms.datascraper.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Legacy entity for market information
 * Maps to the 'marketinformation' table in the database
 * Note: This table uses the old integer company_id FK
 * Consider migrating to StockData for new implementations
 * @deprecated Use {@link StockData} instead for new implementations
 */
@Getter
@Setter
@Entity
@Table(
    name = "marketinformation",
    indexes = {
        @Index(name = "idx_marketinformation_company_id", columnList = "company_id"),
        @Index(name = "idx_marketinformation_date", columnList = "date")
    }
)
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Deprecated
public class MarketInformation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "market_info_id", nullable = false)
    private Integer id;

    @Column(name = "company_id", nullable = false)
    private Integer companyId; // Legacy integer FK

    @Column(name = "date", nullable = false)
    private LocalDate date;

    @Column(name = "last_trading_price", precision = 18, scale = 2)
    private BigDecimal lastTradingPrice;

    @Column(name = "closing_price", precision = 18, scale = 2)
    private BigDecimal closingPrice;

    @Column(name = "opening_price", precision = 18, scale = 2)
    private BigDecimal openingPrice;

    @Column(name = "adjusted_opening_price", precision = 18, scale = 2)
    private BigDecimal adjustedOpeningPrice;

    @Column(name = "days_range", length = 50)
    private String daysRange;

    @Column(name = "change", precision = 18, scale = 2)
    private BigDecimal change;

    @Column(name = "days_value", precision = 18, scale = 2)
    private BigDecimal daysValue;

    @Column(name = "days_volume")
    private Integer daysVolume;

    @Column(name = "days_trade")
    private Integer daysTrade;

    @Column(name = "market_capitalization", precision = 18, scale = 2)
    private BigDecimal marketCapitalization;

    @Column(name = "yesterday_closing_price", precision = 18, scale = 2)
    private BigDecimal yesterdayClosingPrice;

    @Override
    public String toString() {
        return "MarketInformation{" +
                "id=" + id +
                ", companyId=" + companyId +
                ", date=" + date +
                ", lastTradingPrice=" + lastTradingPrice +
                '}';
    }
}

