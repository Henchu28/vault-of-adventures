import { ReactNode, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Keeps every visited page mounted (just hidden) so its state survives navigation,
 * and so the music keeps playing while browsing other sections.
 */
export function KeepAlivePages({ pages, fallback, fresh = [] }: { pages: Record<string, ReactNode>; fallback: ReactNode; fresh?: string[] }) {
  const { pathname } = useLocation();
  const [visited, setVisited] = useState<string[]>([]);
  const known = pathname in pages;
  useEffect(() => {
    if (known) setVisited(previous => previous.includes(pathname) ? previous : [...previous, pathname]);
  }, [pathname, known]);
  const kept = visited.filter(path => !fresh.includes(path) || path === pathname);
  const shown = known && !kept.includes(pathname) ? [...kept, pathname] : kept;
  return <>
    {shown.map(path => <div key={path} hidden={path !== pathname}>{pages[path]}</div>)}
    {!known && fallback}
  </>;
}
