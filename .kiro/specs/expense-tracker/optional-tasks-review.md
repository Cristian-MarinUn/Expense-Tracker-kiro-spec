# Revisión de tareas opcionales: Seguidor de Gastos (expense-tracker)

## Introducción

Este archivo sirve para revisar, una a una, las tareas opcionales de `tasks.md` (las marcadas con `*`). Todas son pruebas: propiedades con fast-check, pruebas unitarias, pruebas de integración y pruebas de componentes. Se ejecutarán al final, cuando las tareas obligatorias estén implementadas.

Para cada tarea se copian literalmente la descripción, el archivo y los requisitos de `tasks.md`, y se añaden tres campos de apoyo: qué riesgo cubre, el coste estimado y una casilla de decisión. Este archivo no modifica `tasks.md`; si decides incluir u omitir una tarea, la decisión queda registrada aquí.

Convenciones comunes (de las notas de `tasks.md`):

- Cada propiedad usa fast-check con al menos 100 iteraciones y el comentario `// Feature: expense-tracker, Property N: <título>`.
- Las pruebas de propiedades de dominio usan los repositorios en memoria de la tarea 4.3 y un `Clock` fijo.
- Todas las ejecuciones usan `vitest --run`.

## Tabla resumen

| ID | Tipo de prueba | Propiedad del diseño | Requisitos validados | Depende de | Decisión |
|---|---|---|---|---|---|
| 2.3 | Propiedad | Property 5 | 6.5, 1.1 | 2.2 | ☐ Incluir / ☐ Omitir |
| 2.4 | Unitaria | — | 1.4, 1.5, 6.5 | 2.1, 2.2 | ☐ Incluir / ☐ Omitir |
| 2.6 | Propiedad | Property 17 | 6.1 | 2.5 | ☐ Incluir / ☐ Omitir |
| 2.7 | Unitaria | — | 6.1, 6.6 | 2.5 | ☐ Incluir / ☐ Omitir |
| 2.9 | Propiedad | Property 13 | 5.5 | 2.8 | ☐ Incluir / ☐ Omitir |
| 2.11 | Propiedad | Property 6 | 1.6, 2.1 | 2.5, 2.10 | ☐ Incluir / ☐ Omitir |
| 4.5 | Integración | — | 4.3, 4.7, 8.1, 8.2, 8.5 | 4.1, 4.2, 4.4 | ☐ Incluir / ☐ Omitir |
| 5.2 | Propiedad | Property 11 | 5.1 | 5.1 | ☐ Incluir / ☐ Omitir |
| 5.3 | Propiedad | Property 12 | 5.2, 5.3, 5.6 | 5.1 | ☐ Incluir / ☐ Omitir |
| 5.4 | Propiedad | Property 15 | 6.1, 6.2, 6.3 | 5.1 | ☐ Incluir / ☐ Omitir |
| 5.5 | Propiedad | Property 16 | 6.4 | 5.1 | ☐ Incluir / ☐ Omitir |
| 5.6 | Propiedad | Property 18 | 7.3, 7.4 | 5.1 | ☐ Incluir / ☐ Omitir |
| 5.7 | Unitaria | — | 7.3, 7.4 | 5.1 | ☐ Incluir / ☐ Omitir |
| 6.2 | Propiedad | Property 1 | 1.1, 1.2, 1.9 | 6.1, 4.3 | ☐ Incluir / ☐ Omitir |
| 6.3 | Propiedad | Property 2 | 2.1, 2.2 | 6.1, 4.3 | ☐ Incluir / ☐ Omitir |
| 6.4 | Propiedad | Property 3 | 1.4, 1.5, 1.6, 1.7, 1.8, 2.4, 2.5 | 6.1, 4.3 | ☐ Incluir / ☐ Omitir |
| 6.5 | Propiedad | Property 7 | 2.3, 3.5 | 6.1, 4.3 | ☐ Incluir / ☐ Omitir |
| 6.6 | Propiedad | Property 8 | 3.2, 3.4 | 6.1, 4.3 | ☐ Incluir / ☐ Omitir |
| 6.7 | Unitaria | — | 1.9, 2.4 | 6.1 | ☐ Incluir / ☐ Omitir |
| 7.2 | Propiedad | Property 9 | 4.5, 4.6, 4.8 | 7.1, 6.1, 4.3 | ☐ Incluir / ☐ Omitir |
| 7.3 | Propiedad | Property 10 | 4.1, 4.2, 4.4 | 7.1, 4.3 | ☐ Incluir / ☐ Omitir |
| 8.3 | Propiedad | Property 14 | 5.4, 6.6 | 6.1, 8.1 | ☐ Incluir / ☐ Omitir |
| 8.4 | Propiedad | Property 19 | 7.1, 7.6 | 8.2 | ☐ Incluir / ☐ Omitir |
| 8.5 | Propiedad | Property 4 | 1.4, 1.5, 7.5 | 2.2, 8.2 | ☐ Incluir / ☐ Omitir |
| 8.6 | Propiedad | Property 20 | 1.3, 3.6, 8.4 | 4.3, 6.1, 7.1, 8.2 | ☐ Incluir / ☐ Omitir |
| 10.7 | Integración | — | 1.1, 1.2, 1.4, 1.5, 1.6, 1.7, 1.8, 2.1, 2.3, 2.4, 3.4, 3.5, 5.1, 5.4, 5.6, 5.7 | 10.2, 10.6 | ☐ Incluir / ☐ Omitir |
| 10.8 | Integración | — | 4.1, 4.2, 4.4, 4.5, 4.6, 4.7 | 10.3, 10.6 | ☐ Incluir / ☐ Omitir |
| 10.9 | Integración | — | 6.1, 6.2, 6.4, 6.6, 7.1, 7.3, 7.4, 7.5, 7.6 | 10.4, 10.5, 10.6 | ☐ Incluir / ☐ Omitir |
| 10.10 | Integración | — | 1.3, 3.2, 3.6, 7.2, 8.3, 8.4, 8.5 | 10.1, 10.6, 4.4 | ☐ Incluir / ☐ Omitir |
| 12.3 | Componente | — | 1.4, 1.5, 1.6, 1.8, 1.9, 2.4 | 12.2 | ☐ Incluir / ☐ Omitir |
| 12.5 | Componente | — | 3.1, 3.2, 3.3, 3.6 | 12.4 | ☐ Incluir / ☐ Omitir |
| 12.7 | Componente | — | 5.4, 5.7 | 12.6 | ☐ Incluir / ☐ Omitir |
| 12.9 | Componente | — | 6.4, 6.6 | 12.8 | ☐ Incluir / ☐ Omitir |
| 12.11 | Componente | — | 4.2, 4.4, 4.6 | 12.10 | ☐ Incluir / ☐ Omitir |
| 12.13 | Componente | — | 7.3, 7.4, 7.5, 7.6 | 12.12 | ☐ Incluir / ☐ Omitir |
| 13.2 | Componente | — | 8.5, 7.1 | 13.1 | ☐ Incluir / ☐ Omitir |
| 13.3 | Integración | — | 1.2, 2.2, 3.4, 5.6, 6.2, 7.4, 8.1 | 10.6 | ☐ Incluir / ☐ Omitir |

