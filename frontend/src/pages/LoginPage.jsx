import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, LogIn, UserPlus, Crown, ChevronDown, Building2, LayoutDashboard, Zap } from 'lucide-react';
import { useAuth, roleHome } from '../lib/auth';
import { apiError } from '../lib/api';

const ROLES = [
  {
    value: 'gog',
    label: 'Global Owner (GoG)',
    desc:  'Full platform access — manages all institutes',
    icon:  Crown,
    accent: '#fbbf24',
    bg:     'rgba(251,191,36,0.1)',
    border: 'rgba(251,191,36,0.3)',
  },
  {
    value: 'super_admin',
    label: 'Super Admin',
    desc:  'Manages admins and institute-level operations',
    icon:  ShieldCheck,
    accent: '#00d99b',
    bg:     'rgba(0,200,150,0.1)',
    border: 'rgba(0,200,150,0.3)',
  },
  {
    value: 'admin',
    label: 'Admin',
    desc:  'Manages evaluators and examination schedules',
    icon:  Building2,
    accent: '#60a5fa',
    bg:     'rgba(96,165,250,0.1)',
    border: 'rgba(96,165,250,0.3)',
  },
  {
    value: 'evaluator',
    label: 'Evaluator / Faculty',
    desc:  'Runs AI evaluations and manages answer sheets',
    icon:  Zap,
    accent: '#a78bfa',
    bg:     'rgba(167,139,250,0.1)',
    border: 'rgba(167,139,250,0.3)',
  },
];

