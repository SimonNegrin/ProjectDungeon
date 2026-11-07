---
type: Experiment
id: EXP-001
title: Comparador de generadores de mazmorra
description: Compara BSP, salas con pasillos e híbrido con la misma semilla para elegir el generador de REQ-003.
status: stable
experiment_status: decided
question: ¿Qué generador produce la mazmorra legible, variada y con los pasillos y huecos de puerta que queremos?
related_requirements: [REQ-003]
seed: 279837264
parameters:
  roomTarget: 9
  roomMin: 4
  roomMax: 11
  loopRatio: 20
  showDoors: true
decision: variant-a
decided_by: human:simon
decided_at: 2026-11-07T22:11:52.376Z
created_at: 2026-11-07T17:43:55Z
updated_at: 2026-11-07T22:12:59Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T17:43:55Z }
verified:
  - by: human:simon
    at: 2026-11-07T22:11:52.376Z
    note: Decide A (BSP) con semilla 279837264 y parámetros 9/4/11/20.
---

# Propósito

Responder una sola pregunta: qué generador produce la mazmorra que queremos para
[REQ-003](../../docs/requirements/REQ-003-generacion-mapa.md). El mapa de trabajo
es de 32×32; los controles permiten variar salas y bucles, pero no el tamaño.

El experimento usa la regla de muros ya aprobada: `wallSide1` solo en muros con
suelo al sur y `wallTop` en el resto. También dibuja los huecos de puerta y los
puntos de aparición para comprobar que el mapa es jugable.

# Hipótesis

- **BSP** dará la estructura más legible y las salas más previsibles.
- **Salas + pasillos** dará un resultado más orgánico, con más riesgo de espacios
  muertos y pasillos largos.
- **Híbrido** dará la sensación más laberíntica, pero puede complicar la lectura
  y la colocación de puertas.

La decisión no es "cuál es más bonito", sino cuál cumple mejor las propiedades de
`REQ-003` con la misma semilla.

# Opciones

| Variante | Descripción | Tradeoff |
|---|---|---|
| A | BSP: partición recursiva, salas en hojas, conexión entre salas con pasillos en L/Z y bucles extra. | Estructura clara y salas variadas; puede sentirse jerárquica y repetitiva. |
| B | Salas colocadas al azar sin solaparse, árbol de expansión y pasillos en L/Z, más bucles. | Más orgánico; puede dejar zonas vacías y pasillos largos. |
| C | Híbrido: salas + relleno laberíntico entre ellas + bucles. | Más sensación de mazmorra; más difícil de leer y de validar. |

# Cómo usarlo

1. Abrir `/experiments/EXP-001-generador-mazmorra/`.
2. Fijar una semilla y comparar A, B y C con los mismos parámetros.
3. Ajustar `roomTarget`, `roomMin`, `roomMax` y `loopRatio`.
4. Activar `showDoors` para revisar los accesos y los puntos de aparición.
5. Probar varias semillas; no decidir con una sola.
6. Elegir una variante, añadir notas y exportar el JSON de decisión.

# Métricas

- Número de salas y área mínima, mediana y máxima.
- Porcentaje de suelo transitable.
- Pasillos, esquinas, callejones y bucles.
- Huecos de puerta y conectividad (debe ser 100 %).
- Distancia de camino entre jugador y enemigo.
- Tiempo de generación.

# Observaciones

La decisión se tomó con la semilla `279837264` y los parámetros
`roomTarget 9`, `roomMin 4`, `roomMax 11`, `loopRatio 20 %` y `showDoors true`.

Referencia de la semilla `20261107` (attempt-2, antes de la decisión):

| Métrica | A · BSP | B · Salas+pasillos | C · Híbrido |
|---|---:|---:|---:|
| Salas | 10 | 10 | 10 |
| Grandes (7×7+) | 3 | 2 | 3 |
| Pequeñas (3×3–5×5) | 3 | 3 | 3 |
| Suelo | 47,7 % | 33,5 % | 59,8 % |
| Pasillos | 102 | 38 | 231 |
| Esquinas | 14 | 4 | 11 |
| Callejones | 0 | 0 | 73 |
| Bucles | 2 | 2 | 2 |
| Distancia jugador→enemigo | 64 | 42 | 75 |
| Tiempo de generación | 250,9 ms | 169,5 ms | 79,7 ms |

A se percibió como la más equilibrada y con mapas más interesantes: salas
grandes y pequeñas reconocibles, pasillos con esquinas y sin callejones. B quedó
demasiado compacta y usó una colocación de respaldo en la semilla de referencia.
C resultó demasiado densa y laberíntica. La regla de muros por borde se leyó
correctamente en las tres variantes.

Limitaciones registradas: A y B superan el objetivo de 100 ms de T-007 en la
maqueta; B puede necesitar una colocación más orgánica; el canvas del
experimento es de 512×512 y en tres columnas deja unos 10 px CSS por tile.

# Decisión

- Opción: **A · BSP** (`variant-a`).
- Motivo: genera mapas generalmente más interesantes para el juego, con salas
  grandes y pequeñas, pasillos con esquinas y estructura legible.
- Fecha: 2026-11-07T22:11:52.376Z.
- Decidido por: `human:simon`.
- Semilla: `279837264`.
- Parámetros: `roomTarget 9`, `roomMin 4`, `roomMax 11`, `loopRatio 20 %`,
  `showDoors true`.

Notas del usuario:

> Creo que esta opción genera generalmente mapas más interesantes para el juego.
>
> Me gustaría hacer algunas preguntas:
> - ¿Sería posible tener el algoritmo encapsulado de tal manera que sea
>   facilmente reemplazable en el futuro, por ejemplo, tener una interfaz
>   MapGenerator o algo así?
> - ¿Existe la posibilidad de generar pasillos de 2 tiles de ancho? Esos pasillos
>   no tendrían puerta y no es obligatorio que hagan esquina (pueden ser rectos).
>   Creo que pasillos de 2 (o incluso 3) tiles de ancho mejoran la posibilidad de
>   combates tácticos en el futuro, donde los jugadores puedan montar barricadas
>   o simplemente aprovechar el espacio estrecho para defender una posición.

# Evidencia

- [JSON de decisión](results/decision-2026-11-07T22-11-52Z.json)
- Capturas A/B/C de `artifacts/TASK-0007/attempt-2/screenshots/`
- [Informe de TASK-0007](../../artifacts/TASK-0007/attempt-2/report.md)
- `pnpm run verify` (145 tests) y `pnpm run test:e2e` (11 tests) OK.

# Siguientes pasos

- `REQ-003` v2 aprobada: BSP, `MapGenerator`, configuración 9/4/11/20 y 1-2
  pasillos anchos de 2 tiles sin puertas por mapa.
- Promocionar BSP a `src/game/` con tests de producción y la interfaz inyectable.
- Crear las tareas de generación, pasillos anchos, integración y E2E.
- Archivar el experimento o dejarlo como referencia.
