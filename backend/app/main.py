import os
import tempfile
from typing import Optional
from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from collections import defaultdict

from . import models
from .database import engine, get_db
from .ingest_master import ingest_master
from .ingest_et import ingest_et_file

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Control SEED API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def save_upload_to_temp(upload: UploadFile) -> str:
    suffix = os.path.splitext(upload.filename)[1] or ".xlsx"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(upload.file.read())
        return tmp.name


# ---------------------------------------------------------------------------
# MAESTRO DE PRODUCTORES
# ---------------------------------------------------------------------------

@app.post("/maestro/upload")
def upload_maestro(file: UploadFile = File(...), region: str = "Caldas", db: Session = Depends(get_db)):
    path = save_upload_to_temp(file)
    try:
        result = ingest_master(db, path, file.filename, region=region)
    finally:
        os.unlink(path)
    return {"status": "ok", "filename": file.filename, **result}


@app.get("/maestro/status")
def maestro_status(db: Session = Depends(get_db)):
    uploads = db.query(models.MaestroUpload).order_by(models.MaestroUpload.uploaded_at.desc()).all()
    n_total = db.query(models.ProductorMaestro).count()
    return {
        "n_productores_en_bd": n_total,
        "cargas": [
            {"filename": u.filename, "region": u.region, "n_activos": u.n_activos,
             "n_retirados": u.n_retirados, "uploaded_at": u.uploaded_at.isoformat()}
            for u in uploads
        ],
    }


# ---------------------------------------------------------------------------
# CARGA DE ARCHIVOS ET ("el agente" — botón de subir, procesa automático)
# ---------------------------------------------------------------------------

@app.post("/et/upload")
def upload_et(file: UploadFile = File(...), correct_year: int = 2026, db: Session = Depends(get_db)):
    path = save_upload_to_temp(file)
    try:
        result = ingest_et_file(db, path, correct_suspicious_shipment_year_to=correct_year)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"No se pudo procesar el archivo: {e}")
    finally:
        os.unlink(path)
    return {"status": "ok", **result}


# ---------------------------------------------------------------------------
# DASHBOARD GENERAL
# ---------------------------------------------------------------------------

@app.get("/dashboard/kpis")
def dashboard_kpis(db: Session = Depends(get_db)):
    contenedores = db.query(models.Contenedor).all()
    n_contenedores = len(contenedores)
    n_transacciones = db.query(models.Transaccion).count()
    n_criticos = sum(1 for c in contenedores if (c.n_after_shipment or 0) > 0)
    n_fuera_rango = sum(c.n_out_of_range or 0 for c in contenedores)
    n_no_seed = db.query(models.Transaccion).filter(models.Transaccion.seed_status == "NO ENCONTRADO EN SEED").count()

    return {
        "contenedores_analizados": n_contenedores,
        "transacciones_totales": n_transacciones,
        "contenedores_con_hallazgo_critico": n_criticos,
        "transacciones_fuera_de_rango": n_fuera_rango,
        "transacciones_productor_no_seed": n_no_seed,
    }


@app.get("/dashboard/exportado-por-shipment-month")
def exportado_por_shipment_month(db: Session = Depends(get_db)):
    """Cuánto café (kg) se exportó, agrupado por shipment month."""
    rows = (
        db.query(models.Contenedor.shipment_month, func.sum(models.Contenedor.total_kg), func.count(models.Contenedor.id))
        .group_by(models.Contenedor.shipment_month)
        .order_by(models.Contenedor.shipment_month)
        .all()
    )
    return [
        {"shipment_month": sm.isoformat() if sm else None, "kg_exportado": round(kg or 0, 1), "n_contenedores": n}
        for sm, kg, n in rows
    ]


@app.get("/dashboard/contenedores")
def listar_contenedores(db: Session = Depends(get_db)):
    contenedores = db.query(models.Contenedor).order_by(models.Contenedor.shipment_month).all()
    return [
        {
            "container_id": c.container_id,
            "po_number": c.po_number,
            "shipment_month": c.shipment_month.isoformat() if c.shipment_month else None,
            "shipment_month_corrected": c.shipment_month_corrected,
            "n_purchases": c.n_purchases,
            "n_out_of_range": c.n_out_of_range,
            "pct_out_of_range": c.pct_out_of_range,
            "n_after_shipment": c.n_after_shipment,
            "total_kg": c.total_kg,
            "flag": c.flag,
        }
        for c in contenedores
    ]


