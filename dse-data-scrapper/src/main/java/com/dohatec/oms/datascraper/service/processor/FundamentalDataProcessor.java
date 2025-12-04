package com.dohatec.oms.datascraper.service.processor;

import com.dohatec.oms.datascraper.dto.CompanyDataDTO;
import com.dohatec.oms.datascraper.model.*;
import com.dohatec.oms.datascraper.repository.*;
import com.dohatec.oms.datascraper.util.DateFormatterUtil;
import com.dohatec.oms.datascraper.util.HtmlParserUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Processor service for fundamental data
 * Handles business logic for processing and saving fundamental data
 * Supports batch processing for optimal performance
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FundamentalDataProcessor {

    private final CompanyRepository companyRepository;
    private final DividendInformationRepository dividendInformationRepository;
    private final FinancialPerformanceRepository financialPerformanceRepository;
    private final QuarterlyPerformanceRepository quarterlyPerformanceRepository;
    private final ShareholdingPatternRepository shareholdingPatternRepository;
    private final LoanStatusRepository loanStatusRepository;
    private final HtmlParserUtil htmlParserUtil;
    private final DateFormatterUtil dateFormatterUtil;

    /**
     * Process fundamental data for a batch of companies
     * Saves all data in a single transaction for better performance
     * Uses UPSERT logic to handle existing records
     * 
     * @param companies       list of companies
     * @param companyDataList list of parsed company data
     */
    @Transactional
    public void processFundamentalDataBatch(List<Company> companies, List<CompanyDataDTO> companyDataList) {
        log.info("Processing fundamental data batch for {} companies", companies.size());

        // Create maps for efficient lookup
        Map<String, Company> companyMap = companies.stream()
                .collect(Collectors.toMap(Company::getTradingCode, c -> c));

        Map<String, CompanyDataDTO> dataMap = companyDataList.stream()
                .collect(Collectors.toMap(CompanyDataDTO::getTradingCode, dto -> dto));

        // Batch collections
        List<Company> companiesToUpdate = new ArrayList<>();
        List<DividendInformation> dividendsToSave = new ArrayList<>();
        List<FinancialPerformance> financialsToSave = new ArrayList<>();
        List<QuarterlyPerformance> quarterlyPerformancesToSave = new ArrayList<>();
        List<LoanStatus> loansToSave = new ArrayList<>();

        // Process each company
        for (Company company : companies) {
            CompanyDataDTO data = dataMap.get(company.getTradingCode());

            if (data == null || !data.isSuccess()) {
                log.warn("Skipping company due to parsing failure: {}", company.getTradingCode());
                continue;
            }

            try {
                Map<String, String> companyDataMap = data.getDataMap();

                // Update company information
                updateCompanyInformation(company, companyDataMap);
                companiesToUpdate.add(company);

                // Collect dividend information
                List<DividendInformation> dividends = processDividendInformation(company, companyDataMap);
                dividendsToSave.addAll(dividends);

                // Collect financial performance
                List<FinancialPerformance> financials = processFinancialPerformance(company, companyDataMap);
                financialsToSave.addAll(financials);

                // Collect quarterly performance
                List<QuarterlyPerformance> quarterlyPerformances = processQuarterlyPerformance(company, companyDataMap);
                quarterlyPerformancesToSave.addAll(quarterlyPerformances);

                // Collect loan status
                LoanStatus loanStatus = processLoanStatus(company, companyDataMap);
                if (loanStatus != null) {
                    loansToSave.add(loanStatus);
                }

                // Process shareholding pattern
                processShareholdingPattern(company, companyDataMap);

            } catch (Exception e) {
                log.error("Failed to process data for: {}", company.getTradingCode(), e);
            }
        }

        // Remove duplicates within the batch itself (keep only unique company_id + year
        // combinations)
        Map<String, DividendInformation> uniqueDividends = new LinkedHashMap<>();
        for (DividendInformation div : dividendsToSave) {
            String key = div.getCompanyId() + "_" + div.getYear();
            // Keep first occurrence or merge
            if (uniqueDividends.containsKey(key)) {
                DividendInformation existing = uniqueDividends.get(key);
                // Merge data
                if (div.getCashDividend() != null)
                    existing.setCashDividend(div.getCashDividend());
                if (div.getStockDividend() != null)
                    existing.setStockDividend(div.getStockDividend());
                if (div.getRightIssue() != null)
                    existing.setRightIssue(div.getRightIssue());
                if (div.getNav() != null)
                    existing.setNav(div.getNav());
                if (div.getYieldPercentage() != null)
                    existing.setYieldPercentage(div.getYieldPercentage());
            } else {
                uniqueDividends.put(key, div);
            }
        }
        List<DividendInformation> uniqueDividendList = new ArrayList<>(uniqueDividends.values());

        // Remove duplicates for quarterly performance (keep only unique company_id +
        // quarter + date)
        Map<String, QuarterlyPerformance> uniqueQuarterlyPerformances = new LinkedHashMap<>();
        for (QuarterlyPerformance qp : quarterlyPerformancesToSave) {
            String key = qp.getCompanyId() + "_" + qp.getQuarter() + "_" + qp.getDate();
            // Keep first occurrence or merge
            if (uniqueQuarterlyPerformances.containsKey(key)) {
                QuarterlyPerformance existing = uniqueQuarterlyPerformances.get(key);
                // Merge data - update if new values are not null
                if (qp.getEpsBasic() != null)
                    existing.setEpsBasic(qp.getEpsBasic());
                if (qp.getEpsDiluted() != null)
                    existing.setEpsDiluted(qp.getEpsDiluted());
                if (qp.getMarketPriceEndPeriod() != null)
                    existing.setMarketPriceEndPeriod(qp.getMarketPriceEndPeriod());
            } else {
                uniqueQuarterlyPerformances.put(key, qp);
            }
        }
        List<QuarterlyPerformance> uniqueQuarterlyPerformanceList = new ArrayList<>(
                uniqueQuarterlyPerformances.values());

        // Batch save all entities
        log.info(
                "Batch saving: {} companies, {} dividends (unique), {} financials, {} quarterly performances (unique), {} loans",
                companiesToUpdate.size(), uniqueDividendList.size(),
                financialsToSave.size(), uniqueQuarterlyPerformanceList.size(), loansToSave.size());

        try {
            if (!companiesToUpdate.isEmpty()) {
                companyRepository.saveAll(companiesToUpdate);
                log.debug("Saved {} companies", companiesToUpdate.size());
            }

            if (!uniqueDividendList.isEmpty()) {
                dividendInformationRepository.saveAll(uniqueDividendList);
                log.debug("Saved {} dividends", uniqueDividendList.size());
            }

            if (!financialsToSave.isEmpty()) {
                financialPerformanceRepository.saveAll(financialsToSave);
                log.debug("Saved {} financials", financialsToSave.size());
            }

            if (!uniqueQuarterlyPerformanceList.isEmpty()) {
                quarterlyPerformanceRepository.saveAll(uniqueQuarterlyPerformanceList);
                log.debug("Saved {} quarterly performances", uniqueQuarterlyPerformanceList.size());
            }

            if (!loansToSave.isEmpty()) {
                loanStatusRepository.saveAll(loansToSave);
                log.debug("Saved {} loans", loansToSave.size());
            }

            log.info("Batch save completed successfully");

        } catch (Exception e) {
            log.error("Batch save failed: {}", e.getMessage());
            throw e;
        }
    }

    /**
     * Update company basic information
     * 
     * @param company the company
     * @param dataMap the data map
     */
    private void updateCompanyInformation(Company company, Map<String, String> dataMap) {
        // Update basic fields
        if (dataMap.containsKey("Company Name")) {
            company.setCompanyName(dataMap.get("Company Name"));
        }

        if (dataMap.containsKey("Scrip Code")) {
            company.setScripCode(htmlParserUtil.parseInteger(dataMap.get("Scrip Code")));
        }

        if (dataMap.containsKey("Sector")) {
            company.setSector(dataMap.get("Sector"));
        }

        if (dataMap.containsKey("Type of Instrument")) {
            company.setTypeOfInstrument(dataMap.get("Type of Instrument"));
        }

        if (dataMap.containsKey("Market Category")) {
            company.setMarketCategory(dataMap.get("Market Category"));
        }

        if (dataMap.containsKey("Authorized Capital (mn)")) {
            company.setAuthorizedCapital(htmlParserUtil.parseDouble(dataMap.get("Authorized Capital (mn)")));
        }

        if (dataMap.containsKey("Paid-up Capital (mn)")) {
            company.setPaidUpCapital(htmlParserUtil.parseDouble(dataMap.get("Paid-up Capital (mn)")));
        }

        if (dataMap.containsKey("Face/par Value")) {
            company.setFaceValue(htmlParserUtil.parseDouble(dataMap.get("Face/par Value")));
        }

        if (dataMap.containsKey("Market Lot")) {
            company.setMarketLot(htmlParserUtil.parseInteger(dataMap.get("Market Lot")));
        }

        if (dataMap.containsKey("Total No. of Outstanding Securities")) {
            company.setTotalOutstandingSecurities(
                    htmlParserUtil.parseInteger(dataMap.get("Total No. of Outstanding Securities")));
        }

        if (dataMap.containsKey("Listing Year")) {
            company.setListingYear(htmlParserUtil.parseInteger(dataMap.get("Listing Year")));
        }

        if (dataMap.containsKey("Year End")) {
            company.setYearEnd(dataMap.get("Year End"));
        }

        if (dataMap.containsKey("Reserve & Surplus without OCI (mn)")) {
            company.setReserveAndSurplus(htmlParserUtil.parseDouble(dataMap.get("Reserve & Surplus without OCI (mn)")));
        }

        if (dataMap.containsKey("52 Weeks' Moving Range")) {
            company.setFiftyTwoWeeksMovingRange(dataMap.get("52 Weeks' Moving Range"));
        }

        // Update contact information
        if (dataMap.containsKey("Head Office")) {
            company.setAddress(dataMap.get("Head Office"));
        }

        if (dataMap.containsKey("Factory")) {
            company.setFactoryAddress(dataMap.get("Factory"));
        }

        if (dataMap.containsKey("Telephone No.")) {
            company.setPhone(dataMap.get("Telephone No."));
        }

        if (dataMap.containsKey("E-mail")) {
            company.setEmail(dataMap.get("E-mail"));
        }

        if (dataMap.containsKey("Web Address")) {
            company.setWebsite(dataMap.get("Web Address"));
        }
    }

    /**
     * Process dividend information
     * Returns list of dividend information to be saved in batch
     * Includes dividend yield data from Table 8
     * 
     * @param company the company
     * @param dataMap the data map
     * @return list of dividend information
     */
    private List<DividendInformation> processDividendInformation(Company company, Map<String, String> dataMap) {
        List<DividendInformation> dividendList = new ArrayList<>();

        try {
            // Parse cash dividend (format: "12% 2024, 10% 2023, ...")
            if (dataMap.containsKey("Cash Dividend")) {
                String cashDividendStr = dataMap.get("Cash Dividend");
                if (cashDividendStr != null && !cashDividendStr.equals("-")) {
                    dividendList.addAll(parseDividendData(company, cashDividendStr, "cash"));
                }
            }

            // Parse bonus/stock dividend
            if (dataMap.containsKey("Bonus Issue (Stock Dividend)")) {
                String stockDividendStr = dataMap.get("Bonus Issue (Stock Dividend)");
                if (stockDividendStr != null && !stockDividendStr.equals("-")) {
                    dividendList.addAll(parseDividendData(company, stockDividendStr, "stock"));
                }
            }

            // Parse right issue
            if (dataMap.containsKey("Right Issue")) {
                String rightIssueStr = dataMap.get("Right Issue");
                if (rightIssueStr != null && !rightIssueStr.equals("-")) {
                    dividendList.addAll(parseRightIssueData(company, rightIssueStr));
                }
            }

            // Enrich with dividend yield data from Table 8
            enrichDividendWithYieldData(company, dataMap, dividendList);

        } catch (Exception e) {
            log.error("Failed to process dividend information for: {}", company.getTradingCode(), e);
        }

        return dividendList;
    }

    /**
     * Parse dividend data (cash or stock)
     * Uses UPSERT logic - updates existing or creates new
     * 
     * @param company the company
     * @param data    the dividend data string
     * @param type    "cash" or "stock"
     * @return list of dividend information
     */
    private List<DividendInformation> parseDividendData(Company company, String data, String type) {
        List<DividendInformation> dividendList = new ArrayList<>();
        String[] entries = data.split(",");

        // Fetch existing dividends to avoid duplicates
        List<DividendInformation> existingDividends = dividendInformationRepository.findByCompanyId(company.getId());
        Map<Integer, DividendInformation> existingMap = existingDividends.stream()
                .collect(Collectors.toMap(DividendInformation::getYear, d -> d, (existing, duplicate) -> existing));

        // Track years we've already processed in this batch to avoid duplicates within
        // batch
        Set<Integer> processedYears = new HashSet<>();

        for (String entry : entries) {
            try {
                String[] parts = entry.trim().split("%");
                if (parts.length == 2) {
                    Integer year = htmlParserUtil.parseInteger(parts[1].trim());
                    BigDecimal percentage = htmlParserUtil.parseNumeric(parts[0].trim());

                    if (year != null && !processedYears.contains(year)) {
                        DividendInformation dividendInfo = existingMap.get(year);

                        if (dividendInfo == null) {
                            // Create new
                            dividendInfo = DividendInformation.builder()
                                    .id(UUID.randomUUID())
                                    .companyId(company.getId())
                                    .year(year)
                                    .build();
                        }

                        // Update fields
                        if (type.equals("cash")) {
                            dividendInfo.setCashDividend(percentage);
                        } else if (type.equals("stock")) {
                            dividendInfo.setStockDividend(parts[0].trim());
                        }

                        dividendList.add(dividendInfo);
                        processedYears.add(year);
                        existingMap.put(year, dividendInfo);
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to parse dividend entry: {}", entry, e);
            }
        }

        return dividendList;
    }

    /**
     * Parse right issue data
     * Uses UPSERT logic - updates existing or creates new
     * 
     * @param company the company
     * @param data    the right issue data string
     * @return list of dividend information
     */
    private List<DividendInformation> parseRightIssueData(Company company, String data) {
        List<DividendInformation> dividendList = new ArrayList<>();
        String[] entries = data.split(",");

        // Fetch existing dividends
        List<DividendInformation> existingDividends = dividendInformationRepository.findByCompanyId(company.getId());
        Map<Integer, DividendInformation> existingMap = existingDividends.stream()
                .collect(Collectors.toMap(DividendInformation::getYear, d -> d, (existing, duplicate) -> existing));

        // Track years we've already processed in this batch to avoid duplicates within
        // batch
        Set<Integer> processedYears = new HashSet<>();

        for (String entry : entries) {
            try {
                String[] parts = entry.trim().split(" ");
                if (parts.length >= 2) {
                    String rightIssueValue = parts[0].trim();
                    Integer year = htmlParserUtil.parseInteger(parts[1].trim());

                    if (year != null && !processedYears.contains(year)) {
                        DividendInformation dividendInfo = existingMap.get(year);

                        if (dividendInfo == null) {
                            // Create new
                            dividendInfo = DividendInformation.builder()
                                    .id(UUID.randomUUID())
                                    .companyId(company.getId())
                                    .year(year)
                                    .build();
                        }

                        // Update field
                        dividendInfo.setRightIssue(rightIssueValue);
                        dividendList.add(dividendInfo);
                        processedYears.add(year);
                        existingMap.put(year, dividendInfo);
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to parse right issue entry: {}", entry, e);
            }
        }

        return dividendList;
    }

    /**
     * Enrich dividend information with yield data from Table 8
     * Updates dividend records with dividend yield percentages
     * 
     * @param company      the company
     * @param dataMap      the data map
     * @param dividendList the list of dividend records to enrich
     */
    private void enrichDividendWithYieldData(Company company, Map<String, String> dataMap,
            List<DividendInformation> dividendList) {
        try {
            // Create a map of existing dividends by year for quick lookup
            Map<Integer, DividendInformation> dividendMap = dividendList.stream()
                    .collect(Collectors.toMap(DividendInformation::getYear, d -> d, (existing, duplicate) -> existing));

            // Fetch existing dividends from database to include them as well
            List<DividendInformation> existingDividends = dividendInformationRepository
                    .findByCompanyId(company.getId());
            for (DividendInformation div : existingDividends) {
                dividendMap.putIfAbsent(div.getYear(), div);
            }

            // Extract dividend yield data from Table 8
            for (Map.Entry<String, String> entry : dataMap.entrySet()) {
                String key = entry.getKey();

                if (key.startsWith("Dividend_Yield_")) {
                    // Extract year from key
                    String yearStr = key.substring("Dividend_Yield_".length());
                    Integer year = htmlParserUtil.parseInteger(yearStr);

                    if (year != null) {
                        DividendInformation dividend = dividendMap.get(year);

                        if (dividend == null) {
                            // Create new dividend record for yield data
                            dividend = DividendInformation.builder()
                                    .id(UUID.randomUUID())
                                    .companyId(company.getId())
                                    .year(year)
                                    .build();
                            dividendList.add(dividend);
                            dividendMap.put(year, dividend);
                        }

                        // Update yield percentage
                        BigDecimal yieldPercentage = htmlParserUtil.parseNumeric(entry.getValue());
                        dividend.setYieldPercentage(yieldPercentage);
                    }
                }
            }

            log.debug("Enriched {} dividend records with yield data for: {}", dividendMap.size(),
                    company.getTradingCode());

        } catch (Exception e) {
            log.warn("Failed to enrich dividend yield data for: {}", company.getTradingCode(), e);
        }
    }

    /**
     * Process financial performance
     * Extracts financial metrics (EPS, NAV, Profit, TCI) for multiple years
     * Uses UPSERT logic - updates existing or creates new records
     * 
     * @param company the company
     * @param dataMap the data map
     * @return list of financial performance
     */
    private List<FinancialPerformance> processFinancialPerformance(Company company, Map<String, String> dataMap) {
        List<FinancialPerformance> financialList = new ArrayList<>();

        try {
            // Fetch existing financial performance to avoid duplicates
            List<FinancialPerformance> existingFinancials = financialPerformanceRepository
                    .findByCompanyId(company.getId());
            Map<Integer, FinancialPerformance> existingMap = existingFinancials.stream()
                    .collect(
                            Collectors.toMap(FinancialPerformance::getYear, f -> f, (existing, duplicate) -> existing));

            // Track years we've already processed in this batch
            Set<Integer> processedYears = new HashSet<>();

            // Extract year-based financial data from dataMap
            // Keys are in format: "EPS_Basic_2024", "NAV_Per_Share_2023", etc.
            Map<Integer, Map<String, String>> yearlyData = extractYearlyFinancialData(dataMap);

            // Process each year's data
            for (Map.Entry<Integer, Map<String, String>> entry : yearlyData.entrySet()) {
                Integer year = entry.getKey();
                Map<String, String> metrics = entry.getValue();

                if (year != null && !processedYears.contains(year)) {
                    FinancialPerformance financial = existingMap.get(year);

                    if (financial == null) {
                        // Create new record
                        financial = FinancialPerformance.builder()
                                .id(UUID.randomUUID())
                                .companyId(company.getId())
                                .year(year)
                                .build();
                    }

                    // Update fields from metrics (Table 7 data)
                    if (metrics.containsKey("EPS_Basic")) {
                        financial.setEpsBasic(htmlParserUtil.parseNumeric(metrics.get("EPS_Basic")));
                    }
                    if (metrics.containsKey("EPS_Diluted")) {
                        financial.setEpsDiluted(htmlParserUtil.parseNumeric(metrics.get("EPS_Diluted")));
                    }
                    if (metrics.containsKey("NAV_Per_Share")) {
                        financial.setNavPerShare(htmlParserUtil.parseNumeric(metrics.get("NAV_Per_Share")));
                    }
                    if (metrics.containsKey("Profit")) {
                        financial.setProfit(htmlParserUtil.parseNumeric(metrics.get("Profit")));
                    }
                    if (metrics.containsKey("Total_Comprehensive_Income")) {
                        financial.setTotalComprehensiveIncome(
                                htmlParserUtil.parseNumeric(metrics.get("Total_Comprehensive_Income")));
                    }

                    // Update PE and PB ratios from Table 8 if available
                    if (metrics.containsKey("PE_Ratio_Basic_Restated")) {
                        financial.setPeRatio(htmlParserUtil.parseNumeric(metrics.get("PE_Ratio_Basic_Restated")));
                    } else if (metrics.containsKey("PE_Ratio_Basic_Original")) {
                        // Fallback to original if restated not available
                        financial.setPeRatio(htmlParserUtil.parseNumeric(metrics.get("PE_Ratio_Basic_Original")));
                    }

                    if (metrics.containsKey("PB_Ratio")) {
                        financial.setPbRatio(htmlParserUtil.parseNumeric(metrics.get("PB_Ratio")));
                    }

                    // Calculate ratios if not available from tables
                    calculateFinancialRatios(financial, company);

                    financialList.add(financial);
                    processedYears.add(year);
                    existingMap.put(year, financial);
                }
            }

            if (financialList.isEmpty()) {
                log.debug("No financial performance data found for: {}", company.getTradingCode());
            } else {
                log.debug("Processed {} years of financial performance for: {}", financialList.size(),
                        company.getTradingCode());
            }

        } catch (Exception e) {
            log.error("Failed to process financial performance for: {}", company.getTradingCode(), e);
        }

        return financialList;
    }

    /**
     * Extract yearly financial data from dataMap
     * Converts keys like "EPS_Basic_2024" into a structured map by year
     * 
     * @param dataMap the data map
     * @return map of year -> metrics map
     */
    private Map<Integer, Map<String, String>> extractYearlyFinancialData(Map<String, String> dataMap) {
        Map<Integer, Map<String, String>> yearlyData = new HashMap<>();

        // Financial performance field patterns from Table 7
        String[] fieldPatterns = {
                "EPS_Basic_",
                "EPS_Diluted_",
                "NAV_Per_Share_",
                "Profit_",
                "Total_Comprehensive_Income_",
                "PE_Ratio_Basic_Restated_",
                "PE_Ratio_Basic_Original_",
                "PB_Ratio_"
        };

        for (Map.Entry<String, String> entry : dataMap.entrySet()) {
            String key = entry.getKey();
            String value = entry.getValue();

            // Check if key matches any field pattern
            for (String pattern : fieldPatterns) {
                if (key.startsWith(pattern)) {
                    // Extract year from key
                    String yearStr = key.substring(pattern.length());
                    Integer year = htmlParserUtil.parseInteger(yearStr);

                    if (year != null && year > 1900 && year < 2100) {
                        // Get or create metrics map for this year
                        Map<String, String> metrics = yearlyData.computeIfAbsent(year, k -> new HashMap<>());

                        // Store metric without year suffix
                        String fieldName = pattern.substring(0, pattern.length() - 1); // Remove trailing underscore
                        metrics.put(fieldName, value);
                    }
                    break;
                }
            }
        }

        return yearlyData;
    }

    /**
     * Process quarterly performance data from dataMap
     * Extracts quarterly EPS and market price data and creates QuarterlyPerformance
     * entities
     * 
     * @param company the company
     * @param dataMap the parsed data map containing quarterly data
     * @return list of QuarterlyPerformance entities
     */
    private List<QuarterlyPerformance> processQuarterlyPerformance(Company company, Map<String, String> dataMap) {
        List<QuarterlyPerformance> quarterlyList = new ArrayList<>();

        try {
            // Extract quarterly data from dataMap
            // Keys are in format: "Earnings_Per_Share_(EPS)_Basic_Q1_202409"
            Map<String, Map<String, String>> quarterlyDataMap = extractQuarterlyData(dataMap);

            // Fetch existing quarterly performance to avoid duplicates
            List<QuarterlyPerformance> existingQuarterlies = quarterlyPerformanceRepository
                    .findByCompanyId(company.getId());
            Map<String, QuarterlyPerformance> existingMap = existingQuarterlies.stream()
                    .collect(Collectors.toMap(
                            qp -> qp.getQuarter() + "_" + qp.getDate(),
                            qp -> qp,
                            (existing, duplicate) -> existing));

            // Process each quarter's data
            for (Map.Entry<String, Map<String, String>> entry : quarterlyDataMap.entrySet()) {
                String quarterKey = entry.getKey(); // e.g., "Q1_202409"
                Map<String, String> metrics = entry.getValue();

                if (quarterKey == null || metrics.isEmpty()) {
                    continue;
                }

                // Parse quarter name and date from key
                String[] parts = quarterKey.split("_");
                if (parts.length < 2) {
                    log.warn("Invalid quarter key format: {}", quarterKey);
                    continue;
                }

                String quarter = parts[0]; // Q1, Q2, Q3, Q4
                String dateStr = parts[1]; // YYYYMM format (e.g., 202409)

                // Only process actual quarters (Q1-Q4), skip cumulative periods
                if (!quarter.matches("Q[1-4]")) {
                    log.debug("Skipping non-quarter period: {}", quarter);
                    continue;
                }

                // Parse date from YYYYMM format
                LocalDate date = dateFormatterUtil.parseYearMonthDate(dateStr);
                if (date == null) {
                    log.warn("Failed to parse date from: {}", dateStr);
                    continue;
                }

                // Check if this quarter already exists
                String existingKey = quarter + "_" + date;
                QuarterlyPerformance quarterlyPerformance = existingMap.get(existingKey);

                if (quarterlyPerformance == null) {
                    // Create new record
                    quarterlyPerformance = QuarterlyPerformance.builder()
                            .id(UUID.randomUUID())
                            .companyId(company.getId())
                            .quarter(quarter)
                            .date(date)
                            .build();
                }

                // Update fields from metrics
                if (metrics.containsKey("EPS_Basic")) {
                    quarterlyPerformance.setEpsBasic(htmlParserUtil.parseNumeric(metrics.get("EPS_Basic")));
                }
                if (metrics.containsKey("EPS_Diluted")) {
                    quarterlyPerformance.setEpsDiluted(htmlParserUtil.parseNumeric(metrics.get("EPS_Diluted")));
                }
                if (metrics.containsKey("Market_Price")) {
                    quarterlyPerformance
                            .setMarketPriceEndPeriod(htmlParserUtil.parseNumeric(metrics.get("Market_Price")));
                }

                quarterlyList.add(quarterlyPerformance);

                log.debug("Processed quarterly performance for {} - {}: EPS Basic = {}, Market Price = {}",
                        company.getTradingCode(), quarterKey,
                        quarterlyPerformance.getEpsBasic(),
                        quarterlyPerformance.getMarketPriceEndPeriod());
            }

            log.debug("Processed {} quarterly performance records for company: {}",
                    quarterlyList.size(), company.getTradingCode());

        } catch (Exception e) {
            log.error("Failed to process quarterly performance for company: {}", company.getTradingCode(), e);
        }

        return quarterlyList;
    }

    /**
     * Extract quarterly data from dataMap
     * Converts keys like "Earnings_Per_Share_(EPS)_Basic_Q1_202409" into a
     * structured map by quarter
     * 
     * @param dataMap the data map
     * @return map of quarterKey (e.g., "Q1_202409") -> metrics map
     */
    private Map<String, Map<String, String>> extractQuarterlyData(Map<String, String> dataMap) {
        Map<String, Map<String, String>> quarterlyData = new HashMap<>();

        // Quarterly field patterns from Table 4 (Quarterly Performance)
        // Keys are in format: "Section_RowLabel_QuarterName_Date"
        // Examples:
        // - "Earnings_Per_Share_(EPS)_Basic_Q1_202409"
        // - "Earnings_Per_Share_(EPS)_Diluted_Q2_202412"
        // - "Market_price_per_share_at_period_end_Q3_202503"

        for (Map.Entry<String, String> entry : dataMap.entrySet()) {
            String key = entry.getKey();
            String value = entry.getValue();

            // Look for quarterly keys (containing Q1, Q2, Q3, Q4 followed by date)
            // Pattern: *_Q[1-4]_YYYYMM
            if (key.matches(".*_Q[1-4]_\\d{6}")) {
                // Extract quarter and date from the end of the key
                String[] parts = key.split("_");

                // Find the quarter and date parts (last 2 parts)
                if (parts.length >= 2) {
                    String date = parts[parts.length - 1]; // YYYYMM
                    String quarter = parts[parts.length - 2]; // Q1, Q2, etc.

                    if (quarter.matches("Q[1-4]") && date.matches("\\d{6}")) {
                        String quarterKey = quarter + "_" + date;

                        // Get or create metrics map for this quarter
                        Map<String, String> metrics = quarterlyData.computeIfAbsent(quarterKey, k -> new HashMap<>());

                        // Determine the field name from the key
                        String fieldName = determineQuarterlyFieldName(key);
                        if (fieldName != null) {
                            metrics.put(fieldName, value);
                        }
                    }
                }
            }
        }

        log.debug("Extracted {} quarters from quarterly data", quarterlyData.size());
        return quarterlyData;
    }

    /**
     * Determine the field name from a quarterly data key
     * 
     * @param key the full key (e.g., "Earnings_Per_Share_(EPS)_Basic_Q1_202409")
     * @return simplified field name (e.g., "EPS_Basic")
     */
    private String determineQuarterlyFieldName(String key) {
        // Map various key patterns to standardized field names
        if (key.contains("Basic") && key.contains("EPS")) {
            return "EPS_Basic";
        } else if (key.contains("Diluted") && key.contains("EPS")) {
            return "EPS_Diluted";
        } else if (key.contains("Market") && key.contains("price")) {
            return "Market_Price";
        }
        return null;
    }

    /**
     * Calculate financial ratios (PE, PB) if sufficient data is available
     * 
     * @param financial the financial performance
     * @param company   the company
     */
    private void calculateFinancialRatios(FinancialPerformance financial, Company company) {
        try {
            // Calculate PE Ratio (Price / EPS)
            if (financial.getEpsBasic() != null && financial.getEpsBasic().compareTo(BigDecimal.ZERO) > 0) {
                // Would need current market price for accurate PE ratio
                // For now, we'll leave it null or calculate based on stored company EPS if
                // available
                if (company.getEps() != null && company.getEps().compareTo(BigDecimal.ZERO) > 0) {
                    // PE = Market Price / EPS, but we don't have market price in financial
                    // performance
                    // This would require historical price data for the year
                    // Leaving as null for now
                }
            }

            // Calculate PB Ratio (Price / Book Value per Share)
            if (financial.getNavPerShare() != null && financial.getNavPerShare().compareTo(BigDecimal.ZERO) > 0) {
                // Similar to PE ratio, would need market price
                // Leaving as null for now
            }

        } catch (Exception e) {
            log.warn("Failed to calculate financial ratios for year {}: {}", financial.getYear(), e.getMessage());
        }
    }

    /**
     * Process loan status
     * 
     * @param company the company
     * @param dataMap the data map
     * @return loan status or null
     */
    private LoanStatus processLoanStatus(Company company, Map<String, String> dataMap) {
        try {
            // Try new normalized keys first (from parseLoanStatusTable)
            boolean hasNewFormat = dataMap.containsKey("Short_Term_Loan") || dataMap.containsKey("Long_Term_Loan");
            // Fallback to old format keys (from parseKeyValueTable)
            boolean hasOldFormat = dataMap.containsKey("Short-term loan (mn)")
                    || dataMap.containsKey("Long-term loan (mn)");

            if (hasNewFormat || hasOldFormat) {
                // Parse short-term loan (try both formats)
                BigDecimal shortTermLoan = null;
                if (dataMap.containsKey("Short_Term_Loan")) {
                    shortTermLoan = htmlParserUtil.parseNumeric(dataMap.get("Short_Term_Loan"));
                } else if (dataMap.containsKey("Short-term loan (mn)")) {
                    shortTermLoan = htmlParserUtil.parseNumeric(dataMap.get("Short-term loan (mn)"));
                }

                // Parse long-term loan (try both formats)
                BigDecimal longTermLoan = null;
                if (dataMap.containsKey("Long_Term_Loan")) {
                    longTermLoan = htmlParserUtil.parseNumeric(dataMap.get("Long_Term_Loan"));
                } else if (dataMap.containsKey("Long-term loan (mn)")) {
                    longTermLoan = htmlParserUtil.parseNumeric(dataMap.get("Long-term loan (mn)"));
                }

                // Only create loan status if we have at least one loan value
                if (shortTermLoan != null || longTermLoan != null) {
                    // Fetch existing or create new
                    LoanStatus loanStatus = loanStatusRepository.findByCompanyId(company.getId())
                            .orElse(LoanStatus.builder()
                                    .id(UUID.randomUUID())
                                    .companyId(company.getId())
                                    .build());

                    loanStatus.setShortTermLoan(shortTermLoan);
                    loanStatus.setLongTermLoan(longTermLoan);

                    log.debug("Processed loan status for {}: Short-term = {}, Long-term = {}",
                            company.getTradingCode(), shortTermLoan, longTermLoan);

                    return loanStatus;
                }
            }
        } catch (Exception e) {
            log.error("Failed to process loan status for: {}", company.getTradingCode(), e);
        }

        return null;
    }

    /**
     * Process shareholding pattern
     * Extracts and saves shareholding distribution data
     * 
     * @param company the company
     * @param dataMap the data map
     */
    private void processShareholdingPattern(Company company, Map<String, String> dataMap) {
        try {
            // Extract shareholding data
            String yearStr = dataMap.get("Shareholding_Pattern_Year");
            Integer year = htmlParserUtil.parseInteger(yearStr);

            if (year == null) {
                log.debug("No shareholding pattern year found for: {}", company.getTradingCode());
                return;
            }

            // Parse shareholding percentages
            BigDecimal sponsorDirector = htmlParserUtil.parseNumeric(dataMap.get("Shareholding_Sponsor_Director"));
            BigDecimal govt = htmlParserUtil.parseNumeric(dataMap.get("Shareholding_Govt"));
            BigDecimal institute = htmlParserUtil.parseNumeric(dataMap.get("Shareholding_Institute"));
            BigDecimal foreign = htmlParserUtil.parseNumeric(dataMap.get("Shareholding_Foreign"));
            BigDecimal publicShare = htmlParserUtil.parseNumeric(dataMap.get("Shareholding_Public"));

            // Check if we have any shareholding data
            if (sponsorDirector == null && govt == null && institute == null && foreign == null
                    && publicShare == null) {
                log.debug("No shareholding percentages found for: {}", company.getTradingCode());
                return;
            }

            // Convert year to LocalDate (use Dec 31 of that year as default)
            LocalDate date = LocalDate.of(year, 12, 31);

            // Fetch existing or create new
            ShareholdingPattern shareholding = shareholdingPatternRepository
                    .findByCompanyIdAndDate(company.getId(), date)
                    .orElse(ShareholdingPattern.builder()
                            .id(UUID.randomUUID())
                            .companyId(company.getId())
                            .date(date)
                            .build());

            // Update fields (use correct field names from model)
            if (sponsorDirector != null)
                shareholding.setSponsorDirector(sponsorDirector);
            if (govt != null)
                shareholding.setGovernment(govt);
            if (institute != null)
                shareholding.setInstitute(institute);
            if (foreign != null)
                shareholding.setForeignHolder(foreign);
            if (publicShare != null)
                shareholding.setPublicHolder(publicShare);

            // Save immediately (not batched as it's typically one record per company)
            shareholdingPatternRepository.save(shareholding);
            log.debug("Saved shareholding pattern for {} (Date: {})", company.getTradingCode(), date);

        } catch (Exception e) {
            log.error("Failed to process shareholding pattern for: {}", company.getTradingCode(), e);
        }
    }
}
