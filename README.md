# Del código a producción: desplegá tu app con herramientas gratuitas

Taller práctico de **JCSA**. Vas a desplegar una app web completa (lista de tareas con login) usando solo planes gratuitos.

> **Los planes gratuitos y sus límites cambian.** Revisá las páginas oficiales de cada servicio antes de depender de ellos en un proyecto propio.

## Para quién es

Estudiantes de informática, sistemas o carreras afines, y cualquiera que quiera llevar sus proyectos a producción sin costo.

**Conocimientos previos:** programación básica (idealmente algo de Python y JavaScript), nociones de Git/GitHub y de qué es una API.

Al terminar vas a tener tu propia app funcionando en internet y vas a saber replicar el proceso en tus proyectos.

## Qué vamos a construir

```
Navegador ── React + TanStack ──► Cloudflare Workers (assets estáticos)
    │
    └─► API FastAPI (Python) ──► Cloudflare Workers
              ├─► Neon (Postgres)
              ├─► Clerk (verifica el login)
              ├─► Resend (mail de bienvenida)
              └─► Grafana Cloud (monitoreo)
```

| Capa | Herramienta |
|---|---|
| Front | React + Vite + TanStack Router y Query, en Cloudflare Workers (assets estáticos) |
| Backend | FastAPI en Cloudflare Workers (Python) |
| Base de datos | Neon (Postgres serverless) |
| Autenticación | Clerk |
| Mails | Resend |
| Monitoreo | Grafana Cloud |

## Estructura del repo

```
frontend/   app React: src/ (código), wrangler.jsonc (deploy), .env.example (variables)
backend/    API FastAPI: src/worker.py (código), wrangler.jsonc (deploy), .dev.vars.example (variables), schema.sql
```

Cada carpeta tiene su propio README con más detalle.

---

## 1. Antes del taller (obligatorio)

Hacerlo **antes** del evento, porque crear cuentas en el momento consume mucho tiempo.

### Cuentas gratuitas
- [ ] GitHub
- [ ] Cloudflare
- [ ] Neon
- [ ] Clerk
- [ ] Resend
- [ ] Grafana Cloud

