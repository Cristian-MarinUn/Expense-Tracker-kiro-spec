# Requirements Document

## Introduction

El Seguidor de Gastos (Expense Tracker) es una aplicación que permite a una persona registrar, organizar y analizar sus gastos personales. El sistema ofrece el registro de gastos con monto, categoría, fecha y descripción; la edición y eliminación de gastos existentes; la clasificación por categorías; el listado con filtros y búsqueda; resúmenes y totales por periodo y por categoría; la gestión de presupuestos con alertas cuando el gasto se aproxima o supera un límite; y la persistencia de todos los datos entre sesiones.

Este documento define los requisitos funcionales en patrones EARS y bajo las reglas de calidad INCOSE. Cada requisito describe qué debe hacer el sistema, no cómo implementarlo.

## Glossary

- **Expense_Tracker**: Sistema completo de seguimiento de gastos que agrupa todos los componentes descritos en este documento.
- **Expense_Manager**: Componente responsable de crear, editar y eliminar registros de gasto.
- **Category_Manager**: Componente responsable de gestionar las categorías de gasto.
- **Expense_List_View**: Componente que presenta el listado de gastos y aplica filtros y búsqueda.
- **Summary_Engine**: Componente que calcula totales y resúmenes por periodo y por categoría.
- **Budget_Manager**: Componente que gestiona presupuestos y genera alertas.
- **Data_Store**: Componente de persistencia que almacena y recupera los datos de la aplicación.
- **Validator**: Componente que valida los datos de entrada antes de persistirlos.
- **Expense**: Registro individual de gasto compuesto por un identificador único, un Amount, una Category, una fecha de gasto no posterior a la fecha actual, una descripción y una fecha de creación. El identificador único es asignado por el sistema al crear el Expense y la fecha de creación corresponde al instante en que el Expense se registra.
- **Category**: Etiqueta que clasifica un gasto (por ejemplo, Alimentación, Transporte, Ocio). El nombre de una Category tiene entre 1 y 50 caracteres.
- **Budget**: Límite de gasto definido para una Category y un Period determinados. La funcionalidad de presupuestos es opcional y puede estar habilitada o deshabilitada.
- **Period**: Intervalo de tiempo usado para agrupar y resumir gastos (día, semana, mes o rango de fechas definido por el usuario).
- **Amount**: Valor monetario de un gasto, expresado con exactamente dos decimales y comprendido entre 0.01 y 999,999,999.99 inclusive.
- **Description**: Texto asociado a un Expense, con una longitud de 0 a 500 caracteres.
- **User**: Persona que utiliza el Expense_Tracker.

## Requirements

### Requirement 1: Registrar un gasto

**User Story:** Como usuario, quiero registrar un gasto con su monto, categoría, fecha y descripción, para llevar un registro de en qué gasto mi dinero.

#### Acceptance Criteria

1. WHEN el User envía un formulario de gasto con un Amount entre 0.01 y 999,999,999.99 con hasta dos decimales, una Category existente, una fecha válida en formato de calendario y una descripción de 0 a 500 caracteres, THE Expense_Manager SHALL crear un nuevo Expense con esos valores.
2. WHEN el Expense_Manager crea un nuevo Expense, THE Data_Store SHALL persistir el Expense y devolver una confirmación con el identificador único asignado al Expense.
3. IF la persistencia del Expense falla, THEN THE Data_Store SHALL rechazar el registro, no crear ningún Expense y devolver un mensaje de error que indique que el gasto no pudo guardarse.
4. IF el Amount enviado es menor o igual que cero, THEN THE Validator SHALL rechazar el registro y devolver un mensaje de error que indique que el monto debe ser mayor que cero.
5. IF el Amount enviado tiene más de dos decimales o excede 999,999,999.99, THEN THE Validator SHALL rechazar el registro y devolver un mensaje de error que indique que el monto está fuera del rango o formato permitido.
6. IF la fecha enviada no es una fecha de calendario válida, THEN THE Validator SHALL rechazar el registro y devolver un mensaje de error que indique que la fecha es inválida.
7. IF la Category enviada no existe, THEN THE Validator SHALL rechazar el registro y devolver un mensaje de error que indique que la categoría no existe.
8. IF la descripción enviada excede 500 caracteres, THEN THE Validator SHALL rechazar el registro y devolver un mensaje de error que indique que la descripción supera el límite de caracteres permitido.
9. WHERE el User no proporciona una descripción, THE Expense_Manager SHALL crear el Expense con una descripción vacía.

