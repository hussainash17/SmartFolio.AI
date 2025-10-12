package com.dohatec.oms.datascraper.controller;

import com.dohatec.oms.datascraper.model.Company;
import com.dohatec.oms.datascraper.model.ScraperLog;
import com.dohatec.oms.datascraper.model.StockData;
import com.dohatec.oms.datascraper.repository.CompanyRepository;
import com.dohatec.oms.datascraper.repository.ScraperLogRepository;
import com.dohatec.oms.datascraper.service.scraper.DailyOHLCAggregator;
import com.dohatec.oms.datascraper.service.scraper.FundamentalDataScraper;
import com.dohatec.oms.datascraper.service.scraper.RealTimeMarketScraper;
import com.dohatec.oms.datascraper.util.TradingCodeMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * REST Controller for manually triggering scrapers and viewing data
 * Useful for testing and monitoring
 */
@Slf4j
@RestController
@RequestMapping("/api/scraper")
@RequiredArgsConstructor
public class ScraperController {

    private final RealTimeMarketScraper realTimeMarketScraper;
    private final FundamentalDataScraper fundamentalDataScraper;
    private final DailyOHLCAggregator dailyOHLCAggregator;
    private final ScraperLogRepository scraperLogRepository;
    private final CompanyRepository companyRepository;
    private final TradingCodeMapper tradingCodeMapper;

