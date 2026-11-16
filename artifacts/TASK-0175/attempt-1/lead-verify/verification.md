---
type: Verification
title: "TASK-0175: verificación del intento 1"
description: Resultado de verify:task y criterios revisados del experimento de densidad.
task: TASK-0175
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T20:23:54Z }
---

# Resultado

`ok`. `verify:task` en verde con 6 criterios firmados, 1904 tests (3 nuevos),
`build:experiments` y diff dentro de `src/`, `tests/` y `experiments/`.

# Criterios

- Panel con `N`, `P`, `R`, fórmula y aplicado: `metrics.test.ts`.
- Aviso con fórmula · `R` · aplicado: `metrics.test.ts` («cuando manda el suelo»).
- Factores a 0 → `R` y una ficha por sala con `emptyRooms` 0: `spawn.test.ts`.
- `P` de 1 a 6 y payload con ambos totales y desglose: `spawn.test.ts` y
  `contract.test.ts`.
- Determinismo y emboscadas: tests existentes siguen pasando; solo cambiaron las
  expectativas de total por el suelo.
- `pnpm run verify` OK y `build:experiments` OK.

# Diff revisado

11 archivos: `spawn.ts` (presupuesto), `types.ts` y `metrics.ts` (panel y
payload), tests del experimento y evidencia. Sin cambios en producción ni en la
ficha ajena. El experimento duplica el cálculo del core a propósito, como el
resto de `EXP-004`; los respaldos de `resolveOptions` (1,35/3/0,5) siguen
antiguos y no afectan al panel, que pasa 1,2/6/0,25.

# Qué debe probar el usuario

Abrir `EXP-004`, poner ambos factores a 0 y ver `Salas no-spawn`, `Enemigos T` y
`Aviso de suelo`; mover `P` de 1 a 6 y comprobar que el total sube y el reparto
sigue con una ficha por sala.
