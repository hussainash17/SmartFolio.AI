package com.dohatec.oms.datascraper.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

/**
 * Configuration for HTTP client (RestTemplate)
 * Configures timeouts and connection pooling
 */
@Slf4j
@Configuration
public class WebClientConfig {

    private final ScraperProperties scraperProperties;

    public WebClientConfig(ScraperProperties scraperProperties) {
        this.scraperProperties = scraperProperties;
    }

    /**
     * Configure RestTemplate with custom timeouts
     * @return configured RestTemplate
     */
    @Bean
    public RestTemplate restTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        
        factory.setConnectTimeout(scraperProperties.getHttp().getConnectionTimeout());
        factory.setReadTimeout(scraperProperties.getHttp().getReadTimeout());
        
        RestTemplate restTemplate = new RestTemplate(factory);
        
        log.info("RestTemplate configured with connection timeout: {}ms, read timeout: {}ms",
                scraperProperties.getHttp().getConnectionTimeout(),
                scraperProperties.getHttp().getReadTimeout());
        
        return restTemplate;
    }
}

