package com.dohatec.oms.datascraper.dto;

import java.math.BigDecimal;

public record MarketTotals(
    Long trades,
    Long volume,
    BigDecimal totalValue
) {}