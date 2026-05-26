import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, Zap, LayoutDashboard, BarChart2, FlaskConical, UserPlus,
  ChevronLeft, ChevronRight, Activity, ClipboardCheck, FileCheck,
  FileUp, LogIn, LogOut, Settings, ShieldCheck, Users,
  Crown, Building2, PieChart, Layers
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../lib/auth';

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: Home },
];

// ── GoG (Global Owner) nav items ──
const GOG_NAV = [
  { href: '/gog/dashboard',          label: 'GoG Dashboard',      icon: Crown        },
  { href: '/gog/add-institute',      label: 'Add Institute',      icon: Building2    },
  { href: '/gog/add-super-admin',    label: 'Add Super Admin',    icon: UserPlus     },
  { href: '/gog/manage-super-admin', label: 'Manage Super Admins',icon: Users        },
  { href: '/gog/token-analysis',     label: 'Token Analysis',     icon: PieChart     },
  { href: '/gog/benchmark',          label: 'Benchmark',          icon: FlaskConical },
];

// ── Evaluator nav items (shared across all elevated roles) ──
// NOTE: '/evaluator/dashboard' → Faculty workspace (RoleWorkspace)
//       '/dashboard'           → Generic evaluator Dashboard page (DashboardPage)
//       These are two DIFFERENT pages — do NOT merge.
const EVALUATOR_NAV = [
  { href: '/evaluator/dashboard', label: 'Faculty Dashboard', icon: LayoutDashboard },
  { href: '/dashboard',           label: 'Evaluation Dashboard',         icon: LayoutDashboard },
  { href: '/evaluator/exams',     label: 'Assigned Exams',    icon: ClipboardCheck  },
  { href: '/evaluator/evaluate',  label: 'Run Evaluation',    icon: Zap             },
  { href: '/evaluator/question',  label: 'Question Paper',    icon: FileUp          },
  { href: '/evaluator/ideal',     label: 'Ideal Answer',      icon: FileCheck       },
  { href: '/evaluator/downloads',   label: 'Reports',           icon: FileCheck       },
  { href: '/bulk-evaluation',       label: 'Bulk Evaluation',   icon: Layers          },
  { href: '/performance',           label: 'Performance',       icon: BarChart2       },
];

// ── Admin nav items (shared by admin + super_admin) ──
const ADMIN_NAV = [
  { href: '/admin/dashboard',        label: 'Admin Dashboard', icon: LayoutDashboard },
  { href: '/admin/evaluators',       label: 'Evaluators',      icon: Users           },
  { href: '/admin/add-evaluator',    label: 'Add Evaluator',   icon: UserPlus        },
  { href: '/admin/exams',            label: 'Managed Exams',   icon: ClipboardCheck  },
  { href: '/admin/assign-evaluator', label: 'Assign Faculty',  icon: Settings        },
  { href: '/admin/schedule',         label: 'Upload Schedule', icon: FileUp          },
  { href: '/admin/papers',           label: 'Paper Approval',  icon: FileCheck       },
  { href: '/admin/criteria',         label: 'Criteria Approval', icon: Settings      },
  { href: '/admin/progress',         label: 'Progress',        icon: Activity        },
];

// ── Super-admin exclusive nav items ──
const SUPER_ADMIN_NAV = [
  { href: '/super-admin/dashboard', label: 'SA Dashboard',   icon: ShieldCheck    },
  { href: '/super-admin/admins',    label: 'Manage Admins',  icon: Users          },
  { href: '/super-admin/add-admin', label: 'Add Admin',      icon: UserPlus       },
  { href: '/super-admin/schedules', label: 'Schedules',      icon: ClipboardCheck },
  { href: '/super-admin/approvals', label: 'Approvals',      icon: FileCheck      },
  { href: '/super-admin/assign',    label: 'Assign Admin',   icon: Settings       },
  { href: '/super-admin/reports',   label: 'Activity Logs',  icon: Activity       },
];

// ── Section separator (no href → renders as a divider label) ──
const sep = (label) => ({ _section: label });

const ROLE_NAV = {
  // GoG: own nav + all Super Admin + all Admin + all Evaluator
  gog: [
    sep('GoG'),
    ...GOG_NAV,
    sep('Super Admin'),
    ...SUPER_ADMIN_NAV,
    sep('Admin'),
    ...ADMIN_NAV,
    sep('Evaluator'),
    ...EVALUATOR_NAV,
  ],
  // Super Admin: SA actions + all Admin actions + all Evaluator actions
  super_admin: [
    sep('Super Admin'),
    ...SUPER_ADMIN_NAV,
    sep('Admin'),
    ...ADMIN_NAV,
    sep('Evaluator'),
    ...EVALUATOR_NAV,
  ],
  // Admin: Admin actions + all Evaluator actions
  admin: [
    sep('Admin'),
    ...ADMIN_NAV,
    sep('Evaluator'),
    ...EVALUATOR_NAV,
  ],
  // Evaluator: own actions only
  evaluator: EVALUATOR_NAV,
};

