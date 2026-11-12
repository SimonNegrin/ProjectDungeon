# Decisiones

* [ADR-001: local-first](ADR-001-local-first.md) - Empezar sin red y añadir el servidor al final.
* [ADR-002: stack](ADR-002-stack.md) - TypeScript, Vite, Canvas 2D y herramientas de test.
* [ADR-003: servidor autoritativo](ADR-003-authoritative-server-later.md) - Cómo será la fase remota cuando llegue.
* [ADR-004: pnpm](ADR-004-pnpm.md) - pnpm 12.18.0 y un único lockfile.
* [ADR-005: timeouts](ADR-005-command-timeouts.md) - Timeouts explícitos y control de procesos en background.
* [ADR-006: arte placeholder](ADR-006-arte-placeholder-32rogues.md) - Uso del pack 32rogues, su licencia y su crédito.
* [ADR-007: interfaz MapGenerator](ADR-007-map-generator.md) - Generación encapsulada y reemplazable; su parte de BSP por defecto queda sustituida por ADR-013.
* [ADR-008: presentación animada](ADR-008-presentacion-animada.md) - El motor atómico sigue siendo la verdad; la animación vive en el host.
* [ADR-009: recorte del arnés](ADR-009-recorte-arnes.md) - Menos documentos, tres skills, handoffs como deltas y topes validados.
* [ADR-010: damero y decoración de presentación](ADR-010-damero-decoracion-presentacion.md) - El suelo se pinta en el host; el tinte y los decals no cambian el motor ni bloquean. Sustituido en la capa de suelo por ADR-011.
* [ADR-011: suelo programático por sala y decoración ambiental](ADR-011-suelo-programatico-ambientes.md) - Dos colores planos por sala, cinco paletas por contraste y 33 decals agrupados por ambientes; el motor sigue sin cambiar.
* [ADR-012: combate con equipo, modificadores y RNG sembrado](ADR-012-combate-equipo-rng.md) - Impacto y daño con dos tiradas, equipo y modificadores como datos, resolvedor compartido y azar reproducible por semilla.
* [ADR-013: generador de producción por variante](ADR-013-generador-produccion-por-variante.md) - Core compartido, `growth` por defecto, import estático, BSP alternativo y build de producción sin experimentos ni variantes descartadas.
* [ADR-014: balance provisional y fuente única de datos](ADR-014-balance-provisional-fuente-unica.md) - Los valores de combate y bestiario viven en catálogos, el MP y la alarma salen del bestiario y los tests de balance comprueban propiedades.
* [ADR-015: atributos inherentes y resistencia en la absorción](ADR-015-atributos-inherentes-absorcion.md) - Ocho atributos por personaje, habilidad/fuerza como modificadores y resistencia en la capa de absorción con la armadura como bonus.
* [ADR-016: permisos de task-lead para diseño y glosario](ADR-016-permisos-docs-diseno-glosario.md) - Tareas mixtas: el lead edita `docs/design` y glosario para reflejar requisitos aprobados; requisitos, arnés y plantillas siguen en `requirements-writer`.
* [ADR-017: feedback visual dirigido por eventos](ADR-017-feedback-visual-eventos.md) - Cues deterministas en la timeline de presentación, estado visible retrasado hasta su evento, capas Canvas/DOM y cadáver de presentación.
* [ADR-018: Harness Keeper](ADR-018-harness-keeper.md) - Agente primario para el arnés y la documentación, con auditoría bajo demanda y propiedad por ruta.
* [ADR-019: magia, maná y hechizos](ADR-019-magia-mana-hechizos.md) - Nivel 0–4, maná nivel × 4, fórmula mágica con las capas del combate físico y catálogo mínimo de seis hechizos.
* [ADR-020: economía de acciones](ADR-020-economia-acciones.md) - 2 acciones por defecto (Pícaro 3), enemigos 2/1/2, tope 4 provisional, fin de turno manual y AI encadenada.
* [ADR-021: inventario, huecos de equipo y panel único](ADR-021-inventario-equipo.md) - Ocho huecos de equipo y ocho de mochila, localización única por instancia, catálogo como fuente, operaciones atómicas y un solo panel abierto con `I`.
