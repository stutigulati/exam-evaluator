import { cn } from '../../lib/utils';

export function Badge({ children, variant = 'default', className }) {
  const v = {
    default: 'bg-white/5 text-text-secondary border-white/8',
    indigo:  'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    green:   'bg-green-500/15 text-green-400 border-green-500/25',
    amber:   'bg-amber-500/15 text-amber-400 border-amber-500/25',
    red:     'bg-red-500/15 text-red-400 border-red-500/25',
    purple:  'bg-teal-500/15 text-teal-300 border-teal-500/25',
  };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border', v[variant], className)}>
      {children}
    </span>
  );
}

export function Button({ children, variant = 'primary', size = 'md', className, ...props }) {
  const v = {
    primary: 'bg-emerald-500 hover:bg-emerald-600 text-black shadow-glow-sm font-semibold',
    secondary: 'bg-white/8 hover:bg-white/12 text-text-primary border border-white/10',
    ghost: 'text-text-secondary hover:text-text-primary hover:bg-white/5',
    outline: 'border border-white/10 text-text-secondary hover:border-white/20 hover:text-text-primary',
  };
  const s = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-2.5 text-sm gap-2',
    xl: 'px-8 py-3 text-sm gap-2',
  };
  return (
    <button className={cn(
      'inline-flex items-center rounded-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed',
      v[variant], s[size], className
    )} {...props}>
      {children}
    </button>
  );
}

export function Card({ children, className, glow = false, ...props }) {
  return (
    <div className={cn(
      'bg-bg-1 border border-white/7 rounded-xl',
      'shadow-card',
      glow && 'shadow-glow',
      className
    )} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className }) {
  return (
    <div className={cn('px-5 py-4 border-b border-white/6', className)}>
      {children}
    </div>
  );
}

export function CardContent({ children, className }) {
  return <div className={cn('px-5 py-4', className)}>{children}</div>;
}

export function Separator({ className }) {
  return <div className={cn('h-px bg-white/6', className)} />;
}

export function ProgressBar({ value, max, className }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const color = pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className={cn('w-full bg-white/8 rounded-full h-1', className)}>
      <div className={cn(color, 'h-1 rounded-full transition-all duration-700')} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function TagList({ items, variant = 'default', emptyText = 'None' }) {
  if (!items?.length) return <span className="text-xs text-text-tertiary italic">{emptyText}</span>;
  return (
    <div className="flex flex-col gap-1.5">
      {items.map((item, i) => (
        <Badge key={i} variant={variant} className="w-fit text-xs py-1 px-2.5">{item}</Badge>
      ))}
    </div>
  );
}

export function Input({ className, label, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="text-xs font-medium text-text-secondary">{label}</label>}
      <input className={cn(
        'w-full bg-bg-2 border border-white/8 rounded-lg px-3 py-2 text-sm',
        'text-text-primary placeholder-text-tertiary',
        'focus:outline-none focus:border-emerald-500/50 focus:bg-bg-3',
        'transition-all duration-150',
        className
      )} {...props} />
    </div>
  );
}

export function Select({ children, className, label, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="text-xs font-medium text-text-secondary">{label}</label>}
      <select className={cn(
        'w-full bg-bg-2 border border-white/8 rounded-lg px-3 py-2 text-sm',
        'text-text-primary focus:outline-none focus:border-emerald-500/50',
        'transition-all duration-150 cursor-pointer',
        className
      )} {...props}>
        {children}
      </select>
    </div>
  );
}

export function StatCard({ label, value, sub, icon: Icon, color = 'text-text-primary' }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs text-text-tertiary uppercase tracking-wider font-medium">{label}</span>
        {Icon && <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center">
          <Icon size={13} className="text-text-tertiary" />
        </div>}
      </div>
      <div className={cn('text-2xl font-semibold tracking-tight', color)}>{value}</div>
      {sub && <div className="text-xs text-text-tertiary mt-1">{sub}</div>}
    </Card>
  );
}
