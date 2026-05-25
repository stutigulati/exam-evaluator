import { useState, useRef, useEffect } from 'react';
import { Search, Medal, Download, FileDown, CheckSquare, Square, X, ChevronDown } from 'lucide-react';
import { Container, PageHeader } from '../components/layout/Sidebar';
import { Badge, StatCard } from '../components/ui/primitives';
import { cn, pctColor } from '../lib/utils';
import { api } from '../lib/api';

// MOCK_RECORDS — used only as fallback when no real data exists from MongoDB
const MOCK_RECORDS = [
  { rank: 1,  name: 'Shreyash Khare',   enrollment: 'BT22CSE043', class: 'CSE A', subject: 'Algorithms',        marks: 10, max: 10, passed: true  },
  { rank: 2,  name: 'Stuti Gulati',     enrollment: 'BT22CSE041', class: 'CSE A', subject: 'Data Structures',   marks: 9,  max: 10, passed: true  },
  { rank: 3,  name: 'Nisha Verma',      enrollment: 'BT22CSE047', class: 'CSE A', subject: 'General Knowledge', marks: 9,  max: 10, passed: true  },
  { rank: 4,  name: 'Kavya Reddy',      enrollment: 'BT22CSE050', class: 'CSE A', subject: 'Computer Networks', marks: 9,  max: 10, passed: true  },
  { rank: 5,  name: 'Saumya Tripathi',  enrollment: 'BT22CSE042', class: 'CSE B', subject: 'Mathematics',       marks: 8,  max: 10, passed: true  },
  { rank: 6,  name: 'Nisha Verma',      enrollment: 'BT22CSE047', class: 'CSE A', subject: 'English',           marks: 8,  max: 10, passed: true  },
  { rank: 7,  name: 'Priya Sharma',     enrollment: 'BT22CSE045', class: 'CSE B', subject: 'English',           marks: 8,  max: 10, passed: true  },
  { rank: 8,  name: 'Yash Hirani',      enrollment: 'BT22CSE044', class: 'CSE C', subject: 'DBMS',              marks: 7,  max: 10, passed: true  },
  { rank: 9,  name: 'Stuti Gulati',     enrollment: 'BT22CSE041', class: 'CSE A', subject: 'Computer Networks', marks: 7,  max: 10, passed: true  },
  { rank: 10, name: 'Aarav Singh',      enrollment: 'BT22CSE049', class: 'CSE C', subject: 'DBMS',              marks: 7,  max: 10, passed: true  },
  { rank: 11, name: 'Saumya Tripathi',  enrollment: 'BT22CSE042', class: 'CSE B', subject: 'Physics',           marks: 6,  max: 10, passed: true  },
  { rank: 12, name: 'Arjun Mehta',      enrollment: 'BT22CSE046', class: 'CSE C', subject: 'Chemistry',         marks: 6,  max: 10, passed: true  },
  { rank: 13, name: 'Aarav Singh',      enrollment: 'BT22CSE049', class: 'CSE C', subject: 'Algorithms',        marks: 6,  max: 10, passed: true  },
  { rank: 14, name: 'Yash Hirani',      enrollment: 'BT22CSE044', class: 'CSE C', subject: 'Operating Systems', marks: 5,  max: 10, passed: true  },
  { rank: 15, name: 'Arjun Mehta',      enrollment: 'BT22CSE046', class: 'CSE C', subject: 'Mathematics',       marks: 4,  max: 10, passed: false },
  { rank: 16, name: 'Rohan Kapoor',     enrollment: 'BT22CSE048', class: 'CSE B', subject: 'Physics',           marks: 3,  max: 10, passed: false },
];

/** Map an evaluation-result document from MongoDB to the ALL_RECORDS row shape. */
function apiResultToRecord(r, idx) {
  const max = Number(r.maxMarks) || 0;
  const marks = Number(r.marks) || 0;
  return {
    rank:       idx + 1,
    name:       r.studentName  || 'Unknown',
    enrollment: r.rollNumber   || '—',
    class:      r.classGrade   || '—',
    subject:    r.subject      || 'Unspecified',
    marks,
    max,
    passed:     max > 0 ? (marks / max) >= 0.33 : false,
  };
}

