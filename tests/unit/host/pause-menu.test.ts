import { describe, expect, it } from 'vitest';
import {
  PAUSE_ACTIONS,
  activatePauseAction,
  closePause,
  createPauseState,
  escapePause,
  movePauseSelection,
  openPause,
  saveAvailability,
  type PauseContext,
} from '../../../src/host/pause-menu';

const READY: PauseContext = {
  phase: 'player',
  status: 'playing',
  animating: false,
  panning: false,
};

function opened(context: PauseContext = READY) {
  return openPause(createPauseState(), context);
}

describe('modelo del menú de pausa', () => {
  it('fija el orden de las cinco acciones', () => {
    expect(PAUSE_ACTIONS).toEqual([
      'resume',
      'new-game',
      'load-game',
      'save-game',
      'controls',
    ]);
  });

  it('nace cerrado y abrir lo deja en la raíz con Reanudar seleccionado', () => {
    const closed = createPauseState();
    expect(closed).toEqual({
      open: false,
      screen: 'root',
      index: 0,
      save: { enabled: false, reason: null },
    });

    const state = opened();
    expect(state.open).toBe(true);
    expect(state.screen).toBe('root');
    expect(state.index).toBe(0);
    expect(state.save).toEqual({ enabled: true, reason: null });
  });

  it('guardar solo está disponible en partida en juego, fase de personajes, sin animación ni paneo', () => {
    expect(saveAvailability(READY)).toEqual({ enabled: true, reason: null });

    const cases: ReadonlyArray<{
      readonly context: PauseContext;
      readonly reason: string;
    }> = [
      {
        context: { ...READY, phase: 'enemy' },
        reason: 'Solo se puede guardar en la fase de personajes.',
      },
      {
        context: { ...READY, animating: true },
        reason: 'Espera a que termine la animación para guardar.',
      },
      {
        context: { ...READY, panning: true },
        reason: 'Espera a que termine el paneo para guardar.',
      },
      {
        context: { ...READY, status: 'victory' },
        reason: 'No se puede guardar una partida terminada.',
      },
      {
        context: { ...READY, status: 'defeat' },
        reason: 'No se puede guardar una partida terminada.',
      },
    ];

    const reasons = new Set<string>();
    for (const entry of cases) {
      const availability = saveAvailability(entry.context);
      expect(availability.enabled).toBe(false);
      expect(availability.reason).toBe(entry.reason);
      reasons.add(entry.reason);
    }
    // Motivo distinto por causa: fase, animación, paneo y partida terminada.
    expect(reasons.size).toBe(4);
  });

  it('recalcula la disponibilidad al abrir y no la cambia durante la pausa', () => {
    const stale = opened({ ...READY, phase: 'enemy' });
    expect(stale.save.enabled).toBe(false);

    const stillStale = movePauseSelection(stale, 1);
    expect(stillStale.save).toEqual(stale.save);

    const fresh = openPause(closePause(stale), READY);
    expect(fresh.save).toEqual({ enabled: true, reason: null });
  });

  it('mueve la selección sin salir de los límites de la raíz', () => {
    const start = opened();
    expect(movePauseSelection(start, -1).index).toBe(0);
    expect(movePauseSelection(start, 1).index).toBe(1);
    expect(movePauseSelection(start, 99).index).toBe(PAUSE_ACTIONS.length - 1);
    expect(movePauseSelection(start, -99).index).toBe(0);

    const controls = activatePauseAction(start, 'controls').state;
    expect(movePauseSelection(controls, 1)).toBe(controls);
  });

  it('activa reanudar, nueva, cargar, guardar y controles', () => {
    const start = opened();

    expect(activatePauseAction(start, 'resume')).toMatchObject({
      effect: 'close',
      state: { open: false },
    });

    const newGame = activatePauseAction(start, 'new-game');
    expect(newGame).toMatchObject({
      effect: 'none',
      state: { open: true, screen: 'confirm-new', index: 1 },
    });

    const loadGame = activatePauseAction(start, 'load-game');
    expect(loadGame).toMatchObject({
      effect: 'none',
      state: { open: true, screen: 'confirm-load', index: 2 },
    });

    expect(activatePauseAction(start, 'save-game')).toMatchObject({
      effect: 'save',
      state: { open: true, screen: 'root' },
    });

    const controls = activatePauseAction(start, 'controls');
    expect(controls).toMatchObject({
      effect: 'none',
      state: { open: true, screen: 'controls' },
    });
    expect(activatePauseAction(controls.state, 'resume')).toEqual({
      state: controls.state,
      effect: 'none',
    });
  });

  it('guardar desactivado no produce efecto ni cambia el estado', () => {
    const disabled = opened({ ...READY, animating: true });
    const result = activatePauseAction(disabled, 'save-game');
    expect(result.effect).toBe('none');
    expect(result.state).toBe(disabled);
  });

  it('sin acción explícita activa la selección actual', () => {
    const state = movePauseSelection(movePauseSelection(opened(), 1), 1);
    expect(activatePauseAction(state)).toMatchObject({
      state: { screen: 'confirm-load', index: 2 },
    });
  });

  it('confirmar nueva cierra y confirmar cargar vuelve a la raíz', () => {
    const start = opened();
    const confirmNew = activatePauseAction(start, 'new-game').state;
    const newResult = activatePauseAction(confirmNew);
    expect(newResult.effect).toBe('confirm-new');
    expect(newResult.state.open).toBe(false);

    const confirmLoad = activatePauseAction(start, 'load-game').state;
    const loadResult = activatePauseAction(confirmLoad);
    expect(loadResult.effect).toBe('confirm-load');
    expect(loadResult.state).toMatchObject({
      open: true,
      screen: 'root',
      index: 2,
    });
  });

  it('Esc cierra en la raíz y vuelve a la raíz desde un submenú conservando la acción', () => {
    const start = movePauseSelection(opened(), 4);
    const closed = escapePause(start);
    expect(closed.open).toBe(false);

    for (const screen of ['controls', 'confirm-new', 'confirm-load'] as const) {
      const submenu = { ...start, screen };
      expect(escapePause(submenu)).toMatchObject({
        open: true,
        screen: 'root',
        index: 4,
      });
    }
  });

  it('es puro: no muta la instantánea recibida', () => {
    const state = opened();
    const before = JSON.stringify(state);

    movePauseSelection(state, 1);
    activatePauseAction(state, 'new-game');
    activatePauseAction(state, 'save-game');
    escapePause(state);
    closePause(state);

    expect(JSON.stringify(state)).toBe(before);
  });
});
