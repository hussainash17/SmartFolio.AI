package com.dohatec.oms.datascraper.repository;

import com.dohatec.oms.datascraper.model.News;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface NewsRepository extends JpaRepository<News, UUID> {

    Optional<News> findByTitleAndContentAndPublishedAtAndSourceUrl(String title, String content, LocalDateTime publishedAt, String sourceUrl);
}