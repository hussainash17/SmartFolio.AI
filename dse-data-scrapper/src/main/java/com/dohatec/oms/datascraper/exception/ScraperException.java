package com.dohatec.oms.datascraper.exception;

/**
 * Base exception for all scraper-related errors
 */
public class ScraperException extends RuntimeException {
    
    public ScraperException(String message) {
        super(message);
    }
    
    public ScraperException(String message, Throwable cause) {
        super(message, cause);
    }
    
    public ScraperException(Throwable cause) {
        super(cause);
    }
}

