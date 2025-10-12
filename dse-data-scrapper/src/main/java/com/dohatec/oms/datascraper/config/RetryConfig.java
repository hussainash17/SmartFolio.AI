package com.dohatec.oms.datascraper.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.retry.RetryCallback;
import org.springframework.retry.RetryContext;
import org.springframework.retry.RetryListener;
import org.springframework.retry.annotation.EnableRetry;
import org.springframework.retry.backoff.ExponentialBackOffPolicy;
import org.springframework.retry.policy.SimpleRetryPolicy;
import org.springframework.retry.support.RetryTemplate;

/**
 * Configuration for retry mechanism
 * Enables @Retryable annotation and provides RetryTemplate bean
 */
@Slf4j
@Configuration
@EnableRetry
public class RetryConfig {

    private final ScraperProperties scraperProperties;

    public RetryConfig(ScraperProperties scraperProperties) {
        this.scraperProperties = scraperProperties;
    }

    /**
     * Configure RetryTemplate with exponential backoff
     * @return configured RetryTemplate
     */
    @Bean
    public RetryTemplate retryTemplate() {
        RetryTemplate retryTemplate = new RetryTemplate();

        // Configure retry policy
        SimpleRetryPolicy retryPolicy = new SimpleRetryPolicy();
        retryPolicy.setMaxAttempts(scraperProperties.getRetry().getMaxAttempts());
        retryTemplate.setRetryPolicy(retryPolicy);

        // Configure backoff policy
        ExponentialBackOffPolicy backOffPolicy = new ExponentialBackOffPolicy();
        backOffPolicy.setInitialInterval(scraperProperties.getRetry().getInitialDelay());
        backOffPolicy.setMaxInterval(scraperProperties.getRetry().getMaxDelay());
        backOffPolicy.setMultiplier(scraperProperties.getRetry().getMultiplier());
        retryTemplate.setBackOffPolicy(backOffPolicy);

        // Add retry listener for logging
        retryTemplate.registerListener(new CustomRetryListener());

        return retryTemplate;
    }

    /**
     * Custom retry listener for logging retry attempts
     */
    @Slf4j
    static class CustomRetryListener implements RetryListener {

        @Override
        public <T, E extends Throwable> boolean open(RetryContext context, RetryCallback<T, E> callback) {
            // Called before the first retry attempt
            return true;
        }

        @Override
        public <T, E extends Throwable> void close(RetryContext context, RetryCallback<T, E> callback, Throwable throwable) {
            // Called after all retry attempts
            if (throwable != null) {
                log.warn("All retry attempts exhausted. Final exception: {}", throwable.getMessage());
            }
        }

        @Override
        public <T, E extends Throwable> void onError(RetryContext context, RetryCallback<T, E> callback, Throwable throwable) {
            // Called on each retry attempt
            log.warn("Retry attempt #{} due to: {}", 
                    context.getRetryCount(), throwable.getMessage());
        }
    }
}

