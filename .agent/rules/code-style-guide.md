---
trigger: always_on
---

# TradeSmart Code Style Guide

This guide documents the coding patterns, naming conventions, and best practices used across the TradeSmart project. Antigravity should follow these patterns when working with this codebase.

---

## Table of Contents

1. [Backend (Python/FastAPI)](#backend-pythonfastapi)
2. [DSE Data Scrapper (Java/Spring Boot)](#dse-data-scrapper-javaspring-boot)
3. [PMS Frontend (React/TypeScript)](#pms-frontend-reacttypescript)
4. [General Principles](#general-principles)

---

## Backend (Python/FastAPI)

### Project Structure

```
backend/
├── app/
│   ├── api/
│   │   ├── routes/          # API endpoint definitions
│   │   ├── deps.py          # Dependency injection
│   │   └── main.py          # API router registration
│   ├── model/               # SQLModel database models & Pydantic schemas
│   ├── services/            # Business logic layer
│   ├── repositories/        # Data access layer (optional)
│   ├── core/                # Core configuration
│   ├── utils/               # Utility functions
│   └── alembic/             # Database migrations
├── migrations/
├── scripts/                 # Utility scripts
└── tests/
```

### Naming Conventions

#### Files and Directories
- **Files**: `snake_case.py`
- **Directories**: `snake_case/`
- **Routes**: Named after the resource, e.g., `portfolio.py`, `analytics.py`
- **Services**: Named after the entity + `_service.py`, e.g., `portfolio_service.py`
- **Models**: Named after the entity, e.g., `portfolio.py`, `user.py`

#### Classes
- **Models**: `PascalCase`, singular noun, e.g., `Portfolio`, `PortfolioPosition`
- **Pydantic Schemas**: 
  - Base: `{Entity}Base` (e.g., `PortfolioBase`)
  - Create: `{Entity}Create` (e.g., `PortfolioCreate`)
  - Update: `{Entity}Update` (e.g., `PortfolioUpdate`)
  - Public: `{Entity}Public` (e.g., `PortfolioPublic`)
- **Services**: `{Entity}Service` (e.g., `PortfolioService`)
- **Exceptions**: `{Name}Exception` (e.g., `ServiceException`)

#### Functions and Variables
- **Functions**: `snake_case`, verb-first, e.g., `get_user_portfolios()`, `create_portfolio()`
- **Private functions**: Prefix with `_`, e.g., `_calculate_commission()`
- **Variables**: `snake_case`, descriptive, e.g., `portfolio_id`, `total_investment`
- **Constants**: `UPPER_SNAKE_CASE`, e.g., `DHAKA_TZ`, `MAX_RETRIES`

#### Database Fields
- Use `snake_case` for column names
- Foreign keys: `{table}_id`, e.g., `user_id`, `portfolio_id`
- Timestamps: Use `created_at`, `updated_at`
- Boolean flags: Use `is_` prefix, e.g., `is_active`, `is_default`

### Architecture Patterns

#### 1. Layered Architecture

**Routes Layer** (`app/api/routes/`)
- Define API endpoints using FastAPI decorators
- Handle HTTP request/response
- Perform minimal validation (use Pydantic models)
- Call service layer for business logic
- Use dependency injection for session and current user

```python
from app.api.deps import SessionDep, CurrentUser

@router.get("/{portfolio_id}")
def get_portfolio(
    portfolio_id: UUID,
    current_user: CurrentUser,
    session: SessionDep
):
    """Get a specific portfolio by ID"""
    portfolio = session.exec(
        select(Portfolio).where(
            Portfolio.id == portfolio_id,
            Portfolio.user_id == current_user.id
        )
    ).first()
    
    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found"
        )
    
    return portfolio
```

**Service Layer** (`app/services/`)
- Encapsulate business logic
- Coordinate between multiple models
- Handle transactions
- Raise `ServiceException` on errors
- Use logging for debugging

```python
class PortfolioService(BaseService[Portfolio, PortfolioCreate, PortfolioUpdate]):
    """Service for portfolio management operations."""
    
    def __init__(self, session: Optional[Session] = None):
        super().__init__(Portfolio, session)
    
    def create_portfolio(self, portfolio_data: PortfolioCreate, user_id: UUID) -> Portfolio:
        """Create a new portfolio for a user."""
        try:
            # Business logic here
            portfolio = Portfolio(user_id=user_id, **portfolio_data.dict())
            self.session.add(portfolio)
            self.session.commit()
            self.session.refresh(portfolio)
            
            logger.info(f"Created portfolio {portfolio.id} for user {user_id}")
            return portfolio
        except Exception as e:
            self.session.rollback()
            logger.error(f"Error creating portfolio: {e}")
            raise ServiceException(f"Failed to create portfolio: {str(e)}")
```

#### 2. Model Design (SQLModel)

**Table Models**
- Inherit from `SQLModel` with `table=True`
- Use `uuid.UUID` for primary keys with `default_factory=uuid.uuid4`
- Use `Field()` for column definitions
- Define relationships using `Relationship()`
- Use `TYPE_CHECKING` for circular import prevention

```python
from sqlmodel import Field, Relationship, SQLModel
from typing import TYPE_CHECKING
import uuid

if TYPE_CHECKING:
    from .user import User

class Portfolio(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id")
    name: str = Field(max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)
    is_default: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    cash_balance: Optional[Decimal] = Field(default=Decimal(0), max_digits=15, decimal_places=2)
    
    # Relationships
    user: "User" = Relationship(back_populates="portfolios")
    positions: list["PortfolioPosition"] = Relationship(back_populates="portfolio")
```

**Pydantic Models**
- Create separate schemas for different operations
- Always include: `{Entity}Base`, `{Entity}Create`, `{Entity}Update`, `{Entity}Public`
- Use `Optional` fields in Update schemas
- Keep Public schemas for API responses

```python
class PortfolioBase(SQLModel):
    name: str
    description: Optional[str] = None
    is_default: bool = False

class PortfolioCreate(PortfolioBase):
    pass

class PortfolioUpdate(SQLModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_default: Optional[bool] = None

class PortfolioPublic(PortfolioBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    cash_balance: Optional[Decimal] = None
```

#### 3. Dependency Injection

Use FastAPI's dependency injection system:

```python
# app/api/deps.py
from typing import Annotated
from fastapi import Depends
from sqlmodel import Session

SessionDep = Annotated[Session, Depends(get_session)]
CurrentUser = Annotated[User, Depends(get_current_user)]
```

#### 4. Error Handling

- Use FastAPI's `HTTPException` in routes
- Use custom `ServiceException` in services
- Include descriptive error messages
- Log errors with context

```python
# In routes
if not portfolio:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Portfolio not found"
    )

# In services
raise ServiceException("Portfolio not found or access denied", status_code=404)
```

### Best Practices

1. **Type Hints**: Always use type hints for function parameters and return types
2. **Docstrings**: Use Google-style docstrings for functions and classes
3. **Decimal for Money**: Use `Decimal` type for all financial calculations
4. **UUID for IDs**: Use `uuid.UUID` for all entity IDs
5. **Timezone**: Use `datetime.utcnow()` for timestamps
6. **Query Optimization**: Avoid N+1 queries, use joins when fetching related data
7. **Transactions**: Use database transactions for multi-step operations
8. **Logging**: Use structured logging with context (user_id, portfolio_id, etc.)

---

## DSE Data Scrapper (Java/Spring Boot)

### Project Structure

```
dse-data-scrapper/
└── src/
    └── main/
        └── java/
            └── com/
                └── dohatec/
                    └── oms/
                        └── datascraper/
                            ├── model/          # JPA entities
                            ├── repository/     # Spring Data JPA repositories
                            ├── service/        # Business logic
                            ├── controller/     # REST controllers (if any)
                            └── config/         # Configuration classes
```

### Naming Conventions

#### Files and Classes
- **Entities**: `PascalCase`, singular, e.g., `Portfolio`, `StockData`
- **Repositories**: `{Entity}Repository`, e.g., `PortfolioRepository`
- **Services**: `{Entity}Service`, e.g., `PortfolioValuationService`
- **DTOs**: `{Entity}DTO` or `{Entity}Request`/`{Entity}Response`

#### Methods and Variables
- **Methods**: `camelCase`, verb-first, e.g., `calculateAndSaveDailyValuations()`
- **Variables**: `camelCase`, e.g., `portfolioId`, `totalValue`
- **Constants**: `UPPER_SNAKE_CASE`, e.g., `DHAKA_TZ`, `DEFAULT_PAGE_SIZE`
- **Booleans**: Prefix with `is`, `has`, or similar, e.g., `isActive`, `hasPermission`

### Architecture Patterns

#### 1. Service Layer Pattern

```java
@Slf4j
@Service
@RequiredArgsConstructor
public class PortfolioValuationService {
    
    private static final ZoneId DHAKA_TZ = ZoneId.of("Asia/Dhaka");
    
    private final PortfolioRepository portfolioRepository;
    private final PortfolioPositionRepository positionRepository;
    private final StockDataRepository stockDataRepository;
    
    @Transactional
    public int calculateAndSaveDailyValuations(LocalDate valuationDate) {
        List<Portfolio> portfolios = portfolioRepository.findByIsActiveTrue();
        int processed = 0;
        
        for (Portfolio portfolio : portfolios) {
            try {
                calculateAndUpsertPortfolioValuation(portfolio, valuationDate);
                processed++;
            } catch (Exception ex) {
                log.error("Failed valuation for portfolio {}: {}", 
                    portfolio.getId(), ex.getMessage(), ex);
            }
        }
        
        log.info("Processed {} portfolios for {}", processed, valuationDate);
        return processed;
    }
}
```

#### 2. Repository Pattern

Use Spring Data JPA:

```java
public interface PortfolioRepository extends JpaRepository<Portfolio, UUID> {
    List<Portfolio> findByIsActiveTrue();
    Optional<Portfolio> findByUserIdAndIsDefaultTrue(UUID userId);
}
```

### Best Practices

1. **Lombok**: Use `@Slf4j`, `@RequiredArgsConstructor`, `@Data`, `@Builder`
2. **Transactions**: Use `@Transactional` for data-modifying operations
3. **BigDecimal**: Use `BigDecimal` for all financial calculations, never `double` or `float`
4. **Optional**: Return `Optional<T>` instead of null for single-value queries
5. **Constants**: Define timezone, configuration values as constants
6. **Logging**: Use SLF4J with parameterized logging for performance
7. **Exception Handling**: Catch and log specific exceptions, handle gracefully

---

## PMS Frontend (React/TypeScript)

### Project Structure

```
pms-frontend/
├── components/           # React components
│   ├── dashboard/       # Dashboard-specific components
│   ├── portfolio/       # Portfolio-specific components
│   ├── ui/              # Reusable UI components (shadcn/ui)
│   └── ...
├── hooks/               # Custom React hooks
├── types/               # TypeScript type definitions
├── src/
│   └── client/          # Generated API client from OpenAPI
├── lib/                 # Utility libraries
├── styles/              # Global styles
└── public/              # Static assets
```

### Naming Conventions

#### Files and Directories
- **Components**: `PascalCase.tsx`, e.g., `PortfolioDetail.tsx`, `ComprehensiveDashboard.tsx`
- **Hooks**: `use{Name}.ts`, e.g., `usePortfolios.ts`, `useAnalytics.ts`
- **Types**: `{name}.ts` in `types/` directory
- **Utils**: `{name}.ts` in `lib/` directory

#### Components and Hooks
- **Components**: `PascalCase`, e.g., `PortfolioDeta