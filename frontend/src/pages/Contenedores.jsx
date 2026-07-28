import { useEffect, useState } from "react";
import { getContenedores } from "../api";
import FlagBadge from "../components/FlagBadge";

export default function Contenedores() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getContenedores().then(setRows).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="loading">Cargando…</p>;

  return (
    <div>
      <h1 className="page-title">Contenedores (ET)</h1>
      <p className="page-subtitle">Todos los archivos ET procesados hasta ahora.</p>

      <div className="card">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Contenedor</th>
                <th>PO Starbucks</th>
                <th>Shipment Month</th>
                <th># Compras</th>
                <th>Fuera de rango</th>
                <th>Después embarque</th>
                <th>Kg totales</th>
                <th>Flag</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.container_id}>
                  <td>{c.container_id}</td>
                  <td>{c.po_number}</td>
                  <td>
                    {c.shipment_month}
                    {c.shipment_month_corrected && (
                      <span className="flag-badge flag-yellow" style={{ marginLeft: 6 }}>
                        corregido
                      </span>
                    )}
                  </td>
                  <td>{c.n_purchases}</td>
                  <td>
                    {c.n_out_of_range} ({c.pct_out_of_range}%)
                  </td>
                  <td>{c.n_after_shipment}</td>
                  <td>{c.total_kg?.toLocaleString()}</td>
                  <td>
                    <FlagBadge flag={c.flag} />
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
