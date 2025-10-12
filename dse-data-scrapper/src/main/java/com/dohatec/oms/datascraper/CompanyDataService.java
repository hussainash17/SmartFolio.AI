//package com.dohatec.oms.datascraper;
//
//import com.dohatec.oms.datascraper.entity.*;
//import com.dohatec.oms.datascraper.repository.*;
//import lombok.RequiredArgsConstructor;
//import lombok.extern.slf4j.Slf4j;
//import org.jsoup.Jsoup;
//import org.jsoup.nodes.Document;
//import org.jsoup.nodes.Element;
//import org.jsoup.select.Elements;
//import org.springframework.stereotype.Service;
//import org.springframework.web.client.RestTemplate;
//
//import java.math.BigDecimal;
//import java.text.ParseException;
//import java.time.LocalDate;
//import java.time.format.DateTimeFormatter;
//import java.util.*;
//import java.util.function.Function;
//import java.util.stream.Collectors;
//
//@Service
//@Slf4j
//@RequiredArgsConstructor
//public class CompanyDataService {
//    private final ShareHoldingRepository shareHoldingRepository;
//
//    private final DividendInformationRepository dividendInformationRepository;
//
//    private final QuarterlyPerformanceRepository quarterlyPerformanceRepository;
//
//    private final FinancialPerformanceRepository financialPerformanceRepository;
//
//    private final CompanyRepository companyRepository;
//
//    private final LoanStatusRepository loanStatusRepository;
//
//    private static final String COMPANY_URL_TEMPLATE = "https://dsebd.org/displayCompany.php?name=%s";
//    private static final String YCP_URL = "https://dsebd.org/latest_share_price_scroll_by_ltp.php";
//    private static final DateTimeFormatter DEBUT_TRADE_DATE_FORMAT = DateTimeFormatter.ofPattern("dd MMM, yyyy");
//    private static final DateTimeFormatter LAST_AGM_DATE_FORMAT = DateTimeFormatter.ofPattern("dd-MM-yyyy");
//    private static final DateTimeFormatter YEAR_MONTH_YYYYMM = DateTimeFormatter.ofPattern("yyyyMMdd");
//
//    public void getYCP() {
//        StringBuilder sqlQuery = new StringBuilder();
//        try {
//            // Fetch the HTML content as a string
//            String htmlContent = getHtml(YCP_URL);
//            // Parse the HTML content with Jsoup
//            Document doc = Jsoup.parse(htmlContent);
//
//            // Select the table using its class name
//            Elements tables = doc.select("table.shares-table");
//            // Loop through each table
//            for (Element table : tables) {
//                // Select all tbody elements within the table
//                Elements tbodies = table.select("tbody");
//
//                // Loop through each tbody
//                for (Element tbody : tbodies) {
//                    // Select all rows in the tbody
//                    Elements rows = tbody.select("tr");
//
//                    // Loop through each row
//                    for (Element row : rows) {
//                        Element companyNameElement = row.select("td a.ab1").first();
//                        Elements tdElements = row.select("td");
//
//                        String tradingCode = companyNameElement != null ? companyNameElement.text().trim() : "N/A";
//                        String ltp = tdElements.size() > 2 ? tdElements.get(2).text().trim() : "N/A";
//                        String high = tdElements.size() > 3 ? tdElements.get(3).text().trim() : "N/A";
//                        String low = tdElements.size() > 4 ? tdElements.get(4).text().trim() : "N/A";
//                        String closep = tdElements.size() > 5 ? tdElements.get(5).text().trim() : "N/A";
//                        String ycp = tdElements.size() > 6 ? tdElements.get(6).text().trim() : "N/A";
//                        String change = tdElements.size() > 7 ? tdElements.get(7).text().trim() : "N/A";
//                        String trade = tdElements.size() > 8 ? tdElements.get(8).text().trim() : "N/A";
//                        String value = tdElements.size() > 9 ? tdElements.get(9).text().trim() : "N/A";
//                        String volume = tdElements.size() > 10 ? tdElements.get(10).text().trim() : "N/A";
//
//                        // Extract company name
//                        String companyName = companyNameElement != null ? companyNameElement.text().concat("''PB") : "N/A";
//
//                        // Extract second td[width=12%] (which contains the price)
//                        String price = tdElements.size() > 1 ? tdElements.get(1).text() : "N/A";
//
//                        // Print extracted data
//                        System.out.println("Company Name: " + companyName + ", Price: " + price);
//                        sqlQuery.append("UPDATE stock_information SET ycp = ")
//                                .append(price.replace(",", ""))  // Ensure price is formatted correctly
//                                .append(" WHERE stock_code = '")
//                                .append(companyName)
//                                .append("';\n");
//                    }
//                }
//            }
//            System.out.println(sqlQuery.toString());
//        } catch (Exception e) {
//            e.printStackTrace();
//        }
//    }
//
//    public List<Map<String, String>> fetchAndParseCompanyData(String stockCode) {
//        String url = String.format(COMPANY_URL_TEMPLATE, stockCode);
//
//        try {
//            // Fetch the HTML content as a string
//            String htmlContent = getHtml(url);
//
//            // Parse the HTML content with Jsoup
//            Document document = Jsoup.parse(htmlContent);
//
//            // List to hold parsed data from all tables
//            List<Map<String, String>> allTablesData = new ArrayList<>();
//            String companyName = document.selectFirst("h2.BodyHead.topBodyHead") != null ?
//                    document.selectFirst("h2.BodyHead.topBodyHead").selectFirst("i").text() : null;
//            // Select all tables with the class "table table-bordered background-white"
//            Elements tables = document.select("table.table.table-bordered.background-white");
//            String lastAgmDate = document.selectFirst("h2.BodyHead.topBodyHead div.pull-left i") != null ?
//                    document.selectFirst("h2.BodyHead.topBodyHead div.pull-left i").text() : null;
//            Map<String, String> mergedTableData = new HashMap<>();
//            mergedTableData.put("Company Name", companyName);
//            mergedTableData.put("Last AGM Date", lastAgmDate);
//            // Loop through each table
//            for (int i = 0; i < tables.size(); i++) {
//                Map<String, String> tableData = new HashMap<>();
//                Element table = tables.get(i);
//
//                switch (i) {
//                    case 0:
//                        tableData = parseTableOne(table);
//                        break;
//                    case 1:
//                        tableData = parseTableTwo(table);
//                        break;
//                    case 2:
//                        tableData = parseBasicInformation(table, stockCode);
//                        break;
//                    case 3:
//                        tableData = parseCompanyResearve(table, stockCode);
//                        break;
//                    case 4:
//                        tableData = parseQuarterlyPerformance(table, stockCode);
//                        break;
//                    case 6:
//                        // tableData = parseFinancialPerformance1(table, stockCode);
//                        break;
//                    case 7:
//                        parseFinancialPerformance(table, stockCode);
//                        break;
//                    case 8:
//                        tableData = parseFinancialPerformance1(table, stockCode);
//                        break;
//                    case 9:
//                        // tableData = parseFinancialDataTest(table);
//                        break;
//                    case 10:
//                        tableData = parseShareHoldingData(table, stockCode);
//                        break;
//                    case 11:
//                        tableData = parseCorporatePerformance(table);
//                        break;
//                    case 12:
//                        tableData = parseAddressInfoTable(table);
//                        break;
//                    default:
//                        tableData = new HashMap<>();
//                        tableData.put("message", "No specific parsing method defined for table " + (i + 1));
//                }
//                if (tableData != null && !tableData.isEmpty())
//                    mergedTableData.putAll(tableData);
//            }
//
//            processTheFundamentalData(mergedTableData, stockCode);
//
//            return allTablesData;
//
//        } catch (Exception e) {
//            e.printStackTrace();
//            return null;
//        }
//    }
//
//    private void processTheFundamentalData(Map<String, String> mergedTableData, String stockCode) {
//        updateCompanyInformation(mergedTableData, stockCode);
//        updateDividendInformation(mergedTableData, stockCode);
//        updateLoanInformation(mergedTableData, stockCode);
//        // share holding done
//        // loan information done
//        // means everything is done
//    }
//
//    private void updateDividendYieldPercentage(Map<String, String> mergedTableData, String stockCode) {
//        // Extract all years from the map keys
//        Set<Integer> years = mergedTableData.keySet().stream()
//                .map(Integer::valueOf)
//                .collect(Collectors.toSet());
//
//        // Fetch all dividend information records for the stock code and years in one query
//        List<DividendInformation> dividendInfoList = dividendInformationRepository
//                .findByTradingCodeAndYearIn(stockCode, years);
//
//        // Update the yield percentage for each record
//        dividendInfoList.forEach(dividendInfo -> {
//            String yearKey = String.valueOf(dividendInfo.getYear());
//            String yieldValue = mergedTableData.get(yearKey);
//            if (yieldValue != null) {
//                dividendInfo.setYieldPercentage(new BigDecimal(yieldValue));
//            }
//        });
//
//        // Bulk save all updated records
//        dividendInformationRepository.saveAll(dividendInfoList);
//    }
//
//    private void updateLoanInformation(Map<String, String> mergedTableData, String stockCode) {
//        //        "Short-term loan (mn)" -> "0.00"
//        //        "Long-term loan (mn)" -> "0.00
//        String shortTermLoan = mergedTableData.get("Short-term loan (mn)");
//        String longTermLoan = mergedTableData.get("Long-term loan (mn)");
//
//        Optional<LoanStatus> existingLoanInfo = loanStatusRepository.findByTradingCode(stockCode);
//        LoanStatus loanInformation;
//        if (existingLoanInfo.isPresent()) {
//            loanInformation = existingLoanInfo.get();
//            loanInformation.setShortTermLoan(new BigDecimal(shortTermLoan));
//            loanInformation.setLongTermLoan(new BigDecimal(longTermLoan));
//        } else {
//            loanInformation = LoanStatus.builder()
//                    .tradingCode(stockCode)
//                    .shortTermLoan(new BigDecimal(shortTermLoan))
//                    .longTermLoan(new BigDecimal(longTermLoan))
//                    .build();
//        }
//        loanStatusRepository.save(loanInformation);
//    }
//
//    private void updateDividentInformation(Map<String, String> mergedTableData, String stockCode) {
//        //        "Year End" -> "30-Jun"
//        //        "Bonus Issue (Stock Dividend)" -> "-"
//        //        "Bonus Issue (Stock Dividend)" -> 10% 2020, 10% 2019, 20% 2018, 10% 2017, 10% 2014
//        //        "Cash Dividend" -> "12% 2024, 10% 2023, 20% 2022, 10% 2021, 10% 2020, 14% 2019, 14% 2018, 14% 2017, 14% 2016, 13% 2015"
//        //        "Right Issue" -> "1:1R 1996"
//        //        "Other Comprehensive Income (OCI) (mn)" -> "0.2"
//        //        "Reserve & Surplus without OCI (mn)" -> "110.9"
//        // here save the dividend information in the divident information table
//        List<DividendInformation> dividendInformationList = new ArrayList<>();
//
//        // Process Cash Dividend
//        String cashDividend = mergedTableData.get("Cash Dividend");
//        if (cashDividend != null && !cashDividend.equals("-")) {
//            String[] yearlyDividends = cashDividend.split(",");
//            for (String yearlyDividend : yearlyDividends) {
//                String[] parts = yearlyDividend.trim().split("%");
//                if (parts.length == 2) {
//                    int year = Integer.parseInt(parts[1].trim());
//                    BigDecimal percentage = new BigDecimal(parts[0].trim());
//
//                    Optional<DividendInformation> existingDividend = dividendInformationRepository.findByTradingCodeAndYear(stockCode, year);
//                    if (existingDividend.isPresent()) {
//                        DividendInformation dividendInformation = existingDividend.get();
//                        dividendInformation.setCashDividend(percentage);
//                        dividendInformationList.add(dividendInformation);
//                    } else {
//                        DividendInformation newDividendInformation = DividendInformation.builder()
//                                .tradingCode(stockCode)
//                                .year(year)
//                                .cashDividend(percentage)
//                                .build();
//                        dividendInformationList.add(newDividendInformation);
//                    }
//                }
//            }
//        }
//
//        // Process Bonus Stock
//        String bonusStock = mergedTableData.get("Bonus Issue (Stock Dividend)");
//        if (bonusStock != null && !bonusStock.equals("-")) {
//            String[] yearlyBonuses = bonusStock.split(",");
//            for (String yearlyBonus : yearlyBonuses) {
//                String[] parts = yearlyBonus.trim().split("%");
//                if (parts.length == 2) {
//                    int year = Integer.parseInt(parts[1].trim());
//                    BigDecimal percentage = new BigDecimal(parts[0].trim());
//
//                    Optional<DividendInformation> existingDividend = dividendInformationRepository.findByTradingCodeAndYear(stockCode, year);
//                    if (existingDividend.isPresent()) {
//                        DividendInformation dividendInformation = existingDividend.get();
//                        dividendInformation.setStockDividend(String.valueOf(percentage));
//                        dividendInformationList.add(dividendInformation);
//                    } else {
//                        DividendInformation newDividendInformation = DividendInformation.builder()
//                                .tradingCode(stockCode)
//                                .year(year)
//                                .stockDividend(String.valueOf(percentage))
//                                .build();
//                        dividendInformationList.add(newDividendInformation);
//                    }
//                }
//            }
//        }
//
//        //        "Right Issue" -> "1:1R 1996"
//        String rightIssue = mergedTableData.get("Right Issue");
//        if (rightIssue != null && !rightIssue.equals("-")) {
//            String[] yearlyRightIssues = rightIssue.split(",");
//            for (String yearlyRightIssue : yearlyRightIssues) {
//                String[] parts = yearlyRightIssue.trim().split(" ");
//                if (parts.length == 2) {
//                    int year = Integer.parseInt(parts[1].trim());
//                    String rightIssueValue = parts[0].trim();
//
//                    Optional<DividendInformation> existingDividend = dividendInformationRepository.findByTradingCodeAndYear(stockCode, year);
//                    if (existingDividend.isPresent()) {
//                        DividendInformation dividendInformation = existingDividend.get();
//                        dividendInformation.setRightIssue(rightIssueValue);
//                        dividendInformationList.add(dividendInformation);
//                    } else {
//                        DividendInformation newDividendInformation = DividendInformation.builder()
//                                .tradingCode(stockCode)
//                                .year(year)
//                                .rightIssue(rightIssueValue)
//                                .build();
//                        dividendInformationList.add(newDividendInformation);
//                    }
//                }
//            }
//        }
//
//        dividendInformationRepository.saveAll(dividendInformationList);
//
//    }
//
//    private void updateDividendInformation(Map<String, String> mergedTableData, String stockCode) {
//        List<DividendInformation> dividendInformationList = new ArrayList<>();
//
//        // Fetch existing records for the stock code
//        List<DividendInformation> existingDividends = dividendInformationRepository.findByTradingCode(stockCode);
//        Map<Integer, DividendInformation> existingDividendsMap = existingDividends.stream()
//                .collect(Collectors.toMap(DividendInformation::getYear, Function.identity()));
//
//        // Process each type of dividend information
//        processAndMergeDividendData(mergedTableData.get("Cash Dividend"), stockCode, existingDividendsMap, existingDividends, "cash");
//        processAndMergeDividendData(mergedTableData.get("Bonus Issue (Stock Dividend)"), stockCode, existingDividendsMap, existingDividends, "stock");
//        processAndMergeDividendData(mergedTableData.get("Right Issue"), stockCode, existingDividendsMap, existingDividends, "right");
//
//        // Save all updated/new records
//        dividendInformationRepository.saveAll(existingDividends);
//    }
//
//    private void processAndMergeDividendData(String data, String stockCode,
//                                             Map<Integer, DividendInformation> existingDividendsMap,
//                                             List<DividendInformation> dividendInformationList,
//                                             String type) {
//        if (data == null || data.equals("-")) {
//            return;
//        }
//
//        String[] entries = data.split(",");
//        for (String entry : entries) {
//            String[] parts = (type.equals("right") ? entry.trim().split(" ") : entry.trim().split("%"));
//            if (parts.length == 2) {
//                try {
//                    int year = Integer.parseInt(parts[1].trim());
//                    String value = parts[0].trim();
//                    BigDecimal percentage = (type.equals("cash") || type.equals("stock")) ? new BigDecimal(value) : null;
//
//                    // Retrieve or create a DividendInformation object
//                    DividendInformation dividendInformation = existingDividendsMap.getOrDefault(year,
//                            DividendInformation.builder().tradingCode(stockCode).year(year).build());
//
//                    // Update the corresponding field based on type
//                    switch (type) {
//                        case "cash":
//                            dividendInformation.setCashDividend(percentage);
//                            break;
//                        case "stock":
//                            dividendInformation.setStockDividend(value);
//                            break;
//                        case "right":
//                            dividendInformation.setRightIssue(value);
//                            break;
//                    }
//
//                    // If it's a new record, add it to the map
//                    existingDividendsMap.putIfAbsent(year, dividendInformation);
//                    if (!dividendInformationList.contains(dividendInformation)) {
//                        dividendInformationList.add(dividendInformation);
//                    }
//                } catch (NumberFormatException e) {
//                    // Log error: invalid format for year or value
//                    System.err.println("Invalid data format: " + entry);
//                }
//            }
//        }
//    }
//
//
//    private void updateCompanyInformation(Map<String, String> mergedTableData, String stockCode) {
//        // need to insert the data into the database
//        // first inserting to the company table
//        // check if the company exists using stock_code
//        // if exists update the company data
//        // else insert the company data private void updateCompanyData(Company company, Map<String, String> data) {
//        Optional<Company> existingCompanyOpt = companyRepository.findByTradingCode(stockCode);
//        if (existingCompanyOpt.isPresent()) {
//            Company existingCompany = existingCompanyOpt.get();
//            updateCompanyData(existingCompany, mergedTableData);
//        } else {
//            Company newCompany = createNewCompany(stockCode, mergedTableData);
//            companyRepository.save(newCompany);
//        }
//    }
//
//    private void updateCompanyData(Company company, Map<String, String> data) {
//        company.setName(data.get("Company Name"));
//        company.setScripCode(Integer.valueOf(data.get("Scrip Code")));
//        company.setAuthorizedCapital(!data.get("Authorized Capital (mn)").equalsIgnoreCase("-") ?
//                new BigDecimal(data.get("Authorized Capital (mn)").replace(",", "")) : null);
//        company.setPaidUpCapital(!data.get("Authorized Capital (mn)").equalsIgnoreCase("-") ?
//                new BigDecimal(data.get("Paid-up Capital (mn)").replace(",", "")) : null);
//        company.setTotalOutstandingSecurities(Long.valueOf(data.get("Total No. of Outstanding Securities").replace(",", "")));
//        company.setFaceValue(new BigDecimal(data.get("Face/par Value")));
//        company.setMarketLot(Integer.valueOf(data.get("Market Lot")));
//        company.setSector(data.get("Sector"));
//        company.setTypeOfInstrument(data.get("Type of Instrument"));
//        company.setMarketCategory(data.get("Market Category"));
//        company.setElectronicShare(data.get("Electronic Share"));
//        company.setDebutTradingDate(data.get("Debut Trading Date").isEmpty() ? null : LocalDate.parse(data.get("Debut Trading Date"), DEBUT_TRADE_DATE_FORMAT));
//        company.setListingYear(data.get("Listing Year") == null ? null : Integer.valueOf(data.get("Listing Year")));
//        company.setAddress(data.get("Head Office"));
//        company.setFactoryAddress(data.get("Factory"));
//        company.setPhone(data.get("Telephone No."));
//        company.setFax(data.get("Fax"));
//        company.setEmail(data.get("E-mail"));
//        company.setWebsite(data.get("Web Address"));
//        company.setCompanySecretaryName(data.get("Company Secretary Name"));
//        company.setCompanySecretaryEmail(data.get("Company Secretary Email"));
//        company.setCompanySecretaryCellNo(data.get("Cell No."));
//        company.setYearEnd(data.get("Year End"));
//        company.setElectronicShare(data.get("Electronic Share"));
//        company.setMarketCategory(data.get("Market Category"));
//        company.setReserveAndSurplus(new BigDecimal(data.get("Reserve & Surplus without OCI (mn)").replace(",", "")));
//        company.setLastAgmDate(data.get("Last AGM Date") == null || Objects.equals(data.get("Last AGM Date"), "0") || data.get("Last AGM Date").isEmpty() ? null : LocalDate.parse(data.get("Last AGM Date"), LAST_AGM_DATE_FORMAT));
//        company.setFiftyTwoWeeksMovingRange(data.get("52 Weeks' Moving Range"));
//        companyRepository.save(company);
//    }
//
//    private Company createNewCompany(String stockCode, Map<String, String> data) {
//        Company company = new Company();
//        company.setTradingCode(stockCode);
//        company.setName(data.get("Company Name"));
//        company.setAuthorizedCapital(new BigDecimal(data.get("Authorized Capital (mn)")));
//        company.setPaidUpCapital(new BigDecimal(data.get("Paid-up Capital (mn)")));
//        company.setTotalOutstandingSecurities(Long.valueOf(data.get("Total No. of Outstanding Securities")));
//        company.setFaceValue(new BigDecimal(data.get("Face/par Value")));
//        company.setMarketLot(Integer.valueOf(data.get("Market Lot")));
//        company.setSector(data.get("Sector"));
//        company.setTypeOfInstrument(data.get("Type of Instrument"));
//        company.setMarketCategory(data.get("Market Category"));
//        company.setElectronicShare(data.get("Electronic Share"));
//        company.setDebutTradingDate(LocalDate.parse(data.get("Debut Trading Date"), DateTimeFormatter.ofPattern("yyyy-MM-dd")));
//        company.setListingYear(Integer.valueOf(data.get("Listing Year")));
//        company.setAddress(data.get("Head Office"));
//        company.setFactoryAddress(data.get("Factory"));
//        company.setPhone(data.get("Telephone No."));
//        company.setFax(data.get("Fax"));
//        company.setEmail(data.get("E-mail"));
//        company.setWebsite(data.get("Web Address"));
//        company.setCompanySecretaryName(data.get("Company Secretary Name"));
//        company.setCompanySecretaryEmail(data.get("Company Secretary Email"));
//        company.setCompanySecretaryCellNo(data.get("Cell No."));
//        company.setYearEnd(data.get("Year End"));
//        company.setReserveAndSurplus(new BigDecimal(data.get("Reserve & Surplus without OCI (mn)")));
//        company.setLastAgmDate(data.get("Last AGM Date").isEmpty() ? null : LocalDate.parse(data.get("Last AGM Date"), LAST_AGM_DATE_FORMAT));
//        company.setFiftyTwoWeeksMovingRange(data.get("52 Weeks' Moving Range"));
//        return company;
//    }
//
//
//    private Map<String, String> parseCorporatePerformance(Element table) {
//        Map<String, String> corporatePerformance = new HashMap<>();
//        Elements rows = table.select("tr");
//
//        for (Element row : rows) {
//            Elements cells = row.select("td");
//            if (cells.size() >= 2) {
//                String key = cells.get(0).text().trim();
//                String value = cells.get(1).text().trim();
//                String newValue = null;
//                if (value.equalsIgnoreCase("Short-term loan (mn)")) {
//                    newValue = cells.get(2).text().trim();
//                    corporatePerformance.put(value, newValue);
//                } else
//                    corporatePerformance.put(key, value);
//            }
//        }
//
//        return corporatePerformance;
//    }
//
//    private Map<String, String> parseBasicInformation(Element table, String stockCode) {
//        Map<String, String> tableData = new HashMap<>();
//        Elements rows = table.select("tr");
//
//        for (Element row : rows) {
//            Elements headers = row.select("th");
//            Elements values = row.select("td");
//
//            for (int i = 0; i < headers.size(); i++) {
//                String key = headers.get(i).text().trim();
//                String value = values.get(i).text().trim();
//                tableData.put(key, value);
//            }
//        }
//
//        return tableData;
//    }
//
//    private Map<String, String> parseCompanyResearve(Element table, String stockCode) {
//        Elements rows = table.select("#company tbody tr");
//
//        Map<String, String> dataMap = new HashMap<>();
//
//        for (Element row : rows) {
//            String header = row.select("th").text().trim();
//            String value = row.select("td").text().trim();
//            dataMap.put(header, value);
//        }
//        return dataMap;
//    }
//
//    private Map<String, String> parseFinancialPerformance1(Element table, String stockCodeString) {
//        Map<String, String> dividendYieldMap = new HashMap<>();
//        Map<String, String> financialPerformanceMap = new HashMap<>();
//        try {
//            // Select all data rows (excluding header rows)
//            Elements dataRows = table.select("tr.shrink, tr.shrink.alt");
//
//            for (Element row : dataRows) {
//                Elements cells = row.select("td");
//
//                // Ensure the row has enough cells
//                if (cells.size() >= 9) {
//                    // Year is in the first cell (index 0), but it spans 2 columns
//                    String year = cells.get(0).text().trim();
//
//                    // Dividend Yield is in the last cell (index 9)
//                    String dividendYield = cells.get(8).text().trim();
//
//                    // Add to map with year as key and dividend yield as value
//                    if (!year.isEmpty() && !dividendYield.isEmpty()) {
//                        financialPerformanceMap.put(year, dividendYield);
//                    }
//                }
//            }
//            dividendYieldMap.put("Dividend Yield", financialPerformanceMap.toString());
//        } catch (Exception e) {
//            System.err.println("Error parsing dividend yield data: " + e.getMessage());
//            e.printStackTrace();
//        }
//        updateDividendYieldPercentage(financialPerformanceMap, stockCodeString);
//        return dividendYieldMap;
//    }
//
//    private void parseFinancialPerformance(Element table, String stockCode) {
//        Map<Integer, FinancialPerformance> navData = new HashMap<>();
//        if (table != null) {
//            // Select all rows in the table body
//            Elements rows = table.select("tbody tr");
//
//            // Loop through each row
//            for (int i = 3; i < rows.size(); i++) { // Skip the first 3 header rows
//                Element row = rows.get(i);
//                Elements cells = row.select("td");
//
//                // Ensure the row has enough cells
//                if (cells.size() >= 12) {
//                    String year = cells.get(0).text(); // Year column
//                    String eps = cells.get(4).text(); // eps
//                    String nav = cells.get(7).text(); // NAV Per Share column
//                    String pco = cells.get(10).text(); // pco
//                    String tci = cells.get(12).text(); // tco
//
//                    // Skip rows with invalid or missing data
//                    if (!year.equals("-")) {
//                        navData.put(Integer.parseInt(year), FinancialPerformance.builder()
//                                .year(Integer.parseInt(year))
//                                .epsBasic(eps.equals("-") ? null : new BigDecimal(eps))
//                                .navPerShare(nav.equals("-") ? null : new BigDecimal(nav))
//                                .profit(pco.equals("-") ? null : new BigDecimal(pco.replace(",", "")))
//                                .totalComprehensiveIncome(tci.equals("-") ? null : new BigDecimal(tci.replace(",", "")))
//                                .tradingCode(stockCode)
//                                .build());
//                    }
//                }
//            }
//        }
//        List<FinancialPerformance> financialPerformanceList = new ArrayList<>();
//        for (Map.Entry<Integer, FinancialPerformance> entry : navData.entrySet()) {
//            Integer key = entry.getKey();
//            FinancialPerformance value = entry.getValue();
//            Optional<FinancialPerformance> byTradingCodeAndYear = financialPerformanceRepository.findByTradingCodeAndYear(stockCode, key);
//            if (byTradingCodeAndYear.isPresent()) {
//                FinancialPerformance existingFinPerformance = byTradingCodeAndYear.get();
//                existingFinPerformance.setEpsBasic(value.getEpsBasic());
//                existingFinPerformance.setProfit(value.getProfit());
//                existingFinPerformance.setNavPerShare(value.getNavPerShare());
//                existingFinPerformance.setTotalComprehensiveIncome(value.getTotalComprehensiveIncome());
//                financialPerformanceList.add(existingFinPerformance);
//            } else {
//                FinancialPerformance build = FinancialPerformance.builder()
//                        .year(value.getYear())
//                        .epsBasic(value.getEpsBasic())
//                        .navPerShare(value.getNavPerShare())
//                        .profit(value.getProfit())
//                        .totalComprehensiveIncome(value.getTotalComprehensiveIncome())
//                        .tradingCode(stockCode).build();
//                financialPerformanceList.add(build);
//            }
//        }
//        financialPerformanceRepository.saveAll(financialPerformanceList);
//    }
//
//    private Map<String, String> parseQuarterlyPerformance(Element table, String stockCode) {
//        try {
//            if (table != null) {
//                // Extract quarter dates and their corresponding quarter names
//                List<QuarterData> quarters = extractQuarterDates(table);
//
//                // List to hold QuarterlyPerformance entities
//                List<QuarterlyPerformance> quarterlyPerformances = new ArrayList<>();
//
//                // Extract and map data rows to the entity
//                addRowData(table, "Basic", quarters, stockCode, quarterlyPerformances, "epsBasic");
//                addRowData(table, "Diluted*", quarters, stockCode, quarterlyPerformances, "epsDiluted");
//                addRowData(table, "Market price per share at period end", quarters, stockCode, quarterlyPerformances, "marketPriceEndPeriod");
//
//                Iterator<QuarterlyPerformance> iterator = quarterlyPerformances.iterator();
//                while (iterator.hasNext()) {
//                    QuarterlyPerformance quarterlyPerformance = iterator.next();
//                    System.out.println(quarterlyPerformance.toString());
//                    Optional<QuarterlyPerformance> byTradingCodeAndDateAndQuarter = quarterlyPerformanceRepository.findByTradingCodeAndDateAndQuarter(stockCode, quarterlyPerformance.getDate(), quarterlyPerformance.getQuarter());
//                    if (byTradingCodeAndDateAndQuarter.isPresent() || quarterlyPerformance.getDate() == null || quarterlyPerformance.getQuarter() == null) {
//                        iterator.remove(); // Safely remove the element from the list
//                    }
//                }
//
//                quarterlyPerformanceRepository.saveAll(quarterlyPerformances);
//            }
//        } catch (Exception e) {
//            log.error("Exception occurred {}", e.getLocalizedMessage(), e);
//        }
//        return null;
//    }
//
//
//    private void saveNavData(String tradingCode, Map<String, String> tableData) {
//        try {
//            List<DividendInformation> dividendInformationList = new ArrayList<>();
//            tableData.forEach((year, nav) -> {
//                Optional<DividendInformation> byTradingCodeAndYear = dividendInformationRepository.findByTradingCodeAndYear(tradingCode, Integer.parseInt(year));
//                if (byTradingCodeAndYear.isPresent()) {
//                    DividendInformation dividendInformation = byTradingCodeAndYear.get();
//                    dividendInformation.setNav(new BigDecimal(nav));
//                    dividendInformationList.add(dividendInformation);
//                } else {
//                    dividendInformationList.add(DividendInformation.builder()
//                            .nav(new BigDecimal(nav))
//                            .year(Integer.parseInt(year))
//                            .build());
//                }
//            });
//            dividendInformationRepository.saveAll(dividendInformationList);
//        } catch (Exception e) {
//            log.error("Exception occurred {}", e.getLocalizedMessage(), e);
//        }
//    }
//
//    private Map<String, String> parseNavInformation(Element table) {
//        Map<String, String> navData = new HashMap<>();
//        if (table != null) {
//            // Select all rows in the table body
//            Elements rows = table.select("tbody tr");
//
//            // Loop through each row
//            for (int i = 3; i < rows.size(); i++) { // Skip the first 3 header rows
//                Element row = rows.get(i);
//                Elements cells = row.select("td");
//
//                // Ensure the row has enough cells
//                if (cells.size() >= 12) {
//                    String year = cells.get(0).text(); // Year column
//                    String nav = cells.get(7).text(); // NAV Per Share column
//
//                    // Skip rows with invalid or missing data
//                    if (!year.equals("-") && !nav.equals("-")) {
//                        navData.put(year, nav);
//                    }
//                }
//            }
//        }
//
//        return navData;
//    }
//
//    // Parsing logic for specific tables
//    private Map<String, String> parseTableOne(Element table) {
//        return parseGenericTable(table, "Table One - Financial Statement");
//    }
//
//    private Map<String, String> parseTableTwo(Element table) {
//        Map<String, String> tableData = new HashMap<>();
//        Elements rows = table.select("tr");
//
//        for (Element row : rows) {
//            Elements headers = row.select("th");
//            Elements values = row.select("td");
//
//            for (int i = 0; i < headers.size(); i++) {
//                String key = headers.get(i).text().trim();
//                String value;
//                if (key.equalsIgnoreCase("52 Weeks' Moving Range")) {
//                    value = values.get(i + 1).text().trim();
//                } else
//                    value = values.get(i).text().trim();
//                tableData.put(key, value);
//            }
//        }
//
//        return tableData;
//    }
//
//    private Map<String, String> parseDividendTable(Element table, String stockCode) {
//        Map<String, String> companyInformation = new HashMap<>();
//        Elements rows = table.select("#company tbody tr");
//
//        for (Element row : rows) {
//            Elements cells = row.select("th, td");
//            if (cells.size() >= 2) {
//                String header = cells.get(0).text();
//                String value = cells.get(1).text();
//                String header1 = cells.get(2).text();
//                String value1 = cells.get(3).text();
//                companyInformation.put(header1, value1);
//                companyInformation.put(header, value);
//            }
//        }
//        Optional<Company> byTradingCode = companyRepository.findByTradingCode(stockCode);
//        if (byTradingCode.isPresent()) {
//            Company existingCompany = byTradingCode.get();
//            existingCompany.setAuthorizedCapital((companyInformation.get("Authorized Capital (mn)").equalsIgnoreCase("-") ? null : new BigDecimal(companyInformation.get("Authorized Capital (mn)").replace(",", ""))));
//            existingCompany.setPaidUpCapital(new BigDecimal(companyInformation.get("Paid-up Capital (mn)").replace(",", "")));
//            existingCompany.setTotalOutstandingSecurities(Long.valueOf(companyInformation.get("Total No. of Outstanding Securities").replace(",", "")));
//            existingCompany.setFaceValue(new BigDecimal(companyInformation.get("Face/par Value")));
//            existingCompany.setMarketLot(Integer.valueOf(companyInformation.get("Market Lot")));
//            existingCompany.setSector(companyInformation.get("Sector"));
//            existingCompany.setTypeOfInstrument(companyInformation.get("Type of Instrument"));
//            companyRepository.save(existingCompany);
//        }
//        return companyInformation;
//    }
//
//    private Map<String, String> parseInterimFinancialPerformance(Element table) {
//        return parseGenericTable(table, "Interim Financial Performance");
//    }
//
//    private Map<String, String> parseFinancialDataTest(Element table) {
//        return parseGenericTable(table, "Shareholding Information");
//    }
//
//    private Map<String, String> parseShareHoldingData(Element tableData, String stockCode) throws ParseException {
//        // Extract the shareholding percentages
//        // Get all the rows with shareholding percentages
//        Map<String, String> shareHoldingData = new HashMap<>();
//        Elements rows = tableData.select("tr");
//        for (Element row : rows) {
//            Elements cells = row.select("td");
//            if (cells.size() >= 2) {
//                String key = cells.get(0).text();
//                String value = cells.get(1).text();
//                shareHoldingData.put(key, value);
//            }
//        }
//        Elements shareholdingRows = tableData.select("tr:contains(Share Holding Percentage)");
//        List<ShareHolding> shareHoldingList = new ArrayList<>();
//        // Process each shareholding row
//        for (Element row : shareholdingRows) {
//            // Extract the date
//            String dateText = Objects.requireNonNull(row.select("td").first()).text();
//            String dateStr = extractDate(dateText);
//            LocalDate date = parseDate1(dateStr);
//
//            // Extract the shareholding percentages from the next <table> within the row
//            Element table = row.select("td table").first();
//            Elements percentageCells = table.select("tr td");
//
//            // Extract percentages
//            double sponsorDirector = parsePercentage(percentageCells.get(0).text());
//            double government = parsePercentage(percentageCells.get(1).text());
//            double institute = parsePercentage(percentageCells.get(2).text());
//            double foreign = parsePercentage(percentageCells.get(3).text());
//            double publicDoc = parsePercentage(percentageCells.get(4).text());
//            Optional<ShareHolding> byTradingCodeAndDate = shareHoldingRepository.findByTradingCodeAndDate(stockCode, date);
//            if (byTradingCodeAndDate.isEmpty()) {
//                shareHoldingList.add(ShareHolding.builder()
//                        .date(date)
//                        .foreignHolder(BigDecimal.valueOf(foreign))
//                        .government(BigDecimal.valueOf(government))
//                        .publicHolder(BigDecimal.valueOf(publicDoc))
//                        .institute(BigDecimal.valueOf(institute))
//                        .sponsorDirector(BigDecimal.valueOf(sponsorDirector))
//                        .tradingCode(stockCode)
//                        .build());
//            }
//        }
//        List<ShareHolding> shareHoldings = shareHoldingRepository.saveAll(shareHoldingList);
//        shareHoldings.forEach(shareHolding -> log.info(shareHolding.toString()));
//        return shareHoldingData;
//    }
//
//
//    // Helper function to extract date from the string
//    private static String extractDate(String dateText) {
//        // Example: "Share Holding Percentage [as on Jun 30, 2024 (year ended)]"
//        String dateStr = dateText.replaceAll(".*\\[as on (.*?)\\].*", "$1");
//        return dateStr;
//    }
//
//    // Helper function to parse date
//    private static LocalDate parseDate1(String dateStr) throws java.time.format.DateTimeParseException {
//        String cleanDateStr = dateStr.replaceAll("\\s*\\(.*\\)", "").trim();
//        DateTimeFormatter dateFormat = DateTimeFormatter.ofPattern("MMM dd, yyyy");
//        return LocalDate.parse(cleanDateStr, dateFormat);
//    }
//
//    private static double parsePercentage(String percentageStr) {
//        try {
//            // Split the string by colon
//            String[] parts = percentageStr.split(":");
//
//            if (parts.length == 2) {
//                // Trim any extra spaces and parse the number
//                String percentageStrring = parts[1].trim();
//                double value = Double.parseDouble(percentageStrring);
//                System.out.println("Extracted value: " + value);
//                return value;
//            } else {
//                System.out.println("Invalid input format");
//                return 0.00;
//            }
//        } catch (NumberFormatException e) {
//            // Return 0.0 in case of any error
//            return 0.0;
//        }
//    }
//
//    private Map<String, String> parseAddressInfoTable(Element table) {
//        Map<String, String> addressInfo = new HashMap<>();
//        Elements rows = table.select("tr");
//
//        for (Element row : rows) {
//            Elements cells = row.select("td");
//            if (cells.size() >= 2) {
//                String key = cells.get(0).text().trim();
//                String value = cells.get(1).text().trim();
//                String newValue = null;
//                if (value.equalsIgnoreCase("Head Office")) {
//                    newValue = cells.get(2).text().trim();
//                    addressInfo.put(value, newValue);
//                } else
//                    addressInfo.put(key, value);
//            }
//        }
//
//        return addressInfo;
//    }
//
//    // Generic parsing for tables
//    private Map<String, String> parseGenericTable(Element table, String tableName) {
//        Map<String, String> tableData = new HashMap<>();
//        tableData.put("Table Name", tableName);
//
//        Elements rows = table.select("tr");
//        for (Element row : rows) {
//            Elements cells = row.select("th");
//            if (cells.size() >= 2) {
//                String[] tradingCodeParts = cells.get(0).text().split(":");
//                tableData.put(tradingCodeParts[0].trim(), tradingCodeParts.length > 1 ? tradingCodeParts[1].trim() : "");
//                String[] scriptCode = cells.get(1).text().split(":");
//                tableData.put(scriptCode[0].trim(), scriptCode.length > 1 ? scriptCode[1].trim() : "");
//            }
//        }
//
//        return tableData;
//    }
//
//    private QuarterlyPerformance getOrCreateQuarterlyPerformance
//            (List<QuarterlyPerformance> quarterlyPerformances,
//             QuarterData quarterData, String tradingCode) {
//        return quarterlyPerformances.stream()
//                .filter(qp -> qp.getQuarter().equals(quarterData.quarter()))
//                .findFirst()
//                .orElseGet(() -> {
//                    QuarterlyPerformance newQP = new QuarterlyPerformance();
//                    newQP.setQuarter(quarterData.quarter());
//                    newQP.setDate(quarterData.date());
//                    newQP.setTradingCode(tradingCode);
//                    quarterlyPerformances.add(newQP);
//                    return newQP;
//                });
//    }
//
//    private List<QuarterData> extractQuarterDates(Element table) {
//        // Extract quarter dates from the 4th "header" row
//        List<QuarterData> quarters = new ArrayList<>();
//        Elements headerRows = table.select("tr.header");
//
//        if (headerRows.size() > 3) {
//            Elements cells = headerRows.get(3).select("td");
//
//            // Ensure we handle the mapping correctly
//            if (!cells.isEmpty()) {
//                quarters.add(new QuarterData("Q1", parseDate(cells.get(0).text())));
//            }
//            if (cells.size() >= 2) {
//                LocalDate date = parseDate(cells.get(1).text());
//                quarters.add(new QuarterData("Q2", date));
//                quarters.add(new QuarterData("Half Yearly", date));
//            }
//            if (cells.size() >= 3) {
//                LocalDate date = parseDate(cells.get(2).text());
//                quarters.add(new QuarterData("Q3", date));
//                quarters.add(new QuarterData("9 Months", date));
//            }
//            if (cells.size() >= 4) {
//                quarters.add(new QuarterData("Annual", parseDate(cells.get(3).text())));
//            }
//        }
//        return quarters;
//    }
//
//
//    private LocalDate parseDate(String dateText) {
//        // Parse a date like "202403" into LocalDate
//        if (dateText.length() == 6) {
//            return LocalDate.parse(dateText + "01", YEAR_MONTH_YYYYMM.withZone(java.time.ZoneId.systemDefault()));
//        }
//        return null;
//    }
//
//    private void addRowData(Element table, String rowHeader, List<QuarterData> quarters, String tradingCode,
//                            List<QuarterlyPerformance> quarterlyPerformances, String dataType) {
//        // Find the row containing the specific header
//        Element row = table.selectFirst("tr:contains(" + rowHeader + ")");
//
//        if (row != null) {
//            Elements cells = row.select("td");
//
//            // Populate QuarterlyPerformance objects
//            for (int i = 1; i < Math.min(cells.size(), quarters.size() + 1); i++) {
//                QuarterlyPerformance qp = getOrCreateQuarterlyPerformance(quarterlyPerformances, quarters.get(i - 1), tradingCode);
//
//                BigDecimal value = cells.get(i).text().equals("-") ? null : new BigDecimal(cells.get(i).text());
//                switch (dataType) {
//                    case "epsBasic" -> qp.setEpsBasic(value);
//                    case "epsDiluted" -> qp.setEpsDiluted(value);
//                    case "marketPriceEndPeriod" -> qp.setMarketPriceEndPeriod(value);
//                }
//            }
//        }
//    }
//
//    private String getHtml(String url) {
//        RestTemplate restTemplate = new RestTemplate();
//        return restTemplate.getForObject(url, String.class);
//    }
//}
//
//record QuarterData(String quarter, LocalDate date) {
//}