---

## Paquete shared

### 2.3 Escribir la prueba de propiedad del round-trip céntimos ↔ string

- Archivo `packages/shared/test/money-roundtrip.property.test.ts`
- **Property 5: Round-trip de conversión céntimos ↔ string decimal**
- **Validates: Requirements 6.5, 1.1**

**Qué aporta:** Detecta pérdidas o desplazamientos de céntimos al convertir entre el valor entero y el texto con dos decimales, que alterarían cualquier monto guardado o mostrado.

**Coste estimado:** Bajo

**Decisión:** ☐ Incluir ☐ Omitir ☐ Posponer

**Notas:**

### 2.4 Escribir pruebas unitarias de `money.ts` y del catálogo de errores

- Casos `"0.01"`, `"999999999.99"`, `"1000000000.00"`, `"1.234"`, `"0"`, `"-5"`, `"abc"`
- Prueba de instantánea de los mensajes en español de `errors.ts` y de la prioridad HTTP
- _Requirements: 1.4, 1.5, 6.5_

**Qué aporta:** Fija los valores frontera de los montos y evita que un cambio accidental altere los mensajes en español o la prioridad `500 > 404 > 409 > 400`.

**Coste estimado:** Bajo

**Decisión:** ☐ Incluir ☐ Omitir ☐ Posponer

