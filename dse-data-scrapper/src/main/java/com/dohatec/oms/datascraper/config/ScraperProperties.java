package com.dohatec.oms.datascraper.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration properties for the DSE Data Scraper
 * Maps to application.properties with prefix "scraper"
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "scraper")
public class ScraperProperties {

    /**
     * DSE base URL configuration
     */
    private Dse dse = new Dse();

    /**
     * Scheduling configuration
     */
    private Schedule schedule = new Schedule();

    /**
     * Retry configuration
     */
    private Retry retry = new Retry();

    /**
     * HTTP client configuration
     */
    private Http http = new Http();

    /**
     * Batch processing configuration
     */
    private Batch batch = new Batch();

    @Data
    public static class Dse {
        private String baseUrl = "https://dsebd.org";
        private String latestSharePriceUrl = "https://dsebd.org/latest_share_price_scroll_by_ltp.php";
        private String companyDetailUrl = "https://dsebd.org/displayCompany.php?name=%s";
        private String marketSummaryUrl = "https://dsebd.org";
        private String newsUrl = "https://dsebd.org/display_news.php";
        private String newsAjaxUrl = "https://dsebd.org/ajax/load-news.php";
        // Waiting configuration for news page load
        private long newsLoadMaxWaitMs = 20000; // maximum wait time in ms
        private long newsLoadPollIntervalMs = 3000; // polling interval in ms
    }

    @Data
    public static class Schedule {
        private boolean enabled = true;
        private String timezone = "Asia/Dhaka";

        // Real-time scraper runs every 1 minute during market hours
        private String realtimeCron = "0 */1 10-3 * * SUN-THU";

        // Fundamental data scraper runs daily at 4 PM after market close
        private String fundamentalCron = "0 0 16 * * MON-THU";

        // Daily OHLC aggregation runs at 3:30 PM
        private String dailyAggregationCron = "0 32 14 * * SUN-THU";

        // Portfolio daily valuation runs at 2:30 PM
        private String portfolioValuationCron = "0 30 15 * * MON-THU";

        // Company list sync runs weekly on Saturday at 10 AM
        private String companyListSyncCron = "0 0 10 * * SAT";

        // Cleanup runs monthly on 1st day at 2 AM
        private String cleanupCron = "0 0 2 1 * *";

        // DSE news scraper runs every 30 seconds
        private String newsCron = "0/30 * * * * *";

        // Index instrument scraper runs every 30 seconds
        private String indexCron = "0 */1 10-3 * * SUN-THU";

        // Open price scraper runs every 5 minutes during market hours
        private String openPriceCron = "0 */5 10-13 * * SUN-THU";
    }

    @Data
    public static class Retry {
        private int maxAttempts = 3;
        private long initialDelay = 1000L; // milliseconds
        private long maxDelay = 10000L; // milliseconds
        private double multiplier = 2.0;
        private boolean enabled = true;
    }

    @Data
    public static class Http {
        private int connectionTimeout = 30000; // 30 seconds
        private int readTimeout = 60000; // 60 seconds
        private int maxConnections = 50;
        private String userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
    }

    @Data
    public static class Batch {
        private int batchSize = 20;
        private int threadPoolSize = 10;
        private boolean parallelProcessing = true;
    }
}
