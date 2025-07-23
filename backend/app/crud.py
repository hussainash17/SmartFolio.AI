import uuid
from typing import Any

from sqlmodel import Session, select

from app.core.security import get_password_hash, verify_password
from app.model.company import Company
from app.model.item import ItemCreate, Item
from app.model.market_information import MarketInformation
from app.model.user import User, UserCreate, UserUpdate


def create_user(*, session: Session, user_create: UserCreate) -> User:
    db_obj = User.model_validate(
        user_create, update={"hashed_password": get_password_hash(user_create.password)}
    )
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def update_user(*, session: Session, db_user: User, user_in: UserUpdate) -> Any:
    user_data = user_in.model_dump(exclude_unset=True)
    extra_data = {}
    if "password" in user_data:
        password = user_data["password"]
        hashed_password = get_password_hash(password)
        extra_data["hashed_password"] = hashed_password
    db_user.sqlmodel_update(user_data, update=extra_data)
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user


def get_user_by_email(*, session: Session, email: str) -> User | None:
    statement = select(User).where(User.email == email)
    session_user = session.exec(statement).first()
    return session_user


def authenticate(*, session: Session, email: str, password: str) -> User | None:
    db_user = get_user_by_email(session=session, email=email)
    if not db_user:
        return None
    if not verify_password(password, db_user.hashed_password):
        return None
    return db_user


def create_item(*, session: Session, item_in: ItemCreate, owner_id: uuid.UUID) -> Item:
    db_item = Item.model_validate(item_in, update={"owner_id": owner_id})
    session.add(db_item)
    session.commit()
    session.refresh(db_item)
    return db_item


def create_company(*, session: Session, company: Company) -> Company:
    session.add(company)
    session.commit()
    session.refresh(company)
    return company


def get_company_by_trading_code(*, session: Session, trading_code: str) -> Company | None:
    statement = select(Company).where(Company.trading_code == trading_code)
    return session.exec(statement).first()


def upsert_company(*, session: Session, company_data: dict) -> Company:
    db_company = get_company_by_trading_code(session=session, trading_code=company_data["trading_code"])
    if db_company:
        for key, value in company_data.items():
            setattr(db_company, key, value)
        session.add(db_company)
        session.commit()
        session.refresh(db_company)
        return db_company
    else:
        company = Company(**company_data)
        session.add(company)
        session.commit()
        session.refresh(company)
        return company


def get_stock_data_by_trading_code(*, session: Session, trading_code: str) -> MarketInformation | None:
    statement = select(MarketInformation).where(MarketInformation.trading_code == trading_code)
    return session.exec(statement).first()


def upsert_stock_data(*, session: Session, stock_data: dict) -> MarketInformation:
    db_stock = get_stock_data_by_trading_code(session=session, trading_code=stock_data["trading_code"])
    if db_stock:
        # Update existing record
        for key, value in stock_data.items():
            if key != "trading_code":  # Don't update the trading code
                setattr(db_stock, key, value)
        session.add(db_stock)
        session.commit()
        session.refresh(db_stock)
        return db_stock
    else:
        # Create new record
        stock = MarketInformation(**stock_data)
        session.add(stock)
        session.commit()
        session.refresh(stock)
        return stock


def get_all_stock_data(*, session: Session, limit: int = 100) -> list[MarketInformation]:
    statement = select(MarketInformation).limit(limit)
    return session.exec(statement).all()