**Notas:**

### 2.6 Escribir la prueba de propiedad de resolución de periodos

- Archivo `packages/shared/test/period.property.test.ts`
- **Property 17: Resolución de periodos**
- **Validates: Requirements 6.1**

**Qué aporta:** Comprueba para cualquier fecha que los periodos día, semana ISO, mes y personalizado tienen los límites correctos, donde son habituales los errores de un día.

**Coste estimado:** Medio

**Decisión:** ☐ Incluir ☐ Omitir ☐ Posponer

**Notas:**

### 2.7 Escribir pruebas unitarias de `resolvePeriod`

- Semana que cruza el cambio de año (2024-12-30 a 2025-01-05), febrero bisiesto y no bisiesto, `custom` con `dateFrom == dateTo`
- _Requirements: 6.1, 6.6_

**Qué aporta:** Documenta con ejemplos concretos los casos de calendario más propensos a fallar (cambio de año, años bisiestos, rango de un solo día).

**Coste estimado:** Bajo

**Decisión:** ☐ Incluir ☐ Omitir ☐ Posponer

**Notas:**

### 2.9 Escribir la prueba de propiedad de búsqueda insensible a mayúsculas y acentos

- Archivo `packages/shared/test/normalize.property.test.ts`
- **Property 13: Búsqueda insensible a mayúsculas y acentos**
- **Validates: Requirements 5.5**

**Qué aporta:** Asegura que la búsqueda encuentra descripciones como "Café" al buscar "cafe" con textos Unicode arbitrarios, no solo con los ejemplos previstos.

**Coste estimado:** Bajo

**Decisión:** ☐ Incluir ☐ Omitir ☐ Posponer

**Notas:**

### 2.11 Escribir la prueba de propiedad de validación de fechas de calendario

- Archivo `packages/shared/test/date-validation.property.test.ts`
- **Property 6: Validación de fechas de calendario**
- **Validates: Requirements 1.6, 2.1**

**Qué aporta:** Evita aceptar fechas inexistentes (por ejemplo, 31 de abril o 29 de febrero en año no bisiesto) o rechazar fechas válidas al crear o editar gastos.

**Coste estimado:** Bajo

**Decisión:** ☐ Incluir ☐ Omitir ☐ Posponer

**Notas:**

---

## Persistencia

### 4.5 Escribir pruebas de integración de persistencia y arranque

- Persistencia tras reinicio con archivo temporal para Expenses, Categories y Budgets
- Primer arranque: colecciones vacías más la categoría `General`
- Bytes aleatorios, esquema desconocido o `user_version` no reconocido → archivo renombrado y `DATA_LOAD_FAILED`
- Restricciones `CHECK`, `UNIQUE (name_lower)`, `UNIQUE (category_id, period_start, period_end)` y claves foráneas
- Carga de 10.000 Expenses, 100 Categories y 100 Budgets en ≤ 3 s
- _Requirements: 4.3, 4.7, 8.1, 8.2, 8.5_

**Qué aporta:** Es la única prueba que verifica sobre un archivo SQLite real que los datos sobreviven a un reinicio y que un archivo corrupto no bloquea el arranque ni se pierde.

**Coste estimado:** Alto

**Decisión:** ☐ Incluir ☐ Omitir ☐ Posponer

**Notas:**

---

## Dominio: funciones puras

### 5.2 Escribir la prueba de propiedad del orden del listado

- Archivo `packages/server/test/domain/list-order.property.test.ts`
- **Property 11: Orden del listado**
- **Validates: Requirements 5.1**

**Qué aporta:** Garantiza un orden estable (`date` desc, `createdAt` desc, `id` asc) incluso con fechas repetidas, donde un orden mal definido daría listados que cambian entre consultas.

**Coste estimado:** Bajo

**Decisión:** ☐ Incluir ☐ Omitir ☐ Posponer

**Notas:**

### 5.3 Escribir la prueba de propiedad de filtros combinados

- Archivo `packages/server/test/domain/filters.property.test.ts`
- **Property 12: Los filtros combinados equivalen a la intersección de los filtros individuales**
- **Validates: Requirements 5.2, 5.3, 5.6**