### Requirement 2: Editar un gasto

**User Story:** Como usuario, quiero editar un gasto existente, para corregir errores o actualizar la información.

#### Acceptance Criteria

1. WHEN el User guarda cambios sobre un Expense existente con un monto entre 0.01 y 999,999,999.99, una fecha con formato válido no posterior a la fecha actual, una categoría perteneciente al conjunto de categorías definidas y una descripción de hasta 500 caracteres, THE Expense_Manager SHALL actualizar el Expense con los nuevos valores.
2. WHEN el Expense_Manager actualiza un Expense, THE Data_Store SHALL persistir los valores actualizados de forma que una lectura posterior del mismo Expense devuelva los nuevos valores.
3. IF el User intenta editar un Expense cuyo identificador no corresponde a ningún Expense almacenado, THEN THE Expense_Manager SHALL rechazar la operación y devolver un mensaje de error que indique que el gasto no existe, sin modificar ningún Expense almacenado.
4. IF uno o más de los valores editados incumplen una regla de validación de monto, fecha, categoría o descripción, THEN THE Validator SHALL rechazar la actualización y devolver un mensaje de error que describa cada regla incumplida.
5. IF el Validator rechaza la actualización de un Expense, THEN THE Expense_Manager SHALL conservar sin cambios los valores previos del Expense.

### Requirement 3: Eliminar un gasto

**User Story:** Como usuario, quiero eliminar un gasto, para quitar registros creados por error o que ya no quiero conservar.

#### Acceptance Criteria

1. WHEN el User solicita eliminar un Expense, THE Expense_Manager SHALL mostrar una solicitud de confirmación que identifique el Expense a eliminar mediante su monto, categoría, fecha y descripción.
2. WHEN el User confirma la eliminación de un Expense existente, THE Expense_Manager SHALL eliminar el Expense y mostrar una indicación de éxito en un plazo máximo de 2 segundos.
3. WHEN el User cancela la solicitud de confirmación de eliminación, THE Expense_Manager SHALL conservar el Expense sin cambios y no ejecutar ninguna eliminación.
4. WHEN el Expense_Manager confirma la eliminación de un Expense, THE Data_Store SHALL eliminar el Expense del almacenamiento de forma permanente, de modo que no vuelva a aparecer en consultas posteriores.
5. IF el User intenta eliminar un Expense que no existe, THEN THE Expense_Manager SHALL rechazar la operación, conservar el estado actual del almacenamiento sin modificaciones y devolver un mensaje de error que indique que el gasto no existe.
6. IF la eliminación del Expense en el Data_Store falla, THEN THE Expense_Manager SHALL conservar el Expense sin cambios y devolver un mensaje de error que indique que la eliminación no pudo completarse.

### Requirement 4: Gestionar categorías

**User Story:** Como usuario, quiero gestionar las categorías de gasto, para clasificar mis gastos de forma coherente.

#### Acceptance Criteria

