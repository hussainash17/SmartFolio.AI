package com.dohatec.oms.datascraper.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NewsItemDTO {
    private String tradingCode;
    private String title;
    private String content;
    private LocalDate postDate;
}