**Qué aporta:** Detecta combinaciones de filtros que excluyen o incluyen gastos de más, por ejemplo por límites de rango no inclusivos.

**Coste estimado:** Medio

**Decisión:** ☐ Incluir ☐ Omitir ☐ Posponer

**Notas:**

### 5.4 Escribir la prueba de propiedad de subtotales y total

- Archivo `packages/server/test/domain/summary-sum.property.test.ts`
- **Property 15: La suma de los subtotales por categoría es igual al total del periodo**
- **Validates: Requirements 6.1, 6.2, 6.3**

**Qué aporta:** Detecta incoherencias entre el total del periodo y su desglose por categoría, que el usuario notaría de inmediato.

**Coste estimado:** Bajo

**Decisión:** ☐ Incluir ☐ Omitir ☐ Posponer

**Notas:**

### 5.5 Escribir la prueba de propiedad del periodo sin gastos

- Archivo `packages/server/test/domain/summary-empty.property.test.ts`
- **Property 16: El total de un periodo sin gastos es cero**
- **Validates: Requirements 6.4**

**Qué aporta:** Cubre el caso vacío, donde es fácil devolver `null` o un error en lugar de cero.

**Coste estimado:** Bajo

**Decisión:** ☐ Incluir ☐ Omitir ☐ Posponer

**Notas:**

### 5.6 Escribir la prueba de propiedad de clasificación de alertas

- Archivo `packages/server/test/domain/classify-budget.property.test.ts`, con generadores que incluyen los valores frontera exactos
- **Property 18: Clasificación de alertas exactamente en 80% y 100%**
- **Validates: Requirements 7.3, 7.4**

**Qué aporta:** Verifica que las alertas de advertencia y de límite superado se activan exactamente en el 80 % y el 100 %, sin errores de redondeo.

**Coste estimado:** Medio

**Decisión:** ☐ Incluir ☐ Omitir ☐ Posponer

**Notas:**

### 5.7 Escribir pruebas unitarias de `classifyBudget`

- Valores exactos 80 %, 79,99 %, 100 % y 99,99 % del límite; `amountOver = 0` cuando `spent == limit`
- _Requirements: 7.3, 7.4_

**Qué aporta:** Deja documentados con ejemplos legibles los mismos umbrales que cubre la propiedad 18.

**Coste estimado:** Bajo

**Decisión:** ☐ Incluir ☐ Omitir ☐ Posponer

**Notas:**

---

## Dominio: ExpenseService

### 6.2 Escribir la prueba de propiedad de crear y leer

- Archivo `packages/server/test/domain/expense-create.property.test.ts`
- **Property 1: Round-trip crear y leer un gasto**
- **Validates: Requirements 1.1, 1.2, 1.9**

**Qué aporta:** Confirma que cualquier gasto válido se guarda y se recupera sin cambios, incluida la descripción vacía por defecto.

**Coste estimado:** Medio

**Decisión:** ☐ Incluir ☐ Omitir ☐ Posponer

**Notas:**

### 6.3 Escribir la prueba de propiedad de editar y leer

- Archivo `packages/server/test/domain/expense-update.property.test.ts`
- **Property 2: Round-trip editar y leer un gasto**
- **Validates: Requirements 2.1, 2.2**

**Qué aporta:** Comprueba que la edición aplica los nuevos valores y conserva `id` y `createdAt`.

**Coste estimado:** Medio

**Decisión:** ☐ Incluir ☐ Omitir ☐ Posponer

**Notas:**

### 6.4 Escribir la prueba de propiedad de entradas inválidas

- Archivo `packages/server/test/domain/expense-invalid.property.test.ts`, comparando con un oráculo de validación independiente
- **Property 3: Una entrada inválida se rechaza con todas sus reglas incumplidas y no modifica el estado**
- **Validates: Requirements 1.4, 1.5, 1.6, 1.7, 1.8, 2.4, 2.5**

**Qué aporta:** Verifica que se devuelven todos los errores a la vez (no solo el primero) y que una entrada rechazada no deja datos a medias.

**Coste estimado:** Alto

**Decisión:** ☐ Incluir ☐ Omitir ☐ Posponer

