package com.dohatec.oms.datascraper;

import com.dohatec.oms.datascraper.model.UpcomingEvent;
import com.dohatec.oms.datascraper.repository.UpcomingEventRepository;
import com.dohatec.oms.datascraper.service.scraper.StockNowScraperService;
import com.dohatec.oms.datascraper.service.scraper.StockNowScraperService.StockNowEventDto;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import java.time.ZonedDateTime;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

public class StockNowScraperTest {

    @Test
    public void testScrapingLogic() {
        // Mock dependencies
        RestTemplate restTemplate = Mockito.mock(RestTemplate.class);
        UpcomingEventRepository repository = Mockito.mock(UpcomingEventRepository.class);

        // Prepare mock data
        StockNowEventDto dto = new StockNowEventDto();
        dto.setCode("TESTCODE");
        dto.setType("AGM");
        dto.setDate("Dec 09, 2025");
        dto.setTime("11:30 AM");
        dto.setTimestamp(1765258200L);
        dto.setPostDate(ZonedDateTime.now());

        StockNowEventDto[] dtos = new StockNowEventDto[] { dto };

        // Mock RestTemplate response
        when(restTemplate.getForEntity(anyString(), eq(StockNowEventDto[].class)))
                .thenReturn(new ResponseEntity<>(dtos, HttpStatus.OK));

        // Mock Repository behavior
        when(repository.findByCodeAndTypeAndDate(anyString(), anyString(), anyString()))
                .thenReturn(Optional.empty()); // Assume not exists

        when(repository.save(any(UpcomingEvent.class))).thenAnswer(invocation -> {
            UpcomingEvent event = invocation.getArgument(0);
            System.out.println(
                    "Saving Event: " + event.getCode() + " | Type: " + event.getType() + " | Date: " + event.getDate());
            return event;
        });

        // Run service
        StockNowScraperService service = new StockNowScraperService(restTemplate, repository);
        service.scrapeEvents();

        // Verify
        verify(repository, times(1)).save(any(UpcomingEvent.class));
    }
}
