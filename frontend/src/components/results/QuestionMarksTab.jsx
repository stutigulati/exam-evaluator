import { useState } from 'react';
import { Save, CheckCircle, XCircle, AlertTriangle, Edit3, ShieldCheck, ChevronDown, ChevronUp, ScanLine, Sparkles, Eye } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn, pctColor } from '../../lib/utils';
import { TagList } from '../ui/primitives';

// ── Single AI Feedback row (styled like Image 2) ──────────────────────────────
function FeedbackRow({ icon: Icon, iconColor, label, count, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-white/[0.02]"
      >
        <span className="flex items-center gap-2 text-sm" style={{ color: '#d4d7d2' }}>
          <Icon size={14} style={{ color: iconColor }} />
          {label}
          {count != null && (
            <span className="text-sm font-medium" style={{ color: '#a2a59f' }}>({count})</span>
          )}
        </span>
        {open
          ? <ChevronUp size={13} style={{ color: '#61665f' }} />
          : <ChevronDown size={13} style={{ color: '#61665f' }} />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 pt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function QuestionMarksTab({ result, onUpdateResult }) {
  const [editedQuestions, setEditedQuestions] = useState(
    () => result.questions?.map(q => ({ ...q, edited_marks: q.marks_awarded })) || []
  );
  const [reviewedByTeacher, setReviewedByTeacher] = useState(result.reviewedByTeacher || false);
  const [saved, setSaved] = useState(false);

  const countedQuestions = editedQuestions.filter(q => !q.excluded_from_total);
  const totalEdited = countedQuestions.reduce((a, q) => a + (parseFloat(q.edited_marks) || 0), 0);
  const totalMax = Number(result.total_max_marks) || countedQuestions.reduce((a, q) => a + q.max_marks, 0);

  const handleMarkChange = (idx, val) => {
    const updated = [...editedQuestions];
    updated[idx] = { ...updated[idx], edited_marks: val };
    setEditedQuestions(updated);
    setSaved(false);
  };

  const handleSave = () => {
    const updatedQuestions = editedQuestions.map(q => ({
      ...q, marks_awarded: parseFloat(q.edited_marks) || 0,
    }));
    const newTotal = updatedQuestions.filter(q => !q.excluded_from_total).reduce((a, q) => a + q.marks_awarded, 0);
    const newPct = totalMax > 0 ? Math.round((newTotal / totalMax) * 100 * 10) / 10 : 0;
    const newGrade = newPct >= 90 ? 'A+' : newPct >= 80 ? 'A' : newPct >= 70 ? 'B' : newPct >= 60 ? 'C' : newPct >= 50 ? 'D' : 'F';
    setReviewedByTeacher(true);
    setSaved(true);
    onUpdateResult?.({ ...result, questions: updatedQuestions, total_marks_awarded: Math.round(newTotal * 10) / 10, percentage: newPct, grade: newGrade, grade_letter: newGrade, reviewedByTeacher: true });
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Edit3 size={14} style={{ color: '#00d99b' }} />
          <span className="text-sm font-semibold text-white">Question-wise Marks</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: 'rgba(0,200,150,0.12)', border: '1px solid rgba(0,200,150,0.25)', color: '#00d99b' }}>
            {Math.round(totalEdited * 10) / 10} / {totalMax}
          </div>
          <button onClick={handleSave}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
            style={{ background: 'linear-gradient(135deg, #00c896, #3ee67f)', boxShadow: '0 0 12px rgba(0,200,150,0.3)' }}>
            <Save size={12} />
            {saved ? 'Saved ✓' : 'Save Changes'}
          </button>
        </div>
      </div>

      {reviewedByTeacher && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
          <ShieldCheck size={13} style={{ color: '#fbbf24' }} />
          <span className="text-xs font-medium" style={{ color: '#fbbf24' }}>Reviewed by teacher</span>
          <span className="text-xs" style={{ color: '#80804a' }}>Marks have been manually verified</span>
        </div>
      )}

      {/* ── OCR Accuracy + Leniency banner ─────────────────────────────── */}
      {(() => {
        const acc       = result?.ocr_review?.accuracy_percent;
        const accLabel  = result?.ocr_review?.accuracy_label;
        const corrCount = result?.ocr_review?.total_corrections || 0;
        const wordCount = result?.ocr_review?.total_words       || 0;
        const lenLevel  = result?.leniency;

        // Color by accuracy band
        const accColor = acc == null
          ? '#7f867c'
          : acc >= 95 ? '#00d99b'
          : acc >= 85 ? '#3ee67f'
          : acc >= 70 ? '#fbbf24'
          : '#f87171';

        const lenColor = lenLevel == null
          ? '#7f867c'
          : lenLevel <= 3 ? '#f87171'
          : lenLevel <= 6 ? '#fbbf24'
          : '#3ee67f';
        const lenLabel = lenLevel == null
          ? '—'
          : lenLevel <= 3 ? 'Strict'
          : lenLevel <= 6 ? 'Balanced'
          : 'Lenient';

        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">

            {/* OCR Accuracy card */}
            <div className="rounded-lg px-3 py-2.5 flex items-center gap-3"
              style={{ background: `${accColor}10`, border: `1px solid ${accColor}33` }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${accColor}20`, border: `1px solid ${accColor}55` }}>
                <Eye size={14} style={{ color: accColor }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: '#8a9087' }}>
                    OCR Accuracy
                  </span>
                  {accLabel && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                      style={{ background: `${accColor}22`, color: accColor }}>
                      {accLabel}
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-lg font-bold font-mono leading-none"
                    style={{ color: accColor }}>
                    {acc != null ? `${acc}%` : '—'}
                  </span>
                  {wordCount > 0 && (
                    <span className="text-[10px]" style={{ color: '#61665f' }}>
                      {corrCount} correction{corrCount === 1 ? '' : 's'} in {wordCount} words
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Leniency check card */}
            <div className="rounded-lg px-3 py-2.5 flex items-center gap-3"
              style={{ background: `${lenColor}10`, border: `1px solid ${lenColor}33` }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${lenColor}20`, border: `1px solid ${lenColor}55` }}>
                <ShieldCheck size={14} style={{ color: lenColor }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: '#8a9087' }}>
                    Leniency Applied
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                    style={{ background: `${lenColor}22`, color: lenColor }}>
                    {lenLabel}
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-lg font-bold font-mono leading-none"
                    style={{ color: lenColor }}>
                    {lenLevel != null ? `${lenLevel}/10` : '—'}
                  </span>
                  <span className="text-[10px]" style={{ color: '#61665f' }}>
                    grading strictness used for this evaluation
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Question cards */}
      {editedQuestions.map((q, i) => {
        const pct = q.max_marks > 0 ? Math.round((parseFloat(q.edited_marks) / q.max_marks) * 100) : 0;
        const markColor = pct >= 75 ? '#4ade80' : pct >= 50 ? '#fbbf24' : '#f87171';
        const matchedItems = q.matched_points?.length ? q.matched_points : (q.strengths || []);
        const wrongItems = q.incorrect_points?.length ? q.incorrect_points : (q.weaknesses || []);
        const missingItems = q.missing_points || [];

        return (
          <div key={i} className="rounded-xl overflow-hidden"
            style={{ background: '#111311', border: '1px solid rgba(255,255,255,0.07)' }}>

            {/* ── Badge row ── */}
            <div className="px-4 pt-3 flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold"
                style={{ background: 'rgba(0,200,150,0.2)', color: '#00d99b' }}>
                Q{q.question_no}
              </span>
              {q.section_name && (
                <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium"
                  style={{ background: 'rgba(20,184,166,0.12)', color: '#5eead4', border: '1px solid rgba(20,184,166,0.22)' }}>
                  {q.section_name}
                </span>
              )}
              {q.excluded_from_total && (
                <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium"
                  style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)' }}>
                  Not counted
                </span>
              )}
            </div>

            {/* ── Question text below badges ── */}
            <div className="px-4 pt-2 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-sm text-white leading-relaxed">{q.question_text || `Question ${q.question_no}`}</p>
            </div>

            <div className="p-4 space-y-3">

              {/* ── Compact marks row ── */}
              <div className="flex items-stretch gap-2">
                <div className="flex-1 rounded-lg px-3 py-2"
                  style={{ background: 'rgba(0,200,150,0.06)', border: '1px solid rgba(0,200,150,0.15)' }}>
                  <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: '#7f867c' }}>Obtained</div>
                  <input type="number" step="0.5" min="0" max={q.max_marks}
                    value={q.edited_marks}
                    onChange={e => handleMarkChange(i, e.target.value)}
                    className="w-full text-lg font-bold font-mono bg-transparent outline-none leading-none"
                    style={{ color: markColor }} />
                </div>
                <div className="flex-1 rounded-lg px-3 py-2"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: '#61665f' }}>Max</div>
                  <div className="text-lg font-bold font-mono text-white leading-none">{q.max_marks}</div>
                </div>
                <div className="flex-1 rounded-lg px-3 py-2"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: '#61665f' }}>Score</div>
                  <div className={cn('text-lg font-bold font-mono leading-none', pctColor(pct))}>{pct}%</div>
                </div>
              </div>

              {/* ── Feedback (always visible) ── */}
              {q.feedback && (
                <div className="rounded-lg px-3 py-2.5"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <p className="text-xs leading-relaxed" style={{ color: '#8a9087' }}>{q.feedback}</p>
                </div>
              )}

              {q.selection_note && (
                <div className="rounded-lg px-3 py-2.5"
                  style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.18)' }}>
                  <p className="text-xs leading-relaxed" style={{ color: '#fbbf24' }}>{q.selection_note}</p>
                </div>
              )}

              {/* ── Student / Expected answers (always visible) ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <p className="text-xs font-medium mb-2" style={{ color: '#8a9087' }}>Student Answer</p>
                  <p className="text-xs leading-relaxed whitespace-pre-wrap font-mono" style={{ color: '#d8d8e8' }}>
                    {q.student_answer || 'No answer detected.'}
                  </p>
                </div>
                <div className="rounded-lg p-3" style={{ background: 'rgba(0,200,150,0.05)', border: '1px solid rgba(0,200,150,0.14)' }}>
                  <p className="text-xs font-medium mb-2" style={{ color: '#00d99b' }}>Expected Answer</p>
                  <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: '#a5b4fc' }}>
                    {q.correct_answer || 'Not available.'}
                  </p>
                </div>
              </div>

              {/* ── OCR Review + Marking Rationale (always visible) ── */}
              {/* <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg p-3"
                  style={{ background: q.ocr_warning ? 'rgba(251,191,36,0.05)' : 'rgba(255,255,255,0.02)', border: q.ocr_warning ? '1px solid rgba(251,191,36,0.18)' : '1px solid rgba(255,255,255,0.05)' }}>
                  <p className="text-xs font-medium mb-2" style={{ color: q.ocr_warning ? '#fbbf24' : '#8a9087' }}>OCR Review Note</p>
                  <p className="text-xs leading-relaxed" style={{ color: q.ocr_warning ? '#facc15' : '#7f867c' }}>
                    {q.ocr_warning || 'No OCR warning for this answer.'}
                  </p>
                </div>
                <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <p className="text-xs font-medium mb-2" style={{ color: '#8a9087' }}>Marking Rationale</p>
                  <p className="text-xs leading-relaxed" style={{ color: '#a2a59f' }}>
                    {q.marking_rationale || 'No detailed rationale available.'}
                  </p>
                </div>
              </div> */}

              {/* ── Key Points + Concepts (always visible) ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg p-3" style={{ background: 'rgba(0,200,150,0.04)', border: '1px solid rgba(0,200,150,0.12)' }}>
                  <p className="text-xs font-medium mb-2" style={{ color: '#00d99b' }}>Expected Key Points</p>
                  <TagList items={q.expected_key_points} variant="indigo" emptyText="Not available" />
                </div>
                <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <p className="text-xs font-medium mb-2" style={{ color: '#8a9087' }}>Concepts Tested</p>
                  <TagList items={q.concepts_tested} variant="green" emptyText="Not available" />
                </div>
              </div>

              {/* ── AI FEEDBACK section (dropdowns only for the 3 points) ── */}
              <div className="rounded-xl overflow-hidden"
                style={{ background: '#0d0f0d', border: '1px solid rgba(255,255,255,0.1)' }}>
                {/* Header */}
                <div className="px-4 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                  <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#7f867c' }}>AI Feedback</p>
                </div>

                <FeedbackRow
                  icon={CheckCircle}
                  iconColor="#4ade80"
                  label="Correct"
                  count={matchedItems.length}>
                  <TagList items={matchedItems} variant="green" emptyText="None" />
                </FeedbackRow>

                <FeedbackRow
                  icon={XCircle}
                  iconColor="#f87171"
                  label="Deductions"
                  count={wrongItems.length}>
                  <TagList items={wrongItems} variant="red" emptyText="None" />
                </FeedbackRow>

                <div style={{ borderBottom: 'none' }}>
                  <FeedbackRow
                    icon={AlertTriangle}
                    iconColor="#fbbf24"
                    label="Missing Points"
                    count={missingItems.length}>
                    <TagList items={missingItems} variant="amber" emptyText="None" />
                  </FeedbackRow>
                  <FeedbackRow
  icon={ShieldCheck}
  iconColor={q.ocr_warning ? '#fbbf24' : '#00d99b'}
  label="OCR Review Note"
  count={q.ocr_warning ? 1 : 0}
