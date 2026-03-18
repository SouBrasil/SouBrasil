import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

const DAYS = [
  { key: 'seg', label: 'Seg' },
  { key: 'ter', label: 'Ter' },
  { key: 'qua', label: 'Qua' },
  { key: 'qui', label: 'Qui' },
  { key: 'sex', label: 'Sex' },
  { key: 'sab', label: 'Sáb' },
  { key: 'dom', label: 'Dom' },
];

const TIMES = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 30) {
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    TIMES.push(`${hh}:${mm}`);
  }
}
TIMES.push('23:59');

const DEFAULT_SCHEDULE = {
  seg: { open: true, start: '08:00', end: '18:00' },
  ter: { open: true, start: '08:00', end: '18:00' },
  qua: { open: true, start: '08:00', end: '18:00' },
  qui: { open: true, start: '08:00', end: '18:00' },
  sex: { open: true, start: '08:00', end: '18:00' },
  sab: { open: false, start: '08:00', end: '13:00' },
  dom: { open: false, start: '08:00', end: '13:00' },
};

function parseScheduleString(str) {
  if (!str) return DEFAULT_SCHEDULE;
  // Try to parse a previously formatted string back into schedule object
  // If it's already an object string representation, return default
  return DEFAULT_SCHEDULE;
}

function formatSchedule(schedule) {
  const openDays = DAYS.filter(d => schedule[d.key]?.open);
  if (openDays.length === 0) return 'Fechado';

  // Group consecutive days with same hours
  const groups = [];
  let i = 0;
  while (i < openDays.length) {
    const current = openDays[i];
    const currData = schedule[current.key];
    let j = i + 1;
    // Try to extend group
    while (j < openDays.length) {
      const next = openDays[j];
      const nextData = schedule[next.key];
      // Check if consecutive in DAYS array
      const currIdx = DAYS.findIndex(d => d.key === current.key);
      const expectedNext = DAYS[currIdx + (j - i)];
      if (
        expectedNext?.key === next.key &&
        nextData.start === currData.start &&
        nextData.end === currData.end
      ) {
        j++;
      } else break;
    }
    const lastDay = openDays[j - 1];
    if (lastDay.key === current.key) {
      groups.push(`${current.label} ${currData.start}-${currData.end}`);
    } else {
      groups.push(`${current.label}-${lastDay.label} ${currData.start}-${currData.end}`);
    }
    i = j;
  }
  return groups.join(' | ');
}

export default function OpeningHoursPicker({ value, onChange }) {
  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE);

  // Sync formatted string back to parent
  useEffect(() => {
    onChange(formatSchedule(schedule));
  }, [schedule]);

  const toggle = (key) => {
    setSchedule(s => ({ ...s, [key]: { ...s[key], open: !s[key].open } }));
  };

  const setTime = (key, field, val) => {
    setSchedule(s => ({ ...s, [key]: { ...s[key], [field]: val } }));
  };

  const copyToAll = (key) => {
    const src = schedule[key];
    setSchedule(s => {
      const next = { ...s };
      DAYS.forEach(d => {
        if (next[d.key].open) next[d.key] = { ...next[d.key], start: src.start, end: src.end };
      });
      return next;
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        <Clock className="w-3.5 h-3.5" />
        <span>Clique no dia para ativar/desativar • Ajuste os horários abaixo</span>
      </div>

      {/* Day toggle chips */}
      <div className="flex gap-1.5 flex-wrap">
        {DAYS.map(d => (
          <button
            key={d.key}
            type="button"
            onClick={() => toggle(d.key)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
              schedule[d.key].open
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted text-muted-foreground border-transparent'
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Time rows for open days */}
      <div className="space-y-2 mt-1">
        {DAYS.filter(d => schedule[d.key].open).map(d => (
          <div key={d.key} className="flex items-center gap-2 bg-muted/40 rounded-xl px-3 py-2">
            <span className="text-xs font-bold w-7 text-foreground">{d.label}</span>
            <select
              value={schedule[d.key].start}
              onChange={e => setTime(d.key, 'start', e.target.value)}
              className="flex-1 text-xs rounded-lg border border-input bg-background px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <span className="text-xs text-muted-foreground">até</span>
            <select
              value={schedule[d.key].end}
              onChange={e => setTime(d.key, 'end', e.target.value)}
              className="flex-1 text-xs rounded-lg border border-input bg-background px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {TIMES.filter(t => t > schedule[d.key].start).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button
              type="button"
              onClick={() => copyToAll(d.key)}
              title="Copiar para todos os dias ativos"
              className="text-[10px] text-primary font-semibold hover:underline whitespace-nowrap"
            >
              Copiar
            </button>
          </div>
        ))}
      </div>

      {/* Preview */}
      {value && (
        <p className="text-[11px] text-muted-foreground bg-primary/5 rounded-lg px-3 py-1.5 mt-1">
          🕐 {value}
        </p>
      )}
    </div>
  );
}