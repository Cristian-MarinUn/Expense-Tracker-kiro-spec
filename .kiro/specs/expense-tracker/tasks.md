# Implementation Plan: Seguidor de Gastos (expense-tracker)

## Overview

La implementación sigue el diseño en TypeScript sobre un monorepo con npm workspaces (`packages/shared`, `packages/server`, `packages/client`). Se construye de dentro hacia fuera: primero el código puro compartido (montos, periodos, normalización, validación y errores), después la persistencia SQLite con `better-sqlite3`, los servicios de dominio, la API REST con Express y, por último, el frontend React con React Query. Cada paso se integra con el anterior y termina con el cableado completo de la aplicación.

Las pruebas usan Vitest (`vitest --run`), fast-check (mínimo 100 iteraciones por propiedad, con el comentario `// Feature: expense-tracker, Property N: <título>`), Supertest y React Testing Library.

## Tasks

- [x] 1. Estructura del monorepo y tooling
  - [x] 1.1 Crear el monorepo con npm workspaces y la configuración común
    - Crear `package.json` raíz con workspaces `packages/shared`, `packages/server` y `packages/client`, y scripts `build`, `test` (`vitest --run`) y `lint`
    - Crear `tsconfig.base.json` en modo `strict` y un `tsconfig.json` por paquete con referencias de proyecto
    - Configurar Vitest por paquete (`environment: node` en shared y server, `jsdom` en client) e instalar `fast-check`, `supertest`, `better-sqlite3`, `express`, `react`, `@tanstack/react-query` y `@testing-library/react`
    - Crear los directorios `src/` y `test/` vacíos de cada paquete con un `index.ts` de exportación
    - _Requirements: 8.1_

- [x] 2. Paquete shared: código puro compartido cliente/servidor
  - [x] 2.1 Implementar `packages/shared/src/errors.ts` y `packages/shared/src/types.ts`
    - Definir `Result<T>`, `DomainError`, el enum `ErrorCode` con todos los códigos del catálogo del diseño, sus mensajes en español y su código HTTP asociado
    - Implementar la función de prioridad HTTP `500 > 404 > 409 > 400` para respuestas con varios errores
    - Definir los tipos de dominio `Money`, `Expense`, `Category`, `Budget`, `Period`, `CategorySummary`, `BudgetAlert`, `ExpenseInput`, `BudgetInput` y `ExpenseFilter`
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 2.3, 2.4, 3.5, 3.6, 4.2, 4.4, 4.6, 5.4, 6.6, 7.5, 7.6, 8.4, 8.5_

  - [x] 2.2 Implementar `packages/shared/src/money.ts` con `parseAmount` y `formatCents`
    - `parseAmount` sigue el orden del diseño: formato → `AMOUNT_NOT_POSITIVE` → más de dos decimales → máximo `99_999_999_999` céntimos, con aritmética entera sobre los dígitos (sin `parseFloat`)
    - `formatCents` produce exactamente dos decimales (`0` → `"0.00"`, `5` → `"0.05"`)
    - _Requirements: 1.1, 1.4, 1.5, 6.5_

  - [ ]* 2.3 Escribir la prueba de propiedad del round-trip céntimos ↔ string
    - Archivo `packages/shared/test/money-roundtrip.property.test.ts`
    - **Property 5: Round-trip de conversión céntimos ↔ string decimal**
    - **Validates: Requirements 6.5, 1.1**

  - [ ]* 2.4 Escribir pruebas unitarias de `money.ts` y del catálogo de errores
    - Casos `"0.01"`, `"999999999.99"`, `"1000000000.00"`, `"1.234"`, `"0"`, `"-5"`, `"abc"`
    - Prueba de instantánea de los mensajes en español de `errors.ts` y de la prioridad HTTP
    - _Requirements: 1.4, 1.5, 6.5_

  - [x] 2.5 Implementar `packages/shared/src/period.ts`
    - `isValidCalendarDate` (formato `YYYY-MM-DD` y día real, incluido el 29 de febrero solo en años bisiestos)
    - `resolvePeriod` para `day`, `week` (lunes a domingo ISO 8601), `month` (último día según bisiesto) y `custom`, con aritmética en UTC y `INVALID_DATE_RANGE` si `dateFrom > dateTo`
    - Interfaz `Clock { today(): string }`
    - _Requirements: 1.6, 6.1, 6.6_

  - [ ]* 2.6 Escribir la prueba de propiedad de resolución de periodos
    - Archivo `packages/shared/test/period.property.test.ts`
    - **Property 17: Resolución de periodos**
    - **Validates: Requirements 6.1**

  - [ ]* 2.7 Escribir pruebas unitarias de `resolvePeriod`
    - Semana que cruza el cambio de año (2024-12-30 a 2025-01-05), febrero bisiesto y no bisiesto, `custom` con `dateFrom == dateTo`
    - _Requirements: 6.1, 6.6_

  - [x] 2.8 Implementar `packages/shared/src/normalize.ts`
    - `normalizeForSearch` (NFD, eliminación de `\p{M}`, minúsculas) y `matchesSearch`
    - _Requirements: 5.5_

  - [ ]* 2.9 Escribir la prueba de propiedad de búsqueda insensible a mayúsculas y acentos
    - Archivo `packages/shared/test/normalize.property.test.ts`
    - **Property 13: Búsqueda insensible a mayúsculas y acentos**
    - **Validates: Requirements 5.5**

  - [x] 2.10 Implementar `packages/shared/src/validators.ts`
    - `validateExpenseInput(input, clock)` que acumula todos los errores de monto, fecha (`INVALID_DATE`, `DATE_IN_FUTURE`) y descripción (longitud en puntos de código ≤ 500, `""` por defecto)
    - `validateCategoryName` (recorte y longitud 1–50 en puntos de código)
    - `validateBudgetInput` (límite con `BUDGET_LIMIT_NOT_POSITIVE` para valores ≤ 0, `start < end` estricto)
    - `validateExpenseFilter` (rango `dateFrom <= dateTo`, búsqueda de 1–100 caracteres)
    - _Requirements: 1.4, 1.5, 1.6, 1.8, 1.9, 2.1, 2.4, 4.2, 5.4, 5.5, 7.1, 7.5_

  - [ ]* 2.11 Escribir la prueba de propiedad de validación de fechas de calendario
    - Archivo `packages/shared/test/date-validation.property.test.ts`
    - **Property 6: Validación de fechas de calendario**
    - **Validates: Requirements 1.6, 2.1**

