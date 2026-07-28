"""
Modelos de base de datos para Control SEED.
Diseño: cada ET subido se guarda como un Contenedor con sus Transacciones.
El Maestro de productores se guarda aparte y se puede actualizar independientemente.
"""
from sqlalchemy import (
    Column, Integer, String, Float, Date, Boolean, ForeignKey, DateTime, UniqueConstraint
)
from sqlalchemy.orm import relationship, declarative_base
import datetime

Base = declarative_base()


class Contenedor(Base):
    __tablename__ = "contenedores"

    id = Column(Integer, primary_key=True)
    container_id = Column(String, unique=True, index=True, nullable=False)  # nombre de archivo (sin duplicar)
    po_number = Column(String, index=True)
    seller_name = Column(String)
    shipment_month = Column(Date)                 # valor USADO en el análisis (puede estar corregido)
    shipment_month_original = Column(Date)         # valor tal como venía en el archivo, si se corrigió
    shipment_month_corrected = Column(Boolean, default=False)
    contract_date = Column(Date)
    date_min = Column(Date)
    date_max = Column(Date)
    n_purchases = Column(Integer)
    n_missing_date = Column(Integer)
    n_out_of_range = Column(Integer)
    pct_out_of_range = Column(Float)
    n_after_shipment = Column(Integer)
    flag = Column(String)
    total_kg = Column(Float)                       # suma de kg de todas las transacciones (para "cuánto se exportó")
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)
    source_filename = Column(String)

    transacciones = relationship("Transaccion", back_populates="contenedor", cascade="all, delete-orphan")


class Transaccion(Base):
    __tablename__ = "transacciones_compra"

    id = Column(Integer, primary_key=True)
    contenedor_id = Column(Integer, ForeignKey("contenedores.id"), nullable=False)
    farm_id = Column(String, index=True)
    farm_name = Column(String)
    purchase_date = Column(Date)
    purchase_year = Column(Integer, index=True)
    qty_kg = Column(Float)
    seed_status = Column(String)     # ACTIVO / RETIRADO / NO ENCONTRADO EN SEED
    out_of_range = Column(Boolean, default=False)
    after_shipment = Column(Boolean, default=False)

    contenedor = relationship("Contenedor", back_populates="transacciones")


class ProductorMaestro(Base):
    __tablename__ = "productores_maestro"

    id = Column(Integer, primary_key=True)
    farm_id = Column(String, unique=True, index=True, nullable=False)
    entity_name = Column(String)
    status = Column(String)  # ACTIVO / RETIRADO
    ann_prod_60kg_bags = Column(Float)
    ann_prod_kg = Column(Float)
    region = Column(String)  # ej. "Caldas" — de qué maestro vino
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)


class MaestroUpload(Base):
    """Registro de cargas del archivo maestro (para saber cuál está vigente)."""
    __tablename__ = "maestro_uploads"

    id = Column(Integer, primary_key=True)
    filename = Column(String)
    region = Column(String)
    n_activos = Column(Integer)
    n_retirados = Column(Integer)
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)
