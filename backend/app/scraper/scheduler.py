import asyncio
import logging
from datetime import datetime, time
from typing import Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.scraper.dse_scraper import run_dse_scraper
from app.scraper.stocknow_scraper import fetch_and_store_stocknow

logger = logging.getLogger(__name__)


class SmartStockScheduler:
    """Scheduler for SmartStock data collection tasks"""
    
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.is_running = False
    
    def start(self):
        """Start the scheduler"""
        if not self.is_running:
            # Market hours: 10:00 AM to 2:30 PM (Bangladesh time)
            # Scrape every 30 seconds during market hours
            self.scheduler.add_job(
                run_dse_scraper,
                CronTrigger(
                    day_of_week='mon-fri',
                    hour='10-14',
                    minute='*',
                    second='*/30'
                ),
                id='dse_scraper_market_hours',
                name='DSE Scraper - Market Hours',
                max_instances=1,
                coalesce=True
            )
            # StockNow scraping every 5 minutes during market hours
            self.scheduler.add_job(
                fetch_and_store_stocknow,
                CronTrigger(
                    day_of_week='mon-fri',
                    hour='10-17',
                    minute='*/5',
                    second='0'
                ),
                id='stocknow_scraper',
                name='StockNow Scraper',
                max_instances=1,
                coalesce=True
            )
            
            # Scrape every 5 minutes outside market hours
            self.scheduler.add_job(
                run_dse_scraper,
                CronTrigger(
                    day_of_week='mon-fri',
                    hour='0-9,15-23',
                    minute='*/5'
                ),
                id='dse_scraper_off_hours',
                name='DSE Scraper - Off Hours',
                max_instances=1,
                coalesce=True
            )
            
            # Weekend scraping every 15 minutes
            self.scheduler.add_job(
                run_dse_scraper,
                CronTrigger(
                    day_of_week='sat-sun',
                    minute='*/15'
                ),
                id='dse_scraper_weekend',
                name='DSE Scraper - Weekend',
                max_instances=1,
                coalesce=True
            )
            
            # Daily data aggregation at end of trading day
            self.scheduler.add_job(
                self.aggregate_daily_data,
                CronTrigger(
                    day_of_week='mon-fri',
                    hour=15,
                    minute=0
                ),
                id='daily_aggregation',
                name='Daily Data Aggregation',
                max_instances=1
            )
            
            # Cleanup old data weekly
            self.scheduler.add_job(
                self.cleanup_old_data,
                CronTrigger(
                    day_of_week='sun',
                    hour=2,
                    minute=0
                ),
                id='data_cleanup',
                name='Data Cleanup',
                max_instances=1
            )
            
            self.scheduler.start()
            self.is_running = True
            logger.info("SmartStock scheduler started")
    
    def stop(self):
        """Stop the scheduler"""
        if self.is_running:
            self.scheduler.shutdown()
            self.is_running = False
            logger.info("SmartStock scheduler stopped")
    
    async def aggregate_daily_data(self):
        """Aggregate intraday data into daily OHLC"""
        try:
            from app.scraper.dse_scraper import DSEScraper
            from app.core.db import get_session
            
            async with DSEScraper() as scraper:
                db = next(get_session())
                try:
                    await scraper.aggregate_daily_data(db, datetime.utcnow())
                    logger.info("Daily data aggregation completed")
                finally:
                    db.close()
        except Exception as e:
            logger.error(f"Error in daily data aggregation: {e}")
    
    async def cleanup_old_data(self):
        """Clean up old data to prevent database bloat"""
        try:
            from app.core.db import get_session
            from app.model.stock import IntradayTick, StockData
            from sqlmodel import delete
            from datetime import datetime, timedelta
            
            db = next(get_session())
            try:
                # Keep intraday ticks for 7 days
                cutoff_date = datetime.utcnow() - timedelta(days=7)
                stmt = delete(IntradayTick).where(IntradayTick.timestamp < cutoff_date)
                result = db.exec(stmt)
                db.commit()
                logger.info(f"Cleaned up {result.rowcount} old intraday ticks")
                
                # Keep stock data for 30 days
                cutoff_date = datetime.utcnow() - timedelta(days=30)
                stmt = delete(StockData).where(StockData.timestamp < cutoff_date)
                result = db.exec(stmt)
                db.commit()
                logger.info(f"Cleaned up {result.rowcount} old stock data records")
                
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Error in data cleanup: {e}")
    
    def get_jobs(self):
        """Get all scheduled jobs"""
        return self.scheduler.get_jobs()
    
    def pause_job(self, job_id: str):
        """Pause a specific job"""
        try:
            self.scheduler.pause_job(job_id)
            logger.info(f"Job {job_id} paused")
        except Exception as e:
            logger.error(f"Error pausing job {job_id}: {e}")
    
    def resume_job(self, job_id: str):
        """Resume a specific job"""
        try:
            self.scheduler.resume_job(job_id)
            logger.info(f"Job {job_id} resumed")
        except Exception as e:
            logger.error(f"Error resuming job {job_id}: {e}")
    
    def run_job_now(self, job_id: str):
        """Run a specific job immediately"""
        try:
            job = self.scheduler.get_job(job_id)
            if job:
                job.modify(next_run_time=datetime.utcnow())
                logger.info(f"Job {job_id} scheduled to run immediately")
            else:
                logger.warning(f"Job {job_id} not found")
        except Exception as e:
            logger.error(f"Error running job {job_id}: {e}")


# Global scheduler instance
scheduler = SmartStockScheduler()


def start_scheduler():
    """Start the global scheduler"""
    scheduler.start()


def stop_scheduler():
    """Stop the global scheduler"""
    scheduler.stop()


if __name__ == "__main__":
    # For testing
    async def main():
        scheduler.start()
        try:
            # Keep running for 1 hour
            await asyncio.sleep(3600)
        finally:
            scheduler.stop()
    
    asyncio.run(main())
