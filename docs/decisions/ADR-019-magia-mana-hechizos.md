---
type: ADR
title: "ADR-019: magia de nivel único, maná por turno y catálogo de hechizos"
description: Nivel de magia 0–4, maná máximo nivel × 4 que se recarga por turno, fórmula mágica con las capas del combate físico y catálogo mínimo de seis hechizos.
status: stable
decision_status: accepted
decided_by: [human:simon]
decided_at: 2026-11-11T15:30:00Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T15:30:00Z }
---

# Contexto

[ADR-015](ADR-015-atributos-inherentes-absorcion.md) dejó magia como un slot sin
efecto y admitía familias con nivel 1–4. [REQ-021](../requirements/REQ-021-muerte-fantasma-resurreccion.md)
convirtió la magia en la fuente del maná de la resurrección.
[REQ-025](../requirements/REQ-025-magia-hechizos-mana.md) cierra el sistema: un
nivel único, un recurso que se recarga cada turno y un catálogo de hechizos
accesible por nivel. Este ADR registra las decisiones técnicas y de sensación;
los valores concretos viven en REQ-025 y en el catálogo.

# Decisión

- **Nivel de magia 0–4**, entero y por personaje; 0 = sin magia. Niveles del
  roster: Mago 4, Clérigo 3, Guerrero mágico 2, Cocinero 1; el resto 0. No hay
  familias con nivel propio.
- **Maná separado del MP**: máximo = nivel × 4 (0/4/8/12/16); se recarga completo
  al inicio del turno de la unidad. No se acumula entre turnos.
- **Acceso por nivel, sin aprendizaje ni grimorio**: cualquier lanzador con nivel
  suficiente usa cualquier hechizo de ese nivel o inferior.
- **Coste**: el catálogo guarda el coste final por hechizo; 2 × nivel es una guía
  de diseño (±1). Consume una acción y el maná. Tope de 2 hechizos por turno,
  provisional hasta los objetos de +1 acción.
- **Ataque mágico con las mismas capas que el físico**:
  - `nivel de magia + acierto del hechizo + 1d6 > defensa + escudo + 1d6`; el
    empate falla.
  - `max(1, poder del hechizo + 1d6 − (resistencia + armadura + 1d6))`.
  - El nivel de magia suma al acierto; el daño sale del poder del hechizo.
- **Catálogo mínimo de seis hechizos**: Eléctrico I (nivel 1), Fuego II (2),
  Eléctrico III (3), Fuego IV (4), Curación III (3) y Resurrección IV (4). El
  catálogo es dato serializable y fuente única; añadir hechizos no toca el
  resolvedor.
- **Números ajustables**: nivel, coste, alcance, acierto, poder y curación son
  datos; los efectos se parametrizan (cantidad de curación, PV al resucitar) y no
  se codifican por id. Las fórmulas (maná máximo, tope, capas de combate) son
  reglas compartidas, no números por hechizo.
- **Curación**: aliado a 2–3 casillas, no a sí mismo; cura 4 PV por 6 de maná.
- **Resurrección**: nivel 4, 8 de maná, condiciones de `REQ-021` (adyacencia al
  cadáver y casilla sin vivos). El resucitado vuelve con el 60 % de su PV máximo,
  redondeado hacia arriba (mínimo 1). Hoy solo el Mago; el objeto de resurrección
  queda como respaldo.
- **Valores provisionales v1**: se ajustan tras playtest; los tests leen del
  catálogo y no duplican números.

# Consecuencias

- El sistema se explica en una línea: nivel, maná y hechizos.
- El Mago escala en daño porque tiene un ataque de nivel 4; el Cocinero usa el
  eléctrico de nivel 1 como opción fiable.
- La resurrección concentra la tensión en el Mago; si muere, el objeto es la vía
  alternativa. El 60 % del PV máximo mantiene la resurrección proporcional al
  arquetipo: el tanque vuelve útil y el frágil sigue frágil.
- El tope de 2 es redundante con 2 acciones y solo muerde con objetos de +1
  acción; se revisa entonces.
- Sin estados alterados ni resistencias por familia, congelar, envenenar y
  similares quedan como ideas futuras.
- El HUD debe presentar magia 0 como «sin magia» o omitir el bloque; se decide en
  `REQ-022`/`REQ-023`.

# Alternativas descartadas

- **Familias con nivel 1–4 independiente**: más grimorio y más UI para una
  decisión que el jugador no necesita.
- **Maná atado al MP o sin recarga completa**: convierte el recurso en una barra
  que se administra toda la partida y contradice el presupuesto táctico por turno.
- **Resistencia mágica separada o magia que ignora armadura**: duplica el lenguaje
  del combate y complica el balance sin mejorar la lectura.
- **Cuatro hechizos fijos sin ataque de nivel 4**: el Mago no escala en daño y el
  nivel alto solo sirve para apoyo.
- **PV fijos al resucitar (p. ej., 10)**: el mismo número es casi el total del
  Mago y menos de la mitad del Bárbaro; no escala con la progresión ni respeta el
  rol del arquetipo.
- **Coste fijo por nivel sin datos por hechizo**: impide que fuego y eléctrico se
  diferencien y obliga a tocar código para ajustar.
- **Curación a sí mismo o a distancia larga**: convierte al Clérigo en un bucle
  de autocuración y alarga los combates.

Ver [REQ-025](../requirements/REQ-025-magia-hechizos-mana.md),
[REQ-014](../requirements/REQ-014-atributos-inherentes-personajes.md),
[REQ-015](../requirements/REQ-015-roster-arquetipos.md),
[REQ-021](../requirements/REQ-021-muerte-fantasma-resurreccion.md) y
[REQ-026](../requirements/REQ-026-economia-acciones-rebalanceo.md).
