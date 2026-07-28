import axios from "axios";

// La URL del backend se configura por variable de entorno en el deploy (Render).
// En desarrollo local cae por defecto a localhost:8000.
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const api = axios.create({ baseURL: API_URL });

export async function getKpis() {
  const { data } = await api.get("/dashboard/kpis");
  return data;
}

export async function getExportadoPorShipmentMonth() {
  const { data } = await api.get("/dashboard/exportado-por-shipment-month");
  return data;
}

export async function getContenedores() {
  const { data } = await api.get("/dashboard/contenedores");
  return data;
}

export async function getRankingProductores(params = {}) {
  const { data } = await api.get("/productores/ranking", { params });
  return data;
}

export async function getProductor(farmId) {
  const { data } = await api.get(`/productores/${farmId}`);
  return data;
}

export async function uploadET(file) {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post("/et/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function uploadMaestro(file, region = "Caldas") {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post(`/maestro/upload?region=${encodeURIComponent(region)}`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function getMaestroStatus() {
  const { data } = await api.get("/maestro/status");
  return data;
}
