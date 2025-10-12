package com.dohatec.oms.datascraper.exception;

/**
 * Exception thrown when data parsing fails
 */
public class DataParsingException extends ScraperException {
    
    private final String tradingCode;
    private final String dataType;
    
    public DataParsingException(String message, String tradingCode, String dataType) {
        super(message);
        this.tradingCode = tradingCode;
        this.dataType = dataType;
    }
    
    public DataParsingException(String message, String tradingCode, String dataType, Throwable cause) {
        super(message, cause);
        this.tradingCode = tradingCode;
        this.dataType = dataType;
    }
    
    public String getTradingCode() {
        return tradingCode;
    }
    
    public String getDataType() {
        return dataType;
    }
    
    @Override
    public String toString() {
        return String.format("DataParsingException[tradingCode=%s, dataType=%s, message=%s]", 
                tradingCode, dataType, getMessage());
    }
}

