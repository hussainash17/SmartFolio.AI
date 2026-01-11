package com.dohatec.oms.datascraper.repository;

import com.dohatec.oms.datascraper.model.BenchmarkTick;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface BenchmarkTickRepository extends JpaRepository<BenchmarkTick, UUID> {
}
