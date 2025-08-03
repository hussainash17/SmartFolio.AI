"""
Base service class providing common functionality for all services.
"""

from abc import ABC
from typing import Generic, TypeVar, Type, Optional, List, Any, Dict
from uuid import UUID
from sqlmodel import Session, SQLModel, select
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
import logging

from app.core.db import get_session

ModelType = TypeVar("ModelType", bound=SQLModel)
CreateSchemaType = TypeVar("CreateSchemaType", bound=SQLModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=SQLModel)

logger = logging.getLogger(__name__)


class BaseService(Generic[ModelType, CreateSchemaType, UpdateSchemaType], ABC):
    """
    Base service class providing CRUD operations and common functionality.
    
    This class follows the Repository pattern and provides a clean interface
    for data operations that can be easily mocked for testing.
    """
    
    def __init__(self, model: Type[ModelType], session: Optional[Session] = None):
        """
        Initialize the service with a model type and optional session.
        
        Args:
            model: The SQLModel class this service operates on
            session: Database session (optional, will create one if not provided)
        """
        self.model = model
        self._session = session
    
    @property 
    def session(self) -> Session:
        """Get or create a database session."""
        if self._session is None:
            self._session = next(get_session())
        return self._session
    
    def get_by_id(self, id: UUID) -> Optional[ModelType]:
        """
        Retrieve a record by its ID.
        
        Args:
            id: The UUID of the record to retrieve
            
        Returns:
            The model instance if found, None otherwise
        """
        try:
            return self.session.exec(
                select(self.model).where(self.model.id == id)
            ).first()
        except Exception as e:
            logger.error(f"Error retrieving {self.model.__name__} by ID {id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database error occurred"
            )
    
    def get_multi(
        self, 
        skip: int = 0, 
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[ModelType]:
        """
        Retrieve multiple records with optional filtering.
        
        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            filters: Optional dictionary of filter conditions
            
        Returns:
            List of model instances
        """
        try:
            query = select(self.model)
            
            if filters:
                for key, value in filters.items():
                    if hasattr(self.model, key):
                        query = query.where(getattr(self.model, key) == value)
            
            return self.session.exec(query.offset(skip).limit(limit)).all()
        except Exception as e:
            logger.error(f"Error retrieving {self.model.__name__} records: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database error occurred"
            )
    
    def create(self, obj_in: CreateSchemaType, **kwargs) -> ModelType:
        """
        Create a new record.
        
        Args:
            obj_in: The creation schema with input data
            **kwargs: Additional fields to set on the model
            
        Returns:
            The created model instance
        """
        try:
            obj_data = obj_in.model_dump() if hasattr(obj_in, 'model_dump') else obj_in.dict()
            obj_data.update(kwargs)
            
            db_obj = self.model(**obj_data)
            self.session.add(db_obj)
            self.session.commit()
            self.session.refresh(db_obj)
            
            logger.info(f"Created {self.model.__name__} with ID {db_obj.id}")
            return db_obj
            
        except IntegrityError as e:
            self.session.rollback()
            logger.error(f"Integrity error creating {self.model.__name__}: {e}")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A record with this data already exists"
            )
        except Exception as e:
            self.session.rollback()
            logger.error(f"Error creating {self.model.__name__}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database error occurred"
            )
    
    def update(
        self, 
        id: UUID, 
        obj_in: UpdateSchemaType,
        **kwargs
    ) -> Optional[ModelType]:
        """
        Update an existing record.
        
        Args:
            id: The UUID of the record to update
            obj_in: The update schema with new data
            **kwargs: Additional fields to set on the model
            
        Returns:
            The updated model instance if found, None otherwise
        """
        try:
            db_obj = self.get_by_id(id)
            if not db_obj:
                return None
            
            update_data = obj_in.model_dump(exclude_unset=True) if hasattr(obj_in, 'model_dump') else obj_in.dict(exclude_unset=True)
            update_data.update(kwargs)
            
            for field, value in update_data.items():
                if hasattr(db_obj, field):
                    setattr(db_obj, field, value)
            
            self.session.add(db_obj)
            self.session.commit()
            self.session.refresh(db_obj)
            
            logger.info(f"Updated {self.model.__name__} with ID {id}")
            return db_obj
            
        except IntegrityError as e:
            self.session.rollback()
            logger.error(f"Integrity error updating {self.model.__name__}: {e}")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A record with this data already exists"
            )
        except Exception as e:
            self.session.rollback()
            logger.error(f"Error updating {self.model.__name__}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database error occurred"
            )
    
    def delete(self, id: UUID) -> bool:
        """
        Delete a record by ID.
        
        Args:
            id: The UUID of the record to delete
            
        Returns:
            True if the record was deleted, False if not found
        """
        try:
            db_obj = self.get_by_id(id)
            if not db_obj:
                return False
            
            self.session.delete(db_obj)
            self.session.commit()
            
            logger.info(f"Deleted {self.model.__name__} with ID {id}")
            return True
            
        except Exception as e:
            self.session.rollback()
            logger.error(f"Error deleting {self.model.__name__}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database error occurred"
            )
    
    def exists(self, **filters) -> bool:
        """
        Check if a record exists with the given filters.
        
        Args:
            **filters: Field-value pairs to filter by
            
        Returns:
            True if a record exists, False otherwise
        """
        try:
            query = select(self.model)
            
            for key, value in filters.items():
                if hasattr(self.model, key):
                    query = query.where(getattr(self.model, key) == value)
            
            result = self.session.exec(query).first()
            return result is not None
            
        except Exception as e:
            logger.error(f"Error checking existence of {self.model.__name__}: {e}")
            return False
    
    def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """
        Count records with optional filtering.
        
        Args:
            filters: Optional dictionary of filter conditions
            
        Returns:
            Number of matching records
        """
        try:
            from sqlmodel import func
            
            query = select(func.count(self.model.id))
            
            if filters:
                for key, value in filters.items():
                    if hasattr(self.model, key):
                        query = query.where(getattr(self.model, key) == value)
            
            return self.session.exec(query).one()
            
        except Exception as e:
            logger.error(f"Error counting {self.model.__name__} records: {e}")
            return 0


class ServiceException(Exception):
    """Custom exception for service layer errors."""
    
    def __init__(self, message: str, status_code: int = status.HTTP_400_BAD_REQUEST):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)