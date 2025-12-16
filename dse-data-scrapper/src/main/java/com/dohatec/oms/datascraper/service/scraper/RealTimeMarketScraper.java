package com.dohatec.oms.datascraper.service.scraper;

import com.dohatec.oms.datascraper.config.ScraperProperties;
import com.dohatec.oms.datascraper.dto.StockPriceDTO;
import com.dohatec.oms.datascraper.exception.NetworkException;
import com.dohatec.oms.datascraper.model.Company;
import com.dohatec.oms.datascraper.model.IntradayTick;
import com.dohatec.oms.datascraper.model.ScraperLog;
import com.dohatec.oms.datascraper.model.StockData;
import com.dohatec.oms.datascraper.repository.CompanyRepository;
import com.dohatec.oms.datascraper.repository.IntradayTickRepository;
import com.dohatec.oms.datascraper.repository.StockDataRepository;
import com.dohatec.oms.datascraper.service.ScraperLogService;
import com.dohatec.oms.datascraper.util.HtmlParserUtil;
import com.dohatec.oms.datascraper.util.TradingCodeMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service for scraping real-time market data from DSE
 * Fetches latest share prices and market information every 1 minute
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RealTimeMarketScraper {

    private final RestTemplate restTemplate;
    private final CompanyRepository companyRepository;
    private final StockDataRepository stockDataRepository;
    private final IntradayTickRepository intradayTickRepository;
    private final TradingCodeMapper tradingCodeMapper;
    private final HtmlParserUtil htmlParserUtil;
    private final ScraperLogService scraperLogService;
    private final ScraperProperties scraperProperties;

    /**
     * Scrape real-time market data from DSE
     * This is the main entry point for real-time data collection
     */
    @Transactional
    public void scrapeMarketData() {
        ScraperLog scraperLog = scraperLogService.startLog("REALTIME");

        try {
            log.info("Starting real-time market data scraping...");

            // Fetch HTML from DSE
            String html = fetchHtml();

            // Parse stock prices from HTML
            List<StockPriceDTO> stockPrices = parseStockPrices(html);

            log.info("Parsed {} stock prices from DSE", stockPrices.size());

            // Save to database
            int successCount = saveStockData(stockPrices);
            int failureCount = stockPrices.size() - successCount;

            // Complete scraper log
            String status = failureCount == 0 ? "SUCCESS" : (successCount > 0 ? "PARTIAL" : "FAILED");
            scraperLogService.completeLog(scraperLog, status, successCount, failureCount);

            log.info("Real-time market data scraping completed. Success: {}, Failed: {}",
                    successCount, failureCount);

        } catch (Exception e) {
            log.error("Real-time market data scraping failed", e);
            scraperLogService.completeLog(scraperLog, "FAILED", 0, 0, e.getMessage());
            throw e;
        }
    }

    /**
     * Fetch HTML content from DSE website
     * 
     * @return HTML content as string
     */
    @Retryable(retryFor = { NetworkException.class,
            Exception.class }, maxAttempts = 3, backoff = @Backoff(delay = 1000, multiplier = 2.0))
    private String fetchHtml() {
        String url = scraperProperties.getDse().getLatestSharePriceUrl();

        try {
            log.debug("Fetching HTML from: {}", url);

            String html = restTemplate.getForObject(url, String.class);

            if (html == null || html.isEmpty()) {
                throw new NetworkException("Empty response from DSE website", url);
            }

            return html;

        } catch (Exception e) {
            log.error("Failed to fetch HTML from: {}", url, e);
            throw new NetworkException("Failed to fetch HTML from DSE website", url, e);
        }
    }

    /**
     * Parse stock prices from HTML content
     * 
     * @param html the HTML content
     * @return list of StockPriceDTO
     */
    private List<StockPriceDTO> parseStockPrices(String html) {
        List<StockPriceDTO> stockPrices = new ArrayList<>();

        try {
            Document doc = Jsoup.parse(html);

            // Select the shares table
            Elements tables = doc.select("table.shares-table");

            for (Element table : tables) {
                Elements rows = table.select("tbody tr");

                for (Element row : rows) {
                    try {
                        StockPriceDTO stockPrice = parseStockPriceRow(row);
                        if (stockPrice != null) {
                            stockPrices.add(stockPrice);
                        }
                    } catch (Exception e) {
                        log.warn("Failed to parse stock price row", e);
                    }
                }
            }

        } catch (Exception e) {
            log.error("Failed to parse stock prices from HTML", e);
        }

        return stockPrices;
    }

    /**
     * Parse a single stock price row from HTML
     * HTML Structure:
     * td[0]: Serial number (e.g., "2")
     * td[1]: Trading code with link (e.g., <a>MARICO</a>)
     * td[2]: LTP (Last Trading Price) (e.g., "2,795.5")
     * td[3]: High (e.g., "2,818")
     * td[4]: Low (e.g., "2,795")
     * td[5]: Close (e.g., "0")
     * td[6]: YCP (Yesterday's Closing Price) (e.g., "2,787.2")
     * td[7]: Change (e.g., "8.3")
     * td[8]: Trade (Number of trades) (e.g., "31")
     * td[9]: Value (Turnover in millions) (e.g., "0.545")
     * td[10]: Volume (e.g., "195")
     * 
     * @param row the HTML row element
     * @return StockPriceDTO or null if parsing fails
     */
    private StockPriceDTO parseStockPriceRow(Element row) {
        try {
            Elements cells = row.select("td");

            if (cells.size() < 11) {
                log.warn("Row has insufficient columns: {}", cells.size());
                return null; // Not enough columns
            }

            // Extract trading code from the link in second column (index 1)
            Element linkElement = cells.get(1).select("a.ab1").first();
            if (linkElement == null) {
                log.warn("No trading code link found in row");
                return null;
            }

            String tradingCode = linkElement.text().trim();

            // Parse all numeric values with correct column indices
            // td[2]: LTP
            BigDecimal ltp = htmlParserUtil.parseNumeric(cells.get(2).text());

            // td[3]: High
            BigDecimal high = htmlParserUtil.parseNumeric(cells.get(3).text());

            // td[4]: Low
            BigDecimal low = htmlParserUtil.parseNumeric(cells.get(4).text());

            // td[5]: Close (current closing price)
            BigDecimal closingPrice = htmlParserUtil.parseNumeric(cells.get(5).text());

            // td[6]: YCP (Yesterday's Closing Price)
            BigDecimal ycp = htmlParserUtil.parseNumeric(cells.get(6).text());

            // td[7]: Change
            BigDecimal change = htmlParserUtil.parseNumeric(cells.get(7).text());

            // td[8]: Trade (number of trades)
            Integer trade = htmlParserUtil.parseInteger(cells.get(8).text());

            // td[9]: Value (turnover in millions)
            BigDecimal value = htmlParserUtil.parseNumeric(cells.get(9).text());

            // td[10]: Volume
            Long volume = htmlParserUtil.parseLong(cells.get(10).text());

            // Calculate change percentage
            BigDecimal changePercent = null;
            if (ycp != null && ycp.compareTo(BigDecimal.ZERO) != 0 && change != null) {
                changePercent = change.divide(ycp, 4, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100));
            }

            // Determine opening price - use LTP if close is 0, otherwise use YCP
            BigDecimal openPrice = ycp;
            if (closingPrice != null && closingPrice.compareTo(BigDecimal.ZERO) == 0) {
                openPrice = ycp;
            }

            log.debug("Parsed stock: {} - LTP: {}, High: {}, Low: {}, Change: {}, Volume: {}",
                    tradingCode, ltp, high, low, change, volume);

            return StockPriceDTO.builder()
                    .tradingCode(tradingCode)
                    .lastTradePrice(ltp)
                    .high(high)
                    .low(low)
                    .closingPrice(closingPrice)
                    .ycp(ycp)
                    .change(change)
                    .changePercent(changePercent)
                    .trade(trade)
                    .value(value)
                    .volume(volume)
                    .openPrice(openPrice)
                    .build();

        } catch (Exception e) {
            log.warn("Failed to parse stock price row: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Save stock data to database
     * Updates StockData (current snapshot) and appends to IntradayTick (historical)
     * Creates new company entries if they don't exist
     * 
     * @param stockPrices list of stock prices
     * @return number of successfully saved records
     */
    private int saveStockData(List<StockPriceDTO> stockPrices) {
        LocalDateTime now = LocalDateTime.now();
        int successCount = 0;

        for (StockPriceDTO priceDTO : stockPrices) {
            try {
                UUID companyId = tradingCodeMapper.getCompanyId(priceDTO.getTradingCode());

                // If company doesn't exist, create it
                if (companyId == null) {
                    log.info("Company not found in cache, creating new entry: {}", priceDTO.getTradingCode());
                    companyId = createNewCompany(priceDTO.getTradingCode());

                    if (companyId == null) {
                        log.warn("Failed to create company: {}", priceDTO.getTradingCode());
                        continue;
                    }
                }

                // Upsert StockData (current snapshot)
                updateStockData(companyId, priceDTO, now);

                // Append to IntradayTick (historical ticks)
                saveIntradayTick(companyId, priceDTO, now);

                successCount++;

            } catch (Exception e) {
                log.error("Failed to save stock data for: {}", priceDTO.getTradingCode(), e);
            }
        }

        return successCount;
    }

    /**
     * Update or insert stock data (current snapshot)
     * Ensures all NOT NULL fields have valid values
     * 
     * @param companyId the company UUID
     * @param priceDTO  the stock price DTO
     * @param timestamp the timestamp
     */
    private void updateStockData(UUID companyId, StockPriceDTO priceDTO, LocalDateTime timestamp) {
        StockData stockData = stockDataRepository.findByCompanyId(companyId)
                .orElse(new StockData());

        // Set ID if new record
        if (stockData.getId() == null) {
            stockData.setId(UUID.randomUUID());
        }

        // Set all fields with null safety for NOT NULL columns
        stockData.setCompanyId(companyId);
        stockData.setClosedPrice(priceDTO.getClosingPrice() != null ? priceDTO.getClosingPrice() : BigDecimal.ZERO);
        stockData.setLastTradePrice(
                priceDTO.getLastTradePrice() != null ? priceDTO.getLastTradePrice() : BigDecimal.ZERO);
        stockData.setChange(priceDTO.getChange() != null ? priceDTO.getChange() : BigDecimal.ZERO);
        stockData.setChangePercent(priceDTO.getChangePercent() != null ? priceDTO.getChangePercent() : BigDecimal.ZERO);
        stockData.setHigh(priceDTO.getHigh() != null ? priceDTO.getHigh() : BigDecimal.ZERO);
        stockData.setLow(priceDTO.getLow() != null ? priceDTO.getLow() : BigDecimal.ZERO);
        stockData.setOpenPrice(priceDTO.getOpenPrice() != null ? priceDTO.getOpenPrice() : BigDecimal.ZERO);
        stockData.setPreviousClose(priceDTO.getYcp() != null ? priceDTO.getYcp() : BigDecimal.ZERO);
        stockData.setVolume(priceDTO.getVolume());
        stockData.setTurnover(priceDTO.getValue() != null ? priceDTO.getValue() : BigDecimal.ZERO);
        stockData.setTradesCount(priceDTO.getTrade() != null ? priceDTO.getTrade() : 0);
        stockData.setMarketCap(priceDTO.getMarketCap());
        stockData.setTimestamp(timestamp);

        stockDataRepository.save(stockData);
    }

    /**
     * Save intraday tick data (historical)
     * Only saves if price is valid (not null and not zero)
     * 
     * @param companyId the company UUID
     * @param priceDTO  the stock price DTO
     * @param timestamp the timestamp
     */
    private void saveIntradayTick(UUID companyId, StockPriceDTO priceDTO, LocalDateTime timestamp) {
        // Only save tick if we have a valid price
        BigDecimal price = priceDTO.getLastTradePrice();
        if (price == null || price.compareTo(BigDecimal.ZERO) == 0) {
            log.debug("Skipping intraday tick for company {} - invalid price", companyId);
            return;
        }

        IntradayTick tick = IntradayTick.builder()
                .id(UUID.randomUUID())
                .companyId(companyId)
                .price(price)
                .volume(priceDTO.getVolume())
                .timestamp(timestamp)
                .build();

        intradayTickRepository.save(tick);
    }

    /**
     * Get current stock data for all companies
     * 
     * @return list of StockData
     */
    public List<StockData> getCurrentStockData() {
        return stockDataRepository.findAll();
    }

    /**
     * Get current stock data for a specific company
     * 
     * @param tradingCode the trading code
     * @return StockData or null if not found
     */
    public StockData getCurrentStockData(String tradingCode) {
        UUID companyId = tradingCodeMapper.getCompanyId(tradingCode);
        if (companyId == null) {
            return null;
        }

        return stockDataRepository.findByCompanyId(companyId).orElse(null);
    }

    /**
     * Create a new company entry if it doesn't exist
     * This handles cases where DSE adds new companies
     * 
     * @param tradingCode the trading code
     * @return UUID of the created company or null if creation failed
     */
    private UUID createNewCompany(String tradingCode) {
        try {
            // Check if company exists in database (cache might be stale)
            Optional<Company> existingCompany = companyRepository.findByTradingCode(tradingCode);
            if (existingCompany.isPresent()) {
                // Company exists but not in cache, add to cache
                Company company = existingCompany.get();
                tradingCodeMapper.addToCache(company);
                return company.getId();
            }

            // Create new company
            Company newCompany = Company.builder()
                    .id(UUID.randomUUID())
                    .tradingCode(tradingCode.toUpperCase())
                    .name(tradingCode) // Temporary name, will be updated by fundamental scraper
                    .isActive(true)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();

            Company savedCompany = companyRepository.save(newCompany);

            // Add to cache
            tradingCodeMapper.addToCache(savedCompany);

            log.info("Created new company: {} with ID: {}", tradingCode, savedCompany.getId());

            return savedCompany.getId();

        } catch (Exception e) {
            log.error("Failed to create new company: {}", tradingCode, e);
            return null;
        }
    }
}
