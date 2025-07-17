import logging

from sqlalchemy import Engine
from sqlmodel import Session, select
from tenacity import after_log, before_log, retry, stop_after_attempt, wait_fixed

from app.core.db import engine
from app.scraper.dse import fetch_dse_company_list
from app.crud import upsert_company

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

max_tries = 60 * 5  # 5 minutes
wait_seconds = 1


@retry(
    stop=stop_after_attempt(max_tries),
    wait=wait_fixed(wait_seconds),
    before=before_log(logger, logging.INFO),
    after=after_log(logger, logging.WARN),
)
def init(db_engine: Engine) -> None:
    try:
        with Session(db_engine) as session:
            # Try to create session to check if DB is awake
            session.exec(select(1))
    except Exception as e:
        logger.error(e)
        raise e


def main() -> None:
    logger.info("Initializing service")
    init(engine)
    logger.info("Service finished initializing")


if __name__ == "__main__":
    with Session(engine) as session:
        companies = fetch_dse_company_list()
        for company in companies:
            upsert_company(session=session, company_data={
                "trading_code": company["trading_code"],
                "name": company["trading_code"],  # Name not available in this table, use trading_code as placeholder
            })
        print(f"Upserted {len(companies)} companies from DSE.")
