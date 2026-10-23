import { ReactNode, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Keeps every visited page mounted (just hidden) so its state survives navigation,
 * and so the music keeps playing while browsing other sections.
 */
export function KeepAlivePages({ pages, fallback }: { pages: Record<string, ReactNode>; fallback: ReactNode }) {
  const { pathname } = useLocation();
  const [visited, setVisited] = useState<string[]>([]);
  const known = pathname in pages;
  useEffect(() => {
    if (known) setVisited(previous => previous.includes(pathname) ? previous : [...previous, pathname]);
  }, [pathname, known]);
  const shown = known && !visited.includes(pathname) ? [...visited, pathname] : visited;
  return <>
    {shown.map(path => <div key={path} hidden={path !== pathname}>{pages[path]}</div>)}
    {!known && fallback}
  </>;
}
