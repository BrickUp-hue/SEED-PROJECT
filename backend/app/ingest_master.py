"""Ingesta del archivo maestro de productores SEED hacia la base de datos."""
from sqlalchemy.orm import Session
from . import models
from .audit_engine import load_master


def ingest_master(db: Session, file_path: str, filename: str, region: str = "Caldas"):
    active, retirados = load_master(file_path)

    n_upserted_active = 0
    for farm_id, info in active.items():
        existing = db.query(models.ProductorMaestro).filter_by(farm_id=farm_id).first()
        prod_bags = info.get("ann_prod_60kg_bags")
        prod_kg = (prod_bags * 60) if isinstance(prod_bags, (int, float)) else None
        if existing:
            existing.entity_name = info.get("entity_name")
            existing.status = "ACTIVO"
            existing.ann_prod_60kg_bags = prod_bags
            existing.ann_prod_kg = prod_kg
            existing.region = region
        else:
            db.add(models.ProductorMaestro(
                farm_id=farm_id,
                entity_name=info.get("entity_name"),
                status="ACTIVO",
                ann_prod_60kg_bags=prod_bags,
                ann_prod_kg=prod_kg,
                region=region,
            ))
        n_upserted_active += 1

    n_upserted_retirados = 0
    for farm_id in retirados:
        existing = db.query(models.ProductorMaestro).filter_by(farm_id=farm_id).first()
        if existing:
            # Si ya estaba como activo en una carga previa y ahora aparece en retirados, se actualiza el status
            if existing.status != "ACTIVO":
                existing.status = "RETIRADO"
        else:
            db.add(models.ProductorMaestro(farm_id=farm_id, status="RETIRADO", region=region))
        n_upserted_retirados += 1

    db.add(models.MaestroUpload(
        filename=filename, region=region,
        n_activos=len(active), n_retirados=len(retirados),
    ))
    db.commit()

    return {"n_activos": len(active), "n_retirados": len(retirados)}


def get_master_lookup(db: Session):
    """Devuelve (active_dict, retirados_set) en el mismo formato que espera audit_engine,
    reconstruido desde la base de datos (para no depender de tener el Excel a mano)."""
    active = {}
    retirados = set()
    for p in db.query(models.ProductorMaestro).all():
        if p.status == "ACTIVO":
            active[p.farm_id] = {"ann_prod_60kg_bags": p.ann_prod_60kg_bags, "entity_name": p.entity_name}
        elif p.status == "RETIRADO":
            retirados.add(p.farm_id)
    return active, retirados
