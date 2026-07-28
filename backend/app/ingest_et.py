"""Ingesta de archivos ET: corre el mismo motor de análisis ya validado y guarda
los resultados en la base de datos. Si el contenedor (mismo nombre de archivo)
ya existía, se reemplaza (evita duplicar si se vuelve a subir el mismo ET)."""
from sqlalchemy.orm import Session
from . import models
from .audit_engine import load_et_file, analyze_traceability_ranges, analyze_purchases
from .ingest_master import get_master_lookup


def ingest_et_file(db: Session, file_path: str, correct_suspicious_shipment_year_to: int = 2026):
    active, retirados = get_master_lookup(db)

    et = load_et_file(file_path, correct_suspicious_shipment_year_to=correct_suspicious_shipment_year_to)
    trace = analyze_traceability_ranges(et)
    prod_rows, _not_in_seed = analyze_purchases(et, active, retirados)

    container_id = et["container_id"]

    # Si ya existe este contenedor (se volvió a subir el mismo archivo), se reemplaza
    existing = db.query(models.Contenedor).filter_by(container_id=container_id).first()
    if existing:
        db.delete(existing)
        db.flush()

    total_kg = sum((p["qty_kg"] or 0) for p in prod_rows)

    cont = models.Contenedor(
        container_id=container_id,
        po_number=et["po_number"],
        seller_name=et["seller_name"],
        shipment_month=trace["shipment_month"],
        shipment_month_original=trace.get("shipment_month_original"),
        shipment_month_corrected=trace.get("shipment_month_corrected", False),
        contract_date=trace.get("contract_date"),
        date_min=trace["date_min"],
        date_max=trace["date_max"],
        n_purchases=trace["n_purchases"],
        n_missing_date=trace["n_missing_date"],
        n_out_of_range=trace["n_out_of_range"],
        pct_out_of_range=trace["pct_out_of_range"],
        n_after_shipment=len(trace["after_shipment"]),
        flag=trace["flag"],
        total_kg=total_kg,
        source_filename=file_path.split("/")[-1],
    )
    db.add(cont)
    db.flush()  # para obtener cont.id

    after_shipment_dates = {(a["farm_id"], a["purchase_date"]) for a in trace["after_shipment"]}
    out_of_range_dates = set()
    for m in trace.get("out_of_range_by_month", []):
        pass  # el detalle por transacción ya viene marcado abajo via purchase_date comparado directo

    for row in prod_rows:
        # Determinar si esta transaccion especifica esta fuera de rango / despues de embarque
        is_after = False
        if row["purchase_date"] and trace["shipment_month"] and row["purchase_date"] > trace["shipment_month"]:
            is_after = True
        is_out = False
        if row["purchase_date"] and trace["shipment_month"] and not is_after:
            from .audit_engine import months_between
            m = months_between(row["purchase_date"], trace["shipment_month"])
            is_out = not (3 <= m <= 4)

        db.add(models.Transaccion(
            contenedor_id=cont.id,
            farm_id=row["farm_id"],
            farm_name=row["farm_name"],
            purchase_date=row["purchase_date"],
            purchase_year=row["purchase_year"],
            qty_kg=row["qty_kg"],
            seed_status=row["seed_status"],
            out_of_range=is_out,
            after_shipment=is_after,
        ))

    db.commit()
    return {
        "container_id": container_id,
        "n_purchases": trace["n_purchases"],
        "n_out_of_range": trace["n_out_of_range"],
        "n_after_shipment": len(trace["after_shipment"]),
        "flag": trace["flag"],
        "total_kg": total_kg,
        "replaced_existing": existing is not None,
    }