1. WHEN el User envía el nombre de una nueva Category cuyo nombre tiene entre 1 y 50 caracteres y no coincide, sin distinguir mayúsculas de minúsculas, con ninguna Category existente, THE Category_Manager SHALL crear la Category.
2. IF el User envía el nombre de una nueva Category que está vacío o supera los 50 caracteres, THEN THE Category_Manager SHALL rechazar la creación, conservar sin cambios el conjunto de Categories existentes y devolver un mensaje de error que indique que el nombre no es válido.
3. WHEN el Category_Manager crea, modifica o elimina una Category, THE Data_Store SHALL persistir el cambio de forma que permanezca disponible tras reiniciar la aplicación.
4. IF el User envía el nombre de una Category que coincide, sin distinguir mayúsculas de minúsculas, con el nombre de una Category existente, THEN THE Category_Manager SHALL rechazar la creación, conservar sin cambios la Category existente y devolver un mensaje de error que indique que la categoría ya existe.
5. WHEN el User elimina una Category sin Expenses ni Budgets asociados, THE Category_Manager SHALL eliminar la Category y dejarla no disponible para su selección en nuevos Expenses.
6. IF el User intenta eliminar una Category que tiene uno o más Expenses asociados, THEN THE Category_Manager SHALL rechazar la eliminación, conservar sin cambios la Category y sus Expenses asociados, y devolver un mensaje de error que indique que la categoría tiene gastos asociados.
7. WHILE el User no haya creado ninguna Category propia, THE Expense_Tracker SHALL proporcionar un conjunto inicial de al menos una Category predefinida disponible desde el primer uso.
8. IF el User intenta eliminar una Category que tiene uno o más Budgets asociados, THEN THE Category_Manager SHALL rechazar la eliminación, conservar sin cambios la Category y sus Budgets, y devolver un mensaje de error que indique que la categoría tiene presupuestos asociados.

### Requirement 5: Visualizar y filtrar el listado de gastos

**User Story:** Como usuario, quiero ver el listado de mis gastos y filtrarlo, para encontrar rápidamente los gastos que me interesan.

#### Acceptance Criteria

1. WHEN el User abre el listado de gastos, THE Expense_List_View SHALL mostrar los Expenses ordenados por fecha de forma descendente y, cuando dos o más Expenses compartan la misma fecha, ordenarlos de forma secundaria por fecha de creación descendente.
2. WHEN el User aplica un filtro por Category, THE Expense_List_View SHALL mostrar únicamente los Expenses cuya Category coincide exactamente con la seleccionada, manteniendo el orden definido en el criterio 1.
3. WHEN el User aplica un filtro por rango de fechas definido por una fecha de inicio y una fecha de fin, THE Expense_List_View SHALL mostrar únicamente los Expenses cuya fecha es mayor o igual que la fecha de inicio y menor o igual que la fecha de fin.
4. IF el User aplica un rango de fechas en el que la fecha de inicio es posterior a la fecha de fin, THEN THE Expense_List_View SHALL rechazar el filtro, mantener el listado previo sin modificar y mostrar un mensaje de error que indique que el rango de fechas es inválido.
5. WHEN el User introduce un texto de búsqueda de entre 1 y 100 caracteres, THE Expense_List_View SHALL mostrar únicamente los Expenses cuya descripción contiene el texto introducido como subcadena, sin distinguir mayúsculas de minúsculas ni acentos.
6. WHEN el User aplica de forma simultánea dos o más criterios entre filtro por Category, filtro por rango de fechas y texto de búsqueda, THE Expense_List_View SHALL mostrar únicamente los Expenses que cumplen todos los criterios aplicados a la vez (conjunción lógica), manteniendo el orden definido en el criterio 1.
7. IF ningún Expense cumple los criterios de filtro o búsqueda aplicados, THEN THE Expense_List_View SHALL mostrar un mensaje que indique que no hay gastos que coincidan y conservar activos los filtros y el texto de búsqueda aplicados.

### Requirement 6: Ver resúmenes y totales

**User Story:** Como usuario, quiero ver resúmenes y totales de mis gastos por periodo y por categoría, para entender mis patrones de gasto.

#### Acceptance Criteria