# ---------------------------------------------------------------------------
# PRODUCTORES: ranking y ficha individual
# ---------------------------------------------------------------------------

def _flag_for(pct, has_prod_data):
    if not has_prod_data:
        return "SIN DATO DE PRODUCCIÓN"
    if pct > 100:
        return "🔴 SUPERA 100% DE PRODUCCIÓN"
    if pct < 20:
        return "🟡 MENOS DEL 20% VENDIDO"
    if pct < 50:
        return "🟠 ENTRE 20% Y 50%"
    return "✅ CUMPLE (≥50%)"


@app.get("/productores/ranking")
def ranking_productores(
    year: Optional[int] = None,
    order: str = Query("desc", pattern="^(asc|desc)$"),
    limit: int = 50,
    db: Session = Depends(get_db),
):
    q = db.query(
        models.Transaccion.farm_id,
        models.Transaccion.purchase_year,
        func.sum(models.Transaccion.qty_kg).label("kg_total"),
    ).filter(models.Transaccion.purchase_year.isnot(None))
    if year:
        q = q.filter(models.Transaccion.purchase_year == year)
    q = q.group_by(models.Transaccion.farm_id, models.Transaccion.purchase_year)

    rows = q.all()
    maestro = {p.farm_id: p for p in db.query(models.ProductorMaestro).all()}

    results = []
    for farm_id, yr, kg_total in rows:
        info = maestro.get(farm_id)
        prod_kg = info.ann_prod_kg if info else None
        pct = (kg_total / prod_kg * 100) if prod_kg else None
        results.append({
            "farm_id": farm_id,
            "farm_name": info.entity_name if info else None,
            "year": yr,
            "kg_total": round(kg_total or 0, 1),
            "declared_prod_kg": round(prod_kg, 1) if prod_kg else None,
            "pct_of_declared": round(pct, 1) if pct is not None else None,
            "flag": _flag_for(pct, prod_kg is not None) if pct is not None else "SIN DATO DE PRODUCCIÓN",
        })

    results.sort(key=lambda r: (r["kg_total"] or 0), reverse=(order == "desc"))
    return results[:limit]


@app.get("/productores/{farm_id}")
def ficha_productor(farm_id: str, db: Session = Depends(get_db)):
    info = db.query(models.ProductorMaestro).filter_by(farm_id=farm_id).first()
    transacciones = (
        db.query(models.Transaccion)
        .filter(models.Transaccion.farm_id == farm_id)
        .order_by(models.Transaccion.purchase_date)
        .all()
    )
    if not transacciones and not info:
        raise HTTPException(status_code=404, detail="Productor no encontrado")

    by_year = defaultdict(float)
    contenedores_ids = set()
    for t in transacciones:
        if t.purchase_year:
            by_year[t.purchase_year] += t.qty_kg or 0
        contenedores_ids.add(t.contenedor_id)

    contenedores = db.query(models.Contenedor).filter(models.Contenedor.id.in_(contenedores_ids)).all()

    prod_kg = info.ann_prod_kg if info else None
    resumen_por_anio = []
    for yr, kg in sorted(by_year.items()):
        pct = (kg / prod_kg * 100) if prod_kg else None
        resumen_por_anio.append({
            "year": yr, "kg_total": round(kg, 1),
            "pct_of_declared": round(pct, 1) if pct is not None else None,
            "flag": _flag_for(pct, prod_kg is not None) if pct is not None else "SIN DATO DE PRODUCCIÓN",
        })

    return {
        "farm_id": farm_id,
        "entity_name": info.entity_name if info else None,
        "status": info.status if info else "NO ENCONTRADO EN MAESTRO",
        "declared_prod_60kg_bags": info.ann_prod_60kg_bags if info else None,
        "declared_prod_kg": prod_kg,
        "resumen_por_anio": resumen_por_anio,
        "contenedores": [c.container_id for c in contenedores],
        "transacciones": [
            {
                "container_id": next((c.container_id for c in contenedores if c.id == t.contenedor_id), None),
                "purchase_date": t.purchase_date.isoformat() if t.purchase_date else None,
                "qty_kg": t.qty_kg,
                "seed_status": t.seed_status,
                "out_of_range": t.out_of_range,
                "after_shipment": t.after_shipment,
            }
            for t in transacciones
        ],
    }
