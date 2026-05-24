import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Activity, Check, ClipboardCheck, FileUp, Plus, RefreshCw, Send,
  ShieldCheck, UploadCloud, Users, X, Edit3, Trash2, Save
} from 'lucide-react';
import { Container, PageHeader } from '../components/layout/Sidebar';
import { Badge, Button, Card, CardContent, CardHeader, Input, Select, StatCard } from '../components/ui/primitives';
import { ResultsPanel } from '../components/results/ResultsPanel';
import { useAuth } from '../lib/auth';
import { api, apiError } from '../lib/api';

/* ── Gradient Stat Card ─────────────────────────────────────────────────── */
function GradientStatCard({ label, value, icon: Icon, accent = '#00d99b' }) {
  return (
    <div className="relative rounded-xl p-4"
      style={{
        background: '#111311',
        border: '1px solid rgba(0,200,150,0.35)',
        boxShadow: '0 0 0 0.5px rgba(0,200,150,0.15), 0 4px 16px rgba(0,0,0,0.3)',
      }}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
        style={{ background: 'transparent', border: `1px solid ${accent}55` }}>
        <Icon size={16} style={{ color: accent }} />
      </div>
      <p className="text-[11px] font-medium uppercase tracking-wider mb-1"
        style={{ color: '#7f867c' }}>{label}</p>
      <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
    </div>
  );
}

