package com.dohatec.oms.datascraper.util;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Helper class for testing and validating data parsing
 * Useful for debugging scraper issues
 */
@Slf4j
@Component
public class ParsingTestHelper {

    /**
     * Test parsing with sample HTML row
     * Example from DSE:
     * <tr>
     *  <td width="4%">2</td>
     *  <td width="15%"><a href="displayCompany.php?name=MARICO" class="ab1"> MARICO </a></td>
     *  <td width="10%" class="background-yellow">2,795.5</td>
     *  <td width="10%">2,818</td>
     *  <td width="12%">2,795</td>
     *  <td width="11%">0</td>
     *  <td width="12%">2,787.2</td>
     *  <td width="12%" style="color: green">8.3</td>
     *  <td width="11%">31</td>
     *  <td width="11%">0.545</td>
     *  <td width="11%">195</td>
     * </tr>
     * 
     * Expected parsing:
     * - Trading Code: MARICO
     * - LTP: 2795.5
     * - High: 2818
     * - Low: 2795
     * - Close: 0
     * - YCP: 2787.2
     * - Change: 8.3
     * - Change%: 0.298% (8.3 / 2787.2 * 100)
     * - Trade: 31
     * - Value: 0.545
     * - Volume: 195
     */
    public void printSampleParsingStructure() {
        log.info("=================================");
        log.info("DSE HTML Row Parsing Structure:");
        log.info("=================================");
        log.info("td[0]  -> Serial Number (ignored)");
        log.info("td[1]  -> Trading Code with link");
        log.info("td[2]  -> LTP (Last Trading Price)");
        log.info("td[3]  -> High");
        log.info("td[4]  -> Low");
        log.info("td[5]  -> Close");
        log.info("td[6]  -> YCP (Yesterday's Close)");
        log.info("td[7]  -> Change");
        log.info("td[8]  -> Trade Count");
        log.info("td[9]  -> Value (Turnover in millions)");
        log.info("td[10] -> Volume");
        log.info("=================================");
        log.info("Sample: MARICO");
        log.info("LTP: 2,795.5 -> 2795.5");
        log.info("High: 2,818 -> 2818");
        log.info("Low: 2,795 -> 2795");
        log.info("Close: 0 -> 0");
        log.info("YCP: 2,787.2 -> 2787.2");
        log.info("Change: 8.3 -> 8.3");
        log.info("Change%: 8.3/2787.2*100 = 0.2977%");
        log.info("Trade: 31 -> 31");
        log.info("Value: 0.545 -> 0.545 (millions)");
        log.info("Volume: 195 -> 195");
        log.info("=================================");
    }
}

