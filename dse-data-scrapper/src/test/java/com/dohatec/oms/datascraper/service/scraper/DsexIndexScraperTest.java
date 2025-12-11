package com.dohatec.oms.datascraper.service.scraper;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;

/**
 * Test class for DSEX Index Scraper
 * This test will fetch and print DSEX index trading codes
 */
@SpringBootTest
@ActiveProfiles("test")
public class DsexIndexScraperTest {

    @Autowired
    private DsexIndexScraper dsexIndexScraper;

    @Test
    public void testScrapeDsexIndexShares() {
        System.out.println("\n========================================");
        System.out.println("DSEX Index Trading Codes Test");
        System.out.println("========================================\n");
        
        try {
            List<String> tradingCodes = dsexIndexScraper.getDsexIndexTradingCodes();
            
            System.out.println("Total DSEX Index Trading Codes: " + tradingCodes.size());
            System.out.println("\nTrading Codes List:");
            System.out.println("-------------------");
            
            for (int i = 0; i < tradingCodes.size(); i++) {
                System.out.println((i + 1) + ". " + tradingCodes.get(i));
            }
            
            System.out.println("\n========================================");
            System.out.println("End of DSEX Index Trading Codes");
            System.out.println("========================================\n");
            
        } catch (Exception e) {
            System.err.println("Error fetching DSEX index trading codes: " + e.getMessage());
            e.printStackTrace();
        }
    }
}

