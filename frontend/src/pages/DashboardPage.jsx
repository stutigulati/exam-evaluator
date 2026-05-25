import { useEffect, useMemo, useState, useCallback } from 'react';
import { Search, ChevronRight, Eye, Trash2, Users, BookOpen, TrendingUp, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import { Container, PageHeader } from '../components/layout/Sidebar';
import { Badge, StatCard } from '../components/ui/primitives';
import { cn, pctColor } from '../lib/utils';
import { deleteEvaluationRecord, loadEvaluationRecords } from '../lib/evaluations';
import { ResultsPanel } from '../components/results/ResultsPanel';
import { useAuth } from '../lib/auth';

const MOCK_STUDENTS = [
  { id: 1, name: 'Stuti Gulati',    enrollment: 'BT22CSE041', class: 'CSE A',
    reports: [
      { subject: 'Data Structures',   marks: 9, max: 10, grade: 'A+', date: '2026-05-17', confidence: 'High' },
      { subject: 'Computer Networks', marks: 7, max: 10, grade: 'B',  date: '2026-05-14', confidence: 'High' },
    ] },
  { id: 2, name: 'Saumya Tripathi', enrollment: 'BT22CSE042', class: 'CSE B',
    reports: [
      { subject: 'Mathematics', marks: 8, max: 10, grade: 'A', date: '2026-05-16', confidence: 'High' },
      { subject: 'Physics',     marks: 6, max: 10, grade: 'C', date: '2026-05-13', confidence: 'Medium' },
    ] },
  { id: 3, name: 'Shreyash Khare',  enrollment: 'BT22CSE043', class: 'CSE A',
    reports: [
      { subject: 'Algorithms', marks: 10, max: 10, grade: 'A+', date: '2026-05-17', confidence: 'High' },
    ] },
  { id: 4, name: 'Yash Hirani',     enrollment: 'BT22CSE044', class: 'CSE C',
    reports: [
      { subject: 'DBMS',              marks: 7, max: 10, grade: 'B', date: '2026-05-15', confidence: 'High' },
      { subject: 'Operating Systems', marks: 5, max: 10, grade: 'D', date: '2026-05-12', confidence: 'Medium' },
    ] },
  { id: 5, name: 'Priya Sharma',    enrollment: 'BT22CSE045', class: 'CSE B',
    reports: [
      { subject: 'English', marks: 8, max: 10, grade: 'A', date: '2026-05-16', confidence: 'High' },
    ] },
  { id: 6, name: 'Arjun Mehta',     enrollment: 'BT22CSE046', class: 'CSE C',
    reports: [
      { subject: 'Mathematics', marks: 4, max: 10, grade: 'F', date: '2026-05-11', confidence: 'Low' },
      { subject: 'Chemistry',   marks: 6, max: 10, grade: 'C', date: '2026-05-10', confidence: 'Medium' },
    ] },
  { id: 7, name: 'Nisha Verma',     enrollment: 'BT22CSE047', class: 'CSE A',
    reports: [
      { subject: 'General Knowledge', marks: 9, max: 10, grade: 'A+', date: '2026-05-15', confidence: 'High' },
      { subject: 'English',           marks: 8, max: 10, grade: 'A',  date: '2026-05-13', confidence: 'High' },
    ] },
  { id: 8, name: 'Rohan Kapoor',    enrollment: 'BT22CSE048', class: 'CSE B',
    reports: [
      { subject: 'Physics', marks: 3, max: 10, grade: 'F', date: '2026-05-14', confidence: 'Low' },
    ] },
  { id: 9, name: 'Aarav Singh',     enrollment: 'BT22CSE049', class: 'CSE C',
    reports: [
      { subject: 'Algorithms', marks: 6, max: 10, grade: 'C', date: '2026-05-13', confidence: 'Medium' },
      { subject: 'DBMS',       marks: 7, max: 10, grade: 'B', date: '2026-05-11', confidence: 'High' },
    ] },
  { id: 10, name: 'Kavya Reddy',    enrollment: 'BT22CSE050', class: 'CSE A',
    reports: [
      { subject: 'Computer Networks', marks: 9, max: 10, grade: 'A+', date: '2026-05-16', confidence: 'High' },
    ] },
];

const CONF_COLOR = { High: 'green', Medium: 'amber', Low: 'red' };

function recordsToStudents(records) {
  const students = new Map();
  records.forEach((record) => {
    const enrollment = record.rollNumber || 'Unassigned';
    const key = `${record.studentName || 'Unknown Student'}:${enrollment}`;
    if (!students.has(key)) {
      students.set(key, {
        id: key,
        name: record.studentName || 'Unknown Student',
        enrollment,
        class: record.classGrade || 'Unassigned',
        reports: [],
      });
    }
    students.get(key).reports.push({
      id: record.id,
      subject: record.subject || 'Unspecified',
      marks: record.marks,
      max: record.max,
      grade: record.grade,
      date: record.date,
      confidence: record.confidence,
      report: record.report || {
        id: record.id,
        studentName: record.studentName,
        rollNumber: record.rollNumber,
        classGrade: record.classGrade,
        subject: record.subject,
        total_marks_awarded: record.marks,
        total_max_marks: record.max,
        percentage: record.percentage,
        grade: record.grade,
        grade_letter: record.grade,
        questions: [],
        overall_feedback: 'Detailed question-wise data was not stored for this older dashboard entry.',
      },
    });
  });
  return [...students.values()];
}

function scoreBand(report) {
  const pct = report.max ? Math.round((report.marks / report.max) * 100) : 0;
  if (pct >= 75) return 'high';
  if (pct >= 50) return 'medium';
  return 'low';
}

function DonutChart({ title, subtitle, segments }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;

  return (
    <div className="bg-bg-1 border border-white/7 rounded-xl p-4 flex items-center gap-4">
      <div className="relative w-28 h-28 flex-shrink-0">
        <svg width="112" height="112" viewBox="0 0 112 112" className="-rotate-90">
          <circle cx="56" cy="56" r={radius} stroke="rgba(255,255,255,0.07)" strokeWidth="14" fill="none" />
          {segments.map((seg, idx) => {
            const length = (seg.value / total) * circumference;
            const dashOffset = offset;
            offset += length;
            return (
              <motion.circle key={seg.label} cx="56" cy="56" r={radius}
                stroke={seg.color} strokeWidth="14" fill="none" strokeLinecap="round"
                strokeDasharray={`${length} ${circumference - length}`}
                initial={{ strokeDashoffset: circumference, opacity: 0.2 }}
                animate={{ strokeDashoffset: -dashOffset, opacity: 1 }}
                transition={{ duration: 0.9, delay: idx * 0.12, ease: 'easeOut' }}
              />
            );
          })}
          <motion.circle cx="56" cy="56" r="30"
            stroke="rgba(0,217,155,0.35)" strokeWidth="1" fill="none" strokeDasharray="10 8"
            animate={{ rotate: 360 }} transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
            style={{ transformOrigin: '56px 56px' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold text-white">{total}</span>
          <span className="text-[10px] uppercase tracking-wider text-text-tertiary">reports</span>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-text-primary">{title}</p>
        <p className="text-xs text-text-tertiary mb-3">{subtitle}</p>
        <div className="space-y-2">
          {segments.map(seg => (
            <div key={seg.label} className="flex items-center justify-between gap-3 text-xs">
              <span className="flex items-center gap-2 text-text-secondary">
                <span className="w-2 h-2 rounded-full" style={{ background: seg.color }} />
                {seg.label}
              </span>
              <span className="font-mono text-text-primary">{seg.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LiveBarGraph({ reports }) {
  const latest = [...reports].sort((a, b) => String(a.date).localeCompare(String(b.date))).slice(-8);
  return (
    <div className="bg-bg-1 border border-white/7 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-text-primary">Live Score Trend</p>
          <p className="text-xs text-text-tertiary">Newest saved evaluations update this graph</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-green-400">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Live
        </span>
      </div>
      <div className="h-36 flex items-end gap-2">
        {latest.map((report, index) => {
          const pct = report.max ? Math.round((report.marks / report.max) * 100) : 0;
          const color = pct >= 75 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
          return (
            <div key={`${report.date}-${index}`} className="flex-1 h-full flex flex-col justify-end gap-2 min-w-0">
              <motion.div className="rounded-t-md"
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(6, pct)}%` }}
                transition={{ duration: 0.7, delay: index * 0.05 }}
                style={{ background: color, boxShadow: `0 0 18px ${color}33` }}
              />
              <span className="text-[10px] text-text-tertiary truncate text-center">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Avatar({ name, size = 'md' }) {
  const colors = [
    'from-emerald-500/30 to-teal-500/30 border-emerald-500/25 text-emerald-300',
    'from-blue-500/30 to-cyan-500/30 border-blue-500/25 text-blue-300',
    'from-teal-500/30 to-pink-500/30 border-teal-500/25 text-teal-300',
    'from-emerald-500/30 to-teal-500/30 border-emerald-500/25 text-emerald-300',
    'from-amber-500/30 to-orange-500/30 border-amber-500/25 text-amber-300',
  ];
  const idx = name.charCodeAt(0) % colors.length;
  const sz = size === 'lg' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs';
  return (
    <div className={cn(
      `${sz} rounded-full bg-gradient-to-br border flex items-center justify-center flex-shrink-0 font-semibold`,
      colors[idx]
    )}>
      {name[0].toUpperCase()}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [search,      setSearch]      = useState('');
  const [records,     setRecords]     = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [selectedId,  setSelectedId]  = useState(null);
  const [openReport,  setOpenReport]  = useState(null);
  const [classFilter, setClassFilter] = useState('All Classes');

  const refreshRecords = useCallback(async () => {
    setLoadingRecs(true);
    try {
      const data = await loadEvaluationRecords();
      setRecords(Array.isArray(data) ? data : []);
    } catch {
      setRecords([]);
    } finally {
      setLoadingRecs(false);
    }
  }, []);

  useEffect(() => { refreshRecords(); }, [refreshRecords]);

  const savedStudents = useMemo(() => recordsToStudents(records), [records]);
  // Show real students from MongoDB. Fall back to MOCK_STUDENTS only when
  // no real records exist (useful for first-time setup / unauthenticated view).
  const students = useMemo(
    () => savedStudents.length > 0 ? savedStudents : MOCK_STUDENTS,
    [savedStudents]
  );
  const selected      = students.find(s => s.id === selectedId) || students[0] || null;

  const classOptions = useMemo(() =>
    ['All Classes', ...new Set(students.map(s => s.class).filter(Boolean))],
  [students]);

  const filtered = students.filter(s =>
    (classFilter === 'All Classes' || s.class === classFilter) &&
    (s.name.toLowerCase().includes(search.toLowerCase()) ||
     s.enrollment.toLowerCase().includes(search.toLowerCase()))
  );

  const allReports = students.flatMap(s => s.reports);
  const totalEvals = allReports.length;
  const avgScore   = totalEvals
    ? Math.round(allReports.reduce((a, r) => a + (r.max ? r.marks / r.max * 100 : 0), 0) / totalEvals)
    : 0;
  const passCount  = allReports.filter(r => r.max && (r.marks / r.max) >= 0.33).length;

  const scoreSegments = useMemo(() => {
    const counts = allReports.reduce((acc, r) => { acc[scoreBand(r)] += 1; return acc; }, { high: 0, medium: 0, low: 0 });
    return [
      { label: 'High',   value: counts.high,   color: '#22c55e' },
      { label: 'Medium', value: counts.medium, color: '#f59e0b' },
      { label: 'Low',    value: counts.low,    color: '#ef4444' },
    ];
  }, [allReports]);

  const confidenceSegments = useMemo(() => {
    const counts = allReports.reduce((acc, r) => { acc[r.confidence] = (acc[r.confidence] || 0) + 1; return acc; }, {});
    return [
      { label: 'High',   value: counts.High   || 0, color: '#22c55e' },
      { label: 'Medium', value: counts.Medium || 0, color: '#f59e0b' },
      { label: 'Low',    value: counts.Low    || 0, color: '#ef4444' },
    ];
  }, [allReports]);

  const handleDeleteReport = async (reportId) => {
    if (!reportId) return;
    await deleteEvaluationRecord(reportId);
    await refreshRecords();
    setOpenReport(null);
  };

  return (
    <div className="min-h-screen" style={{ background: '#050705' }}>
      <PageHeader title="Dashboard" description="Student evaluation records and performance overview." gradient />

      <Container className="py-6 space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total Students" value={students.length}     icon={Users}     />
          <StatCard label="Evaluations"    value={totalEvals}           icon={BookOpen}  />
          <StatCard label="Avg Score"      value={`${avgScore}%`}       icon={TrendingUp} color={pctColor(avgScore)} />
          <StatCard label="Passed"         value={passCount}            icon={Award}     color="text-green-400"
            sub={`of ${totalEvals} evaluations`} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <DonutChart title="Score Distribution"  subtitle="High, medium and low scoring evaluations" segments={scoreSegments} />
          <DonutChart title="Confidence Mix"       subtitle="AI confidence across stored reports"       segments={confidenceSegments} />
          <LiveBarGraph reports={allReports} />
        </div>

        {/* Main split */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* Student list */}
          <div className="lg:col-span-2 bg-bg-1 border border-white/7 rounded-xl overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-white/6 space-y-2.5">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search student name or ID…"
                  className="w-full bg-bg-2 border border-white/8 rounded-lg pl-8 pr-3 py-2 text-xs text-text-primary placeholder-text-tertiary focus:outline-none focus:border-emerald-500/40 transition-colors" />
              </div>
              <select value={classFilter} onChange={e => setClassFilter(e.target.value)}
                className="w-full bg-bg-2 border border-white/8 rounded-lg px-3 py-1.5 text-xs text-text-secondary focus:outline-none cursor-pointer">
                {classOptions.map(c => <option key={c}>{c}</option>)}
              </select>
              <p className="text-xs text-text-tertiary">
                Sorted by enrollment · {filtered.length} student{filtered.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-white/5" style={{ maxHeight: 480 }}>
              {filtered.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-xs text-text-tertiary">No students match your search</p>
                </div>
              ) : filtered.map(s => (
                <button key={s.id} onClick={() => setSelectedId(s.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all duration-150 border-l-2',
                    selected?.id === s.id ? 'bg-emerald-500/8 border-l-emerald-500' : 'hover:bg-white/2 border-l-transparent'
                  )}>
                  <Avatar name={s.name} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-text-primary truncate">{s.name}</p>
                    <p className="text-xs text-text-tertiary">{s.enrollment} · {s.class}</p>
                    <p className="text-xs text-text-tertiary mt-0.5">{s.reports.length} report{s.reports.length !== 1 ? 's' : ''}</p>
                  </div>
                  <ChevronRight size={13} className="text-text-tertiary flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Student detail */}
          <div className="lg:col-span-3 bg-bg-1 border border-white/7 rounded-xl overflow-hidden">
            {selected ? (
              <>
                <div className="px-5 py-4 border-b border-white/6 flex items-center gap-3">
                  <Avatar name={selected.name} size="lg" />
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-semibold text-text-primary">{selected.name}</h2>
                    <p className="text-xs text-text-tertiary">{selected.enrollment} · {selected.class}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 justify-end">
                    {[...new Set(selected.reports.map(r => r.subject))].slice(0, 2).map(sub => (
                      <Badge key={sub} variant="indigo">{sub}</Badge>
                    ))}
                    {selected.reports.length > 2 && <Badge variant="default">+{selected.reports.length - 2}</Badge>}
                  </div>
                </div>

                <div className="px-5 py-4">
                  <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-4">Evaluation Reports</p>
                  {selected.reports.length === 0 ? (
                    <div className="py-10 text-center border border-dashed border-white/8 rounded-xl">
                      <p className="text-xs text-text-tertiary">No evaluations yet</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-white/6">
                            {['Date','Subject','Marks','%','Confidence','Actions'].map(h => (
                              <th key={h} className="text-left py-2.5 pr-5 text-text-tertiary font-medium uppercase tracking-wider last:pr-0">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {selected.reports.map((r, i) => {
                            const pct = r.max ? Math.round((r.marks / r.max) * 100) : 0;
                            return (
                              <tr key={i} className="hover:bg-white/2 transition-colors">
                                <td className="py-3.5 pr-5 text-text-tertiary">{r.date}</td>
                                <td className="py-3.5 pr-5"><Badge variant="default">{r.subject}</Badge></td>
                                <td className="py-3.5 pr-5">
                                  <span className={cn('font-semibold font-mono', pctColor(pct))}>{r.marks}/{r.max}</span>
                                </td>
                                <td className="py-3.5 pr-5">
                                  <Badge variant={pct >= 75 ? 'green' : pct >= 50 ? 'amber' : 'red'}>{pct}%</Badge>
                                </td>
                                <td className="py-3.5 pr-5">
                                  <Badge variant={CONF_COLOR[r.confidence] || 'default'}>{r.confidence}</Badge>
                                </td>
                                <td className="py-3.5">
                                  <div className="flex items-center gap-3">
                                    <button onClick={() => setOpenReport(r.report || null)} disabled={!r.report}
                                      className="flex items-center gap-1 text-text-tertiary hover:text-emerald-400 transition-colors disabled:opacity-40">
                                      <Eye size={11} /><span>View</span>
                                    </button>
                                    <button onClick={() => handleDeleteReport(r.id)} disabled={!r.id}
                                      className="flex items-center gap-1 text-text-tertiary hover:text-red-400 transition-colors disabled:opacity-40">
                                      <Trash2 size={11} /><span>Delete</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-64">
                <p className="text-sm text-text-tertiary">Select a student to view their reports</p>
              </div>
            )}
          </div>
        </div>

        {openReport && (
          <section className="space-y-3">
            <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Saved Report</p>
            <ResultsPanel key={`${openReport.id || openReport.studentName}-${openReport.subject}`}
              result={openReport} onClose={() => setOpenReport(null)} />
          </section>
        )}

      </Container>
    </div>
  );
}