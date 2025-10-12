package com.dohatec.oms.datascraper;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.context.ConfigurableApplicationContext;

/**
 * Main application class for DSE Data Scraper
 * 
 * This application scrapes market data and fundamental data from Dhaka Stock Exchange (DSE)
 * Features:
 * - Real-time market data scraping (every 1 minute during market hours)
 * - Fundamental data scraping (daily after market close)
 * - Daily OHLC aggregation
 * - Automatic cleanup of old data
 * 
 * @author Dohatec OMS Team
 * @version 2.0
 */
@Slf4j
@SpringBootApplication
@ConfigurationPropertiesScan
public class DataScraperApplication {

    public static void main(String[] args) {
        try {
            log.info("========================================");
            log.info("Starting DSE Data Scraper Application");
            log.info("========================================");
            
            ConfigurableApplicationContext context = SpringApplication.run(DataScraperApplication.class, args);
            
            String[] activeProfiles = context.getEnvironment().getActiveProfiles();
            if (activeProfiles.length > 0) {
                log.info("Active profiles: {}", String.join(", ", activeProfiles));
            } else {
                log.info("Active profiles: default");
            }
            
            log.info("========================================");
            log.info("DSE Data Scraper Application Started Successfully");
            log.info("Schedulers are now active and will run as per configured cron expressions");
            log.info("========================================");
            
        } catch (Exception e) {
            log.error("Failed to start application", e);
            System.exit(1);
        }
    }
}
