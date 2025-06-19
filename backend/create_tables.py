from sqlalchemy import create_engine
from sqlalchemy_models import Base

DATABASE_URL = "postgresql://postgres:postgres@192.168.31.49:5432/postgres"
engine = create_engine(DATABASE_URL)

Base.metadata.create_all(bind=engine)