/* ── User Manage Table (with Edit + Delete) ─────────────────────────────── */
function UserManageTable({ users, onDone, refresh }) {
  const [editingId, setEditingId]   = useState(null);
  const [editForm, setEditForm]     = useState({});
  const [deletingId, setDeletingId] = useState(null);

  const startEdit = (user) => {
    setEditingId(user.id);
    setEditForm({ name: user.name || '', email: user.email || '', department: user.department || '' });
  };

  const cancelEdit = () => { setEditingId(null); setEditForm({}); };

  const saveEdit = async (userId) => {
    try {
      await api.patch(`/users/${userId}`, editForm);
      onDone?.('User updated successfully.');
      setEditingId(null);
      refresh?.();
    } catch (err) {
      onDone?.(apiError(err));
    }
  };

  const deleteUser = async (userId, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeletingId(userId);
    try {
      await api.delete(`/users/${userId}`);
      onDone?.('User deleted.');
      refresh?.();
    } catch (err) {
      onDone?.(apiError(err));
    } finally {
      setDeletingId(null);
    }
  };

  const inputCls = 'w-full px-2 py-1 rounded-lg text-xs text-white outline-none';
  const inputStyle = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(0,200,150,0.3)' };

  return (
    <div className="rounded-xl overflow-hidden"
      style={{ background: '#111311', border: '1px solid rgba(255,255,255,0.08)' }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {['Name','Email','Department','Actions'].map(h => (
              <th key={h} className="text-left px-4 py-3 text-xs uppercase tracking-wider"
                style={{ color: '#7f867c' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {users.length === 0 && (
            <tr><td colSpan={4} className="px-4 py-8 text-center text-xs" style={{ color:'#4f564f' }}>No records yet.</td></tr>
          )}
          {users.map(u => (
            <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
              <td className="px-4 py-3">
                {editingId === u.id
                  ? <input className={inputCls} style={inputStyle} value={editForm.name}
                      onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                  : <span className="text-sm font-medium text-white">{u.name}</span>}
              </td>
              <td className="px-4 py-3">
                {editingId === u.id
                  ? <input className={inputCls} style={inputStyle} value={editForm.email} type="email"
                      onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
                  : <span className="text-xs" style={{ color:'#a2a59f' }}>{u.email}</span>}
              </td>
              <td className="px-4 py-3">
                {editingId === u.id
                  ? <input className={inputCls} style={inputStyle} value={editForm.department}
                      onChange={e => setEditForm(f => ({ ...f, department: e.target.value }))} />
                  : <span className="text-xs" style={{ color:'#7f867c' }}>{u.department || '—'}</span>}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {editingId === u.id ? (
                    <>
                      <button onClick={() => saveEdit(u.id)}
                        className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium transition-colors"
                        style={{ background:'rgba(0,200,150,0.12)', color:'#00d99b', border:'1px solid rgba(0,200,150,0.25)' }}>
                        <Save size={11}/> Save
                      </button>
                      <button onClick={cancelEdit}
                        className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition-colors"
                        style={{ background:'rgba(255,255,255,0.05)', color:'#7f867c', border:'1px solid rgba(255,255,255,0.08)' }}>
                        <X size={11}/> Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEdit(u)}
                        className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition-colors hover:bg-white/5"
                        style={{ color:'#60a5fa', border:'1px solid rgba(96,165,250,0.2)' }}>
                        <Edit3 size={11}/> Edit
                      </button>
                      <button onClick={() => deleteUser(u.id, u.name)}
                        disabled={deletingId === u.id}
                        className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition-colors hover:bg-red-500/10 disabled:opacity-40"
                        style={{ color:'#f87171', border:'1px solid rgba(239,68,68,0.2)' }}>
                        <Trash2 size={11}/> {deletingId === u.id ? '...' : 'Delete'}
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const roleLabels = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  evaluator: 'Evaluator',
};

const roleTitles = {
  evaluator: {
    dashboard: 'Evaluator Dashboard',
    exams: 'Assigned Exams',
    evaluate: 'Run AI Evaluation',
    question: 'Upload Question Paper',
    ideal: 'Add Ideal Answer Script',
    leniency: 'Set Leniency Range',
    criteria: 'Add Evaluation Criteria',
    bulk: 'Bulk Upload Answer Scripts',
    results: 'Evaluation Results',
    downloads: 'Download Reports',
  },
  admin: {
    dashboard: 'Admin Dashboard',
    evaluators: 'Manage Evaluators',
    'add-evaluator': 'Add Evaluator',
    exams: 'Managed Examinations',
    'assign-evaluator': 'Assign Evaluator to Examination',
    schedule: 'Upload Schedule',
    papers: 'Question Paper Approval',
    criteria: 'Evaluation Criteria Approval',
    progress: 'Evaluation Progress',
    evaluate: 'Run AI Evaluation',
    question: 'Upload Question Paper',
    ideal: 'Add Ideal Answer Script',
    leniency: 'Set Leniency Range',
    bulk: 'Bulk Upload Answer Scripts',
    results: 'Evaluation Results',
    downloads: 'Download Reports',
  },
  super_admin: {
    dashboard: 'Super Admin Dashboard',
    admins: 'Manage Admins',
    'add-admin': 'Add Admin',
    schedules: 'Examination Schedule',
    approvals: 'Schedule Approval',
    assign: 'Assign Admin to Examination',
    reports: 'Reports / Activity Logs',
    evaluators: 'Manage Evaluators',
    'add-evaluator': 'Add Evaluator',
    'assign-evaluator': 'Assign Evaluator to Examination',
    schedule: 'Upload Schedule',
    papers: 'Question Paper Approval',
    progress: 'Evaluation Progress',
    evaluate: 'Run AI Evaluation',
    question: 'Upload Question Paper',
    ideal: 'Add Ideal Answer Script',
    leniency: 'Set Leniency Range',
    criteria: 'Evaluation Criteria (Approval / Upload)',
    bulk: 'Bulk Upload Answer Scripts',
    results: 'Evaluation Results',
    downloads: 'Download Reports',
  },
};

function statusVariant(status) {
  if (String(status).includes('approved') || String(status).includes('completed')) return 'green';
  if (String(status).includes('reject')) return 'red';
  if (String(status).includes('pending')) return 'amber';
  return 'default';
}

function useRoleData() {
  const [data, setData] = useState({ users: [], exams: [], papers: [], criteria: [], scripts: [], results: [], institutes: [] });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const refresh = async () => {
    setLoading(true);
    try {
      const [users, exams, papers, criteria, scripts, results, institutes] = await Promise.allSettled([
        api.get('/users'),
        api.get('/examinations'),
        api.get('/question-papers'),
        api.get('/evaluation-criteria'),
        api.get('/answer-scripts'),
        api.get('/evaluation-results'),
        api.get('/institutes'),
      ]);
      // Backend already filters by role/institute — use all returned users
      setData({
        users:      users.status      === 'fulfilled' ? users.value.data      : [],
        exams:      exams.status      === 'fulfilled' ? exams.value.data      : [],
        papers:     papers.status     === 'fulfilled' ? papers.value.data     : [],
        criteria:   criteria.status   === 'fulfilled' ? criteria.value.data   : [],
        scripts:    scripts.status    === 'fulfilled' ? scripts.value.data    : [],
        results:    results.status    === 'fulfilled' ? results.value.data    : [],
        institutes: institutes.status === 'fulfilled' ? institutes.value.data : [],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);
  return { data, loading, message, setMessage, refresh };
}

function ShellMessage({ message }) {
  if (!message) return null;
  const isError = message.toLowerCase().includes('error') || message.toLowerCase().includes('required') || message.toLowerCase().includes('failed');
  return (
    <div className="rounded-lg px-3 py-2 text-xs" style={{
      background: isError ? 'rgba(239,68,68,0.08)' : 'rgba(0,200,150,0.08)',
      border: `1px solid ${isError ? 'rgba(239,68,68,0.25)' : 'rgba(0,200,150,0.18)'}`,
      color: isError ? '#f87171' : '#00d99b',
    }}>{message}</div>
  );
}

function DataTable({ columns, rows, empty = 'No records yet.' }) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/6">
              {columns.map(col => (
                <th key={col.key} className="text-left px-4 py-3 text-xs uppercase tracking-wider text-text-tertiary">{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.length ? rows.map((row, idx) => (
              <tr key={row.id || idx}>
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-3 text-text-secondary align-top">
                    {col.render ? col.render(row) : row[col.key] || '-'}
                  </td>
                ))}
              </tr>
            )) : (
              <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-text-tertiary">{empty}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ── UserForm — now accepts institutes for GoG ─────────────────────────────────
function UserForm({ role, targetRole: forcedTargetRole, institutes = [], onDone }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', department: '', instituteId: '' });
  const [busy, setBusy] = useState(false);

  // Determine what role we're creating
  const targetRole = forcedTargetRole || (role === 'super_admin' ? 'admin' : 'evaluator');

  // GoG needs to pick an institute; super_admin/admin inherit their own
  const needsInstitute = user?.role === 'gog';

  const submit = async (e) => {
    e.preventDefault();
    if (needsInstitute && !form.instituteId) {
      onDone?.('Please select an institute.');
      return;
    }
    setBusy(true);
    try {
      const payload = { ...form, role: targetRole, assignedExams: [] };
      if (!needsInstitute) delete payload.instituteId; // backend will auto-inherit
      await api.post('/users', payload);
      setForm({ name: '', email: '', password: '', department: '', instituteId: '' });
      onDone?.(`${targetRole === 'admin' ? 'Admin' : targetRole === 'super_admin' ? 'Super Admin' : 'Evaluator'} added successfully.`);
    } catch (err) {
      onDone?.(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card><CardContent>
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input label="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
        <Input label="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
        <Input label="Password (min 8 chars)" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={8} />
        <Input label="Department" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />

        {/* Institute selector — only shown when GoG is creating a user */}
        {needsInstitute && (
          <div className="md:col-span-2">
            <Select label="Institute *" value={form.instituteId} onChange={e => setForm({ ...form, instituteId: e.target.value })} required>
              <option value="">— Select Institute —</option>
              {institutes.map(inst => (
                <option key={inst.id} value={inst.id}>{inst.name}</option>
              ))}
            </Select>
          </div>
        )}

        <div className="md:col-span-2">
          <Button disabled={busy}>
            <Plus size={14} />
            {busy ? 'Adding...' : `Add ${targetRole === 'admin' ? 'Admin' : targetRole === 'super_admin' ? 'Super Admin' : 'Evaluator'}`}
          </Button>
        </div>
      </form>
    </CardContent></Card>
  );
}

function ExamForm({ role, onDone }) {
  const [form, setForm] = useState({ examName: '', subject: '', department: '', semester: '', date: '', time: '' });
  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/examinations', form);
      setForm({ examName: '', subject: '', department: '', semester: '', date: '', time: '' });
      onDone?.(role === 'admin' ? 'Schedule uploaded for approval.' : 'Examination schedule added.');
    } catch (err) {
      onDone?.(apiError(err));
    }
  };
  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  return (
    <Card><CardContent>
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Input label="Exam Name"  value={form.examName}   onChange={e => update('examName', e.target.value)}   required />
        <Input label="Subject"    value={form.subject}    onChange={e => update('subject', e.target.value)}    required />
        <Input label="Department" value={form.department} onChange={e => update('department', e.target.value)} required />
        <Input label="Semester"   value={form.semester}   onChange={e => update('semester', e.target.value)} />
        <Input label="Date" type="date" value={form.date} onChange={e => update('date', e.target.value)} />
        <Input label="Time" type="time" value={form.time} onChange={e => update('time', e.target.value)} />
        <div className="md:col-span-3">
          <Button><Send size={14} /> {role === 'admin' ? 'Upload Schedule' : 'Add Schedule'}</Button>
        </div>
      </form>
    </CardContent></Card>
  );
}

function ApprovalButtons({ endpoint, id, onDone }) {
  const review = async (status) => {
    const remarks = status === 'rejected' ? window.prompt('Remarks for rejection') || '' : '';
    try {
      await api.patch(`${endpoint}/${id}/review`, { status, remarks });
      onDone?.(`${status === 'approved' ? 'Approved' : 'Rejected'} successfully.`);
    } catch (err) {
      onDone?.(apiError(err));
    }
  };
  return (
    <div className="flex gap-2">
      <button onClick={() => review('approved')} className="text-green-400 hover:text-green-300"><Check size={15} /></button>
      <button onClick={() => review('rejected')} className="text-red-400 hover:text-red-300"><X size={15} /></button>
    </div>
  );
}

function ScheduleApproval({ exams, onDone }) {
  const review = async (exam, status) => {
    const remarks = status === 'rejected' ? window.prompt('Remarks for rejection') || '' : '';
    try {
      await api.patch(`/examinations/${exam.id}/schedule-review`, { status, remarks });
      onDone?.(`Schedule ${status}.`);
    } catch (err) {
      onDone?.(apiError(err));
    }
  };
  const pending = exams.filter(e => String(e.status).includes('pending'));
  return (
    <DataTable
      columns={[
        { key: 'examName',   label: 'Exam' },
        { key: 'subject',    label: 'Subject' },
        { key: 'department', label: 'Department' },
        { key: 'status',     label: 'Status', render: r => <Badge variant={statusVariant(r.status)}>{r.status}</Badge> },
        { key: 'actions',    label: 'Actions', render: r => (
          <div className="flex gap-2">
            <button onClick={() => review(r, 'approved')} className="text-green-400"><Check size={15} /></button>
            <button onClick={() => review(r, 'rejected')} className="text-red-400"><X size={15} /></button>
          </div>
        )},
      ]}
      rows={pending}
      empty="No pending schedules."
    />
  );
}

function AssignAdmin({ exams, admins, onDone }) {
  const [examId, setExamId] = useState('');
  const [adminId, setAdminId] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/examinations/${examId}/assign-admin`, { adminId });
      onDone?.('Admin assigned to examination.');
    } catch (err) {
      onDone?.(apiError(err));
    }
  };
  return (
    <Card><CardContent>
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Select label="Examination" value={examId} onChange={e => setExamId(e.target.value)} required>
          <option value="">Select exam</option>
          {exams.map(e => <option key={e.id} value={e.id}>{e.examName} - {e.subject}</option>)}
        </Select>
        <Select label="Admin" value={adminId} onChange={e => setAdminId(e.target.value)} required>
          <option value="">Select admin</option>
          {admins.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Select>
        <div className="flex items-end">
          <Button><ShieldCheck size={14} /> Assign Admin</Button>
        </div>
      </form>
    </CardContent></Card>
  );
}

function AssignEvaluator({ exams, evaluators, onDone }) {
  const [examId, setExamId] = useState('');
  const [evaluatorId, setEvaluatorId] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/examinations/${examId}/assign-evaluator`, { evaluatorId });
      setExamId(''); setEvaluatorId('');
      onDone?.('Evaluator assigned to examination.');
    } catch (err) {
      onDone?.(apiError(err));
    }
  };
  return (
    <Card><CardContent>
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Select label="Managed Examination" value={examId} onChange={e => setExamId(e.target.value)} required>
          <option value="">Select exam</option>
          {exams.map(e => <option key={e.id} value={e.id}>{e.examName} - {e.subject}</option>)}
        </Select>
        <Select label="Evaluator / Faculty" value={evaluatorId} onChange={e => setEvaluatorId(e.target.value)} required>
          <option value="">Select evaluator</option>
          {evaluators.map(e => <option key={e.id} value={e.id}>{e.name} - {e.department || 'Faculty'}</option>)}
        </Select>
        <div className="flex items-end">
          <Button><ShieldCheck size={14} /> Assign Evaluator</Button>
        </div>
      </form>
    </CardContent></Card>
  );
}

async function uploadToS3(file, purpose, examId) {
  const presign = await api.post('/uploads/presign', {
    purpose, fileName: file.name,
    fileType: file.type || 'application/pdf',
    fileSize: file.size, examId,
  });
  await fetch(presign.data.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/pdf' },
    body: file,
  });
  return presign.data.fileUrl;
}

function FileUploadPanel({ exams, type, onDone }) {
  const [examId, setExamId] = useState('');
  const [file, setFile] = useState(null);
  const [leniencyRange, setLeniencyRange] = useState(5);
  const [questions, setQuestions] = useState('');
  const purpose = type === 'question' ? 'question-paper' : type === 'ideal' ? 'ideal-answer' : 'evaluation-report';

  const submit = async (e) => {
    e.preventDefault();
    if (!file || file.type !== 'application/pdf') return onDone?.('Please select a PDF file.');
    try {
      const fileUrl = await uploadToS3(file, purpose, examId);
      if (type === 'question') await api.post('/question-papers', { examId, fileName: file.name, fileType: file.type, fileUrl });
      if (type === 'ideal')    await api.post('/evaluation-criteria', { examId, idealAnswerUrl: fileUrl, fileName: file.name, questions: [], leniencyRange });
      if (type === 'criteria') await api.post('/evaluation-criteria', { examId, idealAnswerUrl: '', questions: JSON.parse(questions || '[]'), leniencyRange });
      onDone?.('Uploaded successfully.');
    } catch (err) {
      onDone?.(apiError(err));
    }
  };

  return (
    <Card><CardContent>
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Select label="Exam" value={examId} onChange={e => setExamId(e.target.value)} required>
          <option value="">Select exam</option>
          {exams.map(e => <option key={e.id} value={e.id}>{e.examName} - {e.subject}</option>)}
        </Select>
        {type !== 'criteria' && (
          <Input label="PDF File" type="file" accept="application/pdf" onChange={e => setFile(e.target.files?.[0] || null)} required />
        )}
        {(type === 'criteria' || type === 'ideal') && (
          <Input label="Leniency Range (1-10)" type="number" min="1" max="10" value={leniencyRange} onChange={e => setLeniencyRange(Number(e.target.value))} />
        )}
        {type === 'criteria' && (
          <textarea
            className="md:col-span-3 bg-bg-2 border border-white/8 rounded-lg px-3 py-2 text-sm text-white outline-none"
            rows={6}
            placeholder='Questions JSON, e.g. [{"questionNo":"1","maxMarks":5,"criteria":["definition"]}]'
            value={questions}
            onChange={e => setQuestions(e.target.value)}
          />
        )}
        <div className="md:col-span-3"><Button><UploadCloud size={14} /> Submit</Button></div>
      </form>
    </CardContent></Card>
  );
}

function BulkUpload({ exams, onDone }) {
  const [examId, setExamId] = useState('');
  const [files, setFiles] = useState([]);
  const rows = useMemo(() => files.map(file => {
    const m = file.name.match(/^([A-Za-z][A-Za-z ]*)_([A-Za-z0-9-]+)_([A-Za-z0-9-]+)_([A-Za-z0-9-]+)_Answer_Script\.pdf$/);
    return { file, valid: Boolean(m), meta: m ? { studentName: m[1], rollNo: m[2], examName: m[3], subject: m[4] } : null };
  }), [files]);

  const upload = async () => {
    try {
      for (const row of rows.filter(r => r.valid)) {
        const fileUrl = await uploadToS3(row.file, 'answer-script', examId);
        await api.post('/answer-scripts', { examId, fileName: row.file.name, fileUrl, ...row.meta });
      }
      onDone?.('Valid answer scripts uploaded.');
    } catch (err) {
      onDone?.(apiError(err));
    }
  };

  return (
    <Card><CardContent className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Select label="Exam" value={examId} onChange={e => setExamId(e.target.value)} required>
          <option value="">Select exam</option>
          {exams.map(e => <option key={e.id} value={e.id}>{e.examName} - {e.subject}</option>)}
        </Select>
        <Input label="Bulk PDF Answer Scripts" type="file" accept="application/pdf" multiple onChange={e => setFiles(Array.from(e.target.files || []))} />
      </div>
      <DataTable
        columns={[
          { key: 'file',  label: 'File',       render: r => r.file.name },
          { key: 'valid', label: 'Validation',  render: r => <Badge variant={r.valid ? 'green' : 'red'}>{r.valid ? 'Valid' : 'Invalid name'}</Badge> },
          { key: 'meta',  label: 'Metadata',    render: r => r.valid ? `${r.meta.studentName} • ${r.meta.rollNo} • ${r.meta.examName} • ${r.meta.subject}` : 'Expected: StudentName_RollNo_ExamName_Subject_Answer_Script.pdf' },
          { key: 'remove',label: '',            render: r => !r.valid && <button onClick={() => setFiles(prev => prev.filter(f => f !== r.file))} className="text-red-400">Remove</button> },
        ]}
        rows={rows}
        empty="Choose files to validate."
      />
      <Button onClick={upload} disabled={!examId || !rows.some(r => r.valid)}>
        <FileUp size={14} /> Upload Valid Files
      </Button>
    </CardContent></Card>
  );
}

const isAtLeast = (role, targetRole) => {
  if (role === 'gog' || role === 'super_admin') return true;
  if (role === 'admin' && targetRole === 'evaluator') return true;
  return role === targetRole;
};

export default function RoleWorkspace({ role }) {
  const { section = 'dashboard' } = useParams();
  const { user } = useAuth();
  const { data, loading, message, setMessage, refresh } = useRoleData();
  const [openReport, setOpenReport] = useState(null);

  const admins     = data.users.filter(u => u.role === 'admin');
  const evaluators = data.users.filter(u => u.role === 'evaluator');

  const dashboardStats =
    role === 'super_admin' ? [
      ['Total Admins',       admins.length,                                                        Users,          '#00d99b'],
      ['Total Evaluators',   evaluators.length,                                                    Users,          '#60a5fa'],
      ['Total Examinations', data.exams.length,                                                    ClipboardCheck, '#a78bfa'],
      ['Pending Approvals',  data.exams.filter(e => String(e.status).includes('pending')).length,  Activity,       '#fbbf24'],
      ['Approved Schedules', data.exams.filter(e => String(e.status).includes('approved')).length, Check,          '#4ade80'],
      ['Saved Evaluations',  data.results.length,                                                  UploadCloud,    '#f472b6'],
    ]
    : role === 'admin' ? [
      ['Managed Exams',      data.exams.length,                                                    ClipboardCheck, '#00d99b'],
      ['Total Evaluators',   evaluators.length,                                                    Users,          '#60a5fa'],
      ['Pending Papers',     data.papers.filter(p => p.status === 'pending').length,               FileUp,         '#fbbf24'],
      ['Saved Evaluations',  data.results.length,                                                  Activity,       '#4ade80'],
    ]
    : [
      ['Assigned Exams',     data.exams.length,                                                    ClipboardCheck, '#00d99b'],
      ['Question Papers',    data.papers.length,                                                   FileUp,         '#60a5fa'],
      ['Approved Criteria',  data.criteria.filter(c => c.status === 'approved').length,            Check,          '#4ade80'],
      ['Saved Reports',      data.results.length,                                                  UploadCloud,    '#a78bfa'],
    ];

  const title = (roleTitles[role] || {})[section] || (roleTitles[role] || {}).dashboard || 'Workspace';

  return (
    <div className="min-h-screen" style={{ background: '#050705' }}>
      <PageHeader
        title={title}
        description={`${roleLabels[role] || role} workspace${user?.name ? ` for ${user.name}` : ''}`}
        action={
          <Button variant="secondary" onClick={refresh}>
            <RefreshCw size={13} /> {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        }
      />
      <Container className="py-6 space-y-5">
        <ShellMessage message={message} />

        {/* ── Dashboard ── */}
        {section === 'dashboard' && <>
          <div className={`grid gap-3 ${dashboardStats.length <= 4 ? "grid-cols-4" : "grid-cols-3"}`}>
            {dashboardStats.map(([label, value, Icon, accent]) => (
              <GradientStatCard key={label} label={label} value={value} icon={Icon} accent={accent} />
            ))}
          </div>
          <DataTable
            columns={[
              { key: 'examName', label: 'Recent Examinations' },
              { key: 'subject',  label: 'Subject' },
              { key: 'status',   label: 'Status', render: r => <Badge variant={statusVariant(r.status)}>{r.status || 'draft'}</Badge> },
            ]}
            rows={data.exams.slice(0, 6)}
          />
        </>}

        {/* ── Super Admin sections ── */}
        {section === 'admins'    && isAtLeast(role, 'super_admin') &&
          <UserManageTable users={admins} onDone={m => { setMessage(m); }} refresh={refresh} />
        }
        {section === 'add-admin' && isAtLeast(role, 'super_admin') &&
          <UserForm role="super_admin" targetRole="admin" institutes={data.institutes} onDone={m => { setMessage(m); refresh(); }} />
        }
        {section === 'schedules' && isAtLeast(role, 'super_admin') && <>
          <ExamForm role={role} onDone={setMessage} />
          <DataTable columns={[
            { key: 'examName', label: 'Exam' }, { key: 'subject', label: 'Subject' },
            { key: 'date', label: 'Date' },
            { key: 'status', label: 'Status', render: r => <Badge variant={statusVariant(r.status)}>{r.status}</Badge> },
          ]} rows={data.exams} />
        </>}
        {section === 'approvals' && isAtLeast(role, 'super_admin') &&
          <ScheduleApproval exams={data.exams} onDone={m => { setMessage(m); refresh(); }} />
        }
        {section === 'assign'   && isAtLeast(role, 'super_admin') &&
          <AssignAdmin exams={data.exams} admins={admins} onDone={m => { setMessage(m); refresh(); }} />
        }
        {section === 'reports'  && isAtLeast(role, 'super_admin') &&
          <DataTable columns={[
            { key: 'examName', label: 'Activity' },
            { key: 'status',   label: 'Status', render: r => <Badge variant={statusVariant(r.status)}>{r.status}</Badge> },
            { key: 'updatedAt',label: 'Updated' },
          ]} rows={data.exams} />
        }

        {/* ── Admin sections ── */}
        {section === 'evaluators'       && isAtLeast(role, 'admin') &&
          <UserManageTable users={evaluators} onDone={m => { setMessage(m); }} refresh={refresh} />
        }
        {section === 'add-evaluator'    && isAtLeast(role, 'admin') &&
          <UserForm role={role} targetRole="evaluator" institutes={data.institutes} onDone={m => { setMessage(m); refresh(); }} />
        }
        {section === 'exams' && isAtLeast(role, 'admin') &&
          <DataTable columns={[
            { key: 'examName',           label: 'Exam' },
            { key: 'subject',            label: 'Subject' },
            { key: 'semester',           label: 'Semester' },
            { key: 'assignedEvaluators', label: 'Evaluators', render: r => r.assignedEvaluators?.length || 0 },
            { key: 'status',             label: 'Status', render: r => <Badge variant={statusVariant(r.status)}>{r.status}</Badge> },
          ]} rows={data.exams} />
        }
        {/* ── Evaluator: Assigned Exams ── */}
        {section === 'exams' && role === 'evaluator' &&
          <DataTable columns={[
            { key: 'examName',  label: 'Exam Name' },
            { key: 'subject',   label: 'Subject' },
            { key: 'department',label: 'Department' },
            { key: 'semester',  label: 'Semester' },
            { key: 'date',      label: 'Date' },
            { key: 'status',    label: 'Status', render: r => <Badge variant={statusVariant(r.status)}>{r.status}</Badge> },
          ]} rows={data.exams} empty="No exams assigned yet." />
        }
        {section === 'assign-evaluator' && isAtLeast(role, 'admin') &&
          <AssignEvaluator exams={data.exams} evaluators={evaluators} onDone={m => { setMessage(m); refresh(); }} />
        }
        {section === 'schedule'         && isAtLeast(role, 'admin') &&
          <ExamForm role={role} onDone={setMessage} />
        }
        {section === 'papers'           && isAtLeast(role, 'admin') &&
          <DataTable columns={[
            { key: 'fileName', label: 'Question Paper' },
            { key: 'status',   label: 'Status', render: r => <Badge variant={statusVariant(r.status)}>{r.status}</Badge> },
            { key: 'actions',  label: 'Review', render: r => <ApprovalButtons endpoint="/question-papers" id={r.id} onDone={m => { setMessage(m); refresh(); }} /> },
          ]} rows={data.papers} />
        }
        {section === 'criteria'         && isAtLeast(role, 'admin') && role !== 'evaluator' &&
          <DataTable columns={[
            { key: 'examId',       label: 'Exam ID' },
            { key: 'leniencyRange',label: 'Leniency' },
            { key: 'status',       label: 'Status', render: r => <Badge variant={statusVariant(r.status)}>{r.status}</Badge> },
            { key: 'actions',      label: 'Review', render: r => <ApprovalButtons endpoint="/evaluation-criteria" id={r.id} onDone={m => { setMessage(m); refresh(); }} /> },
          ]} rows={data.criteria} />
        }
        {section === 'progress'         && isAtLeast(role, 'admin') &&
          <DataTable columns={[
            { key: 'studentName',      label: 'Student' },
            { key: 'rollNo',           label: 'Roll No' },
            { key: 'evaluationStatus', label: 'Status', render: r => <Badge variant={statusVariant(r.evaluationStatus)}>{r.evaluationStatus}</Badge> },
          ]} rows={data.scripts} />
        }

        {/* ── Evaluator sections ── */}
        {section === 'evaluate' && (
          <Card><CardContent className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white">Open the full AI evaluation workspace</p>
              <p className="text-xs mt-1 text-text-tertiary">Use this for OCR, AI grading, teacher review, report generation, and saved reports.</p>
            </div>
            <Link to="/evaluator/evaluate"
              className="inline-flex items-center rounded-lg transition-all duration-200 bg-emerald-500 hover:bg-emerald-600 text-black shadow-glow-sm font-semibold px-4 py-2 text-sm gap-2 w-fit">
              <Activity size={14} /> Run AI Evaluation
            </Link>
          </CardContent></Card>
        )}
        {section === 'question' && <FileUploadPanel exams={data.exams} type="question"  onDone={setMessage} />}
        {section === 'ideal'    && <FileUploadPanel exams={data.exams} type="ideal"     onDone={setMessage} />}
        {section === 'leniency' && <FileUploadPanel exams={data.exams} type="criteria"  onDone={setMessage} />}
        {section === 'criteria' && role === 'evaluator' && <FileUploadPanel exams={data.exams} type="criteria" onDone={setMessage} />}
        {section === 'bulk'     && <BulkUpload exams={data.exams} onDone={setMessage} />}

        {section === 'results' &&
          <DataTable columns={[
            { key: 'studentName', label: 'Student' },
            { key: 'rollNumber',  label: 'Roll No' },
            { key: 'subject',     label: 'Subject' },
            { key: 'marks',       label: 'Marks',  render: r => `${r.marks ?? 0} / ${r.maxMarks ?? 0}` },
            { key: 'percentage',  label: 'Score',  render: r => <Badge variant={Number(r.percentage) >= 75 ? 'green' : Number(r.percentage) >= 45 ? 'amber' : 'red'}>{r.percentage ?? 0}%</Badge> },
            { key: 'reviewStatus',label: 'Status', render: r => <Badge variant={statusVariant(r.reviewStatus)}>{r.reviewStatus}</Badge> },
          ]} rows={data.results} />
        }
        {section === 'downloads' &&
          <DataTable columns={[
            { key: 'studentName', label: 'Student' },
            { key: 'subject',     label: 'Subject' },
            { key: 'marks',       label: 'Marks',    render: r => `${r.marks ?? 0} / ${r.maxMarks ?? 0}` },
            { key: 'createdAt',   label: 'Generated' },
            { key: 'report',      label: 'Report',   render: r => (
              <button onClick={() => setOpenReport({ ...r.report, id: r.id })} className="text-emerald-400 hover:text-emerald-300">
                View / Download
              </button>
            )},
          ]} rows={data.results} />
        }

        {/* Report modal */}
        {openReport && (
          <div className="fixed inset-0 z-[80] overflow-y-auto p-6" style={{ background: 'rgba(0,0,0,0.78)' }}>
            <div className="max-w-6xl mx-auto">
              <ResultsPanel result={openReport} onClose={() => setOpenReport(null)} />
            </div>
          </div>
        )}
      </Container>
    </div>
  );
}