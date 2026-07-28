import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# En Render: si se monta un disco persistente, usar esa ruta para el archivo SQLite
# (ej. DATABASE_URL=sqlite:////var/data/control_seed.db) o apuntar a un Postgres
# (DATABASE_URL=postgresql://user:pass@host/db) cuando se quiera escalar más adelante.
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./control_seed.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
