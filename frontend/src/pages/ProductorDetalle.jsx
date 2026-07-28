import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getProductor } from "../api";
import FlagBadge from "../components/FlagBadge";

export default function ProductorDetalle() {
  const { farmId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getProductor(farmId)
      .then(setData)
      .catch((err) => setError(err.response?.data?.detail || err.message))
      .finally(() => setLoading(false));
  }, [farmId]);

  if (loading) return <p className="loading">Cargando…</p>;
  if (error) return <p className="status-msg status-error">{error}</p>;
  if (!data) return null;

  return (
    <div>
      <Link to="/productores" style={{ fontSize: 13, color: "#1F3864" }}>
        ← Volver al listado
      </Link>
      <h1 className="page-title" style={{ marginTop: 8 }}>
        {data.entity_name || "(sin nombre)"}
      </h1>
      <p className="page-subtitle">
        Farm ID: {data.farm_id} · Estado en maestro: {data.status}
      </p>

      <div className="kpi-grid">
        <div className="kpi-card">
          <p className="kpi-label">Producción anual declarada</p>
          <p className="kpi-value">
            {data.declared_prod_kg ? `${data.declared_prod_kg.toLocaleString()} kg` : "—"}
          </p>
        </div>
        <div className="kpi-card alt">
          <p className="kpi-label">Contenedores donde aparece</p>
          <p className="kpi-value">{data.contenedores.length}</p>
        </div>
        <div className="kpi-card alt">
          <p className="kpi-label">Total transacciones</p>
          <p className="kpi-value">{data.transacciones.length}</p>
        </div>
      </div>

      <div className="card">
        <h2>Resumen por año calendario</h2>
        <table>
          <thead>
            <tr>
              <th>Año</th>
              <th>Kg comprados</th>
              <th>% de lo declarado</th>
              <th>Flag</th>
            </tr>
          </thead>
          <tbody>
            {data.resumen_por_anio.map((r) => (
              <tr key={r.year}>
                <td>{r.year}</td>
                <td>{r.kg_total.toLocaleString()}</td>
                <td>{r.pct_of_declared != null ? `${r.pct_of_declared}%` : "—"}</td>
                <td>
                  <FlagBadge flag={r.flag} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>Historial de transacciones</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Contenedor</th>
                <th>Fecha de compra</th>
                <th>Kg</th>
                <th>Estado SEED</th>
                <th>Hallazgos</th>
              </tr>
            </thead>
            <tbody>
              {data.transacciones.map((t, i) => (
                <tr key={i}>
                  <td>{t.container_id}</td>
                  <td>{t.purchase_date || "—"}</td>
                  <td>{t.qty_kg?.toLocaleString()}</td>
                  <td>{t.seed_status}</td>
                  <td>
                    {t.after_shipment && <span className="flag-badge flag-red">Después embarque</span>}{" "}
                    {t.out_of_range && !t.after_shipment && (
                      <span className="flag-badge flag-orange">Fuera de rango</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
