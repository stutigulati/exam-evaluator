import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, X, Play, RefreshCw, CheckCircle, XCircle, Clock, Loader, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { Container, PageHeader } from '../components/layout/Sidebar';
import { api } from '../lib/api';

// ── Tiny UI primitives (same style as rest of app) ────────────────────────────
function Card({ children, className = '' }) {
  return (
    <div className={`rounded-2xl border ${className}`}
      style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
      {children}
    </div>
  );
}
function CardContent({ children, className = '' }) {
  return <div className={`p-5 ${className}`}>{children}</div>;
}
function Badge({ children, variant = 'default' }) {
  const colours = {
    green:   { bg: 'rgba(74,222,128,0.12)',  text: '#4ade80',  border: 'rgba(74,222,128,0.25)'  },
    red:     { bg: 'rgba(248,113,113,0.12)', text: '#f87171',  border: 'rgba(248,113,113,0.25)' },
    amber:   { bg: 'rgba(251,191,36,0.12)',  text: '#fbbf24',  border: 'rgba(251,191,36,0.25)'  },
    blue:    { bg: 'rgba(96,165,250,0.12)',  text: '#60a5fa',  border: 'rgba(96,165,250,0.25)'  },
    default: { bg: 'rgba(255,255,255,0.06)', text: '#a2a59f',  border: 'rgba(255,255,255,0.10)' },
  };
  const c = colours[variant] || colours.default;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium"
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
      {children}
    </span>
  );
}
function Button({ children, onClick, disabled, variant = 'primary', className = '' }) {
  const base = 'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
  const styles = {
    primary:   { background: '#00d99b', color: '#050705' },
    secondary: { background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.10)' },
    danger:    { background: 'rgba(239,68,68,0.15)',   color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' },
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${className}`} style={styles[variant] || styles.primary}>
      {children}
    </button>
  );
}

// ── Status helpers ────────────────────────────────────────────────────────────
function statusVariant(s) {
  if (s === 'completed') return 'green';
  if (s === 'failed')    return 'red';
  if (s === 'processing') return 'blue';
  return 'amber';
}
function StatusIcon({ status, size = 14 }) {
  if (status === 'completed')  return <CheckCircle size={size} className="text-green-400" />;
  if (status === 'failed')     return <XCircle     size={size} className="text-red-400"   />;
  if (status === 'processing') return <Loader      size={size} className="text-blue-400 animate-spin" />;
  return <Clock size={size} className="text-amber-400" />;
}

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function BulkEvaluationPage() {
  // ── File state ──
  const [answerSheets, setAnswerSheets]   = useState([]);   // [{file, name, rollNo, classGrade}]
  const [questionPaper, setQuestionPaper] = useState(null);
  const [markingScheme, setMarkingScheme] = useState(null);
  const [msText, setMsText]               = useState('');

  // ── Setup state ──
  const [leniency, setLeniency] = useState(5);
  const [subject,  setSubject]  = useState('');

  // ── Batch tracking ──
  const [batchId,    setBatchId]    = useState(null);
  const [batchData,  setBatchData]  = useState(null);
  const [polling,    setPolling]    = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message,    setMessage]    = useState('');
  const pollRef = useRef(null);

  // ── Recent batches ──
  const [recentBatches,      setRecentBatches]      = useState([]);
  const [loadingRecent,      setLoadingRecent]       = useState(false);
  const [expandedBatchId,    setExpandedBatchId]     = useState(null);
  const [expandedBatchData,  setExpandedBatchData]   = useState({});

  const dropRef = useRef(null);

  // ── Load recent batches ───────────────────────────────────────────────────
  const loadRecent = useCallback(async () => {
    setLoadingRecent(true);
    try {
      const res = await api.get('/bulk-evaluation/batches');
      setRecentBatches(Array.isArray(res.data) ? res.data : []);
    } catch { setRecentBatches([]); }
    finally { setLoadingRecent(false); }
  }, []);

  useEffect(() => { loadRecent(); }, [loadRecent]);

  // ── Polling ───────────────────────────────────────────────────────────────
  const startPolling = useCallback((id) => {
    setPolling(true);
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/bulk-evaluation/batches/${id}/status`);
        setBatchData(res.data);
        const s = res.data.status;
        if (s === 'completed' || s === 'partially_failed' || s === 'failed') {
          clearInterval(pollRef.current);
          setPolling(false);
          loadRecent();
        }
      } catch { /* ignore */ }
    }, 3000);
  }, [loadRecent]);

  useEffect(() => () => clearInterval(pollRef.current), []);

  // ── File helpers ──────────────────────────────────────────────────────────
  const addSheets = (files) => {
    const valid = Array.from(files).filter(f => ALLOWED_TYPES.includes(f.type));
    if (valid.length < files.length) setMessage(`${files.length - valid.length} file(s) skipped — only PDF/image allowed.`);
    const FILENAME_RE = /^([A-Za-z][A-Za-z ]*)_([A-Za-z0-9-]+)_([A-Za-z0-9-]+)_([A-Za-z0-9-]+)[_ ]Answer[_ ]Script\.pdf$/i;
    const parsed = valid.map(f => {
      const m = f.name.match(FILENAME_RE);
      return {
        file:       f,
        name:       m ? m[1].replace(/_/g, ' ') : '',
        rollNo:     m ? m[2] : '',
        classGrade: m ? m[3] : '',
      };
    });
    setAnswerSheets(prev => [...prev, ...parsed]);
    // Auto-fill global subject from first parseable filename if subject not already set
    const firstMatch = valid.map(f => f.name.match(FILENAME_RE)).find(Boolean);
    if (firstMatch) setSubject(prev => prev || firstMatch[4]);
  };
  const removeSheet = (idx) => setAnswerSheets(prev => prev.filter((_, i) => i !== idx));
  const updateSheet = (idx, field, val) =>
    setAnswerSheets(prev => prev.map((s, i) => i === idx ? { ...s, [field]: val } : s));

  // ── Drag & drop ───────────────────────────────────────────────────────────
  const onDrop = (e) => {
    e.preventDefault();
    dropRef.current?.classList.remove('border-emerald-500/60');
    addSheets(e.dataTransfer.files);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleStart = async () => {
    if (!answerSheets.length) return setMessage('Please upload at least one answer sheet.');
    if (!questionPaper)       return setMessage('Please upload a question paper.');

    setSubmitting(true);
    setMessage('');
    try {
      const form = new FormData();
      answerSheets.forEach(s => form.append('answer_sheets', s.file));
      form.append('question_paper', questionPaper);
      if (markingScheme) form.append('marking_scheme_file', markingScheme);
      form.append('marking_scheme_text', msText);
      form.append('leniency', String(leniency));
      form.append('subject',  subject);
      form.append('student_names', JSON.stringify(answerSheets.map(s => s.name)));
      form.append('roll_numbers',  JSON.stringify(answerSheets.map(s => s.rollNo)));
      form.append('class_grades',  JSON.stringify(answerSheets.map(s => s.classGrade)));

      const res = await api.post('/bulk-evaluation/start', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const id = res.data.batchId;
      setBatchId(id);
      setBatchData({ status: 'processing', totalFiles: res.data.totalFiles, completedFiles: 0, failedFiles: 0, pendingFiles: res.data.totalFiles, jobs: [] });
      startPolling(id);
      setMessage('');
    } catch (err) {
      setMessage(err?.response?.data?.detail || 'Failed to start bulk evaluation.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Retry ─────────────────────────────────────────────────────────────────
  const retryJob = async (jobId) => {
    try {
      await api.post(`/bulk-evaluation/jobs/${jobId}/retry`);
      if (batchId) {
        const res = await api.get(`/bulk-evaluation/batches/${batchId}/status`);
        setBatchData(res.data);
        if (!polling) startPolling(batchId);
      }
    } catch (err) {
      setMessage(err?.response?.data?.detail || 'Retry failed.');
    }
  };

  // ── Expand recent batch ───────────────────────────────────────────────────
  const toggleExpand = async (id) => {
    if (expandedBatchId === id) { setExpandedBatchId(null); return; }
    setExpandedBatchId(id);
    if (!expandedBatchData[id]) {
      try {
        const res = await api.get(`/bulk-evaluation/batches/${id}/status`);
        setExpandedBatchData(prev => ({ ...prev, [id]: res.data }));
      } catch { /* ignore */ }
    }
  };

  // ── Progress bar ──────────────────────────────────────────────────────────
  const ProgressBar = ({ total, completed, failed }) => {
    const pct = total > 0 ? Math.round(((completed + failed) / total) * 100) : 0;
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs" style={{ color: '#a2a59f' }}>
          <span>{completed} completed · {failed} failed · {total - completed - failed} pending</span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div className="h-full rounded-full transition-all duration-500" style={{
            width: `${pct}%`,
            background: failed > 0 ? 'linear-gradient(90deg, #00d99b, #fbbf24)' : '#00d99b',
          }} />
        </div>
      </div>
    );
  };

  // ── Job row ───────────────────────────────────────────────────────────────
  const JobRow = ({ job, showRetry = false }) => (
    <div className="flex items-center gap-3 py-2.5 border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
      <StatusIcon status={job.status} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-white truncate">{job.fileName}</p>
        {(job.studentName || job.rollNumber) && (
          <p className="text-xs mt-0.5" style={{ color: '#7f867c' }}>
            {job.studentName}{job.rollNumber ? ` · ${job.rollNumber}` : ''}
          </p>
        )}
        {job.errorMessage && (
          <p className="text-xs mt-0.5 text-red-400 truncate">{job.errorMessage}</p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {job.status === 'completed' && job.percentage != null && (
          <Badge variant={job.percentage >= 75 ? 'green' : job.percentage >= 45 ? 'amber' : 'red'}>
            {job.marks ?? 0}/{job.maxMarks ?? 0} · {job.percentage}%
          </Badge>
        )}
        <Badge variant={statusVariant(job.status)}>{job.status}</Badge>
        {job.status === 'completed' && job.reportId && (
          <a href={`/evaluator/downloads`}
            className="text-xs px-2 py-0.5 rounded-lg font-medium"
            style={{ background: 'rgba(0,217,155,0.12)', color: '#00d99b', border: '1px solid rgba(0,217,155,0.25)' }}>
            View
          </a>
        )}
        {showRetry && job.status === 'failed' && (
          <Button variant="danger" className="!px-2 !py-0.5 !text-xs" onClick={() => retryJob(job._id || job.id)}>
            Retry
          </Button>
        )}
      </div>
    </div>
  );

  const isRunning = batchData && !['completed', 'partially_failed', 'failed'].includes(batchData.status);

  return (
    <div className="min-h-screen" style={{ background: '#050705' }}>
      <PageHeader
        title="Bulk Evaluation"
        description="Evaluate multiple answer sheets at once using the same AI evaluation engine"
        action={
          <Button variant="secondary" onClick={loadRecent}>
            <RefreshCw size={13} /> Refresh
          </Button>
        }
      />
      <Container className="py-6 space-y-5">

        {/* ── Message ── */}
        {message && (
          <div className="rounded-lg px-3 py-2 text-xs"
            style={{
              background: message.toLowerCase().includes('fail') || message.toLowerCase().includes('error')
                ? 'rgba(239,68,68,0.08)' : 'rgba(0,200,150,0.08)',
              border: `1px solid ${message.toLowerCase().includes('fail') || message.toLowerCase().includes('error')
                ? 'rgba(239,68,68,0.25)' : 'rgba(0,200,150,0.18)'}`,
              color: message.toLowerCase().includes('fail') || message.toLowerCase().includes('error')
                ? '#f87171' : '#00d99b',
            }}>
            {message}
          </div>
        )}

        {/* ── Upload + Setup (hidden while a batch is running) ── */}
        {!batchData && (
          <>
            {/* Answer sheet upload */}
            <Card>
              <CardContent>
                <p className="text-sm font-semibold text-white mb-3">Answer Sheets</p>

                {/* Drag-drop zone */}
                <div
                  ref={dropRef}
                  onDragOver={(e) => { e.preventDefault(); dropRef.current?.classList.add('border-emerald-500/60'); }}
                  onDragLeave={() => dropRef.current?.classList.remove('border-emerald-500/60')}
                  onDrop={onDrop}
                  onClick={() => document.getElementById('sheet-input').click()}
                  className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors duration-200"
                  style={{ borderColor: 'rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.02)' }}
                >
                  <Upload size={24} className="mx-auto mb-2" style={{ color: '#00d99b' }} />
                  <p className="text-sm text-white font-medium">Drag & drop answer sheets here</p>
                  <p className="text-xs mt-1" style={{ color: '#7f867c' }}>or click to browse · PDF, JPG, PNG, WebP</p>
                  <input id="sheet-input" type="file" multiple accept=".pdf,image/*" className="hidden"
                    onChange={e => { addSheets(e.target.files); e.target.value = ''; }} />
                </div>

                {/* File list */}
                {answerSheets.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#7f867c' }}>
                      {answerSheets.length} file{answerSheets.length > 1 ? 's' : ''} selected
                    </p>
                    {answerSheets.map((s, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <FileText size={14} style={{ color: '#00d99b', flexShrink: 0 }} />
                        <span className="text-xs text-white truncate flex-1">{s.file.name}</span>
                        <input
                          className="text-xs px-2 py-1 rounded-lg w-28"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: '#e2e8f0' }}
                          placeholder="Student name"
                          value={s.name}
                          onChange={e => updateSheet(idx, 'name', e.target.value)}
                        />
                        <input
                          className="text-xs px-2 py-1 rounded-lg w-24"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: '#e2e8f0' }}
                          placeholder="Roll no."
                          value={s.rollNo}
                          onChange={e => updateSheet(idx, 'rollNo', e.target.value)}
                        />
                        <input
                          className="text-xs px-2 py-1 rounded-lg w-20"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: '#e2e8f0' }}
                          placeholder="Class"
                          value={s.classGrade}
                          onChange={e => updateSheet(idx, 'classGrade', e.target.value)}
                        />
                        <button onClick={() => removeSheet(idx)} className="text-red-400 hover:text-red-300 flex-shrink-0">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Evaluation setup */}
            <Card>
              <CardContent>
                <p className="text-sm font-semibold text-white mb-4">Evaluation Setup</p>
                <div className="grid grid-cols-2 gap-4">
                  {/* Question paper */}
                  <div>
                    <label className="text-xs font-medium mb-1.5 block" style={{ color: '#a2a59f' }}>
                      Question Paper <span className="text-red-400">*</span>
                    </label>
                    <label className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-colors"
                      style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${questionPaper ? 'rgba(0,217,155,0.4)' : 'rgba(255,255,255,0.10)'}` }}>
                      <FileText size={14} style={{ color: questionPaper ? '#00d99b' : '#7f867c' }} />
                      <span className="text-xs truncate" style={{ color: questionPaper ? '#00d99b' : '#7f867c' }}>
                        {questionPaper ? questionPaper.name : 'Upload question paper'}
                      </span>
                      <input type="file" accept=".pdf,image/*" className="hidden"
                        onChange={e => setQuestionPaper(e.target.files[0] || null)} />
                    </label>
                  </div>

                  {/* Marking scheme */}
                  <div>
                    <label className="text-xs font-medium mb-1.5 block" style={{ color: '#a2a59f' }}>
                      Marking Scheme (optional)
                    </label>
                    <label className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-colors"
                      style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${markingScheme ? 'rgba(0,217,155,0.4)' : 'rgba(255,255,255,0.10)'}` }}>
                      <FileText size={14} style={{ color: markingScheme ? '#00d99b' : '#7f867c' }} />
                      <span className="text-xs truncate" style={{ color: markingScheme ? '#00d99b' : '#7f867c' }}>
                        {markingScheme ? markingScheme.name : 'Upload marking scheme'}
                      </span>
                      <input type="file" accept=".pdf,image/*" className="hidden"
                        onChange={e => setMarkingScheme(e.target.files[0] || null)} />
                    </label>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="text-xs font-medium mb-1.5 block" style={{ color: '#a2a59f' }}>Subject</label>
                    <input
                      className="w-full px-3 py-2 rounded-xl text-sm"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: '#e2e8f0' }}
                      placeholder="e.g. Mathematics"
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                    />
                  </div>

                  {/* Leniency */}
                  <div>
                    <label className="text-xs font-medium mb-1.5 block" style={{ color: '#a2a59f' }}>
                      Leniency: {leniency}/10 &nbsp;
                      <span style={{ color: '#7f867c' }}>
                        {leniency <= 3 ? '(Strict)' : leniency <= 6 ? '(Moderate)' : '(Lenient)'}
                      </span>
                    </label>
                    <input type="range" min={1} max={10} value={leniency}
                      onChange={e => setLeniency(Number(e.target.value))}
                      className="w-full accent-emerald-400" />
                  </div>

                  {/* Marking scheme text */}
                  <div className="col-span-2">
                    <label className="text-xs font-medium mb-1.5 block" style={{ color: '#a2a59f' }}>
                      Marking Scheme Text (optional, used for all sheets)
                    </label>
                    <textarea
                      rows={3}
                      className="w-full px-3 py-2 rounded-xl text-sm resize-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: '#e2e8f0' }}
                      placeholder="Paste marking scheme text here..."
                      value={msText}
                      onChange={e => setMsText(e.target.value)}
                    />
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-3">
                  <Button onClick={handleStart} disabled={submitting || !answerSheets.length || !questionPaper}>
                    {submitting ? <><Loader size={14} className="animate-spin" /> Starting...</> : <><Play size={14} /> Start Bulk Evaluation</>}
                  </Button>
                  <span className="text-xs" style={{ color: '#7f867c' }}>
                    {answerSheets.length} sheet{answerSheets.length !== 1 ? 's' : ''} queued
                  </span>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* ── Active Batch Progress ── */}
        {batchData && (
          <Card>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-white">Batch Progress</p>
                  <p className="text-xs mt-0.5" style={{ color: '#7f867c' }}>ID: {batchId}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={statusVariant(batchData.status)}>{batchData.status}</Badge>
                  {isRunning && <Loader size={14} className="animate-spin text-emerald-400" />}
                  {!isRunning && (
                    <Button variant="secondary" onClick={() => { setBatchData(null); setBatchId(null); setAnswerSheets([]); setQuestionPaper(null); setMarkingScheme(null); setMsText(''); }}>
                      New Batch
                    </Button>
                  )}
                </div>
              </div>

              <ProgressBar
                total={batchData.totalFiles || 0}
                completed={batchData.completedFiles || 0}
                failed={batchData.failedFiles || 0}
              />

              {/* Per-job list */}
              {batchData.jobs && batchData.jobs.length > 0 && (
                <div className="mt-4 rounded-xl overflow-hidden"
                  style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                  {batchData.jobs.map((job, idx) => (
                    <JobRow key={job._id || job.id || idx} job={job} showRetry={!isRunning} />
                  ))}
                </div>
              )}
              {isRunning && (!batchData.jobs || batchData.jobs.length === 0) && (
                <p className="text-xs mt-3" style={{ color: '#7f867c' }}>Waiting for jobs to start...</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Recent Batches ── */}
        <Card>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-white">Recent Bulk Batches</p>
              <button onClick={loadRecent} className="text-xs" style={{ color: '#7f867c' }}>
                {loadingRecent ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {recentBatches.length === 0 ? (
              <p className="text-xs" style={{ color: '#7f867c' }}>No bulk evaluation batches yet.</p>
            ) : (
              <div className="space-y-2">
                {recentBatches.map((batch) => {
                  const expanded = expandedBatchId === (batch._id || batch.id);
                  const bId = batch._id || batch.id;
                  const expData = expandedBatchData[bId];
                  return (
                    <div key={bId} className="rounded-xl overflow-hidden"
                      style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                      {/* Batch header row */}
                      <button
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
                        onClick={() => toggleExpand(bId)}
                      >
                        <StatusIcon status={batch.status} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white">
                            {batch.subject || 'Untitled batch'} &nbsp;·&nbsp;
                            <span style={{ color: '#7f867c' }}>{batch.totalFiles} files</span>
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: '#7f867c' }}>
                            {batch.createdAt ? new Date(batch.createdAt).toLocaleString() : ''} &nbsp;·&nbsp; ID: {bId}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant={statusVariant(batch.status)}>{batch.status}</Badge>
                          <span className="text-xs" style={{ color: '#7f867c' }}>
                            {batch.completedFiles}/{batch.totalFiles}
                          </span>
                          {expanded ? <ChevronUp size={14} style={{ color: '#7f867c' }} /> : <ChevronDown size={14} style={{ color: '#7f867c' }} />}
                        </div>
                      </button>

                      {/* Expanded job list */}
                      {expanded && (
                        <div className="px-4 pb-3"
                          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                          {!expData ? (
                            <p className="text-xs py-2" style={{ color: '#7f867c' }}>Loading jobs...</p>
                          ) : expData.jobs && expData.jobs.length > 0 ? (
                            expData.jobs.map((job, idx) => (
                              <JobRow key={job._id || job.id || idx} job={job} showRetry={true} />
                            ))
                          ) : (
                            <p className="text-xs py-2" style={{ color: '#7f867c' }}>No job details available.</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

      </Container>
    </div>
  );
}
