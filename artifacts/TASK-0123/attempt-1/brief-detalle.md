---
type: Task Brief Detail
title: "TASK-0123: contrato del menú y el paso 1"
description: Modelo puro, DOM, semilla, accesibilidad, bypass de test y matriz de pruebas.
task: TASK-0123
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T00:20:00Z }
---

# Frontera y extensión

El host monta una pantalla de arranque independiente del bucle de render. El
menú y el paso 1 no crean ni modifican `GameSession`; dejan dos puntos de
extensión estables para las tareas siguientes:

```ts
interface StepOneConfig {
  readonly playerCount: number; // 1..6
  readonly seed: number; // uint32
}
interface StartScreenHandlers {
  onContinue(config: StepOneConfig): void; // TASK-0124
  onLoadRequested(): void; // TASK-0141
}
```

En `main.ts`, `onContinue` y `onLoadRequested` son no-op en esta tarea. El
callback válido debe anunciar en la pantalla que la configuración está lista
(`role="status"`); no navega a jugador, no oculta el paso 1 y no arranca la
partida. «Cargar» permanece en el menú y no abre ningún selector.

# Modelo puro (`src/host/start-screen.ts`)

Sin DOM y sin relojes. Acepta `random: () => number` inyectable; por defecto usa
`nextSeed` con su aleatoriedad actual. Estados: `menu`, `step1`,
`confirm-cancel`. Campos: `playerCount`, `seedText`, `error`, `notice` y la
semilla precargada pendiente.

- Construcción con `search` y `random`: `N=1`; si `?seed` está presente y es
  válida, se guarda como precarga de la primera entrada; si es inválida, se
  genera una semilla y `notice` conserva el aviso del parser; si falta, se
  genera una.
- `openStepOne`: usa la precarga pendiente una sola vez y la consume; las
  entradas posteriores generan con `nextSeed`. Limpia error y foco de edición.
- `setPlayerCount`: enteros 1-6; cualquier otro valor se rechaza con error y
  conserva N. La UI no debe permitir valores fuera de rango.
- `setSeedText`: guarda el texto tal cual y limpia el error de semilla.
- `continueStepOne`: vacío (`''`) genera otra semilla, la escribe en el campo y
  avanza con ella; válido normaliza a uint32 y emite `StepOneConfig`; inválido
  deja error visible y no emite. Un entero con signo opcional es válido; espacios,
  decimales, exponenciales, hex o texto no lo son (mismo criterio que
  `parseSeedParam`). Reutiliza la lógica de `src/host/seed.ts`; no dupliques el
  parser ni cambies el comportamiento de `parseSeedParam`.
- `requestCancel` solo desde `step1`; `confirmCancel` descarta y vuelve a
  `menu` con N=1 y sin config; `dismissCancel` vuelve a `step1` sin tocar nada.
- `Escape` en `menu` no cambia el estado. En `step1` equivale a «Cancelar»; en
  `confirm-cancel` cierra el aviso sin cancelar.
- Sin persistencia: una recarga vuelve a generar semilla y N=1.

# DOM y accesibilidad

- Nueva sección dentro de `.frame` (`data-testid="start-screen"`), opaca con los
  tokens `--ui-*` y `.ui-outset`; oculta el HUD/juego mientras está activa. No
  crea una página nueva ni toca el Canvas.
- Menú: título, botón «Nueva» (`start-new`), botón «Cargar» (`start-load`) y
  región `role="status" aria-live="polite"` para el aviso de `?seed` inválida.
- Paso 1: título «Nueva partida»; selector nativo de N de 1 a 6 con etiqueta
  (`step1-players`); campo de texto de semilla con etiqueta y valor
  (`step1-seed`); error en `role="alert"` (`step1-error`) enlazado con
  `aria-describedby`; botones «Continuar» y «Cancelar».
- Confirmación: `role="dialog"`, `aria-modal="true"`, título y texto que avisa
  de que se descarta lo configurado; botones «Sí, cancelar» y «Seguir
  configurando». Foco atrapado, `Esc` cierra el aviso y el foco vuelve al
  control de origen.
- Foco inicial: «Nueva» al arrancar y al volver al menú, N al entrar al paso 1.
  `Tab` recorre en orden, `Enter`/`Espacio` activan controles nativos y el foco
  visible usa `--ui-focus`. No se depende solo del color.
- Mientras la pantalla está activa, `main.ts` no interpreta comandos del mapa ni
  `F1`; solo la propia pantalla consume sus teclas. No se hace `preventDefault`
  sobre `Tab`.

# Bypass de test

`?test=1` sigue siendo el hook de test: la pantalla no se muestra y el host
arranca como hoy. Los E2E nuevos del flujo usan `/` sin `test=1`. Si algún spec
existente abre `/` sin `test=1` y necesita jugar (candidato:
`tests/e2e/host-growth-render-qa.spec.ts`), añade `test=1` a su apertura; no
cambies aserciones, capturas ni debilites el test. `perception-alarm` conserva
su prueba de claves de `window.__game` en modo normal.

# Matriz de pruebas

Unitario (`tests/unit/host/start-screen.test.ts`, Vitest node):

- defaults N=1 y semilla generada; `?seed=42` precarga una vez; segunda entrada
  genera otra; `?seed=abc` avisa y genera.
- semilla válida con signo y normalización; vacía genera y avanza; inválida
  bloquea con error; N=1 y N=6 válidos; 0, 7, decimal, vacío y no numérico no.
- cancelar: pedir, desistir, confirmar; tras confirmar, volver a entrar parte
  de N=1 y semilla nueva; no se conserva config.
- `Esc` en menú no cambia estado.

E2E (`tests/e2e/start-screen.spec.ts`, 1280×720 y 900×700):

- `/` muestra menú como primera pantalla; `Esc` no lo abandona; «Nueva» abre el
  paso 1 con N=1 y semilla visible; «Cargar» no rompe el menú.
- `?seed=42`: primera entrada precarga 42 y el campo es editable; cancelar pide
  confirmación, «Seguir» no cambia nada, confirmar vuelve al menú; segunda
  entrada ya no muestra 42.
- semilla inválida bloquea con mensaje visible/anunciado; vacía genera otra y
  continúa; N=6 se puede elegir.
- recorrido solo con teclado y capturas del menú, paso 1 y confirmación en
  `tests/e2e/start-screen/screenshots/` con `E2E_ARTIFACTS_DIR`.

Integración/manual: `pnpm run verify`; `pnpm run test:e2e`; revisar foco y
anuncios con teclado.

# Evidencia

`artifacts/TASK-0123/attempt-1/`: `report.md`, `test-output.txt`,
`verify-output.txt`, `e2e-output.txt`, `commit.txt`. El informe enlaza el detalle
y anota cualquier spec existente adaptado por el bypass.
