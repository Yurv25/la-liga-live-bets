import { useEffect, useMemo, useRef } from 'react';

interface DateStripProps {
  selected: Date;
  onSelect: (d: Date) => void;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function sameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

export default function DateStrip({ selected, onSelect }: DateStripProps) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const days = useMemo(() => {
    const arr: Date[] = [];
    for (let i = -5; i <= 5; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [today]);

  const todayRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    todayRef.current?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, []);

  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-3 border-b border-border/30 bg-header/30 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x">
      {days.map((d) => {
        const isSelected = sameDay(d, selected);
        const isToday = sameDay(d, today);
        const weekday = d.toLocaleDateString([], { weekday: 'short' });
        const day = d.getDate();
        return (
          <button
            key={d.toISOString()}
            ref={isToday ? todayRef : undefined}
            onClick={() => onSelect(d)}
            className={`shrink-0 snap-center flex flex-col items-center justify-center min-w-[56px] px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              isSelected
                ? 'bg-primary text-primary-foreground shadow-lg glow-primary'
                : 'bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            <span className="uppercase tracking-wide text-[10px] opacity-80">{weekday}</span>
            <span className="text-base font-bold tabular-nums">{day}</span>
            {isToday && !isSelected && (
              <span className="mt-0.5 h-1 w-1 rounded-full bg-primary" />
            )}
          </button>
        );
      })}
    </div>
  );
}