### Software
- [ ] Git
- [ ] Node.js 22.12 o superior, recomendado 24 LTS (`node -v`)
- [ ] Python 3.12 o superior (`python --version`)
- [ ] [uv](https://docs.astral.sh/uv/) 0.12.3 o superior (`uv --version`; para actualizar: `uv self update`)
- [ ] Un editor de código (VS Code, por ejemplo)

### Preparación
- [ ] Hacer **fork** de este repositorio (botón *Fork* en GitHub) y clonar **tu fork**:
  `git clone https://github.com/<tu-usuario>/taller-jcsa-2026.git`
- [ ] Levantar la app en local siguiendo la sección siguiente. Si llegás a crear una tarea, estás listo.

### Correr la app en local (sin cuentas)

Necesitás dos terminales, una para la API y otra para el front:

```bash
# Terminal 1: API en http://localhost:8787
cd backend
cp .dev.vars.example .dev.vars
uv sync
uv run pywrangler dev        # la primera vez tarda: descarga Python y las dependencias para Workers
```

```bash
# Terminal 2: front en http://localhost:5173
cd frontend
cp .env.example .env
npm install
npm run dev
```

Abrí http://localhost:5173, entrá a **Mis tareas** y creá una tarea. En la terminal de la API vas a ver una línea por pedido.

Así funciona sin ninguna cuenta porque todo está simulado:

| Pieza | Sin configurar | Cómo se conecta el servicio real |
|---|---|---|
| Base de datos | Tareas en memoria de la API | `NEON_CONNECTION_STRING` en `backend/.dev.vars` (bloque 2) |
| Login | Sin login: el front manda el token `demo` y la API lo acepta | `VITE_CLERK_PUBLISHABLE_KEY` en `frontend/.env` y `CLERK_*` en `backend/.dev.vars` (bloque 3) |
| Mail | Se imprime en la terminal de la API | `RESEND_API_KEY` en `backend/.dev.vars` (bloque 4) |

La simulación la activa `MODO_LOCAL=1`, que solo existe en `.dev.vars`: la API desplegada nunca simula nada.
Si cambiás `.dev.vars`, reiniciá la API (`Ctrl+C` y de nuevo `uv run pywrangler dev`); si cambiás `.env`, reiniciá el front.

---

## 2. Agenda (aprox. 2 h 20)

| Bloque | Min | Qué hacemos | Listo cuando... |
|---|---|---|---|
| 0 | 15 | Arquitectura y chequeo de cuentas | Todos tienen sus cuentas y el repo clonado |
| 1 | 30 | Front en Cloudflare | La app abre en una URL `*.workers.dev` (en modo demo) |
| 2 | 30 | API FastAPI + Neon | En local las tareas se guardan en Neon y el Worker desplegado responde `/health` |
| 3 | 25 | Login con Clerk | En el front online, cada usuario ve solo sus tareas |
| 4 | 15 | Mail con Resend | Llega el mail de bienvenida |
| 5 | 15 | Monitoreo con Grafana Cloud | El check de `/health` está en verde en Grafana |
| 6 | 10 | Cierre y dudas | |

### Dos Workers, dos nombres

Vamos a tener **dos Workers distintos** en Cloudflare y cada uno se identifica por el `name` de su `wrangler.jsonc`:

| Worker | Archivo | Se despliega con |
|---|---|---|
| Front (`taller-jcsa-frontend`) | `frontend/wrangler.jsonc` | Cloudflare, en cada push a `main` |
| API (`taller-api`) | `backend/wrangler.jsonc` | `uv run pywrangler deploy` desde `backend/` |

> Si los dos tienen el mismo `name`, el último deploy **pisa** al otro. Síntoma típico: la URL del front responde `{"detail":"Not Found"}` (es la API).

---

## 3. Paso a paso

### Bloque 1 · Front (Cloudflare)
1. Subir a GitHub cualquier cambio que tengas (`git push`): Cloudflare construye el front desde tu fork.
2. En Cloudflare: *Workers & Pages → Create → Import a repository* y elegir tu fork.
3. Configurar:
   - *Project name*: el mismo `name` de `frontend/wrangler.jsonc` (si elegís otro, cambialo también en ese archivo y hacé push).
   - *Build command*: `npm run build`
   - *Deploy command*: `npx wrangler deploy`
   - *Non-production branch deploy command*: `npx wrangler versions upload`
   - *Path* (root directory): `frontend`
4. No hace falta indicar el directorio de salida: `frontend/wrangler.jsonc` ya publica `dist/`, sirve `index.html` en rutas como `/tareas`
   y habilita la URL `*.workers.dev` y las URLs de preview.
5. La primera vez Cloudflare puede pedirte elegir tu subdominio `*.workers.dev` (es uno por cuenta).
6. Abrir la URL del front: como todavía no tiene variables, arranca en **modo demo** (sin login, datos en memoria del navegador).

### Bloque 2 · API y base de datos
1. En Neon: crear un proyecto, abrir el **SQL Editor**, ejecutar `backend/schema.sql` y copiar la *connection string*.
2. Pegarla en `NEON_CONNECTION_STRING` de `backend/.dev.vars` y reiniciar la API local.
3. Desde el front local, crear tareas y verlas en Neon (*Tables → tasks*). Ahora sobreviven a reiniciar la API.
4. Cargar el secreto y desplegar:
   ```bash
   uv run pywrangler secret put NEON_CONNECTION_STRING   # la 1ª vez pregunta si crear el Worker: sí
   uv run pywrangler deploy
   ```
5. Probar `curl https://taller-api.<tu-subdominio>.workers.dev/health` → `{"ok":true}`.

> El Worker desplegado **no** tiene modo local: `/api/tasks` responde `401` hasta que haya login real (bloque 3). Es lo esperado.

### Bloque 3 · Login (Clerk)
1. En Clerk: crear una aplicación. Si pregunta el framework, elegir **React** (no hace falta seguir la guía de instalación: ya está en el código).
2. Copiar la **Publishable key** (`pk_test_…`) y la **Frontend API URL** (`https://xxxx.clerk.accounts.dev`, en *Configure → API keys*).
3. Backend:
   - `CLERK_ISSUER` = Frontend API URL y `CLERK_JWKS_URL` = Frontend API URL + `/.well-known/jwks.json`,
     en `backend/.dev.vars` (local) y en `backend/wrangler.jsonc` (reemplazando `TU-INSTANCIA`; no son secretos, se pueden commitear en tu fork).
   - `uv run pywrangler deploy`
4. Front local: descomentar `VITE_CLERK_PUBLISHABLE_KEY` en `frontend/.env` y pegar la key. Reiniciar el front y probar el login en local.
5. Front online: en el proyecto del front, *Settings → Build → Variables and secrets*, cargar **las dos**:
   `VITE_CLERK_PUBLISHABLE_KEY` y `VITE_API_URL` (`https://taller-api.<tu-subdominio>.workers.dev`, sin `/` final).
   Después, *Deployments → Retry deployment* (o un push) para que se reconstruya.
6. Probar en `/tareas`: iniciar sesión y crear una tarea. En una ventana de incógnito, con otro usuario, no deberías verla.

### Bloque 4 · Mails (Resend)
1. En Resend: crear una **API key**.
2. Local: pegarla en `RESEND_API_KEY` de `.dev.vars`. Online: `uv run pywrangler secret put RESEND_API_KEY`
   (el secreto queda activo enseguida, sin redeploy).
3. Sin dominio verificado, Resend solo permite enviar **al mail de tu cuenta de Resend** (remitente `onboarding@resend.dev`).
4. En `/tareas`, escribir ese mail y apretar *Enviar*.

### Bloque 5 · Monitoreo (Grafana Cloud)

Un chequeo externo: Grafana le pregunta a la API cada pocos minutos si está viva, desde distintos lugares del mundo.

1. En Grafana Cloud, crear el *stack* gratuito si todavía no lo tenés.
2. *Testing & synthetics → Synthetics → Checks → Add new check → API Endpoint* (HTTP):
   - URL: `https://taller-api.<tu-subdominio>.workers.dev/health`
   - Probes: 2 ubicaciones (por ejemplo, São Paulo y Virginia del Norte). Frecuencia: cada 2 minutos.
   - Validación: status `200`.
3. Guardar y abrir el dashboard del check: disponibilidad y latencia desde cada ubicación.
4. Para verlo fallar: cambiá la URL del check por una ruta inexistente (`/healthz`) y mirá cómo se pone en rojo. Después volvela a `/health`.

> El plan gratuito incluye una cantidad mensual de ejecuciones: 2 probes cada 2 minutos son unas 43.000 por mes.
> Con más probes o más frecuencia podés pasarte.

Para ver qué pasa *adentro* de la API, cada pedido deja una línea de log JSON (`{"evento": "pedido", "metodo": …, "ruta": …, "status": …, "ms": …}`)
que se ve en Cloudflare (*Workers → taller-api → Observability*) o en vivo con `npx wrangler tail taller-api`.

---

## 4. Problemas comunes

| Síntoma | Causa probable y solución |
|---|---|
| `pywrangler` dice `uv version at least 0.12.3 required` | `uv self update` |
| El front local dice `Failed to fetch` al cargar tareas | La API local no está corriendo (terminal 1) |
| `secret put` pregunta si crear un Worker nuevo | Normal la primera vez: todavía no desplegaste la API. Confirmar que el nombre sea `taller-api` |
| La URL del front responde `{"detail":"Not Found"}` | Esa URL tiene la API: o abriste la del Worker de la API, o el `name` de `backend/wrangler.jsonc` es igual al del front y lo pisaste. Corregir el `name` y redesplegar los dos |
| `error code: 1042` en una URL `*.workers.dev` | No existe un Worker con ese nombre o no tiene habilitado `workers.dev`. Revisar el nombre en *Workers & Pages* |
| Refrescar `/tareas` da 404 | Falta `"not_found_handling": "single-page-application"` en `frontend/wrangler.jsonc` |
| `No se pudo cargar: Error 401` | El front no manda un token de Clerk válido: falta `VITE_CLERK_PUBLISHABLE_KEY`, o `CLERK_ISSUER`/`CLERK_JWKS_URL` no coinciden con tu instancia, o no redesplegaste la API |
| Aparecen tareas pero no se guardan | El front no tiene `VITE_API_URL` y usa la API falsa en memoria |
| `Failed to fetch` | El navegador no pudo leer la respuesta: URL de la API mal escrita, Worker caído, o un error interno. Abrir la pestaña *Network* y ver la respuesta, o correr `npx wrangler tail taller-api` |
| `Falta el secreto …` | Cargarlo con `uv run pywrangler secret put <NOMBRE>` (o en `.dev.vars` en local) |
| Error de base de datos | Que `schema.sql` se haya ejecutado en Neon y la connection string sea la correcta |
| El mail no llega | Revisar spam y que el destinatario sea el mail de tu cuenta de Resend |
| El check de Grafana está en rojo | Abrir la URL del check en el navegador: tiene que responder `{"ok":true}`. Revisar que sea la de la API (no la del front) y que termine en `/health` |
| Cambié una variable `VITE_*` y no pasa nada | Tienen que estar en las variables de **build** del front y hay que volver a desplegarlo |

**Plan B:** si falla algún servicio, en local volvé a dejar vacía su variable en `.dev.vars` (con `MODO_LOCAL=1` se simula)
y seguí el taller con la app local. Si la API local no arranca, comentá `VITE_API_URL` en `frontend/.env`: el front pasa a **modo demo** y no la necesita.

---

## 5. Seguridad básica
- Nunca subas `.env` ni `.dev.vars` a Git (ya están en `.gitignore`).
- Los secretos del Worker se cargan con `pywrangler secret put`, no en `wrangler.jsonc`.
- `MODO_LOCAL` existe solo en `.dev.vars`: en el Worker desplegado nunca se simula el login.
- En el backend, CORS está abierto (`*`) y los errores internos devuelven su mensaje para facilitar el diagnóstico.
  En un proyecto real conviene limitar CORS al dominio de tu front y no exponer detalles de errores.