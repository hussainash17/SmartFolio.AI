package com.dohatec.oms.datascraper.util;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Arrays;
import java.util.List;

/**
 * Utility class for parsing and formatting dates
 * Handles various date formats found on DSE website
 */
@Slf4j
@Component
public class DateFormatterUtil {

    // Common date formats used on DSE website
    private static final List<DateTimeFormatter> DATE_FORMATTERS = Arrays.asList(
        DateTimeFormatter.ofPattern("dd MMM, yyyy"),    // "30 Jun, 2024"
        DateTimeFormatter.ofPattern("dd-MM-yyyy"),      // "30-06-2024"
        DateTimeFormatter.ofPattern("dd/MM/yyyy"),      // "30/06/2024"
        DateTimeFormatter.ofPattern("yyyy-MM-dd"),      // "2024-06-30"
        DateTimeFormatter.ofPattern("MMM dd, yyyy"),    // "Jun 30, 2024"
        DateTimeFormatter.ofPattern("yyyyMMdd"),        // "20240630"
        DateTimeFormatter.ofPattern("dd.MM.yyyy")       // "30.06.2024"
    );

    /**
     * Parse a date string using multiple formats
     * @param dateStr the date string
     * @return LocalDate or null if parsing fails
     */
    public LocalDate parseDate(String dateStr) {
        if (dateStr == null || dateStr.isEmpty() || dateStr.equals("-") || dateStr.equals("0")) {
            return null;
        }
        
        // Clean the date string
        String cleanedDate = dateStr.trim()
                .replaceAll("\\s+", " ")
                .replaceAll("\\(.*?\\)", "") // Remove content in parentheses
                .trim();
        
        // Try each formatter
        for (DateTimeFormatter formatter : DATE_FORMATTERS) {
            try {
                return LocalDate.parse(cleanedDate, formatter);
            } catch (DateTimeParseException e) {
                // Continue to next formatter
            }
        }
        
        log.warn("Failed to parse date: {}", dateStr);
        return null;
    }

    /**
     * Parse date from "yyyyMMdd" format specifically
     * @param dateStr the date string
     * @return LocalDate or null if parsing fails
     */
    public LocalDate parseDateYYYYMMDD(String dateStr) {
        if (dateStr == null || dateStr.length() != 6 && dateStr.length() != 8) {
            return null;
        }
        
        try {
            if (dateStr.length() == 6) {
                // Format: "202406" -> add "01" for first day of month
                dateStr = dateStr + "01";
            }
            return LocalDate.parse(dateStr, DateTimeFormatter.ofPattern("yyyyMMdd"));
        } catch (DateTimeParseException e) {
            log.warn("Failed to parse date (yyyyMMdd): {}", dateStr);
            return null;
        }
    }

    /**
     * Extract date from text containing date pattern
     * Example: "Share Holding Percentage [as on Jun 30, 2024 (year ended)]"
     * @param text the text containing date
     * @return extracted date string
     */
    public String extractDateFromText(String text) {
        if (text == null || text.isEmpty()) {
            return null;
        }
        
        // Extract content between brackets
        String extracted = text.replaceAll(".*\\[as on (.*?)\\].*", "$1");
        if (!extracted.equals(text)) {
            return extracted.trim();
        }
        
        return text.trim();
    }

    /**
     * Format LocalDate to string
     * @param date the LocalDate
     * @param pattern the pattern (e.g., "dd-MM-yyyy")
     * @return formatted date string
     */
    public String formatDate(LocalDate date, String pattern) {
        if (date == null) {
            return null;
        }
        
        try {
            return date.format(DateTimeFormatter.ofPattern(pattern));
        } catch (Exception e) {
            log.warn("Failed to format date: {} with pattern: {}", date, pattern);
            return null;
        }
    }

    /**
     * Format LocalDate to ISO format (yyyy-MM-dd)
     * @param date the LocalDate
     * @return formatted date string
     */
    public String formatDateISO(LocalDate date) {
        return formatDate(date, "yyyy-MM-dd");
    }

    /**
     * Get current date/time
     * @return current LocalDateTime
     */
    public LocalDateTime getCurrentDateTime() {
        return LocalDateTime.now();
    }

    /**
     * Get current date
     * @return current LocalDate
     */
    public LocalDate getCurrentDate() {
        return LocalDate.now();
    }

    /**
     * Check if a date string is valid
     * @param dateStr the date string
     * @return true if valid, false otherwise
     */
    public boolean isValidDate(String dateStr) {
        return parseDate(dateStr) != null;
    }
}

