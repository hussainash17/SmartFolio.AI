package com.dohatec.oms.datascraper.repository;

import com.dohatec.oms.datascraper.model.PortfolioDailyValuation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PortfolioDailyValuationRepository extends JpaRepository<PortfolioDailyValuation, Integer> {
    Optional<PortfolioDailyValuation> findByPortfolioIdAndValuationDate(UUID portfolioId, LocalDate valuationDate);
    Optional<PortfolioDailyValuation> findTopByPortfolioIdAndValuationDateBeforeOrderByValuationDateDesc(UUID portfolioId, LocalDate valuationDate);
}

