package com.dohatec.oms.datascraper.service;

import com.dohatec.oms.datascraper.model.*;
import com.dohatec.oms.datascraper.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class FundamentalCacheService {

    private final CompanyRepository companyRepository;
    private final DividendInformationRepository dividendInformationRepository;
    private final FinancialPerformanceRepository financialPerformanceRepository;
    private final LoanStatusRepository loanStatusRepository;
    private final DonchianChannelCacheRepository donchianChannelCacheRepository;

    /**
     * Calculate and cache fundamental metrics for all active companies.
     * This method is designed to be idempotent and can be run daily.
     */
    @Transactional
    public void updateFundamentalCache() {
        log.info("Starting fundamental cache update...");

        List<Company> companies = companyRepository.findByIsActiveTrue();
        log.info("Found {} active companies to process", companies.size());

        LocalDate today = LocalDate.now();
        List<DonchianChannelCache> cacheEntries = new ArrayList<>();
        int successCount = 0;
        int errorCount = 0;

        for (Company company : companies) {
            try {
                // Fetch latest data
                FinancialPerformance fin = financialPerformanceRepository.findLatestByCompanyId(company.getId())
                        .orElse(null);
                DividendInformation div = dividendInformationRepository
                        .findTopByCompanyIdOrderByYearDesc(company.getId()).orElse(null);
                LoanStatus loan = loanStatusRepository.findByCompanyId(company.getId()).orElse(null);

                // Calculate metrics
                BigDecimal marketCap = calculateMarketCap(company);
                BigDecimal peRatio = calculatePeRatio(company, fin);
                BigDecimal dividendYield = calculateDividendYield(company, div);
                BigDecimal roe = calculateRoe(company, fin);
                BigDecimal debtToEquity = calculateDebtToEquity(company, loan);
                BigDecimal eps = (fin != null && fin.getEpsBasic() != null) ? fin.getEpsBasic() : company.getEps();
                BigDecimal nav = (fin != null && fin.getNavPerShare() != null) ? fin.getNavPerShare()
                        : company.getNav();

                BigDecimal score = calculateFundamentalScore(peRatio, dividendYield, debtToEquity, roe);

                // Create or update cache entry
                DonchianChannelCache cache = donchianChannelCacheRepository
                        .findByCompanyIdAndCalculationDate(company.getId(), today)
                        .orElse(DonchianChannelCache.builder()
                                .id(UUID.randomUUID())
                                .companyId(company.getId())
                                .calculationDate(today)
                                .includesCurrentDay(false)
                                .build());

                cache.setSymbol(company.getTradingCode());
                cache.setSector(company.getSector());
                cache.setMarketCap(marketCap);
                cache.setPeRatio(peRatio);
                cache.setDividendYield(dividendYield);
                cache.setRoe(roe);
                cache.setDebtToEquity(debtToEquity);
                cache.setEps(eps);
                cache.setNav(nav);
                cache.setFundamentalScore(score);

                cacheEntries.add(cache);
                successCount++;

            } catch (Exception e) {
                log.error("Failed to calculate cache for company: {}", company.getTradingCode(), e);
                errorCount++;
            }
        }

        if (!cacheEntries.isEmpty()) {
            // Save in batches if needed, but for ~400 companies, saveAll is fine
            donchianChannelCacheRepository.saveAll(cacheEntries);
            log.info("Fundamental cache update completed. Success: {}, Errors: {}", successCount, errorCount);
        } else {
            log.warn("No fundamental cache entries generated.");
        }
    }

    private BigDecimal calculateMarketCap(Company company) {
        try {
            if (company.getMarketCap() != null) {
                return company.getMarketCap();
            }
            return null;
        } catch (Exception e) {
            return null;
        }
    }

    private BigDecimal calculatePeRatio(Company company, FinancialPerformance fin) {
        try {
            if (company.getPeRatio() != null)
                return company.getPeRatio();
            return null;
        } catch (Exception e) {
            return null;
        }
    }

    private BigDecimal calculateDividendYield(Company company, DividendInformation div) {
        try {
            if (company.getDividendYield() != null)
                return company.getDividendYield();
            if (div != null && div.getYieldPercentage() != null)
                return div.getYieldPercentage();
            return null;
        } catch (Exception e) {
            return null;
        }
    }

    private BigDecimal calculateRoe(Company company, FinancialPerformance fin) {
        try {
            if (fin != null && fin.getProfit() != null && company.getReserveAndSurplus() != null
                    && company.getReserveAndSurplus() > 0) {
                return fin.getProfit()
                        .divide(BigDecimal.valueOf(company.getReserveAndSurplus()), 4, java.math.RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100));
            }
            return null;
        } catch (Exception e) {
            return null;
        }
    }

    private BigDecimal calculateDebtToEquity(Company company, LoanStatus loan) {
        try {
            if (loan != null && company.getReserveAndSurplus() != null && company.getReserveAndSurplus() > 0) {
                BigDecimal shortTerm = loan.getShortTermLoan() != null ? loan.getShortTermLoan() : BigDecimal.ZERO;
                BigDecimal longTerm = loan.getLongTermLoan() != null ? loan.getLongTermLoan() : BigDecimal.ZERO;
                BigDecimal totalDebt = shortTerm.add(longTerm);

                if (totalDebt.compareTo(BigDecimal.ZERO) > 0) {
                    return totalDebt.divide(BigDecimal.valueOf(company.getReserveAndSurplus()), 4,
                            java.math.RoundingMode.HALF_UP);
                }
            }
            return null;
        } catch (Exception e) {
            return null;
        }
    }

    private BigDecimal calculateFundamentalScore(BigDecimal pe, BigDecimal divYield, BigDecimal de, BigDecimal roe) {
        double score = 50.0;

        if (pe != null && pe.compareTo(BigDecimal.ZERO) > 0) {
            double peVal = pe.doubleValue();
            if (peVal < 10)
                score += 20;
            else if (peVal < 15)
                score += 15;
            else if (peVal < 20)
                score += 10;
            else if (peVal < 30)
                score += 5;
        }

        if (divYield != null) {
            double divVal = divYield.doubleValue();
            if (divVal > 5)
                score += 15;
            else if (divVal > 3)
                score += 10;
            else if (divVal > 1)
                score += 5;
        }

        if (de != null) {
            double deVal = de.doubleValue();
            if (deVal < 0.3)
                score += 15;
            else if (deVal < 0.5)
                score += 10;
            else if (deVal < 1.0)
                score += 5;
        }

        if (roe != null && roe.compareTo(BigDecimal.ZERO) > 0) {
            double roeVal = roe.doubleValue();
            if (roeVal > 20)
                score += 10;
            else if (roeVal > 15)
                score += 7;
            else if (roeVal > 10)
                score += 5;
        }

        return BigDecimal.valueOf(score);
    }
}
