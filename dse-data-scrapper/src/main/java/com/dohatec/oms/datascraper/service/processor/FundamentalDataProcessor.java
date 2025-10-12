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
     * @param companies list of companies
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
                
                // Collect loan status
                LoanStatus loanStatus = processLoanStatus(company, companyDataMap);
                if (loanStatus != null) {
                    loansToSave.add(loanStatus);
                }
                
            } catch (Exception e) {
                log.error("Failed to process data for: {}", company.getTradingCode(), e);
            }
        }
        
        // Remove duplicates within the batch itself (keep only unique company_id + year combinations)
        Map<String, DividendInformation> uniqueDividends = new LinkedHashMap<>();
        for (DividendInformation div : dividendsToSave) {
            String key = div.getCompanyId() + "_" + div.getYear();
            // Keep first occurrence or merge
            if (uniqueDividends.containsKey(key)) {
                DividendInformation existing = uniqueDividends.get(key);
                // Merge data
                if (div.getCashDividend() != null) existing.setCashDividend(div.getCashDividend());
                if (div.getStockDividend() != null) existing.setStockDividend(div.getStockDividend());
                if (div.getRightIssue() != null) existing.setRightIssue(div.getRightIssue());
                if (div.getNav() != null) existing.setNav(div.getNav());
                if (div.getYieldPercentage() != null) existing.setYieldPercentage(div.getYieldPercentage());
            } else {
                uniqueDividends.put(key, div);
            }
        }
        List<DividendInformation> uniqueDividendList = new ArrayList<>(uniqueDividends.values());
        
        // Batch save all entities
        log.info("Batch saving: {} companies, {} dividends (unique), {} financials, {} loans",
                companiesToUpdate.size(), uniqueDividendList.size(), 
                financialsToSave.size(), loansToSave.size());
        
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
            company.setTotalOutstandingSecurities(htmlParserUtil.parseInteger(dataMap.get("Total No. of Outstanding Securities")));
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
            
        } catch (Exception e) {
            log.error("Failed to process dividend information for: {}", company.getTradingCode(), e);
        }
        
        return dividendList;
    }

    /**
     * Parse dividend data (cash or stock)
     * Uses UPSERT logic - updates existing or creates new
     * @param company the company
     * @param data the dividend data string
     * @param type "cash" or "stock"
     * @return list of dividend information
     */
    private List<DividendInformation> parseDividendData(Company company, String data, String type) {
        List<DividendInformation> dividendList = new ArrayList<>();
        String[] entries = data.split(",");
        
        // Fetch existing dividends to avoid duplicates
        List<DividendInformation> existingDividends = dividendInformationRepository.findByCompanyId(company.getId());
        Map<Integer, DividendInformation> existingMap = existingDividends.stream()
                .collect(Collectors.toMap(DividendInformation::getYear, d -> d, (existing, duplicate) -> existing));
        
        // Track years we've already processed in this batch to avoid duplicates within batch
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
     * @param company the company
     * @param data the right issue data string
     * @return list of dividend information
     */
    private List<DividendInformation> parseRightIssueData(Company company, String data) {
        List<DividendInformation> dividendList = new ArrayList<>();
        String[] entries = data.split(",");
        
        // Fetch existing dividends
        List<DividendInformation> existingDividends = dividendInformationRepository.findByCompanyId(company.getId());
        Map<Integer, DividendInformation> existingMap = existingDividends.stream()
                .collect(Collectors.toMap(DividendInformation::getYear, d -> d, (existing, duplicate) -> existing));
        
        // Track years we've already processed in this batch to avoid duplicates within batch
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
     * Process financial performance
     * @param company the company
     * @param dataMap the data map
     * @return list of financial performance
     */
    private List<FinancialPerformance> processFinancialPerformance(Company company, Map<String, String> dataMap) {
        // Financial performance parsing requires complex table processing
        // Simplified for now - would need to parse multi-row tables
        // TODO: Implement detailed financial performance parsing
        log.debug("Financial performance processing not yet fully implemented for: {}", company.getTradingCode());
        return Collections.emptyList();
    }

    /**
     * Process loan status
     * @param company the company
     * @param dataMap the data map
     * @return loan status or null
     */
    private LoanStatus processLoanStatus(Company company, Map<String, String> dataMap) {
        try {
            if (dataMap.containsKey("Short-term loan (mn)") && dataMap.containsKey("Long-term loan (mn)")) {
                BigDecimal shortTermLoan = htmlParserUtil.parseNumeric(dataMap.get("Short-term loan (mn)"));
                BigDecimal longTermLoan = htmlParserUtil.parseNumeric(dataMap.get("Long-term loan (mn)"));
                
                // Fetch existing or create new
                LoanStatus loanStatus = loanStatusRepository.findByCompanyId(company.getId())
                        .orElse(LoanStatus.builder()
                                .id(UUID.randomUUID())
                                .companyId(company.getId())
                                .build());
                
                loanStatus.setShortTermLoan(shortTermLoan);
                loanStatus.setLongTermLoan(longTermLoan);
                
                return loanStatus;
            }
        } catch (Exception e) {
            log.error("Failed to process loan status for: {}", company.getTradingCode(), e);
        }
        
        return null;
    }
}
