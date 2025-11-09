package com.dohatec.oms.datascraper.service.scraper;

import com.dohatec.oms.datascraper.dto.NewsItemDTO;
import com.dohatec.oms.datascraper.model.Company;
import com.dohatec.oms.datascraper.model.News;
import com.dohatec.oms.datascraper.model.ScraperLog;
import com.dohatec.oms.datascraper.model.StockNews;
import com.dohatec.oms.datascraper.repository.CompanyRepository;
import com.dohatec.oms.datascraper.repository.NewsRepository;
import com.dohatec.oms.datascraper.repository.StockNewsRepository;
import com.dohatec.oms.datascraper.service.ScraperLogService;
import com.dohatec.oms.datascraper.service.parser.DseNewsParser;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class DseNewsScraper {

    private static final String SOURCE_NAME = "DSE";

    private final RestTemplate restTemplate;
    private final DseNewsParser newsParser;
    private final CompanyRepository companyRepository;
    private final NewsRepository newsRepository;
    private final StockNewsRepository stockNewsRepository;
    private final ScraperLogService scraperLogService;
    private final com.dohatec.oms.datascraper.config.ScraperProperties scraperProperties;

    @Transactional
    public void scrapeTodayNews() throws InterruptedException {
        ScraperLog scraperLog = scraperLogService.startLog("DSE_NEWS");

        try {
            String newsUrl = scraperProperties.getDse().getNewsUrl();
            String ajaxUrl = scraperProperties.getDse().getNewsAjaxUrl();
            log.info("Fetching DSE news from: {}", newsUrl);

            String html = fetchNewsHtmlViaAjax(ajaxUrl, newsUrl);
            if (html == null || html.isEmpty()) {
                log.warn("Empty response from AJAX endpoint, falling back to full page load");
                html = fetchNewsHtmlWithWait(newsUrl);
            }

            if (html == null || html.isEmpty()) {
                throw new IllegalStateException("Empty response when fetching DSE news page after waiting");
            }

            List<NewsItemDTO> parsedNews = newsParser.parse(html);
            log.info("Parsed {} news items from DSE", parsedNews.size());

            int success = 0;
            int failed = 0;

            for (NewsItemDTO item : parsedNews) {
                try {
                    if (item.getTradingCode() == null || item.getTradingCode().isEmpty()) {
                        log.warn("Skipping news without trading code: {}", item.getTitle());
                        failed++;
                        continue;
                    }

                    LocalDateTime publishedAt = item.getPostDate() != null ? item.getPostDate().atStartOfDay() : null;
                    String normalizedContent = item.getContent() != null ? item.getContent().trim() : "";

                    Optional<News> existingNews = newsRepository
                            .findByTitleAndContentAndPublishedAtAndSourceUrl(
                                    item.getTitle(),
                                    normalizedContent,
                                    publishedAt,
                                    newsUrl
                            );
                    News newsEntity = existingNews.orElseGet(() -> News.builder()
                        .title(item.getTitle())
                        .summary(null)
                        .source(SOURCE_NAME)
                        .sourceUrl(newsUrl)
                        .author(null)
                        .category("Stock")
                        .tags(null)
                        .sentiment(null)
                        .sentimentScore(null)
                        .publishedAt(publishedAt)
                        .isActive(true)
                        .build());

                    newsEntity.setTitle(item.getTitle());
                    newsEntity.setContent(normalizedContent);
                    newsEntity.setSource(SOURCE_NAME);
                    newsEntity.setSourceUrl(newsUrl);
                    newsEntity.setCategory("Stock");
                    newsEntity.setIsActive(Boolean.TRUE);
                    newsEntity.setTags(null);
                    newsEntity.setPublishedAt(publishedAt);

                    newsEntity = newsRepository.save(newsEntity);
                    if (existingNews.isEmpty()) {
                        log.debug("Saved news: {}", newsEntity.getId());
                    }

                    Optional<Company> companyOpt = companyRepository.findByTradingCodeIgnoreCase(item.getTradingCode());
                    if (companyOpt.isEmpty()) {
                        log.warn("Company not found for trading code: {}", item.getTradingCode());
                        failed++;
                        continue;
                    }

                    UUID companyId = companyOpt.get().getId();
                    Optional<StockNews> existingLink = stockNewsRepository
                            .findByNewsIdAndStockId(newsEntity.getId(), companyId);

                    if (existingLink.isEmpty()) {
                        StockNews link = StockNews.builder()
                                .newsId(newsEntity.getId())
                                .stockId(companyId)
                                .relevanceScore(null)
                                .build();
                        stockNewsRepository.save(link);
                        log.debug("Linked news {} to stock {}", newsEntity.getId(), companyId);
                    }

                    success++;
                } catch (Exception e) {
                    failed++;
                    log.error("Failed to save news item: {}", item.getTitle(), e);
                }
            }

            String status = failed == 0 ? "SUCCESS" : (success > 0 ? "PARTIAL" : "FAILED");
            scraperLogService.completeLog(scraperLog, status, success, failed);
            log.info("DSE news scraping completed. Success: {}, Failed: {}", success, failed);

        } catch (Exception e) {
            log.error("DSE news scraping failed", e);
            scraperLogService.completeLog(scraperLog, "FAILED", 0, 0, e.getMessage());
            throw e;
        }
    }

    private String fetchNewsHtmlViaAjax(String ajaxUrl, String refererUrl) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            headers.set(HttpHeaders.ACCEPT, "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
            headers.set(HttpHeaders.ACCEPT_LANGUAGE, "en-US,en;q=0.9");
            headers.set(HttpHeaders.REFERER, refererUrl);
            headers.set(HttpHeaders.USER_AGENT, scraperProperties.getHttp().getUserAgent());
            headers.set("X-Requested-With", "XMLHttpRequest");

            MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
            form.add("criteria", "1");

            HttpEntity<MultiValueMap<String, String>> requestEntity = new HttpEntity<>(form, headers);

            ResponseEntity<String> response = restTemplate.exchange(
                    UriComponentsBuilder.fromHttpUrl(ajaxUrl).build(true).toUri(),
                    HttpMethod.POST,
                    requestEntity,
                    String.class
            );

            if (!response.getStatusCode().is2xxSuccessful()) {
                log.warn("AJAX news endpoint returned non-success status: {}", response.getStatusCode());
                return null;
            }

            String body = response.getBody();
            if (body == null || body.isBlank()) {
                log.warn("AJAX news endpoint returned empty body");
                return null;
            }

            return body;
        } catch (Exception ex) {
            log.error("Failed to fetch DSE news via AJAX endpoint", ex);
            return null;
        }
    }

    private String fetchNewsHtmlWithWait(String url) throws InterruptedException {
        long maxWait = scraperProperties.getDse().getNewsLoadMaxWaitMs();
        long interval = scraperProperties.getDse().getNewsLoadPollIntervalMs();
        long waited = 0L;
        String html;
        do {
            html = restTemplate.getForObject(url, String.class);
            if (newsParser.isLoaded(html)) {
                return html;
            }
            Thread.sleep(interval);
            waited += interval;
        } while (waited < maxWait);
        return html;
    }
}