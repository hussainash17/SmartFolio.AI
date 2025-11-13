package com.dohatec.oms.datascraper.repository;

import com.dohatec.oms.datascraper.model.Benchmark;
import com.dohatec.oms.datascraper.model.BenchmarkData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

/**
 * Repository for benchmark data points.
 */
@Repository
public interface BenchmarkDataRepository extends JpaRepository<BenchmarkData, Integer> {

    Optional<BenchmarkData> findByBenchmarkAndDate(Benchmark benchmark, LocalDate date);
}

