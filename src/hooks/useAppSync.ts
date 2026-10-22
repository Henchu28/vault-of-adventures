import { useAppSync } from '@/hooks/useAppSync';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

// One shared broadcast channel; database triggers send { table } on every change.
type Listener = (table: string) => void;
const listeners = new Set<Listener>();
let channel: ReturnType<typeof supabase.channel> | null = null;

function ensureChannel() {
  if (channel) return;
  channel = supabase
    .channel('app-sync')
    .on('broadcast', { event: 'changed' }, ({ payload }) => {
      const table = (payload as { table?: string })?.table;
      if (table) listeners.forEach(listener => listener(table));
    })
    .subscribe();
}

/** Calls onChange (debounced) whenever another session changes one of the given tables. */
export function useAppSync(tables: string[], onChange: () => void, delay = 300) {
  const callback = useRef(onChange);
  callback.current = onChange;
  const key = tables.join(',');
  useEffect(() => {
    ensureChannel();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const watched = new Set(key.split(','));
    const listener: Listener = table => {
      if (!watched.has(table)) return;
      clearTimeout(timer);
      timer = setTimeout(() => callback.current(), delay);
    };
    listeners.add(listener);
    return () => { clearTimeout(timer); listeners.delete(listener); };
  }, [key, delay]);
}

/** For changes without a database trigger (e.g. file storage): tell other sessions directly. */
export function notifyAppSync(table: string) {
  ensureChannel();
  void channel?.send({ type: 'broadcast', event: 'changed', payload: { table } });
}