**Notas:**

### 6.5 Escribir la prueba de propiedad de identificadores inexistentes

- Archivo `packages/server/test/domain/expense-not-found.property.test.ts`
- **Property 7: Las operaciones sobre identificadores inexistentes no modifican el estado**
- **Validates: Requirements 2.3, 3.5**

**Qué aporta:** Asegura que editar o eliminar un `id` inexistente devuelve `EXPENSE_NOT_FOUND` sin efectos secundarios.

**Coste estimado:** Bajo

**Decisión:** ☐ Incluir ☐ Omitir ☐ Posponer

**Notas:**

### 6.6 Escribir la prueba de propiedad de eliminar y leer

- Archivo `packages/server/test/domain/expense-delete.property.test.ts`
- **Property 8: Eliminar y luego leer devuelve no encontrado**
- **Validates: Requirements 3.2, 3.4**

**Qué aporta:** Confirma que un gasto eliminado desaparece de verdad y no sigue apareciendo en lecturas posteriores.

**Coste estimado:** Bajo

**Decisión:** ☐ Incluir ☐ Omitir ☐ Posponer

**Notas:**

### 6.7 Escribir pruebas unitarias de ExpenseService

- Creación sin descripción → `""`; edición con varios errores devuelve todos los códigos
- _Requirements: 1.9, 2.4_

**Qué aporta:** Ejemplos concretos y rápidos de dos comportamientos que también cubren las propiedades 1 y 3.

**Coste estimado:** Bajo

**Decisión:** ☐ Incluir ☐ Omitir ☐ Posponer

**Notas:**

---

## Dominio: CategoryService

### 7.2 Escribir la prueba de propiedad de eliminación de categorías

- Archivo `packages/server/test/domain/category-delete.property.test.ts`
- **Property 9: Una categoría con gastos o presupuestos no se elimina; una sin ninguno se elimina y deja de poder usarse**
- **Validates: Requirements 4.5, 4.6, 4.8**

**Qué aporta:** Evita dejar gastos o presupuestos huérfanos al borrar una categoría en uso.

**Coste estimado:** Medio

**Decisión:** ☐ Incluir ☐ Omitir ☐ Posponer

**Notas:**

### 7.3 Escribir la prueba de propiedad de creación de categorías

- Archivo `packages/server/test/domain/category-create.property.test.ts`
- **Property 10: Creación de categorías: longitud válida y unicidad sin distinguir mayúsculas**
- **Validates: Requirements 4.1, 4.2, 4.4**

**Qué aporta:** Detecta duplicados que solo difieren en mayúsculas y errores de longitud con caracteres multibyte.

**Coste estimado:** Medio

**Decisión:** ☐ Incluir ☐ Omitir ☐ Posponer

**Notas:**

---

## Dominio: SummaryService y BudgetService

### 8.3 Escribir la prueba de propiedad de rangos invertidos

- Archivo `packages/server/test/domain/invalid-range.property.test.ts`, contra `ExpenseService.list` y `SummaryService`
- **Property 14: Los rangos de fechas invertidos se rechazan**
- **Validates: Requirements 5.4, 6.6**

**Qué aporta:** Asegura que un rango con `dateFrom > dateTo` siempre devuelve `INVALID_DATE_RANGE` en vez de un listado o total vacío engañoso.

**Coste estimado:** Bajo

**Decisión:** ☐ Incluir ☐ Omitir ☐ Posponer

**Notas:**

### 8.4 Escribir la prueba de propiedad de creación de presupuestos y duplicados

- Archivo `packages/server/test/domain/budget-create.property.test.ts`
- **Property 19: Creación de presupuestos y rechazo de duplicados**
- **Validates: Requirements 7.1, 7.6**

**Qué aporta:** Evita dos presupuestos para la misma categoría y periodo, que harían ambiguas las alertas.

**Coste estimado:** Medio

**Decisión:** ☐ Incluir ☐ Omitir ☐ Posponer

**Notas:**

### 8.5 Escribir la prueba de propiedad de validación de montos y límites

- Archivo `packages/server/test/domain/amount-validation.property.test.ts`, cubriendo `parseAmount` y el límite de Budget en `BudgetService`
- **Property 4: Validación del rango y formato de montos**
- **Validates: Requirements 1.4, 1.5, 7.5**

