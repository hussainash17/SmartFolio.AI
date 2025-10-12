package com.dohatec.oms.datascraper.exception;

/**
 * Exception thrown when network/HTTP errors occur during scraping
 */
public class NetworkException extends ScraperException {
    
    private final String url;
    private final Integer httpStatusCode;
    
    public NetworkException(String message, String url) {
        super(message);
        this.url = url;
        this.httpStatusCode = null;
    }
    
    public NetworkException(String message, String url, Integer httpStatusCode) {
        super(message);
        this.url = url;
        this.httpStatusCode = httpStatusCode;
    }
    
    public NetworkException(String message, String url, Throwable cause) {
        super(message, cause);
        this.url = url;
        this.httpStatusCode = null;
    }
    
    public String getUrl() {
        return url;
    }
    
    public Integer getHttpStatusCode() {
        return httpStatusCode;
    }
    
    @Override
    public String toString() {
        return String.format("NetworkException[url=%s, httpStatusCode=%s, message=%s]", 
                url, httpStatusCode, getMessage());
    }
}