- [-] 3. Checkpoint - Paquete shared
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Capa de persistencia (Data_Store)
  - [x] 4.1 Definir los puertos de persistencia y el esquema SQLite
    - `packages/server/src/domain/ports.ts`: interfaces `ExpenseRepository`, `CategoryRepository`, `BudgetRepository`, `TransactionRunner` y la clase `PersistenceError`
    - `packages/server/src/persistence/schema.ts`: SQL de las tablas `categories`, `expenses` y `budgets` con sus `CHECK`, `UNIQUE`, claves foráneas e índices; `user_version = 1`
    - `packages/server/src/persistence/connection.ts`: apertura con `PRAGMA foreign_keys = ON`, `journal_mode = WAL`, `synchronous = FULL`
    - _Requirements: 1.2, 4.1, 4.4, 7.6, 8.3_

  - [x] 4.2 Implementar los repositorios SQLite
    - `SqliteExpenseRepository`, `SqliteCategoryRepository`, `SqliteBudgetRepository` con consultas parametrizadas, mantenimiento de `name_lower`, `sumByCategoryInPeriod` con `SUM ... GROUP BY` y `countByCategory`
    - `SqliteTransactionRunner` sobre `db.transaction(fn)`; los fallos de SQLite se envuelven en `PersistenceError`
    - _Requirements: 1.2, 1.3, 2.2, 3.4, 4.3, 5.2, 5.3, 6.1, 6.2, 7.2, 8.3, 8.4_

  - [x] 4.3 Implementar repositorios en memoria y el envoltorio de fallos
    - `packages/server/src/persistence/memory/`: implementaciones en memoria de los tres repositorios y de `TransactionRunner` con instantánea y restauración al fallar
    - `FailingRepository`: envoltorio que lanza `PersistenceError` en la llamada N configurable
    - _Requirements: 1.3, 3.6, 8.4_

  - [x] 4.4 Implementar la secuencia de arranque (`packages/server/src/persistence/bootstrap.ts`)
    - Archivo inexistente → crear esquema y sembrar la Category `General` (`is_seed = 1`) en la misma transacción
    - Archivo existente → `PRAGMA quick_check`, `user_version` reconocido y tablas esperadas; aplicar migraciones pendientes en orden
    - Archivo corrupto o excepción → renombrar a `expenses.db.corrupt-TIMESTAMP`, crear BD nueva con semilla y devolver `dataLoadError = DATA_LOAD_FAILED`
    - _Requirements: 4.7, 8.1, 8.2, 8.5_

  - [ ]* 4.5 Escribir pruebas de integración de persistencia y arranque
    - Persistencia tras reinicio con archivo temporal para Expenses, Categories y Budgets
    - Primer arranque: colecciones vacías más la categoría `General`
    - Bytes aleatorios, esquema desconocido o `user_version` no reconocido → archivo renombrado y `DATA_LOAD_FAILED`
    - Restricciones `CHECK`, `UNIQUE (name_lower)`, `UNIQUE (category_id, period_start, period_end)` y claves foráneas
    - Carga de 10.000 Expenses, 100 Categories y 100 Budgets en ≤ 3 s
    - _Requirements: 4.3, 4.7, 8.1, 8.2, 8.5_