export default function Sidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const navItems = user ? ROLE_NAV[user.role] || [] : NAV_ITEMS;
  const sidebarWidth = collapsed ? 64 : 220;

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', `${sidebarWidth}px`);
  }, [sidebarWidth]);

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarWidth }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="fixed top-0 left-0 h-screen z-50 flex flex-col overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #080a08 0%, #050705 100%)',
        borderRight: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '4px 0 24px rgba(0,0,0,0.4)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-3 py-5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', minHeight: 72 }}>
        <Link to="/" className="flex items-center gap-3 flex-shrink-0">
        <div className="w-14 h-14 flex-shrink-0 overflow-hidden relative">
  <img src="/logo.png" alt="GradeAI" className="w-full h-full object-contain" />
</div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.18 }}>
                <p className="text-sm font-bold text-white tracking-tight leading-none">GradeAI</p>
                <p className="text-xs mt-0.5" style={{ color: '#7f867c' }}>Exam Evaluator</p>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {navItems.map((item, idx) => {
          // ── Section separator ──
          if (item._section) {
            return (
              <AnimatePresence key={`sep-${item._section}`}>
                {!collapsed ? (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-2 px-2 pt-4 pb-1"
                    key={`sep-visible-${item._section}`}>
                    <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
                    <span className="text-[10px] font-bold uppercase tracking-widest flex-shrink-0"
                      style={{ color: '#4f564f' }}>
                      {item._section}
                    </span>
                    <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
                  </motion.div>
                ) : (
                  <div key={`sep-collapsed-${item._section}`}
                    className="mx-auto my-2 w-6 h-px"
                    style={{ background: 'rgba(255,255,255,0.10)' }} />
                )}
              </AnimatePresence>
            );
          }

          // ── Nav link ──
          const { href, label, icon: Icon } = item;
          // Routes that must use EXACT match (not startsWith) to avoid clashes
          // between e.g. '/dashboard' (evaluator generic) and '/gog/dashboard' (GoG).
          const EXACT_MATCH_ROUTES = ['/', '/dashboard', '/performance', '/bulk-evaluation'];
          const active = EXACT_MATCH_ROUTES.includes(href)
            ? pathname === href
            : pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              to={href}
              title={collapsed ? label : undefined}
              className={cn(
                'flex items-center gap-3 rounded-xl transition-all duration-150 group relative',
                collapsed ? 'px-0 justify-center h-10 w-10 mx-auto' : 'px-3 py-2.5',
                active ? 'text-white' : 'text-white/45 hover:text-white/80'
              )}
              style={active
                ? { background: 'rgba(0,200,150,0.10)', border: '1px solid rgba(0,200,150,0.28)', boxShadow: '0 0 12px rgba(0,200,150,0.10)' }
                : { border: '1px solid transparent' }}
            >
              <Icon size={16} className="flex-shrink-0" style={{ color: active ? '#00d99b' : 'inherit' }} />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }}
                    transition={{ duration: 0.15 }}
                    className="text-xs font-medium whitespace-nowrap"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                  style={{ background: 'linear-gradient(180deg, #00d99b, #3ee67f)' }} />
              )}
            </Link>
          );
        })}

        {!user && (
          <Link to="/login"
            className={cn('flex items-center gap-3 rounded-xl transition-all duration-150 group relative', collapsed ? 'px-0 justify-center h-10 w-10 mx-auto' : 'px-3 py-2.5', pathname === '/login' ? 'text-white' : 'text-white/45 hover:text-white/80')}
            style={pathname === '/login' ? { background: 'rgba(0,200,150,0.10)', border: '1px solid rgba(0,200,150,0.28)' } : { border: '1px solid transparent' }}>
            <LogIn size={16} style={{ color: pathname === '/login' ? '#00d99b' : 'inherit' }} />
            {!collapsed && <span className="text-xs font-medium whitespace-nowrap">Login</span>}
          </Link>
        )}
      </nav>

      {/* Bottom */}
      <div className="px-2 pb-4 space-y-2">
        <AnimatePresence>
          {!collapsed && user && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="mx-1 px-3 py-2 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xs font-semibold text-white truncate">{user.name}</p>
              <p className="text-xs truncate" style={{ color: '#00d99b' }}>{user.role?.replace(/_/g, ' ')}</p>
            </motion.div>
          )}
        </AnimatePresence>
        {user && (
          <button onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 h-9 rounded-xl transition-all duration-150 text-white/45 hover:text-white/80"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <LogOut size={14} />
            {!collapsed && <span className="text-xs">Logout</span>}
          </button>
        )}
        <button onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center h-9 rounded-xl transition-all duration-150 text-white/40 hover:text-white/70"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>
    </motion.aside>
  );
}

export function Shell({ children, className }) {
  return (
    <div className={cn('min-h-screen transition-all duration-300', className)}
      style={{ background: '#050705', marginLeft: 'var(--sidebar-width, 220px)' }}
      id="page-shell">
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