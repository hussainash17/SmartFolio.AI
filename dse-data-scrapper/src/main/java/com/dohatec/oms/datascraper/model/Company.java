package com.dohatec.oms.datascraper.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entity representing a company in the DSE (Dhaka Stock Exchange)
 * Maps to the 'company' table in the database
 * Exact mapping to database schema
 */
@Getter
@Setter
@Entity
@Table(name = "company")
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Company {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "trading_code", nullable = false)
    private String tradingCode;

    @Column(name = "scrip_code")
    private Integer scripCode;

    @Column(name = "type_of_instrument")
    private String typeOfInstrument;

    @Column(name = "market_category")
    private String marketCategory;

    @Column(name = "electronic_share")
    private String electronicShare;

    @Column(name = "authorized_capital")
    private Double authorizedCapital;

    @Column(name = "paid_up_capital")
    private Double paidUpCapital;

    @Column(name = "face_value")
    private Double faceValue;

    @Column(name = "market_lot")
    private Integer marketLot;

    @Column(name = "total_outstanding_securities")
    private Integer totalOutstandingSecurities;

    @Column(name = "sector")
    private String sector;

    @Column(name = "debut_trading_date")
    private String debutTradingDate;

    @Column(name = "listing_year")
    private Integer listingYear;

    @Column(name = "address")
    private String address;

    @Column(name = "factory_address")
    private String factoryAddress;

    @Column(name = "phone")
    private String phone;

    @Column(name = "fax")
    private String fax;

    @Column(name = "email")
    private String email;

    @Column(name = "website")
    private String website;

    @Column(name = "company_secretary_name")
    private String companySecretaryName;

    @Column(name = "company_secretary_email")
    private String companySecretaryEmail;

    @Column(name = "company_secretary_cell_no")
    private String companySecretaryCellNo;

    @Column(name = "reserve_and_surplus")
    private Double reserveAndSurplus;

    @Column(name = "year_end")
    private String yearEnd;

    @Column(name = "last_agm_date")
    private String lastAgmDate;

    @Column(name = "fifty_two_weeks_moving_range")
    private String fiftyTwoWeeksMovingRange;

    // Additional merged fields from stockcompany
    @Column(name = "company_name")
    private String companyName;

    @Column(name = "industry")
    private String industry;

    @Column(name = "market_cap")
    private BigDecimal marketCap;

    @Column(name = "total_shares")
    private Integer totalShares;

    @Column(name = "free_float")
    private BigDecimal freeFloat;

    @Column(name = "pe_ratio")
    private BigDecimal peRatio;

    @Column(name = "pb_ratio")
    private BigDecimal pbRatio;

    @Column(name = "eps")
    private BigDecimal eps;

    @Column(name = "nav")
    private BigDecimal nav;

    @Column(name = "dividend_yield")
    private BigDecimal dividendYield;

    @Column(name = "is_active")
    private Boolean isActive;

    @Column(name = "is_dsex")
    private Boolean isDsex;

    @Column(name = "is_ds30")
    private Boolean isDs30;

    @Column(name = "is_dses")
    private Boolean isDses;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (updatedAt == null) {
            updatedAt = LocalDateTime.now();
        }
        if (isActive == null) {
            isActive = true;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    @Override
    public String toString() {
        return "Company{" +
                "id=" + id +
                ", tradingCode='" + tradingCode + '\'' +
                ", name='" + name + '\'' +
                ", sector='" + sector + '\'' +
                '}';
    }
}