>
  <p
    className="text-xs leading-relaxed"
    style={{ color: q.ocr_warning ? '#facc15' : '#7f867c' }}
  >
    {q.ocr_warning || 'No OCR warning for this answer.'}
  </p>
</FeedbackRow>

{/* ── Gemini Corrections dropdown — right below OCR Review Note ── */}
<FeedbackRow
  icon={Sparkles}
  iconColor={q.ocr_corrections?.length ? '#00d99b' : '#61665f'}
  label="Gemini Corrections"
  count={q.ocr_corrections?.length || 0}
>
  {q.ocr_corrections?.length ? (
    <div className="space-y-2">
      <p className="text-[11px] mb-2" style={{ color: '#7f867c' }}>
        Gemini re-checked the answer sheet image and corrected these OCR mis-reads before grading:
      </p>
      {q.ocr_corrections.map((c, ci) => (
        <div key={ci} className="rounded-lg px-3 py-2"
          style={{ background: 'rgba(0,200,150,0.04)', border: '1px solid rgba(0,200,150,0.14)' }}>
          <div className="flex items-center gap-2 flex-wrap">
            <ScanLine size={11} style={{ color: '#7f867c', flexShrink: 0 }} />
            <span className="text-xs font-mono px-1.5 py-0.5 rounded line-through"
              style={{
                background: 'rgba(239,68,68,0.1)',
                color: '#f87171',
                textDecorationColor: '#f87171',
              }}>
              {c.ocr}
            </span>
            <span className="text-xs" style={{ color: '#61665f' }}>→</span>
            <span className="text-xs font-mono px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(0,200,150,0.12)', color: '#00d99b' }}>
              {c.actual}
            </span>
          </div>
          {c.context && (
            <p className="text-[11px] mt-1.5 italic pl-5" style={{ color: '#7f867c' }}>
              “…{c.context}…”
            </p>
          )}
        </div>
      ))}
    </div>
  ) : (
    <p className="text-xs leading-relaxed" style={{ color: '#7f867c' }}>
      No OCR corrections were needed for this question — Gemini found the OCR text accurate.
    </p>
  )}
</FeedbackRow>
                </div>
              </div>

            </div>
          </div>
        );
      })}
    </div>
  );
}