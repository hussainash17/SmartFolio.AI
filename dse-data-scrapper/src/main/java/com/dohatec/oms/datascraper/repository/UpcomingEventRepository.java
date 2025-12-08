package com.dohatec.oms.datascraper.repository;

import com.dohatec.oms.datascraper.model.UpcomingEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UpcomingEventRepository extends JpaRepository<UpcomingEvent, UUID> {
    Optional<UpcomingEvent> findByCodeAndTypeAndDate(String code, String type, String date);
}
