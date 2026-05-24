import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, Zap, Menu, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_ITEMS = [
  { href: '/',            label: 'Home' },
  { href: '/evaluate',    label: 'Evaluate' },
  { href: '/dashboard',   label: 'Dashboard' },
  { href: '/performance', label: 'Performance' },
  { href: '/benchmark',   label: 'Benchmark' },
];

export default function Navbar() {
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50">
        {/* Gradient bar */}
        <div className="h-14"
          style={{
            background: 'linear-gradient(135deg, #0b120b 0%, #152414 100%)',
            borderBottom: '1px solid rgba(0,200,150,0.16)',
          }}
        >
          <div className="max-w-7xl mx-auto h-full flex items-center justify-between px-6">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #00c896, #3ee67f)' }}>
                <Activity size={13} className="text-white" />
              </div>
              <span className="text-sm font-semibold text-white tracking-tight">GradeAI</span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-0.5">
              {NAV_ITEMS.map(({ href, label }) => {
                const active = pathname === href || (href !== '/' && pathname.startsWith(href));
                return (
                  <Link key={href} to={href} className={cn(
                    'px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
                    active
                      ? 'text-white bg-white/12'
                      : 'text-white/55 hover:text-white/85 hover:bg-white/6'
                  )}>
                    {label}
                  </Link>
                );
              })}
            </nav>

            {/* Right */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-white/40 bg-white/5 border border-white/8 rounded-full px-3 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span>API live</span>
              </div>
              <Link to="/evaluate"
                className="hidden sm:flex items-center gap-1.5 text-white text-xs font-medium px-3.5 py-1.5 rounded-lg transition-all duration-150"
                style={{ background: 'linear-gradient(135deg, #00c896, #3ee67f)', color: '#04110b' }}>
                <Zap size={11} />
                Evaluate
              </Link>
              <button onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden w-8 h-8 rounded-lg bg-white/8 flex items-center justify-center text-white/60">
                {mobileOpen ? <X size={15} /> : <Menu size={15} />}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="md:hidden px-6 py-4 space-y-1"
              style={{ background: '#080a08', borderBottom: '1px solid rgba(0,200,150,0.15)' }}
            >
              {NAV_ITEMS.map(({ href, label }) => {
                const active = pathname === href || (href !== '/' && pathname.startsWith(href));
                return (
                  <Link key={href} to={href} onClick={() => setMobileOpen(false)}
                    className={cn('block px-3 py-2 rounded-lg text-sm transition-colors',
                      active ? 'text-white bg-white/10' : 'text-white/55 hover:text-white')}>
                    {label}
                  </Link>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}

// Page shell
export function Shell({ children, className }) {
  return (
    <div className={cn('min-h-screen pt-14', className)} style={{ background: '#050705' }}>
      {children}
    </div>
  );
}

export function Container({ children, className }) {
  return <div className={cn('max-w-7xl mx-auto px-6', className)}>{children}</div>;
}

export function PageHeader({ title, description, action }) {
  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }} className="py-7">
      <Container className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">{title}</h1>
          {description && <p className="text-sm mt-1 max-w-lg" style={{ color: '#a2a59f' }}>{description}</p>}
        </div>
        {action}
      </Container>
    </div>
  );
}
