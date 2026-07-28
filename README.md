# Control SEED

App de trazabilidad SEED para RGC Coffee: sube un archivo ET, se procesa
automáticamente, y queda disponible en un dashboard con desglose por productor.

## Estructura

```
control_seed/
  backend/     -> API FastAPI + SQLite (motor de análisis reutilizado y probado)
  frontend/    -> App React (Vite) que consume la API
  render.yaml  -> Blueprint de Render (crea ambos servicios de una)
```

## Opción A (recomendada): Deploy con Blueprint

1. Sube esta carpeta completa (`control_seed/`) a un repositorio de GitHub tuyo.
2. En Render: **New +** → **Blueprint** → conecta el repo.
3. Render va a leer `render.yaml` y crear automáticamente 2 servicios:
   - `control-seed-api` (el backend)
   - `control-seed-frontend` (el sitio web)
4. Una vez creado el backend, copia su URL pública (algo como
   `https://control-seed-api-xxxx.onrender.com`).
5. Entra a `control-seed-frontend` → **Environment** → edita la variable
   `VITE_API_URL` y pega ahí la URL real del backend (del paso 4).
6. Dale **Manual Deploy → Clear build cache & deploy** al frontend para que
   tome la nueva variable.

## Opción B: Deploy manual (si prefieres no usar Blueprint)

### Backend
1. **New +** → **Web Service** → conecta el repo → **Root Directory:** `backend`
2. **Build Command:** `pip install -r requirements.txt`
3. **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Deploy. Copia la URL que te da Render al terminar.

### Frontend
1. **New +** → **Static Site** → mismo repo → **Root Directory:** `frontend`
2. **Build Command:** `npm install && npm run build`
3. **Publish Directory:** `dist`
4. En **Environment Variables**, agrega:
   - `VITE_API_URL` = la URL del backend que copiaste arriba
5. En **Redirects/Rewrites**, agrega una regla: `/*` → `/index.html` (para que
   las rutas de React funcionen al recargar la página).
6. Deploy.

## Sobre la base de datos (importante)

Por defecto usa SQLite guardado en el disco del propio servicio. **Si no
agregas un disco persistente en Render, los datos se borran cada vez que se
redeploya el backend** (por ejemplo al hacer push de un cambio de código).

El `render.yaml` ya incluye un disco persistente de 1GB montado en
`/var/data` para evitar esto — solo asegúrate de que, si haces deploy manual
(Opción B), agregues tú mismo un disco en el backend:
**Settings → Disks → Add Disk** → mount path `/var/data`, y agrega la
variable de entorno `DATABASE_URL=sqlite:////var/data/control_seed.db`.

Si más adelante quieres más robustez (o vas a correr esto en serio, con
muchos usuarios subiendo archivos a la vez), lo ideal es migrar a Postgres:
Render ofrece Postgres administrado gratis en su tier básico. Ese cambio es
mínimo — solo cambiar `DATABASE_URL` a la cadena de conexión de Postgres que
te da Render, el código ya está preparado para eso.

## Primeros pasos una vez desplegado

1. Entra a la app → **Maestro SEED** → sube el archivo maestro de productores
   (ej. `SEED_RGC_Caldas_23-6-26.xlsx`).
2. Ve a **Subir ET** → sube tus archivos ET uno por uno (o los que tengas).
3. El **Dashboard** y el listado de **Productores** se actualizan solos con
   cada archivo que subas — no hace falta recargar nada manualmente aparte
   de refrescar la página.

## Desarrollo local (opcional, para probar antes de subir a Render)

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend (en otra terminal)
cd frontend
npm install
npm run dev
```
