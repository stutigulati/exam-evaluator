import { useState, useRef, useEffect } from 'react';
import { AlertCircle, RotateCcw, FileText, Award, BarChart3, CheckCircle2, User, BookOpen, Hash } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Container, PageHeader } from '../components/layout/Sidebar';
import EvaluateForm from '../components/upload/EvaluateForm';
import { ResultsPanel } from '../components/results/ResultsPanel';
import BookletAnimation from '../components/animations/BookletAnimation';
// saveEvaluationRecord removed — evaluation results are now saved directly via API
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';

/* ── TypeWriter ─────────────────────────────────────────────────────────── */
function TypeWriter({ text, speed = 20 }) {
  const [shown, setShown] = useState('');
  useEffect(() => {
    setShown('');
    let i = 0;
    const id = setInterval(() => {
      i++;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return <>{shown}</>;
}

/* ── Report Building Animation — shows REAL result data ─────────────────── */
function ReportBuildingAnimation({ result, onDone }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Each step appears after a delay
    const delays = [300, 600, 500, 800, 600, 500];
    let total = 0;
    const ids = delays.map((d, i) => {
      total += d;
      return setTimeout(() => setStep(i + 1), total);
    });
    // Done after all steps + a small hold
    const doneId = setTimeout(() => onDone?.(), total + 800);
    return () => { ids.forEach(clearTimeout); clearTimeout(doneId); };
  }, []);

  const pct       = Number(result?.percentage) || 0;
  const grade     = result?.grade_letter || result?.grade || '—';
  const questions = Array.isArray(result?.questions) ? result.questions.slice(0, 6) : [];
  const totalM    = result?.total_marks_awarded ?? 0;
  const maxM      = result?.total_max_marks     ?? 0;
  const feedback  = typeof result?.overall_feedback === 'string'
    ? result.overall_feedback.slice(0, 160) + (result.overall_feedback.length > 160 ? '…' : '')
    : 'Evaluation complete.';

  const gradeColor =
    pct >= 85 ? '#4ade80' : pct >= 70 ? '#00d99b' :
    pct >= 50 ? '#fbbf24' : '#f87171';

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full rounded-2xl overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at 60% 0%, #0d1a12 0%, #050705 60%)',
        border: '1px solid rgba(0,200,150,0.2)',
        boxShadow: '0 0 60px rgba(0,200,150,0.08)',
      }}>

      {/* Top bar */}
      <div className="flex items-center gap-2.5 px-5 py-3"
        style={{ background: 'rgba(0,200,150,0.06)', borderBottom: '1px solid rgba(0,200,150,0.12)' }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
          <FileText size={13} style={{ color: '#00d99b' }} />
        </motion.div>
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#00d99b' }}>
          Generating Evaluation Report
        </span>
        <div className="ml-auto flex items-center gap-1">
          {[0,1,2].map(i => (
            <motion.div key={i} animate={{ opacity: [0.3,1,0.3] }}
              transition={{ duration: 0.9, delay: i * 0.2, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full" style={{ background: '#00d99b' }} />
          ))}
        </div>
      </div>

      <div className="p-5 md:p-6 space-y-5">

        {/* ── Step 1: Student header ── */}
        <AnimatePresence>
          {step >= 1 && (
            <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4 }}
              className="flex items-start gap-4 p-4 rounded-xl"
              style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)' }}>
              {/* Avatar */}
              <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-lg font-black"
                style={{ background:'linear-gradient(135deg,#00c896,#3ee67f)', color:'#04110b' }}>
                {(result?.studentName || 'S')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-white truncate">{result?.studentName || '—'}</p>
                <div className="flex flex-wrap gap-3 mt-1">
                  {result?.rollNumber && (
                    <span className="flex items-center gap-1 text-xs" style={{ color:'#7f867c' }}>
                      <Hash size={10}/>{result.rollNumber}
                    </span>
                  )}
                  {result?.subject && (
                    <span className="flex items-center gap-1 text-xs" style={{ color:'#7f867c' }}>
                      <BookOpen size={10}/>{result.subject}
                    </span>
                  )}
                  {result?.classGrade && (
                    <span className="flex items-center gap-1 text-xs" style={{ color:'#7f867c' }}>
                      <User size={10}/>{result.classGrade}
                    </span>
                  )}
                </div>
              </div>
              <CheckCircle2 size={16} style={{ color:'#00d99b', flexShrink:0, marginTop:2 }} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Step 2: Score bar ── */}
        <AnimatePresence>
          {step >= 2 && (
            <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4 }}>
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color:'#a2a59f' }}>
                  <BarChart3 size={12} style={{ color:'#00d99b' }} />
                  Total Score
                </span>
                <motion.span initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.5 }}
                  className="text-sm font-bold font-mono text-white">
                  {totalM} / {maxM}
                </motion.span>
              </div>
              <div className="h-3 rounded-full overflow-hidden"
                style={{ background:'rgba(255,255,255,0.06)' }}>
                <motion.div initial={{ width:0 }} animate={{ width:`${Math.min(100,pct)}%` }}
                  transition={{ duration:1.4, ease:'easeOut', delay:0.15 }}
                  className="h-full rounded-full"
                  style={{ background:`linear-gradient(90deg,#00c896,${gradeColor})`, boxShadow:`0 0 10px ${gradeColor}55` }} />
              </div>
              <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:1 }}
                className="flex justify-end mt-1">
                <span className="text-sm font-bold" style={{ color: gradeColor }}>{pct.toFixed(1)}%</span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Step 3: Grade badge ── */}
        <AnimatePresence>
          {step >= 3 && (
            <motion.div initial={{ opacity:0, scale:0.4 }} animate={{ opacity:1, scale:1 }}
              transition={{ type:'spring', stiffness:280, damping:18 }}
              className="flex items-center gap-4 p-4 rounded-xl"
              style={{ background:`${gradeColor}0f`, border:`1px solid ${gradeColor}33` }}>
              <div className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background:`${gradeColor}22`, border:`3px solid ${gradeColor}`, boxShadow:`0 0 20px ${gradeColor}44` }}>
                <span className="text-3xl font-black" style={{ color: gradeColor }}>{grade}</span>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Award size={14} style={{ color: gradeColor }} />
                  <span className="text-sm font-bold text-white">Grade Awarded</span>
                </div>
                <p className="text-xs" style={{ color:'#7f867c' }}>
                  {pct >= 85 ? 'Outstanding performance' :
                   pct >= 70 ? 'Good performance' :
                   pct >= 50 ? 'Average performance' : 'Needs improvement'}
                </p>
                <p className="text-xs font-mono mt-0.5" style={{ color: gradeColor }}>
                  {pct.toFixed(1)}% · {totalM}/{maxM} marks
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Step 4: Question-wise breakdown ── */}
        <AnimatePresence>
          {step >= 4 && questions.length > 0 && (
            <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.35 }}>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-3"
                style={{ color:'#4f564f' }}>Question-wise Marks</p>
              <div className="space-y-2.5">
                {questions.map((q, i) => {
                  const qPct  = q.max_marks ? Math.round((Number(q.marks_awarded||0)/Number(q.max_marks))*100) : 0;
                  const qColor = qPct >= 75 ? '#4ade80' : qPct >= 50 ? '#fbbf24' : '#f87171';
                  return (
                    <motion.div key={i} initial={{ opacity:0, x:-12 }} animate={{ opacity:1, x:0 }}
                      transition={{ delay: i * 0.1, duration:0.3 }}
                      className="flex items-center gap-3">
                      <span className="text-xs font-mono font-semibold w-8 flex-shrink-0 text-right"
                        style={{ color:'#7f867c' }}>Q{q.question_no || i+1}</span>
                      <div className="flex-1 h-2 rounded-full" style={{ background:'rgba(255,255,255,0.06)' }}>
                        <motion.div initial={{ width:0 }} animate={{ width:`${Math.min(100,qPct)}%` }}
                          transition={{ delay: i*0.1+0.2, duration:0.7, ease:'easeOut' }}
                          className="h-full rounded-full"
                          style={{ background: qColor, boxShadow:`0 0 6px ${qColor}66` }} />
                      </div>
                      <span className="text-xs font-mono font-bold flex-shrink-0 w-12 text-right"
                        style={{ color: qColor }}>
                        {q.marks_awarded??0}/{q.max_marks??0}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Step 5: Overall feedback typewriter ── */}
        <AnimatePresence>
          {step >= 5 && (
            <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4 }}
              className="rounded-xl p-4"
              style={{ background:'rgba(0,200,150,0.05)', border:'1px solid rgba(0,200,150,0.18)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color:'#00d99b' }}>
                Overall Feedback
              </p>
              <p className="text-sm leading-relaxed" style={{ color:'#a2a59f' }}>
                <TypeWriter text={feedback} speed={18} />
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Step 6: "Opening full report" ── */}
        <AnimatePresence>
          {step >= 6 && (
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.5 }}
              className="flex items-center justify-center gap-2 py-2">
              <motion.div animate={{ scale:[1,1.15,1] }} transition={{ duration:0.6, repeat:Infinity }}>
                <CheckCircle2 size={16} style={{ color:'#4ade80' }} />
              </motion.div>
              <span className="text-sm font-semibold" style={{ color:'#4ade80' }}>
                Report ready — opening full view…
              </span>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </motion.div>
  );
}

/* ── EvaluatePage ────────────────────────────────────────────────────────── */
export default function EvaluatePage() {
  const { user } = useAuth();
  const [result, setResult]       = useState(null);
  const [pending, setPending]     = useState(null);   // real result waiting behind animation
  const [building, setBuilding]   = useState(false);  // report-building animation phase
  const [error, setError]         = useState(null);
  const [loading, setLoading]     = useState(false);
  const [answerFile, setAnswerFile] = useState(null);
  const resultsRef     = useRef(null);
  const formWrapperRef = useRef(null);

  /* Capture answer-sheet file from form */
  useEffect(() => {
    const root = formWrapperRef.current;
    if (!root) return;
    const onChange = (e) => {
      const t = e.target;
      if (!(t instanceof HTMLInputElement) || t.type !== 'file') return;
      const file = t.files?.[0];
      if (!file) return;
      const meta = `${t.name} ${t.id} ${t.getAttribute('aria-label')||''} ${t.closest('label')?.textContent||''}`.toLowerCase();
      if (!meta.includes('question') && !meta.includes('paper')) setAnswerFile(file);
    };
    root.addEventListener('change', onChange, true);
    return () => root.removeEventListener('change', onChange, true);
  }, []);

  const handleResult = async (r) => {
    if (!r) { setResult(null); return; }
    const normalized = { ...r, grade_letter: r.grade_letter || r.grade };
    // Save to MongoDB via the API (no localStorage write needed)
    if (user?.role === 'evaluator' || user?.role === 'gog') {
      try {
        const { answerSheetFile, ...rep } = normalized;
        const saved = await api.post('/evaluation-results', {
          studentName: normalized.studentName || 'Unknown Student',
          rollNumber:  normalized.rollNumber  || '',
          classGrade:  normalized.classGrade  || '',
          subject:     normalized.subject     || 'Unspecified',
          marks:       Number(normalized.total_marks_awarded) || 0,
          maxMarks:    Number(normalized.total_max_marks)     || 0,
          percentage:  Number(normalized.percentage)          || 0,
          grade:       normalized.grade_letter || normalized.grade || '',
          report:      rep,
        });
        normalized.id = saved.data.id || normalized.id;
      } catch (err) {
        console.warn('Could not save evaluation result', err);
      }
    }
    // Start building animation with real data
    setPending(normalized);
    setBuilding(true);
  };

  const handleBuildDone = () => {
    setBuilding(false);
    setResult(pending);
    setPending(null);
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior:'smooth', block:'start' });
    }, 200);
  };

  const reset = () => {
    setResult(null); setPending(null); setBuilding(false);
    setError(null);  setAnswerFile(null);
    window.scrollTo({ top:0, behavior:'smooth' });
  };

  const showForm = !loading && !building;

  return (
    <div className="min-h-screen" style={{ background:'#050705' }}>
      <PageHeader
        title="Evaluate Answer Sheet"
        description="Upload question paper and answer sheet for question-by-question AI grading."
        action={result && (
          <button onClick={reset}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
            style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#a2a59f' }}>
            <RotateCcw size={12} /> New evaluation
          </button>
        )}
      />

      <Container className="py-8 space-y-8">

        {/* Config form — hidden during animation */}
        {showForm && (
          <section ref={formWrapperRef} className="rounded-2xl p-6 md:p-8"
            style={{ background:'linear-gradient(145deg,#141614,#0b0d0b)', border:'1px solid rgba(0,200,150,0.15)', boxShadow:'0 0 0 1px rgba(255,255,255,0.03),0 24px 60px rgba(0,0,0,0.35)' }}>
            <div className="flex items-center gap-2 mb-6 pb-5" style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
              <div className="w-1.5 h-4 rounded-full" style={{ background:'linear-gradient(180deg,#00c896,#3ee67f)' }} />
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color:'#8a9087' }}>Configuration</p>
            </div>
            <EvaluateForm onResult={handleResult} onError={setError} onLoading={setLoading} />
          </section>
        )}

        <section ref={resultsRef} className="space-y-4">

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity:0,y:-8 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }}
                className="flex items-start gap-3 rounded-xl p-4"
                style={{ background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.2)' }}>
                <AlertCircle size={14} style={{ color:'#f87171', flexShrink:0, marginTop:2 }} />
                <div>
                  <p className="text-xs font-medium" style={{ color:'#f87171' }}>Evaluation failed</p>
                  <p className="text-xs mt-0.5" style={{ color:'#7f867c' }}>{error}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Phase 1 — Booklet animation while API runs */}
          <AnimatePresence mode="wait">
            {loading && (
              <motion.div key="booklet"
                initial={{ opacity:0, scale:0.96 }} animate={{ opacity:1, scale:1 }}
                exit={{ opacity:0, scale:0.96, y:-20 }} transition={{ duration:0.35 }}>
                <BookletAnimation file={answerFile} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Phase 2 — Report building with REAL data */}
          <AnimatePresence mode="wait">
            {building && pending && !loading && (
              <motion.div key="building"
                initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                transition={{ duration:0.35 }}>
                <ReportBuildingAnimation result={pending} onDone={handleBuildDone} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Phase 3 — Full ResultsPanel */}
          {result && !loading && !building && (
            <ResultsPanel result={result} onClose={reset} />
          )}

          {/* Empty state */}
          {!result && !loading && !building && !error && (
            <div className="flex flex-col items-center justify-center py-24 text-center rounded-2xl"
              style={{ border:'1px dashed rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.015)' }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' }}>
                <div className="w-4 h-4 rounded-full" style={{ border:'2px solid rgba(255,255,255,0.15)' }} />
              </div>
              <p className="text-sm" style={{ color:'#7f867c' }}>Results will appear here after evaluation</p>
              <p className="text-xs mt-1" style={{ color:'#61665f' }}>Complete the configuration above and run the AI evaluation</p>
            </div>
          )}

        </section>
      </Container>
    </div>
  );
}