from sqlmodel import Session, create_engine, select
from contextlib import contextmanager

from app import crud
from app.core.config import settings

engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))

# make sure all SQLModel model are imported (app.model) before initializing DB
# otherwise, SQLModel might fail to initialize relationships properly
# for more details: https://github.com/fastapi/full-stack-fastapi-template/issues/28

def get_session():
    with Session(engine) as session:
        yield session

def init_db(session: Session) -> None:
    # Import here to avoid circular import at module level
    from app.model import User, UserCreate
    # Tables should be created with Alembic migrations
    # But if you don't want to use migrations, create
    # the tables un-commenting the next lines
    # from sqlmodel import SQLModel

    # This works because the model are already imported and registered from app.model
    # SQLModel.metadata.create_all(engine)

    user = session.exec(
        select(User).where(User.email == settings.FIRST_SUPERUSER)
    ).first()
    if not user:
        user_in = UserCreate(
            email=settings.FIRST_SUPERUSER,
            password=settings.FIRST_SUPERUSER_PASSWORD,
            is_superuser=True,
        )
        user = crud.create_user(session=session, user_create=user_in)
