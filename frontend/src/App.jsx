import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./Layout";
import Dashboard from "./pages/Dashboard";
import Productores from "./pages/Productores";
import ProductorDetalle from "./pages/ProductorDetalle";
import Contenedores from "./pages/Contenedores";
import SubirET from "./pages/SubirET";
import SubirMaestro from "./pages/SubirMaestro";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/productores" element={<Productores />} />
          <Route path="/productores/:farmId" element={<ProductorDetalle />} />
          <Route path="/contenedores" element={<Contenedores />} />
          <Route path="/subir-et" element={<SubirET />} />
          <Route path="/subir-maestro" element={<SubirMaestro />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