- [x] 5. Funciones puras de dominio (modelos de referencia)
  - [x] 5.1 Implementar las funciones puras en `packages/server/src/domain/pure/`
    - `applyFilter(expenses, filter)`: conjunción de Category, rango inclusivo y `matchesSearch`; orden `date` desc, `createdAt` desc, `id` asc
    - `totalForPeriod` y `summaryByCategory` (solo categorías con gastos, orden por `subtotal` desc y `categoryName` asc)
    - `classifyBudget(spent, limit)` con `BigInt`: `exceeded` con `amountOver`, `warning` en 80 %–<100 %, `percentConsumed` truncado
    - _Requirements: 5.1, 5.2, 5.3, 5.5, 5.6, 6.1, 6.2, 6.3, 6.4, 7.3, 7.4_

  - [ ]* 5.2 Escribir la prueba de propiedad del orden del listado
    - Archivo `packages/server/test/domain/list-order.property.test.ts`
    - **Property 11: Orden del listado**
    - **Validates: Requirements 5.1**

  - [ ]* 5.3 Escribir la prueba de propiedad de filtros combinados
    - Archivo `packages/server/test/domain/filters.property.test.ts`
    - **Property 12: Los filtros combinados equivalen a la intersección de los filtros individuales**
    - **Validates: Requirements 5.2, 5.3, 5.6**

  - [ ]* 5.4 Escribir la prueba de propiedad de subtotales y total
    - Archivo `packages/server/test/domain/summary-sum.property.test.ts`
    - **Property 15: La suma de los subtotales por categoría es igual al total del periodo**
    - **Validates: Requirements 6.1, 6.2, 6.3**

  - [ ]* 5.5 Escribir la prueba de propiedad del periodo sin gastos
    - Archivo `packages/server/test/domain/summary-empty.property.test.ts`
    - **Property 16: El total de un periodo sin gastos es cero**
    - **Validates: Requirements 6.4**

  - [ ]* 5.6 Escribir la prueba de propiedad de clasificación de alertas
    - Archivo `packages/server/test/domain/classify-budget.property.test.ts`, con generadores que incluyen los valores frontera exactos
    - **Property 18: Clasificación de alertas exactamente en 80% y 100%**
    - **Validates: Requirements 7.3, 7.4**

  - [ ]* 5.7 Escribir pruebas unitarias de `classifyBudget`
    - Valores exactos 80 %, 79,99 %, 100 % y 99,99 % del límite; `amountOver = 0` cuando `spent == limit`
    - _Requirements: 7.3, 7.4_

