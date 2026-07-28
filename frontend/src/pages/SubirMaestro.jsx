import { useEffect, useState } from "react";
import { uploadMaestro, getMaestroStatus } from "../api";

export default function SubirMaestro() {
  const [file, setFile] = useState(null);
  const [region, setRegion] = useState("Caldas");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);

  const loadStatus = () => getMaestroStatus().then(setStatus);

  useEffect(() => {
    loadStatus();
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await uploadMaestro(file, region);
      setResult(res);
      loadStatus();
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="page-title">Maestro de productores SEED</h1>
      <p className="page-subtitle">
        Sube o actualiza el archivo maestro (hojas "Update SEED" y "Retirados"). Se usa para cruzar
        cada compra de los archivos ET.
      </p>

      <div className="card">
        <div className="upload-box">
          <input
            type="file"
            accept=".xlsx"
            onChange={(e) => setFile(e.target.files[0])}
            style={{ marginBottom: 16 }}
          />
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, marginRight: 8 }}>Región:</label>
            <input
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              style={{ padding: 6, borderRadius: 6, border: "1px solid #E3E6EC" }}
            />
          </div>
          <button className="btn" onClick={handleUpload} disabled={!file || loading}>
            {loading ? "Procesando…" : "Subir maestro"}
          </button>
        </div>

        {result && (
          <div className="status-msg status-ok" style={{ marginTop: 20 }}>
            Maestro cargado: {result.n_activos} productores activos, {result.n_retirados} retirados.
          </div>
        )}
        {error && (
          <div className="status-msg status-error" style={{ marginTop: 20 }}>
            {error}
          </div>
        )}
      </div>

      {status && (
        <div className="card">
          <h2>Estado actual</h2>
          <p style={{ fontSize: 13, color: "#6B7280" }}>
            {status.n_productores_en_bd} productores en base de datos.
          </p>
          <table>
            <thead>
              <tr>
                <th>Archivo</th>
                <th>Región</th>
                <th>Activos</th>
                <th>Retirados</th>
                <th>Fecha de carga</th>
              </tr>
            </thead>
            <tbody>
              {status.cargas.map((c, i) => (
                <tr key={i}>
                  <td>{c.filename}</td>
                  <td>{c.region}</td>
                  <td>{c.n_activos}</td>
                  <td>{c.n_retirados}</td>
                  <td>{new Date(c.uploaded_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
