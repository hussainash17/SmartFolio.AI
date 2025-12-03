package com.dohatec.oms.datascraper.repository;

import com.dohatec.oms.datascraper.model.DonchianChannelCache;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DonchianChannelCacheRepository extends JpaRepository<DonchianChannelCache, UUID> {
    Optional<DonchianChannelCache> findByCompanyIdAndCalculationDate(UUID companyId, LocalDate calculationDate);
}
