package com.dohatec.oms.datascraper.repository;

import com.dohatec.oms.datascraper.model.PortfolioPosition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PortfolioPositionRepository extends JpaRepository<PortfolioPosition, UUID> {
    List<PortfolioPosition> findByPortfolioId(UUID portfolioId);
}

