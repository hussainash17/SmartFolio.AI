package com.dohatec.oms.datascraper.exception;

/**
 * Exception thrown when a company is not found in the database
 */
public class CompanyNotFoundException extends ScraperException {
    
    private final String tradingCode;
    
    public CompanyNotFoundException(String tradingCode) {
        super(String.format("Company not found with trading code: %s", tradingCode));
        this.tradingCode = tradingCode;
    }
    
    public CompanyNotFoundException(String message, String tradingCode) {
        super(message);
        this.tradingCode = tradingCode;
    }
    
    public String getTradingCode() {
        return tradingCode;
    }
}

