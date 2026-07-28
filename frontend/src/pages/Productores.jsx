import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getRankingProductores } from "../api";
import FlagBadge from "../components/FlagBadge";

export default function Productores() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [year, setYear] = useState("");
  const [order, setOrder] = useState("desc");

  useEffect(() => {
    setLoading(true);
    const params = { order, limit: 500 };
    if (year) params.year = year;
    getRankingProductores(params)
      .then(setRows)
      .finally(() => setLoading(false));
  }, [year, order]);

  const filtered = rows.filter(
    (r) =>
      r.farm_id.toLowerCase().includes(search.toLowerCase()) ||
      (r.farm_name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <h1 className="page-title">Productores</h1>
      <p className="page-subtitle">Ranking de fincas por volumen comprado, con su % de cumplimiento.</p>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center" }}>
        <input
          className="search-input"
          placeholder="Buscar por Farm ID o nombre…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={year} onChange={(e) => setYear(e.target.value)} style={{ padding: 8, borderRadius: 8 }}>
          <option value="">Todos los años</option>
          <option value="2025">2025</option>
          <option value="2026">2026</option>
        </select>
        <select value={order} onChange={(e) => setOrder(e.target.value)} style={{ padding: 8, borderRadius: 8 }}>
          <option value="desc">Mayor a menor (kg)</option>
          <option value="asc">Menor a mayor (kg)</option>
        </select>
      </div>

      {loading ? (
        <p className="loading">Cargando…</p>
      ) : (
        <div className="card">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Farm ID</th>
                  <th>Nombre</th>
                  <th>Año</th>
                  <th>Kg comprados</th>
                  <th>% declarado</th>
                  <th>Flag</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={`${r.farm_id}-${r.year}-${i}`}>
                    <td>
                      <Link to={`/productores/${r.farm_id}`}>{r.farm_id}</Link>
                    </td>
                    <td>{r.farm_name || "—"}</td>
                    <td>{r.year}</td>
                    <td>{r.kg_total?.toLocaleString()}</td>
                    <td>{r.pct_of_declared != null ? `${r.pct_of_declared}%` : "—"}</td>
                    <td>
                      <FlagBadge flag={r.flag} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
