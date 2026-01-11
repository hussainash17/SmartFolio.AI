package com.dohatec.oms.datascraper.service.scraper;

import com.dohatec.oms.datascraper.repository.CompanyRepository;
import com.dohatec.oms.datascraper.service.ScraperLogService;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.springframework.web.client.RestTemplate;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

/**
 * Unit test for DsexIndexSharesScraper
 * Verifies parsing logic by subclassing to override fetchHtml
 */
public class DsexIndexScraperUnitTest {

        @Mock
        private RestTemplate restTemplate;

        @Mock
        private CompanyRepository companyRepository;

        @Mock
        private ScraperLogService scraperLogService;

        @Test
        public void testParseTradingCodes_IgnoresHeaderLinks() {
                // Create a subclass to valid HTML injection without network
                DsexIndexSharesScraper scraper = new DsexIndexSharesScraper(
                                mock(RestTemplate.class),
                                mock(CompanyRepository.class),
                                mock(ScraperLogService.class),
                                null) {
                        // Override the private/protected method if possible, or use reflection if
                        // private
                        // Since fetchHtml is private, we can't override it directly unless we change
                        // visibility or use Reflection.
                        // However, DsexIndexSharesScraper.parseTradingCodes is private.
                        // Let's use Reflection to invoke parseTradingCodes directly with our HTML.
                };

                // Sample HTML representing the issue
                // - "1JANATAMF" and "1STPRIMFMF" are in the header (ticker) and should be
                // IGNORED
                // - "AAMRANET", "ABBANK" are in the table and should be INCLUDED
                // - "KAY&QUE" contains '&' which was previously causing truncation
                // - "AMCL(PRAN)" contains '()' which was previously causing truncation
                String html = "<html><body>" +
                                "<div class='ticker'>" +
                                "  <a class='abhead' href='displayCompany.php?name=1JANATAMF'>1JANATAMF</a>" +
                                "  <a class='abhead' href='displayCompany.php?name=1STPRIMFMF'>1STPRIMFMF</a>" +
                                "</div>" +
                                "<div class='table-responsive'>" +
                                "  <table>" +
                                "    <tr><td><a class='ab1' href='displayCompany.php?name=AAMRANET'>AAMRANET</a></td></tr>"
                                +
                                "    <tr><td><a class='ab1' href='displayCompany.php?name=ABBANK'>ABBANK</a></td></tr>"
                                +
                                "    <tr><td><a class='ab1' href='displayCompany.php?name=KAY&QUE'>\n\t\t\t\t\t\t\t\t\t\t\t\tKAY&QUE\t\t\t\t\t\t\t\t\t\t\t</a></td></tr>"
                                +
                                "    <tr><td><a class='ab1' href='displayCompany.php?name=AMCL(PRAN)'>\n\t\t\t\t\t\t\t\t\t\t\t\tAMCL(PRAN)\t\t\t\t\t\t\t\t\t\t\t</a></td></tr>"
                                +
                                "  </table>" +
                                "</div>" +
                                "</body></html>";

                // Use ReflectionTestUtils to invoke the private method
                List<String> result = org.springframework.test.util.ReflectionTestUtils.invokeMethod(
                                scraper,
                                "parseTradingCodes",
                                html);

                // Assertions
                assert result != null;
                System.out.println("Parsed Codes: " + result);

                assertEquals(4, result.size(), "Should find 4 trading codes");
                assertTrue(result.contains("AAMRANET"));
                assertTrue(result.contains("ABBANK"));
                assertTrue(result.contains("KAY&QUE"), "Should contain KAY&QUE without truncation");
                assertTrue(result.contains("AMCL(PRAN)"), "Should contain AMCL(PRAN) without truncation");
                org.junit.jupiter.api.Assertions.assertFalse(result.contains("1JANATAMF"),
                                "Should exclude header link 1JANATAMF");
                org.junit.jupiter.api.Assertions.assertFalse(result.contains("1STPRIMFMF"),
                                "Should exclude header link 1STPRIMFMF");
        }
}