- [x] 6. ExpenseService (Expense_Manager)
  - [x] 6.1 Implementar `packages/server/src/domain/expense-service.ts`
    - `create`: valida con `validateExpenseInput`, comprueba la Category dentro de la transacción, asigna UUID y `createdAt`; `PersistenceError` → `EXPENSE_SAVE_FAILED`
    - `update`: `EXPENSE_NOT_FOUND` si no existe, acumula errores, conserva `id` y `createdAt`; no modifica nada si la validación falla
    - `delete`: `EXPENSE_NOT_FOUND` si no existe; `PersistenceError` → `EXPENSE_DELETE_FAILED`
    - `get` y `list(filter)`: valida el filtro, filtra por Category y fechas en el repositorio y aplica la búsqueda y el orden con las funciones de 5.1
    - Recibe `Clock` y `TransactionRunner` por inyección
    - _Requirements: 1.1, 1.2, 1.3, 1.7, 1.9, 2.1, 2.2, 2.3, 2.4, 2.5, 3.2, 3.4, 3.5, 3.6, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ]* 6.2 Escribir la prueba de propiedad de crear y leer
    - Archivo `packages/server/test/domain/expense-create.property.test.ts`
    - **Property 1: Round-trip crear y leer un gasto**
    - **Validates: Requirements 1.1, 1.2, 1.9**

  - [ ]* 6.3 Escribir la prueba de propiedad de editar y leer
    - Archivo `packages/server/test/domain/expense-update.property.test.ts`
    - **Property 2: Round-trip editar y leer un gasto**
    - **Validates: Requirements 2.1, 2.2**

  - [ ]* 6.4 Escribir la prueba de propiedad de entradas inválidas
    - Archivo `packages/server/test/domain/expense-invalid.property.test.ts`, comparando con un oráculo de validación independiente
    - **Property 3: Una entrada inválida se rechaza con todas sus reglas incumplidas y no modifica el estado**
    - **Validates: Requirements 1.4, 1.5, 1.6, 1.7, 1.8, 2.4, 2.5**

  - [ ]* 6.5 Escribir la prueba de propiedad de identificadores inexistentes
    - Archivo `packages/server/test/domain/expense-not-found.property.test.ts`
    - **Property 7: Las operaciones sobre identificadores inexistentes no modifican el estado**
    - **Validates: Requirements 2.3, 3.5**

  - [ ]* 6.6 Escribir la prueba de propiedad de eliminar y leer
    - Archivo `packages/server/test/domain/expense-delete.property.test.ts`
    - **Property 8: Eliminar y luego leer devuelve no encontrado**
    - **Validates: Requirements 3.2, 3.4**

  - [ ]* 6.7 Escribir pruebas unitarias de ExpenseService
    - Creación sin descripción → `""`; edición con varios errores devuelve todos los códigos
    - _Requirements: 1.9, 2.4_

- [x] 7. CategoryService (Category_Manager)
  - [x] 7.1 Implementar `packages/server/src/domain/category-service.ts`
    - `create` y `rename`: `validateCategoryName`, `CATEGORY_DUPLICATE` sin distinguir mayúsculas (excluyendo la propia Category al renombrar), dentro de una transacción
    - `delete`: `CATEGORY_ID_NOT_FOUND` si no existe, `CATEGORY_HAS_EXPENSES` si `expenses.countByCategory > 0`, `CATEGORY_HAS_BUDGETS` si `budgets.countByCategory > 0`; sin borrado en cascada
    - `list`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

  - [ ]* 7.2 Escribir la prueba de propiedad de eliminación de categorías
    - Archivo `packages/server/test/domain/category-delete.property.test.ts`
    - **Property 9: Una categoría con gastos o presupuestos no se elimina; una sin ninguno se elimina y deja de poder usarse**
    - **Validates: Requirements 4.5, 4.6, 4.8**

  - [ ]* 7.3 Escribir la prueba de propiedad de creación de categorías
    - Archivo `packages/server/test/domain/category-create.property.test.ts`
    - **Property 10: Creación de categorías: longitud válida y unicidad sin distinguir mayúsculas**
    - **Validates: Requirements 4.1, 4.2, 4.4**

