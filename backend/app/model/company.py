from sqlmodel import SQLModel, Field


class Company(SQLModel, table=True):
    company_id: int | None = Field(default=None, primary_key=True)
    name: str = Field(max_length=255)
    trading_code: str = Field(max_length=50, unique=True)
    scrip_code: int | None = None
    type_of_instrument: str | None = Field(default=None, max_length=50)
    market_category: str | None = Field(default=None, max_length=1)
    electronic_share: str | None = Field(default=None, max_length=1)
    authorized_capital: float | None = None
    paid_up_capital: float | None = None
    face_value: float | None = None
    market_lot: int | None = None
    total_outstanding_securities: int | None = None
    sector: str | None = Field(default=None, max_length=255)
    debut_trading_date: str | None = None  # Use str for date, parse as needed
    listing_year: int | None = None
    address: str | None = Field(default=None, max_length=2500)
    factory_address: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=255)
    fax: str | None = Field(default=None, max_length=255)
    email: str | None = Field(default=None, max_length=255)
    website: str | None = Field(default=None, max_length=255)
    company_secretary_name: str | None = Field(default=None, max_length=255)
    company_secretary_email: str | None = Field(default=None, max_length=255)
    company_secretary_cell_no: str | None = Field(default=None, max_length=255)
    reserve_and_surplus: float | None = None
    year_end: str | None = Field(default=None, max_length=25)
    last_agm_date: str | None = None  # Use str for date, parse as needed
    fifty_two_weeks_moving_range: str | None = Field(default=None, max_length=100)
