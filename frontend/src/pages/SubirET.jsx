import { useState } from "react";
import { uploadET } from "../api";

export default function SubirET() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await uploadET(file);
      setResult(res);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="page-title">Subir ET</h1>
      <p className="page-subtitle">
        Sube el archivo ET (Excel) de un contenedor. Se procesa automáticamente: trazabilidad, cruce
        contra el maestro SEED y volumen por productor. Si vuelves a subir el mismo archivo, se
        reemplaza (no se duplica).
      </p>

      <div className="card">
        <div className="upload-box">
          <input
            type="file"
            accept=".xlsx"
            onChange={(e) => setFile(e.target.files[0])}
            style={{ marginBottom: 16 }}
          />
          <div>
            <button className="btn" onClick={handleUpload} disabled={!file || loading}>
              {loading ? "Procesando…" : "Subir y procesar"}
            </button>
          </div>
        </div>

        {result && (
          <div className="status-msg status-ok" style={{ marginTop: 20 }}>
            <strong>{result.container_id}</strong> procesado correctamente
            {result.replaced_existing && " (reemplazó una carga anterior de este mismo archivo)"}.
            <br />
            {result.n_purchases} transacciones · {result.n_out_of_range} fuera de rango ·{" "}
            {result.n_after_shipment} después del embarque · {result.total_kg.toLocaleString()} kg totales.
            <br />
            Flag: {result.flag}
          </div>
        )}
        {error && (
          <div className="status-msg status-error" style={{ marginTop: 20 }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