- [x] 8. SummaryService y BudgetService
  - [x] 8.1 Implementar `packages/server/src/domain/summary-service.ts`
    - `totalForPeriod` y `summaryByCategory` sobre `resolvePeriod` y `ExpenseRepository.sumByCategoryInPeriod`, uniendo los nombres de Category
    - Comprobación `Number.isSafeInteger` del resultado; `INVALID_DATE_RANGE` sin cálculo si el rango está invertido
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 8.2 Implementar `packages/server/src/domain/budget-service.ts`
    - `create`, `update`, `delete`, `list` con `validateBudgetInput`, `CATEGORY_NOT_FOUND`, `BUDGET_DUPLICATE` (excluyendo el propio Budget al modificar) y `BUDGET_NOT_FOUND`; el Budget previo se conserva si la validación falla
    - `evaluateAlerts(period)`: Budgets cuyo Period se solapa, `spent` por Category en el Period del Budget y `classifyBudget`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [ ]* 8.3 Escribir la prueba de propiedad de rangos invertidos
    - Archivo `packages/server/test/domain/invalid-range.property.test.ts`, contra `ExpenseService.list` y `SummaryService`
    - **Property 14: Los rangos de fechas invertidos se rechazan**
    - **Validates: Requirements 5.4, 6.6**

  - [ ]* 8.4 Escribir la prueba de propiedad de creación de presupuestos y duplicados
    - Archivo `packages/server/test/domain/budget-create.property.test.ts`
    - **Property 19: Creación de presupuestos y rechazo de duplicados**
    - **Validates: Requirements 7.1, 7.6**

  - [ ]* 8.5 Escribir la prueba de propiedad de validación de montos y límites
    - Archivo `packages/server/test/domain/amount-validation.property.test.ts`, cubriendo `parseAmount` y el límite de Budget en `BudgetService`
    - **Property 4: Validación del rango y formato de montos**
    - **Validates: Requirements 1.4, 1.5, 7.5**

  - [ ]* 8.6 Escribir la prueba de propiedad de fallos de persistencia
    - Archivo `packages/server/test/domain/persistence-failure.property.test.ts`, usando `FailingRepository` sobre los servicios de Expense, Category y Budget
    - **Property 20: Un fallo de persistencia conserva el estado previo**
    - **Validates: Requirements 1.3, 3.6, 8.4**

- [ ] 9. Checkpoint - Persistencia y dominio
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. API REST con Express
  - [x] 10.1 Crear la aplicación Express base y el ErrorMapper
    - `packages/server/src/http/app.ts`: `createApp(deps, config)` con `express.json()`, `GET /api/status` (devuelve `dataLoadError`) y `GET /api/config` (devuelve `budgetsEnabled`)
    - `packages/server/src/http/error-mapper.ts`: convierte `DomainError[]` en `{ errors: [...] }` con el código HTTP de mayor prioridad; excepciones no previstas → log y `500` sin detalles internos
    - `packages/server/src/http/dto.ts`: serialización de montos como string de dos decimales con `formatCents` y parseo con `parseAmount`; validación de tipos de cuerpo y query
    - `packages/server/src/config.ts`: lectura de `BUDGETS_ENABLED` (por defecto `true`), ruta de BD y `TZ`
    - _Requirements: 1.3, 2.4, 6.5, 8.4, 8.5_

  - [x] 10.2 Implementar el router de gastos (`packages/server/src/http/expenses-router.ts`)
    - `POST /api/expenses` (201), `PUT /api/expenses/:id` (200), `DELETE /api/expenses/:id` (204), `GET /api/expenses` con `categoryId`, `dateFrom`, `dateTo`, `search`, y `GET /api/expenses/:id`
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 3.2, 3.4, 3.5, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [x] 10.3 Implementar el router de categorías (`packages/server/src/http/categories-router.ts`)
    - `GET`, `POST` (201), `PUT /:id`, `DELETE /:id` (204) con códigos 400, 404 y 409 del catálogo
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [x] 10.4 Implementar el router de resúmenes (`packages/server/src/http/summary-router.ts`)
    - `GET /api/summary/total` y `GET /api/summary/by-category` con `periodType`, `referenceDate`, `dateFrom` y `dateTo`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 10.5 Implementar el router de presupuestos (`packages/server/src/http/budgets-router.ts`)
    - `GET`, `POST` (201), `PUT /:id`, `DELETE /:id` (204) y `GET /api/budgets/alerts`
    - Middleware que responde `404 BUDGETS_DISABLED` en todas las rutas `/api/budgets*` cuando `budgetsEnabled` es `false`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 10.6 Montar los routers y crear el punto de entrada del servidor
    - Registrar los cuatro routers y el ErrorMapper en `createApp`
    - `packages/server/src/index.ts`: ejecutar `bootstrap`, construir repositorios SQLite, `Clock` del sistema y servicios, y arrancar el servidor HTTP
    - _Requirements: 4.7, 8.1, 8.2, 8.5_

  - [ ]* 10.7 Escribir pruebas de integración de los endpoints de gastos
    - Supertest con BD `:memory:` nueva por prueba: 201 con `id`, 400 por cada regla, 404, 204, orden y filtros, `[]` sin coincidencias, montos como string
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.6, 1.7, 1.8, 2.1, 2.3, 2.4, 3.4, 3.5, 5.1, 5.4, 5.6, 5.7_

  - [ ]* 10.8 Escribir pruebas de integración de los endpoints de categorías
    - Creación, duplicado sin distinguir mayúsculas (409), nombre inválido (400), borrado con gastos (409), categoría sembrada en `GET`
    - _Requirements: 4.1, 4.2, 4.4, 4.5, 4.6, 4.7_

  - [ ]* 10.9 Escribir pruebas de integración de resúmenes y presupuestos
    - Total `"0.00"` sin gastos, desglose por categoría, rango invertido (400), creación y duplicado de Budget, alertas `warning` y `exceeded`, `budgetsEnabled = false` → `404 BUDGETS_DISABLED`
    - _Requirements: 6.1, 6.2, 6.4, 6.6, 7.1, 7.3, 7.4, 7.5, 7.6_

  - [ ]* 10.10 Escribir pruebas de integración de transacciones, estado y tiempos
    - Fallo simulado de SQLite tras la primera escritura → `500` y rollback
    - `GET /api/status` con `DATA_LOAD_FAILED` tras arrancar con un archivo corrupto
    - Respuesta de guardado y eliminación en ≤ 2 s
    - _Requirements: 1.3, 3.2, 3.6, 7.2, 8.3, 8.4, 8.5_