**Qué aporta:** Comprueba con entradas arbitrarias que los montos y límites fuera de rango o con formato incorrecto se rechazan siempre.

**Coste estimado:** Medio

**Decisión:** ☐ Incluir ☐ Omitir ☐ Posponer

**Notas:**

### 8.6 Escribir la prueba de propiedad de fallos de persistencia

- Archivo `packages/server/test/domain/persistence-failure.property.test.ts`, usando `FailingRepository` sobre los servicios de Expense, Category y Budget
- **Property 20: Un fallo de persistencia conserva el estado previo**
- **Validates: Requirements 1.3, 3.6, 8.4**

**Qué aporta:** Es la única prueba de dominio que simula fallos de escritura y verifica que no quedan datos parciales.

**Coste estimado:** Alto

**Decisión:** ☐ Incluir ☐ Omitir ☐ Posponer

**Notas:**

---

## API REST

### 10.7 Escribir pruebas de integración de los endpoints de gastos

- Supertest con BD `:memory:` nueva por prueba: 201 con `id`, 400 por cada regla, 404, 204, orden y filtros, `[]` sin coincidencias, montos como string
- _Requirements: 1.1, 1.2, 1.4, 1.5, 1.6, 1.7, 1.8, 2.1, 2.3, 2.4, 3.4, 3.5, 5.1, 5.4, 5.6, 5.7_

**Qué aporta:** Verifica el contrato HTTP de gastos (códigos de estado, formato de errores y montos como string) que consume el frontend.

**Coste estimado:** Medio

**Decisión:** ☐ Incluir ☐ Omitir ☐ Posponer

**Notas:**

### 10.8 Escribir pruebas de integración de los endpoints de categorías

- Creación, duplicado sin distinguir mayúsculas (409), nombre inválido (400), borrado con gastos (409), categoría sembrada en `GET`
- _Requirements: 4.1, 4.2, 4.4, 4.5, 4.6, 4.7_

**Qué aporta:** Confirma que los errores de dominio de categorías llegan al cliente con el código HTTP correcto.

**Coste estimado:** Bajo

**Decisión:** ☐ Incluir ☐ Omitir ☐ Posponer

**Notas:**

### 10.9 Escribir pruebas de integración de resúmenes y presupuestos

- Total `"0.00"` sin gastos, desglose por categoría, rango invertido (400), creación y duplicado de Budget, alertas `warning` y `exceeded`, `budgetsEnabled = false` → `404 BUDGETS_DISABLED`
- _Requirements: 6.1, 6.2, 6.4, 6.6, 7.1, 7.3, 7.4, 7.5, 7.6_

**Qué aporta:** Cubre el parseo de parámetros de periodo y el interruptor `budgetsEnabled`, que no prueba ninguna otra tarea.

**Coste estimado:** Medio

**Decisión:** ☐ Incluir ☐ Omitir ☐ Posponer

**Notas:**

### 10.10 Escribir pruebas de integración de transacciones, estado y tiempos

- Fallo simulado de SQLite tras la primera escritura → `500` y rollback
- `GET /api/status` con `DATA_LOAD_FAILED` tras arrancar con un archivo corrupto
- Respuesta de guardado y eliminación en ≤ 2 s
- _Requirements: 1.3, 3.2, 3.6, 7.2, 8.3, 8.4, 8.5_

**Qué aporta:** Verifica el rollback real de SQLite y que el aviso de datos corruptos llega por la API.

**Coste estimado:** Alto

**Decisión:** ☐ Incluir ☐ Omitir ☐ Posponer

**Notas:**

---

## Frontend React

### 12.3 Escribir pruebas de componente de `ExpenseForm`

- Errores por campo al escribir y al enviar, errores del servidor, envío sin descripción
- _Requirements: 1.4, 1.5, 1.6, 1.8, 1.9, 2.4_

**Qué aporta:** Asegura que el usuario ve cada error junto a su campo, tanto los de validación local como los devueltos por el servidor.

**Coste estimado:** Medio

**Decisión:** ☐ Incluir ☐ Omitir ☐ Posponer

**Notas:**

### 12.5 Escribir pruebas de componente de `DeleteConfirmDialog`

