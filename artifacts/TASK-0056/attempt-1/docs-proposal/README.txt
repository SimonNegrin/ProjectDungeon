Propuesta documental para TASK-0056 (intento 1).

`task-runner` no puede editar `docs/**`; `task-lead` solo tiene permiso sobre
`docs/tasks/**`, `docs/decisions/**`, `docs/log.md` y `artifacts/**`. Los cambios
de `docs/glossary.md` y `docs/design/**` debe aplicarlos `requirements-writer`.

Aplicar, en este orden:

1. `docs/glossary.md`: añadir al final de la tabla las dos filas de
   `glossary-additions.txt`.
2. `docs/design/turn-economy.md`: aplicar los reemplazos de
   `turn-economy-changes.txt`.
3. `docs/design/architecture.md`: sustituir la sección «# Combate y azar»
   completa por el contenido de `architecture-combate.txt`.

Después: `pnpm run docs:check` y `pnpm run verify`; devolver el control al lead
para cerrar la verificación y fusionar `task/TASK-0056`.
