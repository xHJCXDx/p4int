import os
from sqlalchemy import text
from sqlmodel import SQLModel, create_engine, Session

# PostgreSQL Configuration
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/p4_p2_db"
)

# Extract database name from URL
def get_db_name():
    if "postgresql" in DATABASE_URL:
        return DATABASE_URL.split("/")[-1]
    return "p4_p2_db"

def create_database_if_not_exists():
    """Create PostgreSQL database if it doesn't exist."""
    if "sqlite" in DATABASE_URL:
        return

    # Connect to PostgreSQL server without specifying a database
    db_name = get_db_name()
    server_url = DATABASE_URL.rsplit("/", 1)[0]

    try:
        engine_server = create_engine(
            server_url + "/postgres",
            echo=False,
            isolation_level="AUTOCOMMIT"
        )
        with engine_server.connect() as conn:
            # Check if database exists
            result = conn.execute(
                text(f"SELECT 1 FROM pg_database WHERE datname = '{db_name}'")
            )
            if not result.fetchone():
                conn.execute(text(f"CREATE DATABASE {db_name}"))
                print(f"✓ Database '{db_name}' created successfully")
            else:
                print(f"✓ Database '{db_name}' already exists")
        engine_server.dispose()
    except Exception as e:
        print(f"⚠ Warning: Could not create database - {e}")
        print(f"  Make sure PostgreSQL is running and accessible")

engine = create_engine(
    DATABASE_URL,
    echo=False,
    pool_size=10,
    max_overflow=20,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

def create_db_and_tables():
    create_database_if_not_exists()
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
