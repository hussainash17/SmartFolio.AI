import logging

from apscheduler.schedulers.background import BackgroundScheduler
from sqlmodel import Session

from app.core.db import engine
from app.crud import upsert_company
from app.scraper.dse import fetch_dse_company_list

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()


def fetch_and_save_companies():
    with Session(engine) as session:
        companies = fetch_dse_company_list()
        for company in companies:
            upsert_company(session=session, company_data={
                "trading_code": company["trading_code"],
                "name": company["trading_code"],
            })
        logger.info(f"Upserted {len(companies)} companies from DSE.")


def start_scheduler(app):
    scheduler.add_job(fetch_and_save_companies, 'cron', minute=0)
    scheduler.start()
    logger.info("Started DSE company fetch scheduler (runs every hour)...")

    @app.on_event("shutdown")
    def shutdown_event():
        scheduler.shutdown()
