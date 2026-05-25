import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus, Building2, DollarSign, Cpu, Loader2, Trash2,
  Edit3, X, CheckCircle2, AlertCircle, BarChart3, Search, TrendingUp, Activity,
  MapPin, Mail, Phone, ShieldCheck, Users, UserPlus, FlaskConical,
} from 'lucide-react';
import { Container, PageHeader } from '../components/layout/Sidebar';
import { api, apiError } from '../lib/api';
import BenchmarkPage from './BenchmarkPage';

const cardStyle = {
  background: '#111311',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 14,
};

function StatCard({ icon: Icon, label, value, sub, accent = '#00d99b' }) {
  return (
    <div className="p-5" style={cardStyle}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
        style={{ background: `${accent}1f`, border: `1px solid ${accent}55` }}>
        <Icon size={16} style={{ color: accent }} />
      </div>
      <p className="text-xs mb-1" style={{ color: '#7f867c' }}>{label}</p>
      <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: '#666688' }}>{sub}</p>}
    </div>
  );
}

function Toast({ kind, msg, onClose }) {
  if (!msg) return null;
  const isErr = kind === 'error';
  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
      className="fixed top-6 right-6 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl"
      style={{
        background: isErr ? 'rgba(239,68,68,0.12)' : 'rgba(0,200,150,0.12)',
        border: isErr ? '1px solid rgba(239,68,68,0.35)' : '1px solid rgba(0,200,150,0.35)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      }}>
      {isErr ? <AlertCircle size={15} style={{ color: '#f87171' }} /> : <CheckCircle2 size={15} style={{ color: '#4ade80' }} />}
      <span className="text-sm" style={{ color: isErr ? '#fca5a5' : '#a7f3d0' }}>{msg}</span>
      <button onClick={onClose} className="ml-2"><X size={13} style={{ color: '#7f867c' }} /></button>
    </motion.div>
  );
}

/* ── Institute Modal ─────────────────────────────────────────────────────── */
function InstituteModal({ open, initial, onClose, onSaved, notify }) {
  const editing = !!initial;
  const [form, setForm] = useState({ name: '', code: '', address: '', contactEmail: '', contactPhone: '', status: 'active' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) setForm({ name: initial.name||'', code: initial.code||'', address: initial.address||'', contactEmail: initial.contactEmail||'', contactPhone: initial.contactPhone||'', status: initial.status||'active' });
    else setForm({ name: '', code: '', address: '', contactEmail: '', contactPhone: '', status: 'active' });
  }, [initial, open]);

  if (!open) return null;

  async function handleSave() {
    if (!form.name.trim()) return notify('error', 'Institute name is required.');
    setSaving(true);
    try {
      if (editing) { await api.patch(`/institutes/${initial.id}`, form); notify('ok', 'Institute updated.'); }
      else { await api.post('/institutes', form); notify('ok', 'Institute created.'); }
      onSaved(); onClose();
    } catch (e) { notify('error', apiError(e)); }
    finally { setSaving(false); }
  }

  const inputCls = 'w-full px-3.5 py-2.5 rounded-lg text-sm text-white placeholder:text-neutral-600 outline-none';
  const inputStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg p-6" style={cardStyle} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-white">{editing ? 'Edit institute' : 'Add new institute'}</h3>
          <button onClick={onClose}><X size={18} style={{ color: '#7f867c' }} /></button>
        </div>
        <div className="space-y-3.5">
          <div><label className="block text-xs mb-1.5" style={{ color: '#c0c0d8' }}>Name *</label>
            <input className={inputCls} style={inputStyle} placeholder="Institute name" value={form.name} onChange={e => setForm({...form,name:e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs mb-1.5" style={{ color: '#c0c0d8' }}>Code</label>
              <input className={inputCls} style={inputStyle} placeholder="IIT-K" value={form.code} onChange={e => setForm({...form,code:e.target.value})} /></div>
            <div><label className="block text-xs mb-1.5" style={{ color: '#c0c0d8' }}>Status</label>
              <select className={inputCls} style={inputStyle} value={form.status} onChange={e => setForm({...form,status:e.target.value})}>
                <option value="active">active</option><option value="suspended">suspended</option></select></div>
          </div>
          <div><label className="block text-xs mb-1.5" style={{ color: '#c0c0d8' }}>Address</label>
            <input className={inputCls} style={inputStyle} placeholder="City, State" value={form.address} onChange={e => setForm({...form,address:e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs mb-1.5" style={{ color: '#c0c0d8' }}>Contact email</label>
              <input className={inputCls} style={inputStyle} placeholder="admin@institute.edu" value={form.contactEmail} onChange={e => setForm({...form,contactEmail:e.target.value})} /></div>
            <div><label className="block text-xs mb-1.5" style={{ color: '#c0c0d8' }}>Contact phone</label>
              <input className={inputCls} style={inputStyle} placeholder="+91 ..." value={form.contactPhone} onChange={e => setForm({...form,contactPhone:e.target.value})} /></div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#c0c0d8' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: saving ? 'rgba(0,200,150,0.4)' : 'linear-gradient(135deg,#00c896,#3ee67f)', boxShadow: saving?'none':'0 0 20px rgba(0,200,150,0.3)' }}>
            {saving && <Loader2 size={14} className="animate-spin" />}
            {editing ? 'Save changes' : 'Create institute'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Add Institute Page ───────────────────────────────────────────────────── */
function AddInstitutePage({ onSaved, notify }) {
  const [form, setForm] = useState({ name:'',code:'',address:'',contactEmail:'',contactPhone:'',status:'active' });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const F = (k,v) => setForm(prev=>({...prev,[k]:v}));

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name.trim()) return notify('error', 'Institute name is required.');
    setSaving(true);
    try {
      await api.post('/institutes', form);
      notify('ok', `Institute "${form.name}" created.`);
      setForm({ name:'',code:'',address:'',contactEmail:'',contactPhone:'',status:'active' });
      setSaved(true); onSaved?.(); setTimeout(()=>setSaved(false),3000);
    } catch(e) { notify('error', apiError(e)); }
    finally { setSaving(false); }
  }

  const inp = {
    base: 'w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-neutral-600 transition-all',
    style: { background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', outline:'none' },
    focus: e=>e.target.style.borderColor='rgba(0,200,150,0.55)',
    blur:  e=>e.target.style.borderColor='rgba(255,255,255,0.1)',
  };
  const labelCls = 'block text-xs font-semibold uppercase tracking-wider mb-2';
  const preview = { initial:(form.code||form.name||'I')[0]?.toUpperCase(), name:form.name||'Institute Name', code:form.code||'', addr:form.address||'City, State', email:form.contactEmail||'contact@institute.edu', phone:form.contactPhone||'+91 00000 00000', status:form.status };

  return (
    <form onSubmit={handleSave} className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 w-full">
        <div className="lg:col-span-3 space-y-5 min-w-0">
          <div className="w-full rounded-2xl overflow-hidden" style={{ background:'#111311',border:'1px solid rgba(255,255,255,0.08)',boxShadow:'0 4px 30px rgba(0,0,0,0.35)' }}>
            <div className="flex items-center gap-3 px-6 py-5" style={{ background:'linear-gradient(135deg,rgba(0,200,150,0.12),rgba(62,230,127,0.04))',borderBottom:'1px solid rgba(0,200,150,0.18)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background:'rgba(0,200,150,0.22)',border:'1px solid rgba(0,200,150,0.4)' }}><Building2 size={18} style={{ color:'#00d99b' }} /></div>
              <div><p className="text-base font-bold text-white">Basic Information</p><p className="text-xs mt-0.5" style={{ color:'#7f867c' }}>Identity and classification</p></div>
            </div>
            <div className="p-6 space-y-5">
              <div><label className={labelCls} style={{ color:'#a2a59f' }}>Institute Name <span style={{ color:'#f87171' }}>*</span></label>
                <input className={inp.base} style={{...inp.style,fontSize:15,fontWeight:500}} placeholder="e.g. Indian Institute of Technology" value={form.name} onChange={e=>F('name',e.target.value)} onFocus={inp.focus} onBlur={inp.blur} required /></div>
              <div className="grid grid-cols-2 gap-5">
                <div><label className={labelCls} style={{ color:'#a2a59f' }}>Institute Code</label>
                  <input className={inp.base} style={inp.style} placeholder="e.g. IIT-K" value={form.code} onChange={e=>F('code',e.target.value)} onFocus={inp.focus} onBlur={inp.blur} /></div>
                <div><label className={labelCls} style={{ color:'#a2a59f' }}>Status</label>
                  <select className={inp.base} style={{...inp.style,cursor:'pointer'}} value={form.status} onChange={e=>F('status',e.target.value)}>
                    <option value="active">Active</option><option value="suspended">Suspended</option></select></div>
              </div>
              <div><label className={labelCls} style={{ color:'#a2a59f' }}>Address</label>
                <input className={inp.base} style={inp.style} placeholder="City, State" value={form.address} onChange={e=>F('address',e.target.value)} onFocus={inp.focus} onBlur={inp.blur} /></div>
            </div>
          </div>
          <div className="w-full rounded-2xl overflow-hidden" style={{ background:'#111311',border:'1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-3 px-6 py-5" style={{ background:'rgba(96,165,250,0.06)',borderBottom:'1px solid rgba(96,165,250,0.15)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background:'rgba(96,165,250,0.18)',border:'1px solid rgba(96,165,250,0.35)' }}><Activity size={18} style={{ color:'#60a5fa' }} /></div>
              <div><p className="text-base font-bold text-white">Contact Details</p><p className="text-xs mt-0.5" style={{ color:'#7f867c' }}>Primary point of contact</p></div>
            </div>
            <div className="p-6"><div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div><label className={labelCls} style={{ color:'#a2a59f' }}>Contact Email</label>
                <input className={inp.base} style={inp.style} type="email" placeholder="admin@institute.edu" value={form.contactEmail} onChange={e=>F('contactEmail',e.target.value)} onFocus={e=>e.target.style.borderColor='rgba(96,165,250,0.55)'} onBlur={inp.blur} /></div>
              <div><label className={labelCls} style={{ color:'#a2a59f' }}>Contact Phone</label>
                <input className={inp.base} style={inp.style} placeholder="+91 98765 43210" value={form.contactPhone} onChange={e=>F('contactPhone',e.target.value)} onFocus={e=>e.target.style.borderColor='rgba(96,165,250,0.55)'} onBlur={inp.blur} /></div>
            </div></div>
          </div>
          <div className="flex items-center gap-4 pt-1">
            <button type="submit" disabled={saving} className="flex items-center gap-2.5 px-8 py-3.5 rounded-xl text-sm font-bold disabled:opacity-50 transition-all"
              style={saved?{background:'rgba(74,222,128,0.15)',border:'1px solid rgba(74,222,128,0.4)',color:'#4ade80'}:{background:'linear-gradient(135deg,#00c896,#3ee67f)',color:'#04110b',boxShadow:'0 0 30px rgba(0,200,150,0.4)'}}>
              {saving?<><Loader2 size={15} className="animate-spin"/> Creating…</>:saved?<><CheckCircle2 size={15}/> Created!</>:<><Plus size={15}/> Create Institute</>}
            </button>
          </div>
        </div>
        <div className="lg:col-span-2 min-w-0"><div className="sticky top-6 space-y-4">
          <div className="rounded-2xl overflow-hidden" style={{ background:'#111311',border:'1px solid rgba(255,255,255,0.08)' }}>
            <div className="px-5 py-4" style={{ borderBottom:'1px solid rgba(255,255,255,0.07)',background:'rgba(255,255,255,0.02)' }}>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color:'#7f867c' }}>Live Preview</p></div>
            <div className="p-5"><div className="rounded-xl p-4" style={{ background:'rgba(0,200,150,0.05)',border:'1px solid rgba(0,200,150,0.2)' }}>
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black" style={{ background:'linear-gradient(135deg,#00c896,#3ee67f)',color:'#04110b' }}>{preview.initial}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-sm break-words">{preview.name}</p>
                  {preview.code&&<span className="inline-block mt-1 text-[10px] font-mono px-2 py-0.5 rounded" style={{ background:'rgba(255,255,255,0.07)',color:'#a2a59f' }}>{preview.code}</span>}
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background:preview.status==='active'?'#4ade80':'#f87171' }}/>
                    <span className="text-xs capitalize" style={{ color:preview.status==='active'?'#4ade80':'#f87171' }}>{preview.status}</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 space-y-2" style={{ borderTop:'1px solid rgba(255,255,255,0.07)' }}>
                {[[MapPin,preview.addr],[Mail,preview.email],[Phone,preview.phone]].map(([Icon,val],i)=>(
                  <div key={i} className="flex items-center gap-2"><Icon size={12} style={{ color:'#4f564f',flexShrink:0 }}/><span className="text-xs truncate" style={{ color:'#8a9087' }}>{val}</span></div>
                ))}
              </div>
            </div></div>
          </div>
        </div></div>
      </div>
    </form>
  );
}

/* ── Super Admin Management Page ─────────────────────────────────────────── */
function SuperAdminPage({ notify, type }) {
  const [superAdmins, setSuperAdmins] = useState([]);
  const [institutes, setInstitutes]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name:'',email:'',password:'',department:'',instituteId:'' });
  const [busy, setBusy] = useState(false);

  async function loadSuperAdmins() {
    setLoading(true);
    try {
      const res = await api.get('/users?role=super_admin');
      setSuperAdmins(res.data || []);
    } catch(e) { notify('error', apiError(e)); }
    finally { setLoading(false); }
  }

  async function loadInstitutes() {
    try {
      const res = await api.get('/institutes');
      setInstitutes(res.data || []);
    } catch(e) { console.warn('Could not load institutes', e); }
  }

  useEffect(() => {
    loadInstitutes();
    if (type === 'manage') loadSuperAdmins();
  }, [type]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.instituteId) return notify('error', 'Please select an institute.');
    setBusy(true);
    try {
      await api.post('/users', { ...form, role: 'super_admin', assignedExams: [] });
      notify('ok', 'Super Admin created successfully.');
      setForm({ name:'',email:'',password:'',department:'',instituteId:'' });
    } catch(e) { notify('error', apiError(e)); }
    finally { setBusy(false); }
  }

  const inputCls = 'w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-neutral-600 outline-none transition-all';
  const inputStyle = { background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)' };
  const focus = e => e.target.style.borderColor = 'rgba(0,200,150,0.55)';
  const blur  = e => e.target.style.borderColor = 'rgba(255,255,255,0.1)';
  const labelCls = 'block text-xs font-semibold uppercase tracking-wider mb-2';

  if (type === 'manage') return (
    <div className="space-y-4">
      <div className="rounded-2xl overflow-hidden" style={cardStyle}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-sm font-semibold text-white">All Super Admins</p>
          <span className="text-xs px-2 py-0.5 rounded-md font-mono" style={{ background:'rgba(0,200,150,0.12)',color:'#00d99b' }}>{superAdmins.length} total</span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 size={18} className="animate-spin" style={{ color:'#00d99b' }}/></div>
        ) : superAdmins.length === 0 ? (
          <div className="text-center py-12"><ShieldCheck size={28} style={{ color:'#3a3f3a',margin:'0 auto 12px' }}/><p className="text-sm" style={{ color:'#7f867c' }}>No Super Admins yet.</p>
            <Link to="/gog/add-super-admin" className="inline-flex items-center gap-1.5 mt-3 text-xs px-3 py-1.5 rounded-lg" style={{ background:'rgba(0,200,150,0.12)',color:'#00d99b',border:'1px solid rgba(0,200,150,0.25)' }}><UserPlus size={12}/> Add Super Admin</Link>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {superAdmins.map(sa => {
              const inst = institutes.find(i => i.id === sa.instituteId);
              return (
                <div key={sa.id} className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background:'rgba(0,200,150,0.12)',border:'1px solid rgba(0,200,150,0.25)' }}>
                    <ShieldCheck size={16} style={{ color:'#00d99b' }}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{sa.name}</p>
                    <p className="text-xs mt-0.5" style={{ color:'#7f867c' }}>{sa.email}</p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-medium text-white">{inst?.name || 'No institute'}</p>
                    <p className="text-[10px] mt-0.5" style={{ color:'#4f564f' }}>{sa.department || 'No department'}</p>
                  </div>
                  <span className="text-[10px] px-2 py-1 rounded-full uppercase tracking-wide font-semibold" style={{ background:'rgba(0,200,150,0.12)',color:'#00d99b',border:'1px solid rgba(0,200,150,0.2)' }}>Super Admin</span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={async () => {
                      const name = window.prompt('New name:', sa.name);
                      if (!name) return;
                      try { await api.patch(`/users/${sa.id}`, { name }); notify('ok', 'Updated.'); loadSuperAdmins(); }
                      catch(e) { notify('error', apiError(e)); }
                    }} className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
                      style={{ color:'#60a5fa', border:'1px solid rgba(96,165,250,0.2)' }}>
                      ✏ Edit
                    </button>
                    <button onClick={async () => {
                      if (!window.confirm(`Delete ${sa.name}?`)) return;
                      try { await api.delete(`/users/${sa.id}`); notify('ok', 'Deleted.'); loadSuperAdmins(); }
                      catch(e) { notify('error', apiError(e)); }
                    }} className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
                      style={{ color:'#f87171', border:'1px solid rgba(239,68,68,0.2)' }}>
                      🗑 Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3">
        <div className="rounded-2xl overflow-hidden" style={cardStyle}>
          <div className="flex items-center gap-3 px-6 py-5" style={{ background:'linear-gradient(135deg,rgba(0,200,150,0.12),rgba(62,230,127,0.04))',borderBottom:'1px solid rgba(0,200,150,0.18)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background:'rgba(0,200,150,0.22)',border:'1px solid rgba(0,200,150,0.4)' }}><ShieldCheck size={18} style={{ color:'#00d99b' }}/></div>
            <div><p className="text-base font-bold text-white">Add Super Admin</p><p className="text-xs mt-0.5" style={{ color:'#7f867c' }}>Assign a super admin to an institute</p></div>
          </div>
          <form onSubmit={handleAdd} className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className={labelCls} style={{ color:'#a2a59f' }}>Full Name *</label>
                <input className={inputCls} style={inputStyle} placeholder="Super Admin name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} onFocus={focus} onBlur={blur} required /></div>
              <div><label className={labelCls} style={{ color:'#a2a59f' }}>Email *</label>
                <input className={inputCls} style={inputStyle} type="email" placeholder="superadmin@institute.edu" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} onFocus={focus} onBlur={blur} required /></div>
              <div><label className={labelCls} style={{ color:'#a2a59f' }}>Password * (min 8)</label>
                <input className={inputCls} style={inputStyle} type="password" placeholder="••••••••" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} onFocus={focus} onBlur={blur} required minLength={8}/></div>
              <div><label className={labelCls} style={{ color:'#a2a59f' }}>Department</label>
                <input className={inputCls} style={inputStyle} placeholder="e.g. Administration" value={form.department} onChange={e=>setForm({...form,department:e.target.value})} onFocus={focus} onBlur={blur}/></div>
            </div>
            <div><label className={labelCls} style={{ color:'#a2a59f' }}>Assign to Institute *</label>
              <select className={inputCls} style={{...inputStyle,cursor:'pointer'}} value={form.instituteId} onChange={e=>setForm({...form,instituteId:e.target.value})} required>
                <option value="">— Select Institute —</option>
                {institutes.map(inst=><option key={inst.id} value={inst.id}>{inst.name}</option>)}
              </select>
            </div>
            <button type="submit" disabled={busy}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold disabled:opacity-50 transition-all"
              style={{ background:'linear-gradient(135deg,#00c896,#3ee67f)',color:'#04110b',boxShadow:'0 0 20px rgba(0,200,150,0.3)' }}>
              {busy?<><Loader2 size={14} className="animate-spin"/> Adding…</>:<><UserPlus size={14}/> Add Super Admin</>}
            </button>
          </form>
        </div>
      </div>
      <div className="lg:col-span-2">
        <div className="rounded-2xl p-5" style={cardStyle}>
          <p className="text-xs font-bold text-white mb-4 uppercase tracking-wider">After Creation</p>
          <div className="space-y-3">
            {[['1','Super Admin can login with selected role','#00d99b'],['2','They manage admins within their institute','#60a5fa'],['3','Can create and assign admins to exams','#a78bfa'],['4','Token usage tracked per institute','#fbbf24']].map(([step,text,color])=>(
              <div key={step} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-black mt-0.5" style={{ background:`${color}22`,border:`1px solid ${color}55`,color }}>{step}</div>
                <p className="text-xs leading-relaxed" style={{ color:'#7f867c' }}>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Token Analysis Page ─────────────────────────────────────────────────── */
function TokenAnalysisPage({ analytics, byInstitute, loading, recent, institutes }) {
  const totals = analytics?.totals || {};
  const total = (totals.input_tokens||0)+(totals.output_tokens||0);
  const inPct = total ? Math.round(((totals.input_tokens||0)/total)*100) : 50;
  const usdToInr = analytics?.totals?.usd_to_inr || 84;
  const rows = [['Google Vision feature','DOCUMENT_TEXT_DETECTION'],['Gemini model','gemini-2.5-flash-lite'],['Input price','$ 0.10 / 1M tokens'],['Output price','$ 0.40 / 1M tokens'],['USD → INR rate',`₹ ${usdToInr}`]];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[{label:'Total Evaluations',value:(totals.evaluations||0).toLocaleString(),accent:'#00d99b',bg:'rgba(0,200,150,0.1)',border:'rgba(0,200,150,0.25)'},{label:'Input Tokens',value:(totals.input_tokens||0).toLocaleString(),accent:'#3ee67f',bg:'rgba(62,230,127,0.1)',border:'rgba(62,230,127,0.25)'},{label:'Output Tokens',value:(totals.output_tokens||0).toLocaleString(),accent:'#a78bfa',bg:'rgba(139,92,246,0.1)',border:'rgba(139,92,246,0.25)'},{label:'Total Tokens',value:(totals.total_tokens||0).toLocaleString(),accent:'#fbbf24',bg:'rgba(251,191,36,0.1)',border:'rgba(251,191,36,0.25)'}].map((c,i)=>(
          <div key={i} className="rounded-xl p-4" style={{ background:c.bg,border:`1px solid ${c.border}` }}>
            <div className="text-[10px] uppercase tracking-wider font-semibold mb-1" style={{ color:c.accent }}>{c.label}</div>
            <div className="text-xl font-bold font-mono text-white">{c.value}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[{label:'Total Cost (INR)',value:`₹ ${(totals.cost_inr||0).toFixed(4)}`,accent:'#fbbf24',bg:'rgba(251,191,36,0.08)',border:'rgba(251,191,36,0.25)'},{label:'Total Cost (USD)',value:`$ ${(totals.cost_usd||0).toFixed(6)}`,accent:'#f472b6',bg:'rgba(244,114,182,0.08)',border:'rgba(244,114,182,0.25)'},{label:'Avg Cost / Eval',value:totals.evaluations>0?`₹ ${((totals.cost_inr||0)/totals.evaluations).toFixed(4)}`:'—',accent:'#60a5fa',bg:'rgba(96,165,250,0.08)',border:'rgba(96,165,250,0.25)'}].map((c,i)=>(
          <div key={i} className="rounded-xl p-4" style={{ background:c.bg,border:`1px solid ${c.border}` }}>
            <div className="text-[10px] uppercase tracking-wider font-semibold mb-1" style={{ color:c.accent }}>{c.label}</div>
            <div className="text-xl font-bold font-mono text-white">{c.value}</div>
          </div>
        ))}
      </div>
      {total>0&&(<div className="p-5 rounded-2xl" style={cardStyle}>
        <p className="text-sm font-semibold text-white mb-4">Input vs Output Token Split</p>
        <div className="flex justify-between text-xs mb-2" style={{ color:'#7f867c' }}><span style={{ color:'#00d99b' }}>Input — {inPct}%</span><span style={{ color:'#a78bfa' }}>Output — {100-inPct}%</span></div>
        <div className="h-3 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.06)' }}><div className="h-full transition-all duration-700" style={{ width:`${inPct}%`,background:'linear-gradient(90deg,#00c896,#3ee67f)' }}/></div>
      </div>)}
      <div className="rounded-2xl overflow-hidden" style={cardStyle}>
        <div className="px-5 py-4" style={{ borderBottom:'1px solid rgba(255,255,255,0.07)' }}><p className="text-sm font-semibold text-white">Pricing Reference</p></div>
        <table className="w-full text-sm"><tbody>{rows.map(([label,value],i)=>(
          <tr key={i} style={{ borderBottom:i<rows.length-1?'1px solid rgba(255,255,255,0.04)':'none' }}>
            <td className="px-5 py-3 text-xs" style={{ color:'#8a9087' }}>{label}</td>
            <td className="px-5 py-3 text-xs font-mono font-medium text-white">{value}</td>
          </tr>
        ))}</tbody></table>
      </div>
    </div>
  );
}

/* ── Main GoG Dashboard ───────────────────────────────────────────────────── */
export default function GogDashboard() {
  const { section = 'dashboard' } = useParams();
  const [institutes, setInstitutes] = useState([]);
  const [analytics, setAnalytics]   = useState(null);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState(null);
  const [toast, setToast]           = useState({ kind:'',msg:'' });

  const notify = (kind,msg) => { setToast({kind,msg}); setTimeout(()=>setToast({kind:'',msg:''}),3500); };

  async function loadAll() {
    setLoading(true);
    try {
      const [instRes, anRes] = await Promise.all([api.get('/institutes'), api.get('/analytics/token-cost')]);
      setInstitutes(instRes.data||[]);
      setAnalytics(anRes.data||null);
    } catch(e) { notify('error',apiError(e)); }
    finally { setLoading(false); }
  }
  useEffect(()=>{ loadAll(); },[]);

  async function handleDelete(inst) {
    if (!window.confirm(`Delete "${inst.name}"?`)) return;
    try { await api.delete(`/institutes/${inst.id}`); notify('ok','Institute deleted.'); loadAll(); }
    catch(e) { notify('error',apiError(e)); }
  }

  const filtered = institutes.filter(i=>!search||(i.name||'').toLowerCase().includes(search.toLowerCase())||(i.code||'').toLowerCase().includes(search.toLowerCase()));
  const totals = analytics?.totals||{};
  const byInstitute = analytics?.byInstitute||[];

  const pageMeta = {
    'dashboard':         { title:'Platform Overview',       desc:'Manage institutes and monitor token spend.' },
    'add-institute':     { title:'Add Institute',           desc:'Register a new institute on the platform.' },
    'token-analysis':    { title:'Token Analysis',          desc:'Full token usage and cost breakdown.' },
    'add-super-admin':   { title:'Add Super Admin',         desc:'Create a new Super Admin and assign to an institute.' },
    'manage-super-admin':{ title:'Manage Super Admins',     desc:'View and manage all Super Admins on the platform.' },
    'benchmark':         { title:'OCR Benchmark',           desc:'Compare OCR engines — speed, confidence, and output quality.' },
  };
  const { title, desc } = pageMeta[section] || pageMeta['dashboard'];

  return (
    <div className="min-h-screen" style={{ background:'#050705' }}>
      <Toast {...toast} onClose={()=>setToast({kind:'',msg:''})} />
      <PageHeader title={title} description={desc} gradient
        action={section==='dashboard'&&(
          <button onClick={()=>{ setEditing(null); setModalOpen(true); }}
            className="inline-flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background:'linear-gradient(135deg,#00c896,#3ee67f)',boxShadow:'0 0 20px rgba(0,200,150,0.3)' }}>
            <Plus size={14}/> Add institute
          </button>
        )}
      />
      <Container className="py-6 space-y-6">

        {section==='add-institute'      && <AddInstitutePage onSaved={loadAll} notify={notify}/>}
        {section==='token-analysis'     && <TokenAnalysisPage analytics={analytics} byInstitute={byInstitute} loading={loading} recent={analytics?.recent||[]} institutes={institutes}/>}
        {section==='add-super-admin'    && <SuperAdminPage notify={notify} type="add"/>}
        {section==='manage-super-admin' && <SuperAdminPage notify={notify} type="manage"/>}
        {section==='benchmark'          && <BenchmarkPage embedded />}

        {section==='dashboard' && (<>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={Building2} label="Institutes" value={institutes.length} sub={`${institutes.filter(i=>i.status!=='suspended').length} active`}/>
            <StatCard icon={BarChart3}  label="Evaluations" accent="#7cffb6" value={totals.evaluations||0} sub="Total runs"/>
            <StatCard icon={Cpu}        label="Total tokens" accent="#fbbf24" value={(totals.total_tokens||0).toLocaleString()} sub={`${(totals.input_tokens||0).toLocaleString()} in / ${(totals.output_tokens||0).toLocaleString()} out`}/>
            <StatCard icon={DollarSign} label="Total cost" accent="#f472b6" value={`₹ ${(totals.cost_inr||0).toFixed(2)}`} sub={`$ ${(totals.cost_usd||0).toFixed(4)}`}/>
          </div>

          <div className="p-5" style={cardStyle}>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background:'rgba(251,191,36,0.12)',border:'1px solid rgba(251,191,36,0.25)' }}><Activity size={15} style={{ color:'#fbbf24' }}/></div>
              <div><h2 className="text-sm font-semibold text-white">Token & Cost Analytics</h2><p className="text-xs" style={{ color:'#61665f' }}>Aggregate usage across all evaluations</p></div>
            </div>
            {loading?<div className="flex items-center justify-center py-8"><Loader2 size={18} className="animate-spin" style={{ color:'#00d99b' }}/></div>:(
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[{label:'Input Tokens',value:(totals.input_tokens||0).toLocaleString(),accent:'rgba(0,200,150,0.1)',border:'rgba(0,200,150,0.25)',color:'#00d99b'},{label:'Output Tokens',value:(totals.output_tokens||0).toLocaleString(),accent:'rgba(62,230,127,0.1)',border:'rgba(62,230,127,0.25)',color:'#3ee67f'},{label:'Total Cost (INR)',value:`₹ ${(totals.cost_inr||0).toFixed(4)}`,accent:'rgba(251,191,36,0.1)',border:'rgba(251,191,36,0.25)',color:'#fbbf24'},{label:'Total Cost (USD)',value:`$ ${(totals.cost_usd||0).toFixed(6)}`,accent:'rgba(244,114,182,0.1)',border:'rgba(244,114,182,0.25)',color:'#f472b6'}].map((c,i)=>(
                  <div key={i} className="rounded-xl p-3" style={{ background:c.accent,border:`1px solid ${c.border}` }}>
                    <div className="text-[10px] uppercase tracking-wider mb-1 font-medium" style={{ color:c.color }}>{c.label}</div>
                    <div className="text-base font-bold font-mono" style={{ color:'#f4f5f2' }}>{c.value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            <div className="lg:col-span-3 p-5" style={cardStyle}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-white">Institutes</h2>
                <div className="relative"><Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:'#7f867c' }}/>
                  <input placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)} className="pl-8 pr-3 py-1.5 rounded-lg text-xs text-white placeholder:text-neutral-600 outline-none" style={{ background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)' }}/></div>
              </div>
              {loading?<div className="flex items-center justify-center py-12"><Loader2 size={20} className="animate-spin" style={{ color:'#00d99b' }}/></div>
              :filtered.length===0?<div className="text-center py-12"><Building2 size={28} style={{ color:'#3a3f3a',margin:'0 auto 12px' }}/><p className="text-sm" style={{ color:'#7f867c' }}>{search?'No institutes match.':'No institutes yet.'}</p></div>
              :<div className="space-y-2">{filtered.map(inst=>{
                const metrics=byInstitute.find(b=>b.instituteId===inst.id);
                return(<div key={inst.id} className="flex items-center gap-4 px-4 py-3 rounded-xl" style={{ background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)' }}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background:'rgba(0,200,150,0.12)',border:'1px solid rgba(0,200,150,0.25)' }}><Building2 size={16} style={{ color:'#00d99b' }}/></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-white truncate">{inst.name}</p>
                      {inst.code&&<span className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background:'rgba(255,255,255,0.05)',color:'#a2a59f' }}>{inst.code}</span>}
                      <span className="text-[10px] px-1.5 py-0.5 rounded uppercase" style={inst.status==='active'?{background:'rgba(74,222,128,0.1)',color:'#4ade80'}:{background:'rgba(239,68,68,0.1)',color:'#f87171'}}>{inst.status}</span>
                    </div>
                    <p className="text-xs truncate mt-0.5" style={{ color:'#7f867c' }}>{inst.address||inst.contactEmail||'—'}</p>
                  </div>
                  <div className="hidden sm:block text-right"><p className="text-xs font-semibold text-white">₹ {(metrics?.cost_inr||0).toFixed(2)}</p><p className="text-[10px]" style={{ color:'#7f867c' }}>{(metrics?.total_tokens||0).toLocaleString()} tokens</p></div>
                  <button onClick={()=>{ setEditing(inst); setModalOpen(true); }} className="p-2 rounded-lg hover:bg-white/5" style={{ color:'#a2a59f' }}><Edit3 size={14}/></button>
                  <button onClick={()=>handleDelete(inst)} className="p-2 rounded-lg hover:bg-red-500/10" style={{ color:'#f87171' }}><Trash2 size={14}/></button>
                </div>);
              })}</div>}
            </div>
            <div className="lg:col-span-2 p-5" style={cardStyle}>
              <h2 className="text-sm font-semibold text-white mb-4">Token & cost by institute</h2>
              {loading?<div className="flex items-center justify-center py-12"><Loader2 size={18} className="animate-spin" style={{ color:'#00d99b' }}/></div>
              :byInstitute.length===0?<div className="text-center py-10"><Cpu size={24} style={{ color:'#3a3f3a',margin:'0 auto 10px' }}/><p className="text-xs" style={{ color:'#7f867c' }}>No evaluation cost data yet.</p><p className="text-[10px] mt-1" style={{ color:'#4f564f' }}>Run an evaluation to see numbers here.</p></div>
              :<div className="space-y-2.5">{byInstitute.map(b=>{
                const pct=totals.cost_inr?(b.cost_inr/totals.cost_inr)*100:0;
                return(<div key={b.instituteId} className="px-3.5 py-2.5 rounded-lg" style={{ background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center justify-between mb-1.5"><p className="text-xs font-medium text-white truncate flex-1 mr-2">{b.instituteName}</p><p className="text-xs font-semibold" style={{ color:'#00d99b' }}>₹ {b.cost_inr.toFixed(2)}</p></div>
                  <div className="w-full h-1 rounded-full" style={{ background:'rgba(255,255,255,0.06)' }}><div className="h-1 rounded-full" style={{ width:`${Math.min(100,pct)}%`,background:'linear-gradient(90deg,#00c896,#7cffb6)' }}/></div>
                  <div className="flex justify-between mt-1.5 text-[10px]" style={{ color:'#7f867c' }}><span>{b.total_tokens.toLocaleString()} tokens</span><span>{b.evaluations} eval{b.evaluations!==1?'s':''}</span></div>
                </div>);
              })}</div>}
            </div>
          </div>
        </>)}
      </Container>
      <InstituteModal open={modalOpen} initial={editing} onClose={()=>setModalOpen(false)} onSaved={loadAll} notify={notify}/>
    </div>
  );
}