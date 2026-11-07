---
type: ADR
title: "ADR-004: pnpm como gestor de paquetes"
description: Usar pnpm 9.15.0 y pnpm-lock.yaml; retirar npm y package-lock.json.
status: stable
decision_status: accepted
decided_by: human:simon
decided_at: 2026-11-07T14:51:41Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T14:51:41Z }
---

# Contexto

El proyecto arrancó con npm y `package-lock.json`. El usuario decide usar pnpm
para el proyecto y para todos los comandos de agentes.

# Decisión

- Usar **pnpm 9.15.0**.
- Declarar `packageManager: "pnpm@9.15.0"` en `package.json`.
- Versionar `pnpm-lock.yaml`.
- Eliminar `package-lock.json`.
- Ejecutar scripts con `pnpm run ...` o `pnpm ...`.
- Instalar Playwright con `pnpm exec playwright install chromium`.
- Mantener Node `>=20`.

# Consecuencias

- Un único lockfile.
- Instalaciones más rápidas y reproducibles.
- Los agentes deben usar `pnpm`, no `npm` ni `npx`.
- La documentación y las skills deben hablar de pnpm.
- `pnpm run verify` es la validación canónica.

# Alternativas descartadas

- **npm**: era el estado inicial, pero el usuario prefiere pnpm.
- **yarn**: no aporta una ventaja clara para este proyecto.
- **Sin lockfile**: rompe la reproducibilidad.
