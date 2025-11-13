package com.dohatec.oms.datascraper.repository;

import com.dohatec.oms.datascraper.model.Benchmark;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository for benchmark metadata.
 */
@Repository
public interface BenchmarkRepository extends JpaRepository<Benchmark, String> {
}

