package com.dohatec.oms.datascraper.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "portfolio_daily_valuations",
       uniqueConstraints = {
           @UniqueConstraint(name = "uq_portfolio_date", columnNames = {"portfolio_id", "valuation_date"})
       })
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PortfolioDailyValuation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @Column(name = "portfolio_id", nullable = false)
    private UUID portfolioId;

    @Column(name = "valuation_date", nullable = false)
    private LocalDate valuationDate;

    @Column(name = "total_value", nullable = false)
    private BigDecimal totalValue;

    @Column(name = "cash_value")
    private BigDecimal cashValue;

    @Column(name = "securities_value")
    private BigDecimal securitiesValue;

    @Column(name = "daily_return")
    private BigDecimal dailyReturn;

    @Column(name = "cumulative_return")
    private BigDecimal cumulativeReturn;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;
}

