'use client';

import { useEffect, useRef, memo, useMemo } from 'react';

interface DonutChartProps {
  value: number;
  color: string;
  label: string;
  sublabel?: string;
}

export function DonutChart({ value, color, label, sublabel }: DonutChartProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className="text-center relative flex-1">
      <svg viewBox="0 0 36 36" className="w-24 h-24 mx-auto">
        <path strokeWidth="4" stroke="rgba(255,255,255,0.05)" fill="none"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
        <path strokeDasharray={`${clamped}, 100`} strokeWidth="4" strokeLinecap="round"
          stroke={color} fill="none"
          className="transition-all duration-700 ease-out"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
      </svg>
      <div className="absolute inset-x-0 top-[30px] flex flex-col items-center">
        <span className="text-xl font-bold text-white transition-all duration-700">{clamped}%</span>
        <span className="text-[9px] text-slate-400 mt-0.5">{label}</span>
      </div>
      {sublabel && <div className="mt-1 text-[10px] text-slate-500 truncate px-2">{sublabel}</div>}
    </div>
  );
}

interface NetworkSparklineProps {
  upload: string;
  download: string;
  history?: { upload: number; download: number }[];
}

export const NetworkSparkline = memo(function NetworkSparkline({ upload, download, history = [] }: NetworkSparklineProps) {
  const maxPoints = 20;
  const points = history.slice(-maxPoints);

  // Smoothing the max value to prevent scale jitter
  const targetMax = useMemo(() => {
    const allData = [...points.map(p => p.upload), ...points.map(p => p.download)];
    return Math.max(...allData, 1000);
  }, [points]);

  const maxValRef = useRef(1000);
  useEffect(() => {
    maxValRef.current = maxValRef.current * 0.5 + targetMax * 0.5;
  }, [targetMax]);

  const maxVal = Math.max(maxValRef.current, targetMax, 1000);

  const formatY = (val: number) => {
    if (val >= 1024 * 1024) return `${(val / (1024 * 1024)).toFixed(1)}M`;
    if (val >= 1024) return `${(val / 1024).toFixed(0)}K`;
    return `${val}`;
  };

  const generatePath = (data: number[], isFill = false) => {
    if (data.length < 2) return "";
    const width = 400;
    const height = 100;
    const step = width / (maxPoints - 1);

    // We only show the last N points, but aligned to the right
    const offset = (maxPoints - data.length) * step;

    const getY = (val: number) => height - (val / maxVal * height * 0.8) - 5;

    let path = `M ${offset} ${getY(data[0])}`;

    for (let i = 0; i < data.length - 1; i++) {
      const x1 = offset + i * step;
      const y1 = getY(data[i]);
      const x2 = offset + (i + 1) * step;
      const y2 = getY(data[i + 1]);

      const cx = (x1 + x2) / 2;
      path += ` C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
    }

    if (isFill) {
      path += ` L ${offset + (data.length - 1) * step} ${height} L ${offset} ${height} Z`;
    }
    return path;
  };

  const uploadData = useMemo(() => points.map(p => p.upload), [points]);
  const downloadData = useMemo(() => points.map(p => p.download), [points]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-white">
          <div className="w-2 h-2 rounded-full bg-blue-400" />↑ {upload}
        </div>
        <div className="flex items-center gap-1.5 text-xs font-bold text-white">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />↓ {download}
        </div>
      </div>
      <div className="mt-auto h-20 w-full relative flex">
        <div className="flex flex-col justify-between h-full pr-2 text-[8px] font-mono text-slate-500 w-8 select-none">
          <span>{formatY(maxVal)}</span>
          <span>{formatY(maxVal * 0.5)}</span>
          <span>0</span>
        </div>

        <div className="flex-1 relative overflow-hidden">
          <svg viewBox="0 0 400 100" className="w-full h-full" preserveAspectRatio="none">
            <line x1="0" y1="80" x2="400" y2="80" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            <line x1="0" y1="50" x2="400" y2="50" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            <line x1="0" y1="20" x2="400" y2="20" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

            <path d={generatePath(uploadData)}
              fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" />
            <path d={generatePath(uploadData, true)}
              fill="url(#blue-grad)" opacity="0.1" />

            <path d={generatePath(downloadData)}
              fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" />
            <path d={generatePath(downloadData, true)}
              fill="url(#green-grad)" opacity="0.1" />

            <defs>
              <linearGradient id="blue-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#60a5fa" stopOpacity="1" />
                <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="green-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" stopOpacity="1" />
                <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
    </div>
  );
});

export function MiniCalendar() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = now.toLocaleString('default', { month: 'long' });

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  return (
    <div>
      <div className="text-center mb-4">
        <h3 className="text-sm font-bold text-white tracking-wide">{monthName} {year}</h3>
      </div>
      <div className="grid grid-cols-7 text-center text-[10px] font-medium text-slate-500 mb-2">
        {['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].map(d => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 text-center text-xs gap-y-2 text-slate-300 font-medium">
        {days.map((d, i) => (
          <div key={i} className={d === today ? 'bg-[#f38020] text-white rounded-full w-6 h-6 flex items-center justify-center mx-auto shadow-[0_0_12px_rgba(243,128,32,0.5)]' : d ? 'flex items-center justify-center w-6 h-6' : 'text-slate-600'}>
            {d ?? ''}
          </div>
        ))}
      </div>
    </div>
  );
}

export function StorageBar({ label, used, total, color, icon }: { label: string; used: string; total: string; color: string; icon: React.ReactNode | string }) {
  const pct = (parseFloat(used) / parseFloat(total)) * 100;
  return (
    <div>
      <div className="flex justify-between items-end mb-1">
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color }}>{icon}</span>
          <span className="text-xs font-bold text-white">{label}</span>
        </div>
        <span className="text-[9px] font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded border border-emerald-400/20">OK</span>
      </div>
      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mb-1">
        <div className="h-full rounded-full" style={{ width: `${pct.toFixed(1)}%`, background: color }} />
      </div>
      <div className="flex justify-between text-[9px] text-slate-500 font-medium">
        <span>{used} GB used</span>
        <span>{pct.toFixed(1)}% · {total} GB total</span>
      </div>
    </div>
  );
}
