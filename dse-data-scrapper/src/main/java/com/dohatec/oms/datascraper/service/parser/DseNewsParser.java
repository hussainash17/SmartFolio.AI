package com.dohatec.oms.datascraper.service.parser;

import com.dohatec.oms.datascraper.dto.NewsItemDTO;
import com.dohatec.oms.datascraper.util.DateFormatterUtil;
import com.dohatec.oms.datascraper.util.HtmlParserUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class DseNewsParser {

    private final HtmlParserUtil htmlParserUtil;
    private final DateFormatterUtil dateFormatterUtil;

    /**
     * Parse DSE news table into list of NewsItemDTO.
     * Assumes table structure where each item has rows for Trading Code, News Title, News, Post Date,
     * separated by rows containing a single TH with colspan.
     */
    public List<NewsItemDTO> parse(String html) {
        List<NewsItemDTO> result = new ArrayList<>();
        if (html == null || html.isEmpty()) {
            return result;
        }

        Document doc = Jsoup.parse(html);
        Element table = doc.selectFirst("table.table-news");
        if (table == null) {
            log.warn("No table with class 'table-news' found");
            return result;
        }

        Elements rows = table.select("tbody tr");

        String tradingCode = null;
        String title = null;
        String content = null;
        LocalDate postDate = null;

        for (Element row : rows) {
            Elements ths = row.select("th");
            Elements tds = row.select("td");

            // Separator rows: single th with colspan indicates end of an item
            if (ths.size() == 1 && ths.get(0).hasAttr("colspan")) {
                if (isComplete(tradingCode, title, content, postDate)) {
                    result.add(NewsItemDTO.builder()
                            .tradingCode(tradingCode)
                            .title(title)
                            .content(content)
                            .postDate(postDate)
                            .build());
                }
                tradingCode = null;
                title = null;
                content = null;
                postDate = null;
                continue;
            }

            if (!ths.isEmpty() && !tds.isEmpty()) {
                String key = htmlParserUtil.cleanText(ths.get(0).text());
                String value = htmlParserUtil.cleanText(tds.get(0).text());

                switch (key) {
                    case "Trading Code:":
                    case "Trading Code":
                        tradingCode = value;
                        break;
                    case "News Title:":
                    case "News Title":
                        title = value;
                        break;
                    case "News:":
                    case "News":
                        content = value;
                        break;
                    case "Post Date:":
                    case "Post Date":
                        LocalDate parsed = dateFormatterUtil.parseDate(value);
                        postDate = parsed != null ? parsed : null;
                        break;
                    default:
                        // ignore other rows
                        break;
                }
            }
        }

        // Handle last item if not followed by separator
        if (isComplete(tradingCode, title, content, postDate)) {
            result.add(NewsItemDTO.builder()
                    .tradingCode(tradingCode)
                    .title(title)
                    .content(content)
                    .postDate(postDate)
                    .build());
        }

        return result;
    }

    private boolean isComplete(String tradingCode, String title, String content, LocalDate postDate) {
        return tradingCode != null && !tradingCode.isEmpty()
                && title != null && !title.isEmpty()
                && content != null && !content.isEmpty()
                && postDate != null;
    }

    /**
     * Check if page appears to be loaded with at least one news item.
     */
    public boolean isLoaded(String html) {
        if (html == null || html.isEmpty()) return false;
        Document doc = Jsoup.parse(html);
        Element table = doc.selectFirst("table.table-news");
        if (table == null) return false;
        Elements rows = table.select("tbody tr");
        return rows != null && !rows.isEmpty();
    }
}