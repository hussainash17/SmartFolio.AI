package com.dohatec.oms.datascraper.util;

import lombok.extern.slf4j.Slf4j;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

/**
 * Utility class for parsing HTML content from DSE website
 * Provides helper methods for extracting data from HTML elements
 */
@Slf4j
@Component
public class HtmlParserUtil {

    /**
     * Parse a key-value table (th-td pairs)
     * @param table the table element
     * @return map of key-value pairs
     */
    public Map<String, String> parseKeyValueTable(Element table) {
        Map<String, String> data = new HashMap<>();
        
        if (table == null) {
            return data;
        }
        
        Elements rows = table.select("tr");
        for (Element row : rows) {
            Elements headers = row.select("th");
            Elements values = row.select("td");
            
            for (int i = 0; i < headers.size() && i < values.size(); i++) {
                String key = cleanText(headers.get(i).text());
                String value = cleanText(values.get(i).text());
                
                if (!key.isEmpty()) {
                    data.put(key, value);
                }
            }
        }
        
        return data;
    }

    /**
     * Parse a table with multiple th-td pairs per row
     * @param table the table element
     * @return map of key-value pairs
     */
    public Map<String, String> parseMultiColumnTable(Element table) {
        Map<String, String> data = new HashMap<>();
        
        if (table == null) {
            return data;
        }
        
        Elements rows = table.select("tbody tr");
        for (Element row : rows) {
            Elements cells = row.select("th, td");
            
            // Process pairs of cells (key-value)
            for (int i = 0; i < cells.size() - 1; i += 2) {
                String key = cleanText(cells.get(i).text());
                String value = cleanText(cells.get(i + 1).text());
                
                if (!key.isEmpty()) {
                    data.put(key, value);
                }
            }
        }
        
        return data;
    }

    /**
     * Clean and normalize text extracted from HTML
     * @param text the raw text
     * @return cleaned text
     */
    public String cleanText(String text) {
        if (text == null) {
            return "";
        }
        
        return text.trim()
                .replaceAll("\\s+", " ")
                .replaceAll("\\u00A0", " ") // Non-breaking space
                .replaceAll("[\\n\\r\\t]", " ")
                .trim();
    }

    /**
     * Parse a numeric value from string
     * @param value the string value
     * @return BigDecimal or null if parsing fails
     */
    public BigDecimal parseNumeric(String value) {
        if (value == null || value.isEmpty() || value.equals("-") || value.equalsIgnoreCase("N/A")) {
            return null;
        }
        
        try {
            // Remove commas and other non-numeric characters except decimal point and minus sign
            String cleaned = value.replaceAll("[^0-9.-]", "");
            return new BigDecimal(cleaned);
        } catch (NumberFormatException e) {
            log.warn("Failed to parse numeric value: {}", value);
            return null;
        }
    }

    /**
     * Parse an integer value from string
     * @param value the string value
     * @return Integer or null if parsing fails
     */
    public Integer parseInteger(String value) {
        if (value == null || value.isEmpty() || value.equals("-") || value.equalsIgnoreCase("N/A")) {
            return null;
        }
        
        try {
            String cleaned = value.replaceAll("[^0-9-]", "");
            return Integer.parseInt(cleaned);
        } catch (NumberFormatException e) {
            log.warn("Failed to parse integer value: {}", value);
            return null;
        }
    }

    /**
     * Parse a long value from string
     * @param value the string value
     * @return Long or null if parsing fails
     */
    public Long parseLong(String value) {
        if (value == null || value.isEmpty() || value.equals("-") || value.equalsIgnoreCase("N/A")) {
            return null;
        }
        
        try {
            String cleaned = value.replaceAll("[^0-9-]", "");
            return Long.parseLong(cleaned);
        } catch (NumberFormatException e) {
            log.warn("Failed to parse long value: {}", value);
            return null;
        }
    }

    /**
     * Parse a double value from string
     * @param value the string value
     * @return Double or null if parsing fails
     */
    public Double parseDouble(String value) {
        if (value == null || value.isEmpty() || value.equals("-") || value.equalsIgnoreCase("N/A")) {
            return null;
        }
        
        try {
            String cleaned = value.replaceAll("[^0-9.-]", "");
            return Double.parseDouble(cleaned);
        } catch (NumberFormatException e) {
            log.warn("Failed to parse double value: {}", value);
            return null;
        }
    }

    /**
     * Check if a value is empty or placeholder
     * @param value the value to check
     * @return true if empty, false otherwise
     */
    public boolean isEmpty(String value) {
        return value == null || 
               value.isEmpty() || 
               value.equals("-") || 
               value.equalsIgnoreCase("N/A") ||
               value.equalsIgnoreCase("null");
    }

    /**
     * Get text from element safely
     * @param element the element
     * @return text or empty string
     */
    public String getTextSafely(Element element) {
        return element != null ? cleanText(element.text()) : "";
    }

    /**
     * Get attribute from element safely
     * @param element the element
     * @param attribute the attribute name
     * @return attribute value or empty string
     */
    public String getAttributeSafely(Element element, String attribute) {
        return element != null ? element.attr(attribute) : "";
    }

    /**
     * Parse financial performance table with multi-row structure
     * Expected table structure:
     * - First 3 rows are headers
     * - Subsequent rows contain: Year, ..., EPS, ..., NAV, ..., Profit, ..., TCI
     * 
     * @param table the table element
     * @return map with keys in format "FieldName_Year" (e.g., "EPS_2024")
     */
    public Map<String, String> parseFinancialPerformanceTable(Element table) {
        Map<String, String> data = new HashMap<>();
        
        if (table == null) {
            return data;
        }
        
        Elements rows = table.select("tbody tr");
        
        // Skip first 3 header rows, process data rows
        for (int i = 3; i < rows.size(); i++) {
            Element row = rows.get(i);
            Elements cells = row.select("td");
            
            // Table typically has 12+ columns
            if (cells.size() >= 12) {
                String year = cleanText(cells.get(0).text());
                
                // Skip invalid rows
                if (isEmpty(year) || year.equals("Year")) {
                    continue;
                }
                
                // Extract financial metrics
                String epsBasic = cleanText(cells.size() > 4 ? cells.get(4).text() : "-");
                String epsDiluted = cleanText(cells.size() > 5 ? cells.get(5).text() : "-");
                String navPerShare = cleanText(cells.size() > 7 ? cells.get(7).text() : "-");
                String profit = cleanText(cells.size() > 10 ? cells.get(10).text() : "-");
                String totalComprehensiveIncome = cleanText(cells.size() > 12 ? cells.get(12).text() : "-");
                
                // Store with year suffix
                if (!isEmpty(epsBasic)) {
                    data.put("EPS_Basic_" + year, epsBasic);
                }
                if (!isEmpty(epsDiluted)) {
                    data.put("EPS_Diluted_" + year, epsDiluted);
                }
                if (!isEmpty(navPerShare)) {
                    data.put("NAV_Per_Share_" + year, navPerShare);
                }
                if (!isEmpty(profit)) {
                    data.put("Profit_" + year, profit);
                }
                if (!isEmpty(totalComprehensiveIncome)) {
                    data.put("Total_Comprehensive_Income_" + year, totalComprehensiveIncome);
                }
            }
        }
        
        return data;
    }
}
