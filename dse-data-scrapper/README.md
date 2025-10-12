# DSE Data Scraper - Enterprise Edition

A production-ready Spring Boot application for scraping market data and fundamental information from the Dhaka Stock Exchange (DSE).

## 🚀 Features

- **Real-Time Market Data**: Scrapes latest share prices every 1 minute during market hours
- **Fundamental Data**: Fetches comprehensive company information, financials, dividends daily
- **OHLC Aggregation**: Aggregates intraday ticks into daily OHLC candles
- **UUID-Based Schema**: Modern database design with UUID primary keys
- **Enterprise Patterns**: Follows Spring Boot best practices and design patterns
- **Retry Mechanism**: Automatic retry on network failures with exponential backoff
- **Async Processing**: Thread pool for parallel data processing
- **Monitoring Ready**: Spring Boot Actuator integration for health checks
- **Comprehensive Logging**: Tracks all scraper executions with performance metrics

## 📋 Prerequisites

- Java 17 or higher
- Maven 3.6+
- PostgreSQL 12+
- Access to DSE website (https://dsebd.org)

## 🗄️ Database Schema

The application uses the following main tables:

### Core Tables
- `company` - Company master data (UUID-based)
- `stockdata` - Real-time market snapshots
- `intradaytick` - Intraday tick data (time-series)
- `dailyohlc` - Daily OHLC aggregated data

### Fundamental Data Tables
- `dividend_information` - Dividend history
- `financial_performance` - Annual financial metrics
- `quarterly_performance` - Quarterly EPS data
- `shareholding_pattern` - Ownership distribution
- `loan_status` - Company debt information

### System Tables
- `scraper_log` - Execution logs and metrics
- `marketsummary` - Market-wide statistics

## 🏗️ Architecture

### Project Structure

```
src/main/java/com/dohatec/oms/datascraper/
├── config/                  # Configuration classes
│   ├── AsyncConfig.java
│   ├── RetryConfig.java
│   ├── ScraperProperties.java
│   ├── SchedulerConfig.java
│   └── WebClientConfig.java
├── dto/                     # Data Transfer Objects
│   ├── StockPriceDTO.java
│   ├── CompanyDataDTO.java
│   └── ScraperResultDTO.java
├── exception/               # Custom exceptions
│   ├── ScraperException.java
│   ├── NetworkException.java
│   └── GlobalExceptionHandler.java
├── model/                   # JPA Entities
│   ├── Company.java
│   ├── StockData.java
│   ├── DividendInformation.java
│   └── ...
├── repository/              # Spring Data JPA Repositories
│   ├── CompanyRepository.java
│   ├── StockDataRepository.java
│   └── ...
├── scheduler/               # Scheduled tasks
│   ├── RealTimeMarketScheduler.java
│   ├── FundamentalDataScheduler.java
│   └── DailyAggregationScheduler.java
├── service/
│   ├── scraper/            # Scraper services
│   │   ├── RealTimeMarketScraper.java
│   │   ├── FundamentalDataScraper.java
│   │   └── DailyOHLCAggregator.java
│   ├── processor/          # Business logic processors
│   │   └── FundamentalDataProcessor.java
│   └── ScraperLogService.java
└── util/                    # Utility classes
    ├── TradingCodeMapper.java
    ├── HtmlParserUtil.java
    └── DateFormatterUtil.java
```

### Design Patterns Used

- **Service Layer Pattern**: Separation of business logic
- **Repository Pattern**: Data access abstraction
- **DTO Pattern**: Data transfer between layers
- **Builder Pattern**: Object construction (Lombok)
- **Singleton Pattern**: Configuration and utility classes
- **Retry Pattern**: Network failure handling
- **Factory Pattern**: Entity creation

## ⚙️ Configuration

### Application Properties

Key configuration in `application.properties`:

```properties
# Enable/Disable Scheduling
scraper.schedule.enabled=true

# Schedule Timings
scraper.schedule.realtime-cron=0 */1 10-14 * * MON-THU
scraper.schedule.fundamental-cron=0 0 16 * * MON-THU

# Retry Configuration
scraper.retry.max-attempts=3
scraper.retry.initial-delay=1000

# HTTP Timeouts
scraper.http.connection-timeout=30000
scraper.http.read-timeout=60000
```

## 🚀 Running the Application

### 1. Clone and Build

```bash
git clone <repository-url>
cd dse-data-scrapper
mvn clean install
```

### 2. Configure Database

Update `application.properties`:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/yourdb
spring.datasource.username=your_username
spring.datasource.password=your_password
```

### 3. Run Application

```bash
# Using Maven
mvn spring-boot:run

# Or using JAR
java -jar target/data-scraper-0.0.1-SNAPSHOT.jar
```

### 4. Using Docker

```bash
docker build -t dse-scraper .
docker run -p 8080:8080 dse-scraper
```

## 📅 Scheduling

### Default Schedule

| Task | Schedule | Description |
|------|----------|-------------|
| Real-Time Market Data | Every 1 minute (10 AM - 2:30 PM, Mon-Thu) | Fetches latest stock prices |
| Fundamental Data | Daily at 4 PM (Mon-Thu) | Fetches company details |
| Daily OHLC | Daily at 3:30 PM (Mon-Thu) | Aggregates intraday data |
| Cleanup | Monthly on 1st at 2 AM | Removes old logs |

### Disable Scheduling

```properties
scraper.schedule.enabled=false
```

## 🔍 Monitoring

### Health Check

```bash
curl http://localhost:8080/actuator/health
```

### Metrics

```bash
curl http://localhost:8080/actuator/metrics
```

### View Scraper Logs

Check `logs/dse-scraper.log` or query the `scraper_log` table:

```sql
SELECT * FROM scraper_log ORDER BY started_at DESC LIMIT 10;
```

## 📊 API Endpoints (Future Enhancement)

While this is primarily a scheduled scraping application, you can add REST controllers for:

- `/api/stocks/{tradingCode}` - Get current stock data
- `/api/companies` - List all companies
- `/api/scraper/trigger/{type}` - Manually trigger scraper
- `/api/logs` - View scraper execution logs

## 🧪 Testing

```bash
# Run all tests
mvn test

# Run specific test
mvn test -Dtest=CompanyRepositoryTest
```

## 🐛 Troubleshooting

### Issue: Scheduler not running

**Solution**: Check that `scraper.schedule.enabled=true` in application.properties

### Issue: Database connection failed

**Solution**: Verify PostgreSQL is running and credentials are correct

### Issue: Network timeout

**Solution**: Increase timeout values:
```properties
scraper.http.connection-timeout=60000
scraper.http.read-timeout=120000
```

### Issue: Company not found errors

**Solution**: Refresh the trading code cache:
- Restart the application
- The cache auto-refreshes hourly

## 📈 Performance Tuning

### Database Connection Pool

```properties
spring.datasource.hikari.maximum-pool-size=20
spring.datasource.hikari.minimum-idle=5
```

### Batch Processing

```properties
spring.jpa.properties.hibernate.jdbc.batch_size=20
scraper.batch.batch-size=20
scraper.batch.thread-pool-size=10
```

## 🔒 Security Considerations

- Store database credentials in environment variables or vault
- Use HTTPS for production deployments
- Implement rate limiting if adding REST APIs
- Regular security updates for dependencies

## 📝 Logging

Log levels can be configured per package:

```properties
logging.level.com.dohatec.oms.datascraper=INFO
logging.level.com.dohatec.oms.datascraper.service.scraper=DEBUG
```

## 🤝 Contributing

1. Follow Spring Boot coding conventions
2. Write unit tests for new features
3. Update documentation
4. Use meaningful commit messages

## 📄 License

Proprietary - Dohatec OMS

## 👥 Team

Dohatec OMS Development Team

## 📞 Support

For issues and questions, contact the development team.

---

## 🆕 What's New in v2.0

- **UUID-based schema**: Migrated from Integer IDs to UUID for better scalability
- **Modular architecture**: Clean separation of concerns
- **Enterprise patterns**: Retry, async processing, proper exception handling
- **Real-time scraping**: 1-minute interval market data collection
- **Comprehensive monitoring**: Scraper logs with performance metrics
- **Configurable scheduling**: Easily customize scrape timings
- **Production-ready**: Proper logging, health checks, graceful shutdown

## 🔄 Migration from v1.0

If migrating from the old version:

1. **Database**: The schema now uses UUIDs. Existing data remains compatible.
2. **Configuration**: Review and update `application.properties`
3. **Scheduling**: Now managed by Spring @Scheduled annotations
4. **Dependencies**: Update `pom.xml` with new dependencies

---

**Built with ❤️ using Spring Boot**