- [ ] 11. Checkpoint - API REST
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Frontend React
  - [x] 12.1 Configurar el cliente y crear el ApiClient
    - Proyecto React + TypeScript en `packages/client` con `QueryClientProvider` de React Query
    - `packages/client/src/api/api-client.ts`: funciones tipadas para todos los endpoints, conversión de `amount`/`limit` string ↔ céntimos con el paquete shared y normalización de errores (`{ errors }`, errores de red)
    - Hooks de consulta y mutación con invalidación de caché tras cada mutación
    - _Requirements: 1.2, 2.2, 3.4, 4.3, 7.2, 8.3_

  - [x] 12.2 Implementar `ExpenseForm`
    - Alta y edición con validación en vivo mediante `validateExpenseInput` del paquete shared, errores por campo y errores del servidor
    - Envía el monto como string; selector con las Categories existentes
    - _Requirements: 1.1, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.1, 2.4_

  - [ ]* 12.3 Escribir pruebas de componente de `ExpenseForm`
    - Errores por campo al escribir y al enviar, errores del servidor, envío sin descripción
    - _Requirements: 1.4, 1.5, 1.6, 1.8, 1.9, 2.4_

  - [x] 12.4 Implementar `DeleteConfirmDialog`
    - Muestra monto, categoría, fecha y descripción; cancelar no llama a la API; confirmar llama a `DELETE` y muestra la indicación de éxito o el error
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6_

  - [ ]* 12.5 Escribir pruebas de componente de `DeleteConfirmDialog`
    - Datos mostrados, cancelación sin llamada, éxito en ≤ 2 s con temporizadores simulados, mensaje de error
    - _Requirements: 3.1, 3.2, 3.3, 3.6_

  - [x] 12.6 Implementar `ExpenseListView`
    - Tabla en el orden devuelto por la API, filtros de Category y rango de fechas, caja de búsqueda (1–100 caracteres), acciones de editar (`ExpenseForm`) y eliminar (`DeleteConfirmDialog`)
    - Mensaje "No hay gastos que coincidan con los criterios aplicados." conservando filtros; ante `INVALID_DATE_RANGE` muestra el error y mantiene el listado anterior
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [ ]* 12.7 Escribir pruebas de componente de `ExpenseListView`
    - Respuesta `[]` con mensaje y filtros activos; rango inválido con listado previo conservado
    - _Requirements: 5.4, 5.7_

  - [x] 12.8 Implementar `SummaryPanel`
    - Selector de periodo (`day`, `week`, `month`, `custom` con fechas), total y desglose por categoría con montos de dos decimales; error de rango inválido
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [ ]* 12.9 Escribir pruebas de componente de `SummaryPanel`
    - Periodo sin gastos muestra `0.00` y desglose vacío; rango invertido muestra el error
    - _Requirements: 6.4, 6.6_

  - [x] 12.10 Implementar `CategoryManagerView`
    - Lista, alta, renombrado y borrado de categorías con los mensajes de nombre inválido, duplicado y categoría con gastos
    - _Requirements: 4.1, 4.2, 4.4, 4.5, 4.6, 4.7_

  - [ ]* 12.11 Escribir pruebas de componente de `CategoryManagerView`
    - Errores de nombre inválido, duplicado y categoría con gastos
    - _Requirements: 4.2, 4.4, 4.6_

  - [x] 12.12 Implementar `BudgetManagerView`
    - Alta y edición de presupuestos (`week`, `month`, `custom`), errores de límite y duplicado, panel de alertas con porcentaje consumido y monto excedido
    - _Requirements: 7.1, 7.3, 7.4, 7.5, 7.6_

  - [ ]* 12.13 Escribir pruebas de componente de `BudgetManagerView`
    - Alerta de advertencia con porcentaje, alerta de límite superado con monto excedido, errores de validación
    - _Requirements: 7.3, 7.4, 7.5, 7.6_

