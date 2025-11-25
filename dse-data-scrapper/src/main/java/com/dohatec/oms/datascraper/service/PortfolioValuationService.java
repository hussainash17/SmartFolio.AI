package com.dohatec.oms.datascraper.service;

import com.dohatec.oms.datascraper.model.Portfolio;
import com.dohatec.oms.datascraper.model.PortfolioDailyValuation;
import com.dohatec.oms.datascraper.model.PortfolioPosition;
import com.dohatec.oms.datascraper.model.StockData;
import com.dohatec.oms.datascraper.repository.PortfolioDailyValuationRepository;
import com.dohatec.oms.datascraper.repository.PortfolioPositionRepository;
import com.dohatec.oms.datascraper.repository.PortfolioRepository;
import com.dohatec.oms.datascraper.repository.StockDataRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class PortfolioValuationService {

    private static final ZoneId DHAKA_TZ = ZoneId.of("Asia/Dhaka");

    private final PortfolioRepository portfolioRepository;
    private final PortfolioPositionRepository positionRepository;
    private final StockDataRepository stockDataRepository;
    private final PortfolioDailyValuationRepository dailyValuationRepository;

    /**
     * Calculate and persist daily valuations for all active portfolios
     */
    @Transactional
    public int calculateAndSaveDailyValuations(LocalDate valuationDate) {
        List<Portfolio> portfolios = portfolioRepository.findByIsActiveTrue();
        int processed = 0;
        int failed = 0;

        for (Portfolio portfolio : portfolios) {
            try {
                calculateAndUpsertPortfolioValuation(portfolio, valuationDate);
                processed++;
            } catch (Exception ex) {
                failed++;
                log.error("Failed valuation for portfolio {} on {}: {}", portfolio.getId(), valuationDate, ex.getMessage(), ex);
            }
        }

        log.info("Portfolio valuations done for {} on {}. processed={}, failed={}", portfolios.size(), valuationDate, processed, failed);
        return processed;
    }

    /**
     * Calculate valuation for a single portfolio and upsert into the table
     */
    @Transactional
    public void calculateAndUpsertPortfolioValuation(Portfolio portfolio, LocalDate valuationDate) {
        List<PortfolioPosition> positions = positionRepository.findByPortfolioId(portfolio.getId());

        BigDecimal securitiesValue = BigDecimal.ZERO;

        for (PortfolioPosition position : positions) {
            if (position.getStockId() == null || position.getQuantity() == null || position.getQuantity() <= 0) {
                continue;
            }

            Optional<StockData> sdOpt = stockDataRepository.findTopByCompanyIdOrderByTimestampDesc(position.getStockId());
            BigDecimal lastPrice = sdOpt.map(StockData::getLastTradePrice).orElse(BigDecimal.ZERO);
            BigDecimal qty = BigDecimal.valueOf(position.getQuantity());

            // position market value = quantity * last trade price
            BigDecimal positionValue = lastPrice.multiply(qty);
            securitiesValue = securitiesValue.add(positionValue);
        }

        BigDecimal cashValue = portfolio.getCashBalance() != null ? portfolio.getCashBalance() : BigDecimal.ZERO;
        BigDecimal totalValue = cashValue.add(securitiesValue);

        // Compute daily and cumulative returns
        BigDecimal dailyReturn = null;
        BigDecimal cumulativeReturn = null;

        Optional<PortfolioDailyValuation> prevOpt = dailyValuationRepository
                .findTopByPortfolioIdAndValuationDateBeforeOrderByValuationDateDesc(portfolio.getId(), valuationDate);

        if (prevOpt.isPresent()) {
            PortfolioDailyValuation prev = prevOpt.get();
            if (prev.getTotalValue() != null && prev.getTotalValue().compareTo(BigDecimal.ZERO) > 0) {
                dailyReturn = totalValue.subtract(prev.getTotalValue())
                        .divide(prev.getTotalValue(), 6, RoundingMode.HALF_UP);
            } else {
                dailyReturn = BigDecimal.ZERO;
            }

            if (prev.getCumulativeReturn() != null) {
                cumulativeReturn = BigDecimal.ONE.add(prev.getCumulativeReturn())
                        .multiply(BigDecimal.ONE.add(dailyReturn))
                        .subtract(BigDecimal.ONE);
            } else {
                cumulativeReturn = dailyReturn;
            }
        } else {
            // First valuation: cumulative equals daily (or 0 if no baseline)
            dailyReturn = BigDecimal.ZERO;
            cumulativeReturn = BigDecimal.ZERO;
        }

        // Upsert today's valuation
        PortfolioDailyValuation valuation = dailyValuationRepository
                .findByPortfolioIdAndValuationDate(portfolio.getId(), valuationDate)
                .orElse(PortfolioDailyValuation.builder()
                        .portfolioId(portfolio.getId())
                        .valuationDate(valuationDate)
                        .build());

        valuation.setCashValue(cashValue);
        valuation.setSecuritiesValue(securitiesValue);
        valuation.setTotalValue(totalValue);
        valuation.setDailyReturn(dailyReturn);
        valuation.setCumulativeReturn(cumulativeReturn);

        dailyValuationRepository.save(valuation);
    }
}
