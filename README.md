# Seguidor de Gastos

Aplicación web de un solo usuario para registrar, filtrar y resumir gastos personales, con presupuestos opcionales por categoría. Los datos se guardan en una base de datos SQLite local.

## Funcionalidades

- **Gastos**: crear, consultar, editar y eliminar (con confirmación en la interfaz).
- **Categorías**: crear, renombrar y eliminar categorías propias.
- **Filtros y búsqueda**: filtrado de la lista de gastos mediante parámetros de consulta en `GET /api/expenses`.
- **Resúmenes**: total por periodo (día, semana, mes o rango de fechas) y desglose por categoría.
- **Presupuestos** (se pueden desactivar con `BUDGETS_ENABLED=false`): límites por categoría y periodo, con alertas al alcanzar el 80 % y el 100 %.
- **Persistencia**: SQLite mediante `better-sqlite3`.
- **Ingresos**: la sección existe en la interfaz, pero es solo un marcador provisional ("disponible próximamente").

## Stack

- TypeScript en todo el monorepo (npm workspaces).
- Cliente: React 19, Vite 7, Tailwind CSS 4, TanStack Query.
- Servidor: Node.js, Express 5, better-sqlite3.
- Herramientas: ESLint, Vitest, fast-check, Testing Library, Supertest.

## Estructura

```
packages/
  shared/   Tipos, validadores, dinero, normalización y cálculo de periodos compartidos
  server/   API REST (Express), lógica de dominio y persistencia SQLite
  client/   Interfaz web (React + Vite)
.kiro/specs/expense-tracker/   Requisitos, diseño y plan de tareas
```

## Requisitos previos

- Node.js 20.19 o superior (requisito de Vite 7; el proyecto se ha desarrollado con Node 24) y npm.
- `better-sqlite3` es un módulo nativo: si no hay binario precompilado para tu plataforma, npm lo compilará y necesitará las herramientas de compilación de C++ (en Windows, Visual Studio Build Tools).

## Instalación

```bash
npm install
```

## Ejecución

**Desarrollo.** Compila y arranca el servidor en el puerto 3000 y el cliente Vite, que redirige `/api` a `localhost:3000`:

```bash
npm run dev
```

Abre http://localhost:5173. El servidor no recarga al cambiar el código del servidor; reinicia el comando para aplicar esos cambios.

**Servidor solo.** Compila y arranca la API en http://localhost:3000:

```bash
npm run start
```

`npm run start` no sirve el cliente; para la interfaz usa `npm run dev`. La compilación del cliente (`npm run build -w @expense-tracker/client`) genera `packages/client/dist-web`.

## Variables de entorno

Se leen en el servidor (`packages/server/src/config.ts`). Un valor no válido hace que el servidor falle al arrancar.

| Variable | Por defecto | Descripción |
|----------|-------------|-------------|
| `PORT` | `3000` | Puerto HTTP (0-65535) |
| `DB_PATH` | `data/expenses.db` | Archivo SQLite, relativo al directorio de trabajo |
| `BUDGETS_ENABLED` | `true` | Habilita presupuestos y alertas; si es `false`, `/api/budgets` responde 404 |
| `TZ` | zona local | Zona horaria IANA (por ejemplo `Europe/Madrid`) |

## Scripts

Desde la raíz:

| Script | Acción |
|--------|--------|
| `npm run dev` | Servidor y cliente en modo desarrollo |
| `npm run build` | Compila los paquetes (`tsc -b`) |
| `npm run start` | Compila y arranca el servidor |
| `npm run lint` | ESLint y comprobación de tipos |
| `npm test` | Ejecuta Vitest una vez |

## API REST

| Método y ruta | Descripción |
|---------------|-------------|
| `GET /api/status` | Estado de carga de datos |
| `GET /api/config` | Configuración visible para el cliente (`budgetsEnabled`) |
| `GET, POST /api/expenses` | Listar (con filtros) y crear gastos |
| `GET, PUT, DELETE /api/expenses/:id` | Consultar, editar y eliminar un gasto |
| `GET, POST /api/categories` | Listar y crear categorías |
| `PUT, DELETE /api/categories/:id` | Editar y eliminar una categoría |
| `GET /api/summary/total` | Total del periodo |
| `GET /api/summary/by-category` | Total por categoría del periodo |
| `GET, POST /api/budgets` | Listar y crear presupuestos |
| `GET /api/budgets/alerts` | Alertas de presupuesto (80 % y 100 %) |
| `GET, PUT, DELETE /api/budgets/:id` | Consultar, editar y eliminar un presupuesto |

Los resúmenes y las alertas aceptan `periodType`, `referenceDate`, `dateFrom` y `dateTo`.

## Especificación

- [Requisitos](.kiro/specs/expense-tracker/requirements.md)
- [Diseño](.kiro/specs/expense-tracker/design.md)
- [Tareas](.kiro/specs/expense-tracker/tasks.md)

## Estado del proyecto

Proyecto en desarrollo (versión 0.1.0). La API, la lógica de dominio y la interfaz de gastos, categorías, resúmenes y presupuestos están implementadas. Las pruebas automatizadas están pendientes: los scripts de prueba y las dependencias (Vitest, fast-check, Supertest, Testing Library) están configurados, pero los directorios `test/` aún no contienen pruebas. La sección Ingresos no está implementada. El repositorio no incluye todavía un archivo de licencia.