    /**
     * Manually trigger real-time market data scraper
     * GET /api/scraper/trigger/realtime
     */
    @PostMapping("/trigger/realtime")
    public ResponseEntity<Map<String, Object>> triggerRealTimeScraper() {
        log.info("Manual trigger: Real-time market scraper");
        
        try {
            realTimeMarketScraper.scrapeMarketData();
            
            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "Real-time market scraper executed successfully");
            response.put("timestamp", java.time.LocalDateTime.now());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Failed to trigger real-time scraper", e);
            
            Map<String, Object> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", e.getMessage());
            response.put("timestamp", java.time.LocalDateTime.now());
            
            return ResponseEntity.status(500).body(response);
        }
    }

    /**
     * Manually trigger fundamental data scraper
     * GET /api/scraper/trigger/fundamental
     */
    @PostMapping("/trigger/fundamental")
    public ResponseEntity<Map<String, Object>> triggerFundamentalScraper() {
        log.info("Manual trigger: Fundamental data scraper");
        
        try {
            fundamentalDataScraper.scrapeFundamentalData();
            
            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "Fundamental data scraper executed successfully");
            response.put("timestamp", java.time.LocalDateTime.now());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Failed to trigger fundamental scraper", e);
            
            Map<String, Object> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", e.getMessage());
            response.put("timestamp", java.time.LocalDateTime.now());
            
            return ResponseEntity.status(500).body(response);
        }
    }

    /**
     * Manually trigger fundamental data scraper for a single company
     * POST /api/scraper/trigger/fundamental/{tradingCode}
     */
    @PostMapping("/trigger/fundamental/{tradingCode}")
    public ResponseEntity<Map<String, Object>> triggerFundamentalScraperForCompany(
            @PathVariable String tradingCode) {
        log.info("Manual trigger: Fundamental data scraper for {}", tradingCode);
        
        try {
            Company company = companyRepository.findByTradingCode(tradingCode.toUpperCase())
                    .orElseThrow(() -> new RuntimeException("Company not found: " + tradingCode));
            
            fundamentalDataScraper.scrapeCompanyDataAsync(company);
            
            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "Fundamental data scraped for " + tradingCode);
            response.put("tradingCode", tradingCode);
            response.put("timestamp", java.time.LocalDateTime.now());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Failed to scrape fundamental data for {}", tradingCode, e);
            
            Map<String, Object> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", e.getMessage());
            response.put("tradingCode", tradingCode);
            response.put("timestamp", java.time.LocalDateTime.now());
            
            return ResponseEntity.status(500).body(response);
        }
    }

    /**
     * Manually trigger daily OHLC aggregation
     * GET /api/scraper/trigger/aggregate
     */
    @PostMapping("/trigger/aggregate")
    public ResponseEntity<Map<String, Object>> triggerDailyAggregation() {
        log.info("Manual trigger: Daily OHLC aggregation");
        
        try {
            dailyOHLCAggregator.aggregateToday();
            
            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "Daily OHLC aggregation executed successfully");
            response.put("timestamp", java.time.LocalDateTime.now());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Failed to trigger daily aggregation", e);
            
            Map<String, Object> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", e.getMessage());
            response.put("timestamp", java.time.LocalDateTime.now());
            
            return ResponseEntity.status(500).body(response);
        }
    }

    /**
     * Get scraper execution logs
     * GET /api/scraper/logs?type=REALTIME&limit=10
     */
    @GetMapping("/logs")
    public ResponseEntity<List<ScraperLog>> getScraperLogs(
            @RequestParam(required = false) String type,
            @RequestParam(defaultValue = "10") int limit) {
        
        List<ScraperLog> logs;
        
        if (type != null) {
            logs = scraperLogRepository.findLastNRunsByScraperType(type.toUpperCase(), limit);
        } else {
            logs = scraperLogRepository.findAllByOrderByStartedAtDesc();
            if (logs.size() > limit) {
                logs = logs.subList(0, limit);
            }
        }
        
        return ResponseEntity.ok(logs);
    }

    /**
     * Get latest scraper log by type
     * GET /api/scraper/logs/latest/{type}
     */
    @GetMapping("/logs/latest/{type}")
    public ResponseEntity<ScraperLog> getLatestLog(@PathVariable String type) {
        return scraperLogRepository.findLatestByScraperType(type.toUpperCase())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Get scraper statistics
     * GET /api/scraper/stats/{type}
     */
    @GetMapping("/stats/{type}")
    public ResponseEntity<Map<String, Object>> getScraperStats(@PathVariable String type) {
        String scraperType = type.toUpperCase();
        
        Map<String, Object> stats = new HashMap<>();
        stats.put("scraperType", scraperType);
        stats.put("totalRuns", scraperLogRepository.countByScraperTypeAndStatus(scraperType, "SUCCESS") +
                               scraperLogRepository.countByScraperTypeAndStatus(scraperType, "FAILED") +
                               scraperLogRepository.countByScraperTypeAndStatus(scraperType, "PARTIAL"));
        stats.put("successfulRuns", scraperLogRepository.countSuccessfulRunsByScraperType(scraperType));
        stats.put("failedRuns", scraperLogRepository.countFailedRunsByScraperType(scraperType));
        stats.put("averageDuration", scraperLogRepository.getAverageDurationByScraperType(scraperType));
        stats.put("minDuration", scraperLogRepository.getMinDurationByScraperType(scraperType));
        stats.put("maxDuration", scraperLogRepository.getMaxDurationByScraperType(scraperType));
        
        return ResponseEntity.ok(stats);
    }

    /**
     * Get current stock data for a company
     * GET /api/scraper/stock/{tradingCode}
     */
    @GetMapping("/stock/{tradingCode}")
    public ResponseEntity<StockData> getStockData(@PathVariable String tradingCode) {
        StockData stockData = realTimeMarketScraper.getCurrentStockData(tradingCode.toUpperCase());
        
        if (stockData != null) {
            return ResponseEntity.ok(stockData);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Get all current stock data
     * GET /api/scraper/stocks
     */
    @GetMapping("/stocks")
    public ResponseEntity<List<StockData>> getAllStockData() {
        List<StockData> stockData = realTimeMarketScraper.getCurrentStockData();
        return ResponseEntity.ok(stockData);
    }

    /**
     * Refresh trading code cache
     * POST /api/scraper/cache/refresh
     */
    @PostMapping("/cache/refresh")
    public ResponseEntity<Map<String, Object>> refreshCache() {
        log.info("Manual trigger: Refresh trading code cache");
        
        int sizeBefore = tradingCodeMapper.getCacheSize();
        tradingCodeMapper.loadCache();
        int sizeAfter = tradingCodeMapper.getCacheSize();
        
        Map<String, Object> response = new HashMap<>();
        response.put("status", "success");
        response.put("message", "Trading code cache refreshed");
        response.put("sizeBefore", sizeBefore);
        response.put("sizeAfter", sizeAfter);
        response.put("timestamp", java.time.LocalDateTime.now());
        
        return ResponseEntity.ok(response);
    }

    /**
     * Get cache statistics
     * GET /api/scraper/cache/stats
     */
    @GetMapping("/cache/stats")
    public ResponseEntity<Map<String, Object>> getCacheStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("cacheSize", tradingCodeMapper.getCacheSize());
        stats.put("totalCompanies", companyRepository.count());
        stats.put("activeCompanies", companyRepository.countByIsActiveTrue());
        
        return ResponseEntity.ok(stats);
    }

    /**
     * Health check endpoint
     * GET /api/scraper/health
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        Map<String, Object> health = new HashMap<>();
        health.put("status", "UP");
        health.put("timestamp", java.time.LocalDateTime.now());
        health.put("cacheSize", tradingCodeMapper.getCacheSize());
        health.put("activeCompanies", companyRepository.countByIsActiveTrue());
        
        // Get latest scraper runs
        ScraperLog latestRealtime = scraperLogRepository.findLatestByScraperType("REALTIME").orElse(null);
        ScraperLog latestFundamental = scraperLogRepository.findLatestByScraperType("FUNDAMENTAL").orElse(null);
        
        if (latestRealtime != null) {
            health.put("latestRealtimeScraper", Map.of(
                "status", latestRealtime.getStatus(),
                "startedAt", latestRealtime.getStartedAt(),
                "duration", latestRealtime.getDurationSeconds()
            ));
        }
        
        if (latestFundamental != null) {
            health.put("latestFundamentalScraper", Map.of(
                "status", latestFundamental.getStatus(),
                "startedAt", latestFundamental.getStartedAt(),
                "duration", latestFundamental.getDurationSeconds()
            ));
        }
        
        return ResponseEntity.ok(health);
    }
}

