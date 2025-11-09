package com.dohatec.oms.datascraper.repository;

import com.dohatec.oms.datascraper.model.StockNews;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface StockNewsRepository extends JpaRepository<StockNews, UUID> {

    Optional<StockNews> findByNewsIdAndStockId(UUID newsId, UUID stockId);
}