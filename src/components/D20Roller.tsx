import { useState, useCallback } from 'react';

interface Particle {
  id: number;
  x: number;
  emoji: string;
  delay: number;
  duration: number;
  size: number;
}

interface D20RollerProps {
  size?: 'sm' | 'lg';
}

export function D20Roller({ size = 'sm' }: D20RollerProps) {
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);

  const spawnParticles = useCallback((type: 'coins' | 'rocks') => {
    const emojis = type === 'coins' ? ['🎉', '⭐', '✨', '🏆', '💎'] : ['🗡️', '💀', '🔥', '☠️'];
    const newParticles: Particle[] = Array.from({ length: 30 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 100,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      delay: Math.random() * 1.5,
      duration: 2 + Math.random() * 2,
      size: type === 'coins' ? 20 + Math.random() * 16 : 16 + Math.random() * 20,
    }));
    setParticles(newParticles);
    setTimeout(() => setParticles([]), 5000);
  }, []);

  const roll = useCallback(() => {
    if (rolling) return;
    setRolling(true);
    setShowResult(false);
    setParticles([]);

    setTimeout(() => {
      const value = Math.floor(Math.random() * 20) + 1;
      setResult(value);
      setRolling(false);
      setShowResult(true);

      if (value === 20) spawnParticles('coins');
      if (value === 1) spawnParticles('rocks');

      setTimeout(() => setShowResult(false), 5000);
    }, 1200);
  }, [rolling, spawnParticles]);

  const dimensions = size === 'lg' ? 'w-14 h-14' : 'w-8 h-8';
  const svgSize = size === 'lg' ? 'w-14 h-14' : 'w-8 h-8';
  const fontSize = size === 'lg'
    ? (showResult && result ? (result >= 10 ? '32' : '38') : '30')
    : (showResult && result ? (result >= 10 ? '24' : '28') : '22');

  return (
    <>
      {particles.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
          {particles.map((p) => (
            <span
              key={p.id}
              className="absolute animate-falling-particle"
              style={{
                left: `${p.x}%`,
                top: '-40px',
                fontSize: `${p.size}px`,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
              }}
            >
              {p.emoji}
            </span>
          ))}
        </div>
      )}

      <button
        onClick={roll}
        className={`relative ${dimensions} flex items-center justify-center cursor-pointer group`}
        title="Roll a D20!"
      >
        <svg
          viewBox="0 0 100 100"
          className={`${svgSize} transition-transform ${rolling ? 'animate-dice-spin' : 'group-hover:scale-110'}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <polygon
            points="50,5 95,35 80,90 20,90 5,35"
            className="fill-primary-foreground/20 stroke-primary-foreground"
            strokeWidth="2"
          />
          <line x1="50" y1="5" x2="50" y2="55" className="stroke-primary-foreground/60" strokeWidth="1.5" />
          <line x1="5" y1="35" x2="50" y2="55" className="stroke-primary-foreground/60" strokeWidth="1.5" />
          <line x1="95" y1="35" x2="50" y2="55" className="stroke-primary-foreground/60" strokeWidth="1.5" />
          <line x1="20" y1="90" x2="50" y2="55" className="stroke-primary-foreground/60" strokeWidth="1.5" />
          <line x1="80" y1="90" x2="50" y2="55" className="stroke-primary-foreground/60" strokeWidth="1.5" />
          <text
            x="50"
            y="48"
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-primary-foreground font-bold"
            fontSize={fontSize}
          >
            {showResult && result ? result : '20'}
          </text>
        </svg>

        {showResult && result && (
          <span
            className={`absolute -bottom-8 left-1/2 -translate-x-1/2 text-sm font-bold px-2 py-0.5 rounded-full whitespace-nowrap animate-scale-in ${
              result === 20
                ? 'bg-yellow-500 text-yellow-950'
                : result === 1
                ? 'bg-red-500 text-red-50'
                : 'bg-primary-foreground/90 text-primary'
            }`}
          >
            {result === 20 ? '🎉 NAT 20!' : result === 1 ? '💀 NAT 1!' : result}
          </span>
        )}
      </button>
    </>
  );
}
