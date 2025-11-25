package com.dohatec.oms.datascraper.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "portfolioposition")
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PortfolioPosition {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "portfolio_id", nullable = false)
    private UUID portfolioId;

    // References public.company.id
    @Column(name = "stock_id")
    private UUID stockId;

    @Column(name = "quantity", nullable = false)
    private Integer quantity;

    @Column(name = "average_price", nullable = false)
    private BigDecimal averagePrice;

    @Column(name = "total_investment", nullable = false)
    private BigDecimal totalInvestment;

    @Column(name = "current_value", nullable = false)
    private BigDecimal currentValue;

    @Column(name = "unrealized_pnl", nullable = false)
    private BigDecimal unrealizedPnl;

    @Column(name = "unrealized_pnl_percent", nullable = false)
    private BigDecimal unrealizedPnlPercent;

    @Column(name = "last_updated", nullable = false)
    private LocalDateTime lastUpdated;
}

