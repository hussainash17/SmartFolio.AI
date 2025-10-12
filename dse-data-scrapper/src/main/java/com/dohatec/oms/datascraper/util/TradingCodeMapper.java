package com.dohatec.oms.datascraper.util;

import com.dohatec.oms.datascraper.model.Company;
import com.dohatec.oms.datascraper.repository.CompanyRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Utility class for mapping trading codes to company UUIDs
 * Maintains an in-memory cache for fast lookups
 * Cache is refreshed periodically and on-demand
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TradingCodeMapper {

    private final CompanyRepository companyRepository;
    
    // Thread-safe cache for trading code to UUID mappings
    private final Map<String, UUID> tradingCodeToIdCache = new ConcurrentHashMap<>();
    
    // Reverse cache for UUID to trading code mappings
    private final Map<UUID, String> idToTradingCodeCache = new ConcurrentHashMap<>();

    /**
     * Initialize cache on application startup
     */
    @PostConstruct
    public void init() {
        loadCache();
    }

    /**
     * Load all companies into cache
     */
    public synchronized void loadCache() {
        log.info("Loading trading code cache...");
        
        try {
            tradingCodeToIdCache.clear();
            idToTradingCodeCache.clear();
            
            companyRepository.findAll().forEach(company -> {
                String tradingCode = company.getTradingCode().toUpperCase();
                UUID id = company.getId();
                
                tradingCodeToIdCache.put(tradingCode, id);
                idToTradingCodeCache.put(id, tradingCode);
            });
            
            log.info("Trading code cache loaded successfully. Total companies: {}", 
                    tradingCodeToIdCache.size());
                    
        } catch (Exception e) {
            log.error("Failed to load trading code cache", e);
        }
    }

    /**
     * Refresh cache periodically (every hour)
     */
    @Scheduled(fixedRate = 3600000, zone = "Asia/Dhaka")
    public void refreshCache() {
        log.info("Refreshing trading code cache...");
        loadCache();
    }

    /**
     * Get company UUID by trading code
     * @param tradingCode the trading code (case-insensitive)
     * @return UUID or null if not found
     */
    public UUID getCompanyId(String tradingCode) {
        if (tradingCode == null || tradingCode.isEmpty()) {
            return null;
        }
        
        return tradingCodeToIdCache.get(tradingCode.toUpperCase());
    }

    /**
     * Get trading code by company UUID
     * @param companyId the company UUID
     * @return trading code or null if not found
     */
    public String getTradingCode(UUID companyId) {
        if (companyId == null) {
            return null;
        }
        
        return idToTradingCodeCache.get(companyId);
    }

    /**
     * Check if trading code exists in cache
     * @param tradingCode the trading code
     * @return true if exists, false otherwise
     */
    public boolean exists(String tradingCode) {
        if (tradingCode == null || tradingCode.isEmpty()) {
            return false;
        }
        
        return tradingCodeToIdCache.containsKey(tradingCode.toUpperCase());
    }

    /**
     * Add a new company to cache
     * @param company the company to add
     */
    public void addToCache(Company company) {
        if (company != null && company.getId() != null && company.getTradingCode() != null) {
            String tradingCode = company.getTradingCode().toUpperCase();
            tradingCodeToIdCache.put(tradingCode, company.getId());
            idToTradingCodeCache.put(company.getId(), tradingCode);
            
            log.debug("Added company to cache: {}", tradingCode);
        }
    }

    /**
     * Remove a company from cache
     * @param tradingCode the trading code
     */
    public void removeFromCache(String tradingCode) {
        if (tradingCode != null) {
            String upperCode = tradingCode.toUpperCase();
            UUID id = tradingCodeToIdCache.remove(upperCode);
            if (id != null) {
                idToTradingCodeCache.remove(id);
                log.debug("Removed company from cache: {}", tradingCode);
            }
        }
    }

    /**
     * Get cache size
     * @return number of companies in cache
     */
    public int getCacheSize() {
        return tradingCodeToIdCache.size();
    }

    /**
     * Clear cache
     */
    public void clearCache() {
        tradingCodeToIdCache.clear();
        idToTradingCodeCache.clear();
        log.info("Trading code cache cleared");
    }
}

