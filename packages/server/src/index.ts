// Punto de entrada del servidor (Express + servicios de dominio + repositorios SQLite).
// La aplicación, los servicios y los repositorios se exportarán aquí.
export * from './domain/ports.js';
export * from './domain/pure/index.js';
export * from './domain/expense-service.js';
export * from './domain/summary-service.js';
export * from './domain/category-service.js';
export * from './domain/budget-service.js';
export * from './persistence/schema.js';
export * from './persistence/connection.js';
export * from './persistence/bootstrap.js';
export * from './persistence/sqlite/index.js';
export * from './persistence/memory/index.js';
export * from './config.js';
export * from './http/app.js';
export * from './http/error-mapper.js';
export * from './http/dto.js';
export * from './http/categories-router.js';
export * from './http/summary-router.js';
export * from './http/expenses-router.js';
export * from './http/budgets-router.js';
export * from './server.js';
