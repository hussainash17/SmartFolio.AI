package com.dohatec.oms.datascraper.service.scraper;

import com.dohatec.oms.datascraper.model.UpcomingEvent;
import com.dohatec.oms.datascraper.repository.UpcomingEventRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.ZonedDateTime;
import java.util.Arrays;
import java.util.Optional;

@Service
@Slf4j
@RequiredArgsConstructor
public class StockNowScraperService {

    private static final String STOCKNOW_EVENTS_URL = "https://stocknow.com.bd/api/v1/news/events";
    private final RestTemplate restTemplate;
    private final UpcomingEventRepository upcomingEventRepository;

    @Transactional
    public void scrapeEvents() {
        log.info("Starting upcoming events scraping from {}", STOCKNOW_EVENTS_URL);
        try {
            ResponseEntity<StockNowEventDto[]> response = restTemplate.getForEntity(STOCKNOW_EVENTS_URL,
                    StockNowEventDto[].class);

            if (response.getBody() != null) {
                Arrays.stream(response.getBody()).forEach(this::processEvent);
                log.info("Processed {} events from StockNow", response.getBody().length);
            } else {
                log.warn("Received empty response from StockNow API");
            }
        } catch (Exception e) {
            log.error("Error scraping upcoming events", e);
        }
    }

    private void processEvent(StockNowEventDto dto) {
        try {
            // Check if event already exists to avoid duplicates
            // Composite key: code + type + date
            Optional<UpcomingEvent> existingEvent = upcomingEventRepository.findByCodeAndTypeAndDate(
                    dto.getCode(), dto.getType(), dto.getDate());

            if (existingEvent.isPresent()) {
                // Update existing if needed? Usually events might just be static, but let's
                // update simplified fields maybe
                // For now, just skip or only update if you want to keep 'updatedAt' fresh
                log.debug("Event already exists: {} - {} - {}", dto.getCode(), dto.getType(), dto.getDate());
                return;
            }

            UpcomingEvent event = UpcomingEvent.builder()
                    .code(dto.getCode())
                    .postDate(dto.getPostDate()) // ZonedDateTime handles ISO format implicitly with Jackson
                    .timestamp(dto.getTimestamp())
                    .date(dto.getDate())
                    .time(dto.getTime())
                    .type(dto.getType())
                    .build();

            upcomingEventRepository.save(event);
            log.debug("Saved new event: {} - {}", dto.getCode(), dto.getType());

        } catch (Exception e) {
            log.warn("Error processing event for {}: {}", dto.getCode(), e.getMessage());
        }
    }

    @Data
    public static class StockNowEventDto {
        private String code;
        private Double open; // Not used in entity but present in JSON
        private ZonedDateTime postDate;
        private Long timestamp;
        private String date;
        private String time;
        private String type;
    }
}