1. WHEN el User selecciona un Period, THE Summary_Engine SHALL calcular la suma de los Amounts de todos los Expenses cuya fecha es mayor o igual a la fecha de inicio del Period y menor o igual a la fecha de fin del Period, incluyendo ambos extremos.
2. WHEN el User solicita el resumen por Category para un Period, THE Summary_Engine SHALL calcular la suma de los Amounts agrupada por cada Category dentro del Period y devolver una entrada por cada Category que tenga al menos un Expense dentro del Period.
3. WHERE una Category no tiene ningún Expense dentro del Period seleccionado, THE Summary_Engine SHALL omitir esa Category del resumen por Category.
4. WHERE no existe ningún Expense dentro del Period seleccionado, THE Summary_Engine SHALL devolver un total igual a 0.00 y un resumen por Category vacío.
5. WHEN el Summary_Engine calcula un total o un subtotal por Category, THE Summary_Engine SHALL expresar el resultado con exactamente dos decimales, redondeando al céntimo más cercano mediante redondeo hacia arriba en el caso de empate (0.005 se redondea a 0.01).
6. IF el Period solicitado tiene una fecha de inicio posterior a su fecha de fin, THEN THE Summary_Engine SHALL rechazar la solicitud, devolver un mensaje de error que indique que el rango de fechas es inválido y no calcular ningún total.

### Requirement 7: Gestionar presupuestos y alertas

**User Story:** Como usuario, quiero definir presupuestos por categoría y recibir alertas, para no gastar más de lo previsto.

#### Acceptance Criteria

1. WHERE la funcionalidad de presupuestos está habilitada, WHEN el User define un Budget con un límite entre 0.01 y 999,999,999.99, una Category existente y un Period con fecha de inicio anterior a la fecha de fin, THE Budget_Manager SHALL crear el Budget y asignarle un identificador único.
2. WHERE la funcionalidad de presupuestos está habilitada, WHEN el Budget_Manager crea o modifica un Budget, THE Data_Store SHALL persistir el Budget en un plazo máximo de 2 segundos.
3. WHERE la funcionalidad de presupuestos está habilitada, WHILE el total de Expenses de una Category dentro del Period es mayor o igual al 80 por ciento del límite del Budget y menor al 100 por ciento, THE Budget_Manager SHALL mostrar una alerta de advertencia que indique el porcentaje consumido del límite.
4. WHERE la funcionalidad de presupuestos está habilitada, IF el total de Expenses de una Category dentro del Period es mayor o igual al 100 por ciento del límite del Budget, THEN THE Budget_Manager SHALL mostrar una alerta de límite superado que indique el monto excedido sobre el límite.
5. WHERE la funcionalidad de presupuestos está habilitada, IF el User define un Budget con un límite menor o igual que cero, THEN THE Validator SHALL rechazar el Budget, conservar sin cambios el Budget previo si existía y devolver un mensaje de error que indique que el límite debe ser mayor que cero.
6. WHERE la funcionalidad de presupuestos está habilitada, IF el User define un Budget para una Category y un Period que ya tienen un Budget asignado, THEN THE Validator SHALL rechazar el Budget y devolver un mensaje de error que indique que ya existe un Budget para esa Category y Period.

### Requirement 8: Persistir los datos

**User Story:** Como usuario, quiero que mis datos se guarden entre sesiones, para no perder la información registrada al cerrar la aplicación.

#### Acceptance Criteria

1. WHEN el Expense_Tracker se inicia y existen datos previamente almacenados, THE Data_Store SHALL cargar todos los Expenses, Categories y Budgets almacenados en un tiempo máximo de 3 segundos.
2. WHEN el Expense_Tracker se inicia y no existen datos previamente almacenados, THE Data_Store SHALL inicializar colecciones vacías de Expenses, Categories y Budgets sin devolver un error.
3. WHEN el Data_Store completa una operación de guardado, THE Data_Store SHALL devolver una confirmación que indique que los datos se persistieron correctamente en un tiempo máximo de 2 segundos.
4. IF una operación de guardado en el Data_Store falla, THEN THE Data_Store SHALL devolver un mensaje de error que indique que los datos no pudieron guardarse y SHALL conservar sin modificaciones el estado previo de los datos.
5. IF los datos almacenados están corruptos o no pueden interpretarse durante la carga, THEN THE Data_Store SHALL devolver un mensaje de error que indique que los datos no pudieron cargarse y SHALL inicializar colecciones vacías de Expenses, Categories y Budgets.
