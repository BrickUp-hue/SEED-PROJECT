import { NavLink, Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h1>Control SEED</h1>
        <p className="subtitle">RGC Coffee · Trazabilidad</p>
        <nav>
          <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
            Dashboard
          </NavLink>
          <NavLink to="/productores" className={({ isActive }) => (isActive ? "active" : "")}>
            Productores
          </NavLink>
          <NavLink to="/contenedores" className={({ isActive }) => (isActive ? "active" : "")}>
            Contenedores (ET)
          </NavLink>
          <NavLink to="/subir-et" className={({ isActive }) => (isActive ? "active" : "")}>
            Subir ET
          </NavLink>
          <NavLink to="/subir-maestro" className={({ isActive }) => (isActive ? "active" : "")}>
            Maestro SEED
          </NavLink>
        </nav>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