export default function LoginPage() {
  const { login, logout, bootstrap } = useAuth();
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState('evaluator');
  const [dropdownOpen, setDropdownOpen]  = useState(false);
  const [mode, setMode]  = useState('login'); // login | bootstrap-gog | bootstrap-super-admin
  const [form, setForm]  = useState({ name: '', email: '', password: '', department: '' });
  const [error, setError] = useState('');
  const [busy, setBusy]   = useState(false);

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const roleInfo = ROLES.find(r => r.value === selectedRole) || ROLES[3];
  const isBootstrap = mode !== 'login';
  const isGog = mode === 'bootstrap-gog';

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'bootstrap-gog') {
        await bootstrap({ ...form, role: 'gog', assignedExams: [] }, 'gog');
        setMode('login');
        setError('Global Owner (GoG) created. Please login.');
      } else if (mode === 'bootstrap-super-admin') {
        await bootstrap({ ...form, role: 'super_admin', assignedExams: [] }, 'super-admin');
        setMode('login');
        setError('Super Admin created. Please login.');
      } else {
        const user = await login(form.email, form.password, selectedRole);

        // ── Role gate: reject if the credentials belong to a different role ──
        if (user.role !== selectedRole) {
          await logout();                         // clear the session immediately
          const expectedLabel = ROLES.find(r => r.value === selectedRole)?.label || selectedRole;
          const actualLabel   = ROLES.find(r => r.value === user.role)?.label   || user.role;
          setError(
            `Login credentials not found for ${expectedLabel}. ` +
            `These credentials belong to a ${actualLabel}.`
          );
          return;
        }

        // GoG goes to add-institute first, others go to their dashboard
        const home = user.role === 'gog' ? '/gog/add-institute' : roleHome(user.role);
        navigate(home, { replace: true });
      }
    } catch (err) {
      // Don't overwrite a role-mismatch error already set above
      if (!error) {
        const msg = apiError(err);
        // Replace technical errors with user-friendly message
        setError(
          msg.toLowerCase().includes('401') || msg.toLowerCase().includes('unauthorized') ||
          msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('not found')
            ? 'Login credentials not found. Please check your email and password.'
            : msg
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const inputCls = 'w-full bg-transparent border rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 outline-none transition-all';
  const inputStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' };
  const inputFocus = (e) => e.target.style.borderColor = `${roleInfo.accent}88`;
  const inputBlur  = (e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)';

  return (
    <div className="fixed inset-0 z-[9999] min-h-screen flex items-center justify-center px-6"
      style={{ background: '#050705' }}>

      <div className="w-full max-w-md space-y-4">

        {/* Header card */}
        <div className="rounded-2xl p-6"
          style={{ background: '#111311', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 24px 60px rgba(0,0,0,0.4)' }}>

          {/* Brand */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={isGog
                ? { background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)' }
                : { background: 'rgba(0,200,150,0.12)', border: '1px solid rgba(0,200,150,0.25)' }}>
              {isGog ? <Crown size={18} style={{ color: '#fbbf24' }} /> : <ShieldCheck size={18} style={{ color: '#00d99b' }} />}
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">
                {isBootstrap ? (isGog ? 'Bootstrap Global Owner' : 'Create Super Admin') : 'GradeAI Login'}
              </h1>
              <p className="text-sm" style={{ color: '#7f867c' }}>
                {isBootstrap ? 'First-time platform setup' : 'Role-based examination management'}
              </p>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-3">

            {/* ── Role selector (login mode only) ── */}
            {!isBootstrap && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: '#7f867c' }}>Login as</label>

                {/* Custom dropdown */}
                <div className="relative">
                  <button type="button"
                    onClick={() => setDropdownOpen(v => !v)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                    style={{
                      background: roleInfo.bg,
                      border: `1px solid ${dropdownOpen ? roleInfo.accent + '99' : roleInfo.border}`,
                      boxShadow: dropdownOpen ? `0 0 0 3px ${roleInfo.accent}18` : 'none',
                    }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: roleInfo.bg, border: `1px solid ${roleInfo.border}` }}>
                      <roleInfo.icon size={15} style={{ color: roleInfo.accent }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">{roleInfo.label}</p>
                      <p className="text-xs truncate" style={{ color: '#7f867c' }}>{roleInfo.desc}</p>
                    </div>
                    <ChevronDown size={15}
                      style={{ color: roleInfo.accent, flexShrink: 0, transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                  </button>

                  {/* Dropdown list */}
                  {dropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-xl overflow-hidden"
                      style={{ background: '#111311', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 16px 40px rgba(0,0,0,0.5)' }}>
                      {ROLES.map((r, i) => (
                        <button key={r.value} type="button"
                          onClick={() => { setSelectedRole(r.value); setDropdownOpen(false); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all"
                          style={{
                            background: selectedRole === r.value ? r.bg : 'transparent',
                            borderBottom: i < ROLES.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                          }}
                          onMouseEnter={e => { if (selectedRole !== r.value) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                          onMouseLeave={e => { if (selectedRole !== r.value) e.currentTarget.style.background = 'transparent'; }}>
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: r.bg, border: `1px solid ${r.border}` }}>
                            <r.icon size={15} style={{ color: r.accent }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white">{r.label}</p>
                            <p className="text-xs" style={{ color: '#7f867c' }}>{r.desc}</p>
                          </div>
                          {selectedRole === r.value && (
                            <div className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ background: r.accent }} />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bootstrap name field */}
            {isBootstrap && (
              <input className={inputCls} style={inputStyle}
                placeholder={isGog ? 'Global Owner name' : 'Super Admin name'}
                value={form.name} onChange={e => update('name', e.target.value)}
                onFocus={inputFocus} onBlur={inputBlur} required />
            )}

            {/* Bootstrap department field */}
            {mode === 'bootstrap-super-admin' && (
              <input className={inputCls} style={inputStyle}
                placeholder="Department"
                value={form.department} onChange={e => update('department', e.target.value)}
                onFocus={inputFocus} onBlur={inputBlur} />
            )}

            {/* Email */}
            <input className={inputCls} style={inputStyle}
              placeholder="Email address" type="email"
              value={form.email} onChange={e => update('email', e.target.value)}
              onFocus={inputFocus} onBlur={inputBlur} required />

            {/* Password */}
            <input className={inputCls} style={inputStyle}
              placeholder="Password" type="password"
              value={form.password} onChange={e => update('password', e.target.value)}
              onFocus={inputFocus} onBlur={inputBlur} required minLength={8} />

            {/* Error / message */}
            {error && (
              <div className="rounded-xl px-4 py-3 text-sm"
                style={error.includes('created') || error.includes('Please login')
                  ? { background: 'rgba(251,191,36,0.08)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }
                  : { background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button disabled={busy} type="submit"
              className="w-full rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all mt-1"
              style={isGog
                ? { background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', color: '#1a1306', boxShadow: '0 0 20px rgba(251,191,36,0.3)' }
                : !isBootstrap
                ? { background: `linear-gradient(135deg, ${roleInfo.accent}, ${roleInfo.accent}cc)`, color: roleInfo.value === 'evaluator' ? '#1a0a2e' : '#051008', boxShadow: `0 0 20px ${roleInfo.accent}44` }
                : { background: 'linear-gradient(135deg,#00c896,#3ee67f)', color: '#04110b', boxShadow: '0 0 20px rgba(0,200,150,0.3)' }}>
              {isBootstrap ? <UserPlus size={15} /> : <LogIn size={15} />}
              {busy ? 'Please wait…'
                : isGog ? 'Create Global Owner'
                : mode === 'bootstrap-super-admin' ? 'Create Super Admin'
                : `Login as ${roleInfo.label}`}
            </button>
          </form>

          {/* Footer links */}
          <div className="mt-4 pt-4 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {mode === 'login' && (
              <>
                <button type="button" onClick={() => { setError(''); setMode('bootstrap-gog'); }}
                  className="w-full text-xs flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-colors hover:bg-white/5"
                  style={{ color: '#fbbf24' }}>
                  <Crown size={11} /> First-time setup? Create the Global Owner (GoG)
                </button>
                <button type="button" onClick={() => { setError(''); setMode('bootstrap-super-admin'); }}
                  className="w-full text-xs py-1.5 rounded-lg transition-colors hover:bg-white/5"
                  style={{ color: '#7f867c' }}>
                  Legacy: create the first Super Admin
                </button>
              </>
            )}
            {isBootstrap && (
              <button type="button" onClick={() => { setError(''); setMode('login'); }}
                className="w-full text-xs py-1.5 rounded-lg transition-colors hover:bg-white/5"
                style={{ color: '#7f867c' }}>
                ← Back to login
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Close dropdown on outside click */}
      {dropdownOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
      )}
    </div>
  );
}