package com.dohatec.oms.datascraper.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "donchian_channel_cache")
public class DonchianChannelCache {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "company_id", nullable = false)
    private UUID companyId;

    @Column(name = "calculation_date", nullable = false)
    private LocalDate calculationDate;

    // Technical Indicators (Nullable)
    @Column(name = "current_price")
    private BigDecimal currentPrice;

    @Column(name = "data_points")
    private Integer dataPoints;

    @Column(name = "includes_current_day")
    private Boolean includesCurrentDay;

    @Column(name = "period_5_resistance")
    private BigDecimal period5Resistance;

    @Column(name = "period_5_support")
    private BigDecimal period5Support;

    @Column(name = "period_5_middle")
    private BigDecimal period5Middle;

    @Column(name = "period_5_range")
    private BigDecimal period5Range;

    @Column(name = "period_10_resistance")
    private BigDecimal period10Resistance;

    @Column(name = "period_10_support")
    private BigDecimal period10Support;

    @Column(name = "period_10_middle")
    private BigDecimal period10Middle;

    @Column(name = "period_10_range")
    private BigDecimal period10Range;

    @Column(name = "period_20_resistance")
    private BigDecimal period20Resistance;

    @Column(name = "period_20_support")
    private BigDecimal period20Support;

    @Column(name = "period_20_middle")
    private BigDecimal period20Middle;

    @Column(name = "period_20_range")
    private BigDecimal period20Range;

    // Fundamental Data
    @Column(name = "market_cap")
    private BigDecimal marketCap;

    @Column(name = "pe_ratio")
    private BigDecimal peRatio;

    @Column(name = "dividend_yield")
    private BigDecimal dividendYield;

    @Column(name = "roe")
    private BigDecimal roe;

    @Column(name = "debt_to_equity")
    private BigDecimal debtToEquity;

    @Column(name = "eps")
    private BigDecimal eps;

    @Column(name = "nav")
    private BigDecimal nav;

    @Column(name = "fundamental_score")
    private BigDecimal fundamentalScore;

    @Column(name = "sector")
    private String sector;

    @Column(name = "symbol")
    private String symbol;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