- Datos mostrados, cancelación sin llamada, éxito en ≤ 2 s con temporizadores simulados, mensaje de error
- _Requirements: 3.1, 3.2, 3.3, 3.6_

**Qué aporta:** Evita borrados accidentales comprobando que cancelar no llama a la API.

**Coste estimado:** Bajo

**Decisión:** ☐ Incluir ☐ Omitir ☐ Posponer

**Notas:**

### 12.7 Escribir pruebas de componente de `ExpenseListView`

- Respuesta `[]` con mensaje y filtros activos; rango inválido con listado previo conservado
- _Requirements: 5.4, 5.7_

**Qué aporta:** Cubre los dos estados del listado que más confunden al usuario: sin resultados y con rango inválido.

**Coste estimado:** Bajo

**Decisión:** ☐ Incluir ☐ Omitir ☐ Posponer

**Notas:**

### 12.9 Escribir pruebas de componente de `SummaryPanel`

- Periodo sin gastos muestra `0.00` y desglose vacío; rango invertido muestra el error
- _Requirements: 6.4, 6.6_

**Qué aporta:** Comprueba que el panel muestra el total cero y el error de rango en lugar de quedarse en blanco.

**Coste estimado:** Bajo

**Decisión:** ☐ Incluir ☐ Omitir ☐ Posponer

**Notas:**

### 12.11 Escribir pruebas de componente de `CategoryManagerView`

- Errores de nombre inválido, duplicado y categoría con gastos
- _Requirements: 4.2, 4.4, 4.6_

**Qué aporta:** Asegura que los tres rechazos de categorías se muestran con su mensaje.

**Coste estimado:** Bajo

**Decisión:** ☐ Incluir ☐ Omitir ☐ Posponer

**Notas:**

### 12.13 Escribir pruebas de componente de `BudgetManagerView`

- Alerta de advertencia con porcentaje, alerta de límite superado con monto excedido, errores de validación
- _Requirements: 7.3, 7.4, 7.5, 7.6_

**Qué aporta:** Verifica que las alertas muestran el porcentaje consumido y el monto excedido correctos.

**Coste estimado:** Medio

**Decisión:** ☐ Incluir ☐ Omitir ☐ Posponer

**Notas:**

---

## Integración final

### 13.2 Escribir pruebas de componente de `App`

- Aviso de `DATA_LOAD_FAILED`; vista de presupuestos oculta con `budgetsEnabled = false`
- _Requirements: 8.5, 7.1_

**Qué aporta:** Comprueba que el usuario recibe el aviso de datos corruptos y que los presupuestos desaparecen de la interfaz cuando están desactivados.

**Coste estimado:** Bajo

**Decisión:** ☐ Incluir ☐ Omitir ☐ Posponer

**Notas:**

### 13.3 Escribir una prueba de integración del flujo completo en el servidor

- Supertest: crear Category, crear Expenses, consultar listado filtrado, resumen y alertas de un Budget, editar y eliminar, y verificar los resultados tras reabrir la BD
- _Requirements: 1.2, 2.2, 3.4, 5.6, 6.2, 7.4, 8.1_

**Qué aporta:** Recorre de punta a punta el uso real y detecta fallos de cableado entre componentes que las pruebas aisladas no ven.

**Coste estimado:** Medio

**Decisión:** ☐ Incluir ☐ Omitir ☐ Posponer

**Notas:**

---

## Orden recomendado de ejecución

El orden sigue las dependencias: shared → persistencia → dominio → API → frontend → flujo completo. Dentro de cada paso, las tareas son independientes entre sí.

1. **Shared:** 2.3, 2.4, 2.6, 2.7, 2.9, 2.11
2. **Persistencia:** 4.5
3. **Dominio, funciones puras:** 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
4. **Dominio, ExpenseService:** 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
5. **Dominio, CategoryService:** 7.2, 7.3
6. **Dominio, SummaryService y BudgetService:** 8.3, 8.4, 8.5, 8.6
7. **API REST:** 10.7, 10.8, 10.9, 10.10
8. **Frontend, componentes:** 12.3, 12.5, 12.7, 12.9, 12.11, 12.13
9. **Frontend, App:** 13.2
10. **Flujo completo:** 13.3
