---
type: Lead Verification
title: "TASK-0123: verificación independiente"
description: Revisión del diff, reejecución de verify/E2E, criterios y triaje de fricción.
task: TASK-0123
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T00:35:00Z }
---

# Diff

Revisado `git diff main...HEAD` (29 archivos): `src/host/seed.ts`,
`start-screen.ts`, `start-screen-view.ts`, `main.ts`, `index.html`, `ui.css`,
dos tests nuevos y capturas. `src/game/`, `package.json` y `pnpm-lock.yaml`
intactos. No hay tests borrados ni aserciones relajadas.

- `seed.ts`: `parseSeedText` y `readSeedParam` reutilizan el criterio existente;
  `parseSeedParam` conserva su comportamiento.
- `start-screen.ts`: modelo puro sin DOM ni reloj, `random` inyectable, estados
  menú/paso 1/confirmación y aviso correcto de `?seed` inválido.
- `start-screen-view.ts`: DOM con nodos estables, foco inicial y devuelto,
  trampa de foco en el aviso, `role="status"`/`aria-live` y `role="alert"`.
- `main.ts`: monta la pantalla fuera de `?test=1` y bloquea mapa/F1 mientras
  está activa; `onContinue`/`onLoadRequested` quedan como puntos de extensión.
- Único test existente tocado: `host-growth-render-qa.spec.ts` abre con
  `?test=1` por defecto (el menú ya es la primera pantalla); sus aserciones,
  capturas y snapshots no cambian.

# Comandos

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec vitest run tests/unit/host/start-screen.test.ts tests/unit/host/seed.test.ts` | 46/46 OK | `attempt-1/test-output.txt` |
| `pnpm run verify` | 96 archivos / 1406 tests OK; tsc, build y bundle OK | `verify-lead.txt`, `verify-lead-2.txt` |
| `pnpm run test:e2e` | 219/219 OK | `e2e-lead.txt`, `e2e-lead-2.txt` |
| `pnpm run docs:check` | OK (616 documentos); solo avisos históricos | salida del comando |

Reejecutado tras la corrección `b2212c1` del aviso de `?seed`; ambas pasadas
independientes del lead están verdes. Sin procesos en background.

# Criterios

| Criterio | Evidencia |
|---|---|
| Menú primera pantalla, «Nueva»/«Cargar», `Esc` no abandona, «Nueva» abre paso 1 | E2E 211; captura `menu-1280x720.png` |
| N 1-6 y semilla editables solo en paso 1 | unit «número de jugadores», E2E 213 |
| Semilla al entrar, vacía genera otra, inválida bloquea con mensaje | unit de semilla; E2E 213 y `paso1-error-1280x720.png` |
| `?seed=` válido precarga una vez y es editable; inválido avisa y se ignora | unit `?seed`; E2E 212; aviso corregido en `b2212c1` |
| Defaults N=1 y semilla generada; sin persistencia al recargar | unit de defaults y cancelación; E2E 212 |
| `Esc`/«Cancelar» confirman y vuelven al menú sin empezar partida | E2E 211 y 214; `confirmacion-1280x720.png` |
| Teclado completo, foco visible, avisos `aria-live` | E2E 214; `role=status`/`role=alert`; captura `menu-900x700.png` |
| Tests de primera pantalla, N=1/6, semilla válida/vacía/inválida, `?seed` y cancelación | 46 unitarios y 4 E2E; `verify` y suite E2E verdes |

# Fricción

| Propuesta | Clase | Disposición | Motivo |
|---|---|---|---|
| Fijar una sola ruta de capturas E2E entre brief y detalle | local/documental | `rejected` | La plantilla ya fija `<spec>/screenshots/` con `E2E_ARTIFACTS_DIR`; el brief lo repitió y la copia a `artifacts/` es un extra local. No hay contradicción normativa ni cambio de arnés necesario. |

# Cierre

Verificado y apto para fusionar. La documentación de diseño, glosario y alcance
queda en TASK-0128; la QA visual/E2E completa del flujo en TASK-0129. El flujo
de jugador, resumen y arranque no forman parte de esta tarea.