// All available CSV fields with labels and value extractors
const CSV_FIELDS = [
  { key: 'rank',        label: 'Rank',        get: r => r.rank },
  { key: 'name',        label: 'Student Name', get: r => r.name },
  { key: 'enrollment',  label: 'Enrollment No.', get: r => r.enrollment },
  { key: 'class',       label: 'Class',        get: r => r.class },
  { key: 'subject',     label: 'Subject',      get: r => r.subject },
  { key: 'marks',       label: 'Marks',        get: r => r.marks },
  { key: 'max',         label: 'Max Marks',    get: r => r.max },
  { key: 'percentage',  label: 'Percentage',   get: r => Math.round((r.marks / r.max) * 100) + '%' },
  { key: 'passed',      label: 'Result',       get: r => r.passed ? 'Passed' : 'Failed' },
];

const MEDAL = [
  { icon: Medal, color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20' },
  { icon: Medal, color: 'text-slate-300',  bg: 'bg-slate-500/10 border-slate-500/20' },
  { icon: Medal, color: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/20' },
];

function Avatar({ name }) {
  const colors = [
    'from-emerald-500/30 to-teal-500/30 text-emerald-300 border-emerald-500/25',
    'from-blue-500/30 to-cyan-500/30 text-blue-300 border-blue-500/25',
    'from-teal-500/30 to-pink-500/30 text-teal-300 border-teal-500/25',
    'from-emerald-500/30 to-teal-500/30 text-emerald-300 border-emerald-500/25',
    'from-amber-500/30 to-orange-500/30 text-amber-300 border-amber-500/25',
    'from-rose-500/30 to-red-500/30 text-rose-300 border-rose-500/25',
  ];
  const idx = (name.charCodeAt(0) + name.charCodeAt(1)) % colors.length;
  return (
    <div className={cn('w-8 h-8 rounded-full bg-gradient-to-br border flex items-center justify-center flex-shrink-0 text-xs font-semibold', colors[idx])}>
      {name[0].toUpperCase()}
    </div>
  );
}

// ── CSV download helpers ───────────────────────────────────────────────────────
function buildCSV(records, fieldKeys) {
  const fields = CSV_FIELDS.filter(f => fieldKeys.includes(f.key));
  const header = fields.map(f => `"${f.label}"`).join(',');
  const rows = records.map(r =>
    fields.map(f => {
      const val = String(f.get(r));
      return `"${val.replace(/"/g, '""')}"`;
    }).join(',')
  );
  return [header, ...rows].join('\r\n');
}

function triggerDownload(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Download dropdown component ───────────────────────────────────────────────
function DownloadMenu({ filtered }) {
  const [open, setOpen]           = useState(false);
  const [mode, setMode]           = useState(null); // null | 'custom'
  const [selected, setSelected]   = useState(CSV_FIELDS.map(f => f.key));
  const [justDownloaded, setJustDownloaded] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setMode(null); } };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggleField = (key) => {
    setSelected(prev =>
      prev.includes(key) ? (prev.length > 1 ? prev.filter(k => k !== key) : prev) : [...prev, key]
    );
  };

  const doDownload = (fieldKeys) => {
    const ts = new Date().toISOString().slice(0, 10);
    triggerDownload(buildCSV(filtered, fieldKeys), `performance_${ts}.csv`);
    setJustDownloaded(true);
    setOpen(false);
    setMode(null);
    setTimeout(() => setJustDownloaded(false), 2000);
  };

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => { setOpen(v => !v); setMode(null); }}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
        style={{
          background: justDownloaded
            ? 'rgba(74,222,128,0.15)'
            : 'linear-gradient(135deg, #00c896, #3ee67f)',
          color: justDownloaded ? '#4ade80' : '#04110b',
          border: justDownloaded ? '1px solid rgba(74,222,128,0.35)' : 'none',
          boxShadow: justDownloaded ? 'none' : '0 0 18px rgba(0,200,150,0.35)',
        }}
      >
        <Download size={14} />
        {justDownloaded ? 'Downloaded ✓' : 'Download CSV'}
        <ChevronDown size={12} style={{ opacity: 0.7, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 z-50 rounded-2xl overflow-hidden"
          style={{
            width: mode === 'custom' ? 320 : 220,
            background: '#111311',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          }}
        >
          {mode === null && (
            <>
              {/* Header */}
              <div className="px-4 py-3 flex items-center justify-between"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#7f867c' }}>Export as CSV</span>
                <button onClick={() => setOpen(false)}>
                  <X size={13} style={{ color: '#61665f' }} />
                </button>
              </div>

              {/* Options */}
              <div className="p-2 space-y-1">
                {/* Standard */}
                <button
                  onClick={() => doDownload(CSV_FIELDS.map(f => f.key))}
                  className="w-full flex items-start gap-3 px-3 py-3 rounded-xl text-left transition-colors hover:bg-white/5"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: 'rgba(0,200,150,0.15)', border: '1px solid rgba(0,200,150,0.25)' }}>
                    <FileDown size={14} style={{ color: '#00d99b' }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Standard CSV</p>
                    <p className="text-xs mt-0.5" style={{ color: '#61665f' }}>All {CSV_FIELDS.length} fields · {filtered.length} rows</p>
                  </div>
                </button>

                {/* Custom */}
                <button
                  onClick={() => setMode('custom')}
                  className="w-full flex items-start gap-3 px-3 py-3 rounded-xl text-left transition-colors hover:bg-white/5"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)' }}>
                    <CheckSquare size={14} style={{ color: '#a78bfa' }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Custom Fields</p>
                    <p className="text-xs mt-0.5" style={{ color: '#61665f' }}>Choose which columns to include</p>
                  </div>
                </button>
              </div>

              <div className="px-4 pb-3 pt-1">
                <p className="text-[10px]" style={{ color: '#4f564f' }}>
                  Exports current filtered view · {filtered.length} record{filtered.length !== 1 ? 's' : ''}
                </p>
              </div>
            </>
          )}

          {mode === 'custom' && (
            <>
              {/* Header */}
              <div className="px-4 py-3 flex items-center justify-between"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center gap-2">
                  <button onClick={() => setMode(null)}>
                    <ChevronDown size={13} style={{ color: '#61665f', transform: 'rotate(90deg)' }} />
                  </button>
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#7f867c' }}>Select Fields</span>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded-md"
                  style={{ background: 'rgba(0,200,150,0.12)', color: '#00d99b' }}>
                  {selected.length}/{CSV_FIELDS.length}
                </span>
              </div>

              {/* Field checkboxes */}
              <div className="p-2">
                {CSV_FIELDS.map(f => {
                  const on = selected.includes(f.key);
                  return (
                    <button
                      key={f.key}
                      onClick={() => toggleField(f.key)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-white/5"
                    >
                      <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
                        style={{
                          background: on ? 'rgba(0,200,150,0.2)' : 'rgba(255,255,255,0.04)',
                          border: on ? '1px solid rgba(0,200,150,0.5)' : '1px solid rgba(255,255,255,0.12)',
                        }}>
                        {on && <div className="w-2 h-2 rounded-sm" style={{ background: '#00d99b' }} />}
                      </div>
                      <span className="text-sm text-left flex-1" style={{ color: on ? '#f4f5f2' : '#7f867c' }}>
                        {f.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Select all / none */}
              <div className="px-3 pb-2 flex gap-2">
                <button onClick={() => setSelected(CSV_FIELDS.map(f => f.key))}
                  className="text-[11px] px-2 py-1 rounded-md transition-colors"
                  style={{ color: '#00d99b', background: 'rgba(0,200,150,0.08)' }}>
                  Select all
                </button>
                <button onClick={() => setSelected([CSV_FIELDS[0].key])}
                  className="text-[11px] px-2 py-1 rounded-md transition-colors"
                  style={{ color: '#a2a59f', background: 'rgba(255,255,255,0.05)' }}>
                  Clear
                </button>
              </div>

              {/* Download button */}
              <div className="p-3 pt-0">
                <button
                  onClick={() => doDownload(selected)}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #00c896, #3ee67f)',
                    color: '#04110b',
                    boxShadow: '0 0 14px rgba(0,200,150,0.3)',
                  }}
                >
                  <FileDown size={13} className="inline mr-1.5 -mt-0.5" />
                  Download {selected.length} field{selected.length !== 1 ? 's' : ''} · {filtered.length} rows
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PerformancePage() {
  const [search,     setSearch]     = useState('');
  const [subject,    setSubject]    = useState('All Subjects');
  const [classF,     setClassF]     = useState('All Classes');
  const [allRecords, setAllRecords] = useState(null); // null = loading

  // Load records from MongoDB on mount
  useEffect(() => {
    api.get('/evaluation-results')
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : [];
        if (data.length > 0) {
          // Sort by marks descending before assigning ranks
          const sorted = [...data].sort((a, b) => {
            const pA = Number(a.maxMarks) > 0 ? Number(a.marks) / Number(a.maxMarks) : 0;
            const pB = Number(b.maxMarks) > 0 ? Number(b.marks) / Number(b.maxMarks) : 0;
            return pB - pA;
          });
          setAllRecords(sorted.map(apiResultToRecord));
        } else {
          setAllRecords(MOCK_RECORDS);
        }
      })
      .catch(() => {
        setAllRecords(MOCK_RECORDS);
      });
  }, []);

  // While loading, use mock records so the page doesn't flash empty
  const ALL_RECORDS = allRecords ?? MOCK_RECORDS;

  // Dynamically build subject/class filter options from actual data
  const SUBJECTS = ['All Subjects', ...new Set(ALL_RECORDS.map(r => r.subject).filter(Boolean))];
  const CLASSES  = ['All Classes',  ...new Set(ALL_RECORDS.map(r => r.class).filter(Boolean))];

  const filtered = ALL_RECORDS.filter(r =>
    (subject === 'All Subjects' || r.subject === subject) &&
    (classF  === 'All Classes'  || r.class   === classF) &&
    (r.name.toLowerCase().includes(search.toLowerCase()) || r.enrollment.includes(search))
  ).map((r, i) => ({ ...r, rank: i + 1 }));

  const total    = filtered.length;
  const passed   = filtered.filter(r => r.passed).length;
  const failed   = filtered.filter(r => !r.passed).length;
  const avgScore = total > 0
    ? Math.round(filtered.reduce((a, r) => a + (r.marks / r.max * 100), 0) / total)
    : 0;

  return (
    <div className="min-h-screen" style={{ background: '#050705' }}>
      <PageHeader
        title="Student Performance"
        description="Subject-wise rankings from highest to lowest. Students below 33% are marked failed."
        gradient
        action={<DownloadMenu filtered={filtered} />}
      />

      <Container className="py-6 space-y-5">

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total Records" value={total} />
          <StatCard label="Passed"        value={passed} color="text-green-400" />
          <StatCard label="Failed"        value={failed} color="text-red-400" />
          <StatCard label="Avg Score"     value={`${avgScore}%`} color={pctColor(avgScore)} />
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-56">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search student name or enrollment…"
              className="w-full bg-bg-1 border border-white/7 rounded-xl pl-8 pr-3 py-2.5 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-emerald-500/40 transition-colors"
            />
          </div>
          <select value={subject} onChange={e => setSubject(e.target.value)}
            className="bg-bg-1 border border-white/7 rounded-xl px-4 py-2.5 text-sm text-text-secondary focus:outline-none cursor-pointer min-w-44">
            {SUBJECTS.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={classF} onChange={e => setClassF(e.target.value)}
            className="bg-bg-1 border border-white/7 rounded-xl px-4 py-2.5 text-sm text-text-secondary focus:outline-none cursor-pointer min-w-36">
            {CLASSES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        {/* ── Ranking table ── */}
        <div className="bg-bg-1 border border-white/7 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 flex items-center justify-between border-b border-white/6">
            <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
              Ranking List · Highest to lowest · {total} record{total !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/6">
                  {['Rank', 'Student', 'Subject', 'Marks', 'Percentage', 'Result'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((s, i) => {
                  const pct   = Math.round((s.marks / s.max) * 100);
                  const medal = i < 3 ? MEDAL[i] : null;
                  return (
                    <tr key={`${s.name}-${s.subject}-${i}`}
                      className="hover:bg-white/2 transition-colors group">

                      {/* Rank */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        {medal ? (
                          <div className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-semibold', medal.bg)}>
                            <medal.icon size={12} className={medal.color} />
                            <span className={medal.color}>{s.rank}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-text-tertiary font-mono pl-2">{s.rank}</span>
                        )}
                      </td>

                      {/* Student */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={s.name} />
                          <div>
                            <p className="text-sm font-medium text-text-primary whitespace-nowrap">{s.name}</p>
                            <p className="text-xs text-text-tertiary">{s.enrollment} · {s.class}</p>
                          </div>
                        </div>
                      </td>

                      {/* Subject */}
                      <td className="px-5 py-4">
                        <Badge variant="indigo">{s.subject}</Badge>
                      </td>

                      {/* Marks */}
                      <td className="px-5 py-4">
                        <span className={cn('text-sm font-semibold font-mono', pctColor(pct))}>
                          {s.marks}/{s.max}
                        </span>
                      </td>

                      {/* Percentage */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Badge variant={pct >= 75 ? 'green' : pct >= 50 ? 'amber' : 'red'}>{pct}%</Badge>
                          <div className="w-16 bg-white/8 rounded-full h-1 hidden sm:block">
                            <div
                              className={cn('h-1 rounded-full', pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500')}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Result */}
                      <td className="px-5 py-4">
                        <Badge variant={s.passed ? 'green' : 'red'}>{s.passed ? 'Passed' : 'Failed'}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <div className="py-16 text-center">
                <p className="text-sm text-text-secondary">No records match the current filters</p>
                <p className="text-xs text-text-tertiary mt-1">Try adjusting your search or subject filter</p>
              </div>
            )}
          </div>
        </div>

      </Container>
    </div>
  );
}