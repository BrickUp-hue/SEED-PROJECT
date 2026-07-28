import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { getKpis, getExportadoPorShipmentMonth } from "../api";

export default function Dashboard() {
  const [kpis, setKpis] = useState(null);
  const [exportado, setExportado] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([getKpis(), getExportadoPorShipmentMonth()])
      .then(([k, e]) => {
        setKpis(k);
        setExportado(
          e.map((row) => ({
            mes: row.shipment_month,
            kg: row.kg_exportado,
            contenedores: row.n_contenedores,
          }))
        );
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="loading">Cargando dashboard…</p>;
  if (error) return <p className="status-msg status-error">Error cargando datos: {error}</p>;

  return (
    <div>
      <h1 className="page-title">Dashboard general</h1>
      <p className="page-subtitle">Resumen acumulado de todos los contenedores (ET) cargados.</p>

      <div className="kpi-grid">
        <div className="kpi-card">
          <p className="kpi-label">Contenedores analizados</p>
          <p className="kpi-value">{kpis.contenedores_analizados}</p>
        </div>
        <div className="kpi-card alt">
          <p className="kpi-label">Transacciones totales</p>
          <p className="kpi-value">{kpis.transacciones_totales.toLocaleString()}</p>
        </div>
        <div className="kpi-card danger">
          <p className="kpi-label">Hallazgo crítico</p>
          <p className="kpi-value">{kpis.contenedores_con_hallazgo_critico}</p>
        </div>
        <div className="kpi-card warning">
          <p className="kpi-label">No en SEED</p>
          <p className="kpi-value">{kpis.transacciones_productor_no_seed.toLocaleString()}</p>
        </div>
      </div>

      <div className="card">
        <h2>Kg exportados por shipment month</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={exportado}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E3E6EC" />
            <XAxis dataKey="mes" fontSize={12} />
            <YAxis fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(value, name) => [
                name === "kg" ? `${value.toLocaleString()} kg` : value,
                name === "kg" ? "Kg exportado" : "Contenedores",
              ]}
            />
            <Bar dataKey="kg" fill="#1F3864" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