- [x] 13. Integración final
  - [x] 13.1 Ensamblar la aplicación cliente en `App.tsx`
    - Navegación entre `ExpenseListView` (con alta de gasto), `SummaryPanel`, `CategoryManagerView` y `BudgetManagerView`
    - Consulta de `GET /api/status` al iniciar y aviso de `DATA_LOAD_FAILED`; consulta de `GET /api/config` para ocultar presupuestos y alertas si `budgetsEnabled` es `false`
    - Proxy de desarrollo del cliente hacia el servidor
    - _Requirements: 4.7, 7.1, 8.1, 8.5_

  - [ ]* 13.2 Escribir pruebas de componente de `App`
    - Aviso de `DATA_LOAD_FAILED`; vista de presupuestos oculta con `budgetsEnabled = false`
    - _Requirements: 8.5, 7.1_

  - [ ]* 13.3 Escribir una prueba de integración del flujo completo en el servidor
    - Supertest: crear Category, crear Expenses, consultar listado filtrado, resumen y alertas de un Budget, editar y eliminar, y verificar los resultados tras reabrir la BD
    - _Requirements: 1.2, 2.2, 3.4, 5.6, 6.2, 7.4, 8.1_

- [ ] 14. Checkpoint final - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido.
- Cada tarea referencia criterios de aceptación concretos para mantener la trazabilidad.
- Cada propiedad de Correctness Properties (1–20) tiene una única prueba con fast-check, al menos 100 iteraciones y el comentario `// Feature: expense-tracker, Property N: <título>`.
- Las pruebas de propiedades de dominio usan los repositorios en memoria de la tarea 4.3 y un `Clock` fijo.
- Las pruebas unitarias y de componentes cubren ejemplos concretos y casos límite que complementan las propiedades.
- Todas las ejecuciones de pruebas usan `vitest --run`.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.8"] },
    { "id": 2, "tasks": ["2.2", "2.5", "2.9"] },
    { "id": 3, "tasks": ["2.3", "2.4", "2.6", "2.7", "2.10"] },
    { "id": 4, "tasks": ["2.11", "4.1"] },
    { "id": 5, "tasks": ["4.2", "4.3", "5.1"] },
    { "id": 6, "tasks": ["4.4", "5.2", "5.3", "5.4", "5.5", "5.6", "5.7", "6.1", "7.1", "8.1", "8.2"] },
    { "id": 7, "tasks": ["4.5", "6.2", "6.3", "6.4", "6.5", "6.6", "6.7", "7.2", "7.3", "8.3", "8.4", "8.5", "8.6", "10.1"] },
    { "id": 8, "tasks": ["10.2", "10.3", "10.4", "10.5"] },
    { "id": 9, "tasks": ["10.6"] },
    { "id": 10, "tasks": ["10.7", "10.8", "10.9", "10.10", "12.1"] },
    { "id": 11, "tasks": ["12.2", "12.4", "12.8", "12.10", "12.12"] },
    { "id": 12, "tasks": ["12.3", "12.5", "12.6", "12.9", "12.11", "12.13"] },
    { "id": 13, "tasks": ["12.7", "13.1"] },
    { "id": 14, "tasks": ["13.2", "13.3"] }
  ]
}
```
