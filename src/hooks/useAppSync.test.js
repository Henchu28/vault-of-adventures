import { afterAll, describe, expect, mock, test } from 'bun:test';

const cleanups = [];
let receive;
const channel = {
  on: mock((_kind, _filter, callback) => { receive = callback; return channel; }),
  subscribe: mock(() => channel),
};
const refresh = mock(() => {});
mock.module('react', () => ({
  useRef: value => ({ current: value }),
  useEffect: effect => { cleanups.push(effect()); },
}));
mock.module('@/integrations/supabase/client', () => ({
  supabase: { channel: () => channel, removeChannel: mock(async () => {}) },
}));
const { useAppSync } = await import('./useAppSync');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

afterAll(() => {
  cleanups.forEach(cleanup => cleanup?.());
  mock.restore();
});

describe('Change-driven shared updates', () => {
  test('idle pages never refresh, but a watched change refreshes automatically', async () => {
    useAppSync(['saved_combats'], refresh, 10);
    await pause(3200);
    expect(refresh).toHaveBeenCalledTimes(0);
    receive({ payload: { table: 'songs' } });
    await pause(30);
    expect(refresh).toHaveBeenCalledTimes(0);
    receive({ payload: { table: 'saved_combats' } });
    receive({ payload: { table: 'saved_combats' } });
    await pause(30);
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});