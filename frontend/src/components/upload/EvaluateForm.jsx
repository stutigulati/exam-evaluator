import { useState, useRef, useEffect } from 'react';
import { Upload, FileImage, X, ChevronDown, ChevronUp, Info, Zap, User, Hash, GraduationCap, BookOpen, FileText, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { cn, leniencyLabel } from '../../lib/utils';

const ACCEPTED = ['image/jpeg','image/jpg','image/png','image/webp','application/pdf'];
const MAX_SIZE  = 10 * 1024 * 1024;
const SUBJECTS  = ['English','Mathematics','Physics','Chemistry','Biology','History','Geography','Computer Science','Data Structures','Algorithms','DBMS','Operating Systems','Computer Networks','UNIX','General Knowledge','Economics','Other'];

// ── Parse student info from filename ──────────────────────────────────────────
// Supported format: StudentName_RollNo_Subject_Grade_Answer_Script.pdf
// e.g.: AaravSharma_23_Physics_10A_Answer_Script.pdf
function parseStudentFromFilename(filename) {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  const parts = nameWithoutExt.split('_');

  if (parts.length >= 2) {
    let rollIdx = -1;

    parts.forEach((p, i) => {
      if (/^(?=.*\d)[a-z0-9-]+$/i.test(p) && rollIdx === -1) rollIdx = i;
    });

    // No numeric roll found — fall back to positional
    if (rollIdx === -1) {
      const rawSub = parts[2] || '';
      return {
        name:    parts[0] || '',
        roll:    parts[1] || '',
        grade:   parts[3] || '',
        subject: SUBJECTS.find(s => s.toLowerCase() === rawSub.toLowerCase()) || rawSub,
      };
    }

    const name = parts.slice(0, rollIdx).join(' ');
    const roll = parts[rollIdx] || '';
    const details = parts.slice(rollIdx + 1);
    const suffixIdx = details.findIndex((p, i) =>
      ['answer script', 'answer-script', 'answerscript'].includes(p.toLowerCase()) ||
      (p.toLowerCase() === 'answer' && details[i + 1]?.toLowerCase() === 'script')
    );
    const usefulDetails = suffixIdx === -1 ? details : details.slice(0, suffixIdx);
    const lowerDetails = usefulDetails.map(p => p.toLowerCase());
    const subjectMatch = SUBJECTS
      .map(subjectName => ({
        subjectName,
        tokens: subjectName.toLowerCase().split(' '),
      }))
      .sort((a, b) => b.tokens.length - a.tokens.length)
      .find(({ tokens }) =>
        lowerDetails.some((_, i) =>
          tokens.every((token, offset) => lowerDetails[i + offset] === token)
        )
      );
    const subjectIdx = subjectMatch
      ? lowerDetails.findIndex((_, i) =>
          subjectMatch.tokens.every((token, offset) => lowerDetails[i + offset] === token)
        )
      : -1;

    let grade = '';
    let rawSubject = '';

    if (subjectIdx !== -1) {
      rawSubject = usefulDetails.slice(subjectIdx, subjectIdx + subjectMatch.tokens.length).join(' ');
      grade = subjectIdx === 0
        ? usefulDetails.slice(subjectIdx + subjectMatch.tokens.length).join(' ')
        : usefulDetails.slice(0, subjectIdx).join(' ');
    } else {
      rawSubject = usefulDetails[0] || '';
      grade = usefulDetails.slice(1).join(' ');
    }

    const subject = SUBJECTS.find(
      s => s.toLowerCase() === rawSubject.toLowerCase()
    ) || rawSubject;

    return { name, roll, grade, subject };
  }

  return { name: nameWithoutExt, roll: '', grade: '', subject: '' };
}

// ── File preview hook ──────────────────────────────────────────────────────────
function useFilePreview(file) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const isPdf  = file?.type === 'application/pdf';
  const isImage = file && !isPdf;

  useEffect(() => {
    if (!file) { setPreviewUrl(null); return; }
    if (isImage) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
  }, [file]);

  return { previewUrl, isPdf, isImage };
}

// ── File drop zone ─────────────────────────────────────────────────────────────
function FileZone({ label, sublabel, file, onFile, onError, required = true, onParsed }) {
  const [drag, setDrag] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [pdfUrl, setPdfUrl] = useState(null);
  const ref = useRef(null);
  const { previewUrl, isPdf, isImage } = useFilePreview(file);

  useEffect(() => {
    if (isPdf && file) {
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPdfUrl(null);
    }
  }, [file, isPdf]);

  const validate = (f) => {
    if (!f) return;
    if (!ACCEPTED.includes(f.type)) { onError?.(`${label}: use JPG, PNG or PDF`); return; }
    if (f.size > MAX_SIZE) { onError?.(`${label}: max 10 MB`); return; }
    onFile(f);
    if (onParsed) {
      const parsed = parseStudentFromFilename(f.name);
      onParsed(parsed);
    }
  };

  if (file) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid rgba(0,200,150,0.25)', background: 'rgba(0,200,150,0.05)' }}>

        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(0,200,150,0.15)', border: '1px solid rgba(0,200,150,0.2)' }}>
            {isPdf ? <FileText size={15} style={{ color: '#00d99b' }} /> : <FileImage size={15} style={{ color: '#00d99b' }} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{file.name}</p>
            <p className="text-xs" style={{ color: '#7f867c' }}>
              {(file.size / 1024).toFixed(0)} KB · {isPdf ? 'PDF document' : 'Image'} · {label}
            </p>
          </div>

          <button type="button" onClick={() => setShowPreview(v => !v)}
            title={showPreview ? 'Hide preview' : 'Show preview'}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all mr-1"
            style={{ background: showPreview ? 'rgba(0,200,150,0.15)' : 'rgba(255,255,255,0.06)', border: '1px solid rgba(0,200,150,0.2)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,200,150,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = showPreview ? 'rgba(0,200,150,0.15)' : 'rgba(255,255,255,0.06)'}>
            {showPreview ? <EyeOff size={11} style={{ color: '#00d99b' }} /> : <Eye size={11} style={{ color: '#a2a59f' }} />}
          </button>

          <button type="button" onClick={() => { onFile(null); setShowPreview(true); }}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
            style={{ background: 'rgba(255,255,255,0.06)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.15)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}>
            <X size={11} style={{ color: '#a2a59f' }} />
          </button>
        </div>

        <AnimatePresence>
          {showPreview && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
              className="overflow-hidden" style={{ borderTop: '1px solid rgba(0,200,150,0.12)' }}>
              {isImage && previewUrl && (
                <div className="p-3">
                  <div className="rounded-lg overflow-hidden flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.3)', maxHeight: '280px' }}>
                    <img src={previewUrl} alt={`Preview of ${file.name}`}
                      className="max-w-full object-contain" style={{ maxHeight: '280px', display: 'block' }} />
                  </div>
                </div>
              )}
              {isPdf && pdfUrl && (
                <div className="p-3">
                  <div className="rounded-lg overflow-hidden"
                    style={{ background: 'rgba(0,0,0,0.2)', height: '320px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <iframe src={pdfUrl + '#toolbar=0&navpanes=0&scrollbar=0'} title={`Preview of ${file.name}`}
                      className="w-full h-full rounded-lg" style={{ border: 'none' }} />
                  </div>
                  <p className="text-xs mt-2 text-center" style={{ color: '#61665f' }}>PDF preview · scroll to browse pages</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-xs font-medium" style={{ color: '#a2a59f' }}>{label}</span>
        {!required && <span className="text-xs" style={{ color: '#61665f' }}>optional</span>}
      </div>
      <div
        onClick={() => ref.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); validate(e.dataTransfer.files[0]); }}
        className="rounded-xl p-6 text-center cursor-pointer transition-all duration-150"
        style={{
          border: `1px dashed ${drag ? 'rgba(0,200,150,0.6)' : 'rgba(255,255,255,0.12)'}`,
          background: drag ? 'rgba(0,200,150,0.06)' : 'rgba(255,255,255,0.02)',
        }}
        onMouseEnter={e => { if (!drag) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
        onMouseLeave={e => { if (!drag) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
      >
        <input ref={ref} type="file" className="hidden" accept=".jpg,.jpeg,.png,.webp,.pdf"
          onChange={(e) => validate(e.target.files[0])} />
        <div className="w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Upload size={15} style={{ color: drag ? '#00d99b' : '#61665f' }} />
        </div>
        <p className="text-xs font-medium" style={{ color: '#a2a59f' }}>{sublabel}</p>
        <p className="text-xs mt-0.5" style={{ color: '#4f564f' }}>JPG, PNG, PDF · max 10 MB</p>
        {onParsed && (
          <p className="text-xs mt-1" style={{ color: '#61665f' }}>
            Name format: <span style={{ color: '#7f867c' }}>StudentName_RollNo_Subject_Grade_Answer_Script.pdf</span>
          </p>
        )}
      </div>
    </div>
  );
}

// ── Leniency slider ────────────────────────────────────────────────────────────
function LeniencySlider({ value, onChange }) {
  const label = leniencyLabel(value);
  const pct   = ((value - 1) / 9) * 100;
  const clr   = value <= 3 ? '#f87171' : value <= 6 ? '#fbbf24' : '#4ade80';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: '#a2a59f' }}>Leniency Scale</span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold font-mono" style={{ color: clr }}>{value}/10</span>
          <span className="text-xs" style={{ color: '#7f867c' }}>{label}</span>
        </div>
      </div>
      <div className="relative h-4 flex items-center">
        <div className="absolute inset-x-0 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div className="h-1 rounded-full transition-all duration-200" style={{ width: `${pct}%`, background: clr }} />
        </div>
        <input type="range" min={1} max={10} step={1} value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-4" />
        <div className="absolute w-4 h-4 rounded-full border-2 shadow-lg transition-all duration-200 pointer-events-none"
          style={{ left: `calc(${pct}% - 8px)`, background: clr, borderColor: '#111311', boxShadow: `0 0 10px ${clr}50` }} />
      </div>
      <div className="flex justify-between">
        <span className="text-xs" style={{ color: '#61665f' }}>1 · Strictest</span>
        <span className="text-xs" style={{ color: '#61665f' }}>10 · Most lenient</span>
      </div>
      <div className="rounded-lg px-3 py-2 text-xs leading-relaxed"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#7f867c' }}>
        {value <= 3 && 'Competitive exam standard. Every missing concept penalised.'}
        {value === 4 && 'Strict grading. Accuracy and completeness required.'}
        {value === 5 && 'Balanced school / university teacher style.'}
        {value === 6 && 'Slightly generous. Rewards understanding over exact wording.'}
        {value >= 7 && value <= 8 && 'Lenient. Encourages partial understanding and effort.'}
        {value >= 9 && 'Very lenient. Rewards any relevant attempt generously.'}
      </div>
    </div>
  );
}

function Div() {
  return <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />;
}

function InputField({ label, icon: Icon, placeholder, value, onChange, type = 'text', readOnly = false }) {
  return (
    <div>
      <label className="text-xs font-medium block mb-1.5" style={{ color: '#a2a59f' }}>{label}</label>
      <div className="relative">
        {Icon && <div className="absolute left-3 top-1/2 -translate-y-1/2"><Icon size={13} style={{ color: '#61665f' }} /></div>}
        <input type={type} placeholder={placeholder} value={value} onChange={onChange} readOnly={readOnly}
          className="w-full rounded-lg text-sm text-white outline-none transition-all"
          style={{
            background: readOnly ? 'rgba(0,200,150,0.06)' : 'rgba(255,255,255,0.05)',
            border:     readOnly ? '1px solid rgba(0,200,150,0.2)' : '1px solid rgba(255,255,255,0.1)',
            padding:    Icon ? '8px 12px 8px 32px' : '8px 12px',
            color:      value ? '#f4f5f2' : '#61665f',
          }}
          onFocus={e => { if (!readOnly) e.target.style.borderColor = 'rgba(0,200,150,0.5)'; }}
          onBlur={e => { if (!readOnly) e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
        />
      </div>
    </div>
  );
}

// ── Main form ──────────────────────────────────────────────────────────────────
export default function EvaluateForm({ onResult, onError, onLoading }) {
  const [questionPaper, setQuestionPaper] = useState(null);
  const [answerSheet,   setAnswerSheet]   = useState(null);
  const [msFile,        setMsFile]        = useState(null);
  const [msText,        setMsText]        = useState('');
  const [showMs,        setShowMs]        = useState(false);
  const [leniency,      setLeniency]      = useState(5);
  const [subject,       setSubject]       = useState('');
  const [studentName,   setStudentName]   = useState('');
  const [rollNumber,    setRollNumber]    = useState('');
  const [grade,         setGrade]         = useState('');
  const [loading,       setLoading]       = useState(false);

  const canSubmit = questionPaper && answerSheet && !loading;

  // Auto-fill all student fields from filename including subject
  const handleAnswerSheetParsed = (parsed) => {
    if (parsed.name    && !studentName) setStudentName(parsed.name);
    if (parsed.roll    && !rollNumber)  setRollNumber(parsed.roll);
    if (parsed.grade   && !grade)       setGrade(parsed.grade);
    if (parsed.subject && !subject)     setSubject(parsed.subject);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true); onLoading?.(true); onResult?.(null); onError?.(null);
    const fd = new FormData();
    fd.append('question_paper', questionPaper);
    fd.append('answer_sheet', answerSheet);
    fd.append('leniency', leniency.toString());
    fd.append('marking_scheme_text', msText.trim());
    if (msFile) fd.append('marking_scheme_file', msFile);
    try {
      const res = await axios.post('/api/evaluate', fd, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 300_000 });
      onResult?.({
        ...res.data,
        studentName: studentName || res.data.studentName,
        rollNumber,
        classGrade: grade,
        subject,
        answerSheetFile: answerSheet,
      });
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (err.code === 'ECONNABORTED') {
        onError?.('Evaluation timed out after 5 minutes. Please try again with smaller/clearer files, or check the backend logs for a slow OCR/AI API call.');
      } else if (err.code === 'ERR_NETWORK') {
        onError?.('Could not reach the backend API. Please make sure the backend is running on port 8000.');
      } else if (typeof detail === 'string' && detail.includes('Expecting')) {
        onError?.('AI returned an incomplete response. Please run the evaluation again.');
      } else {
        onError?.(detail || 'Evaluation failed. Please try again.');
      }
    } finally {
      setLoading(false); onLoading?.(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Student Information */}
      <div className="rounded-xl p-4 space-y-4"
        style={{ background: 'rgba(0,200,150,0.04)', border: '1px solid rgba(0,200,150,0.12)' }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(0,200,150,0.2)' }}>
            <GraduationCap size={12} style={{ color: '#00d99b' }} />
          </div>
          <span className="text-xs font-semibold" style={{ color: '#00d99b' }}>Student Information</span>
          <span className="text-xs" style={{ color: '#61665f' }}>(auto-filled from filename)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InputField label="Student Name" icon={User} placeholder="e.g. Aarav Sharma"
            value={studentName} onChange={e => setStudentName(e.target.value)} />
          <InputField label="Roll Number" icon={Hash} placeholder="e.g. 23"
            value={rollNumber} onChange={e => setRollNumber(e.target.value)} />

          {/* Subject dropdown — highlights green when auto-filled */}
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: '#a2a59f' }}>Subject</label>
            <select value={subject} onChange={e => setSubject(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none cursor-pointer transition-all"
              style={{
                background: subject ? 'rgba(0,200,150,0.06)' : 'rgba(255,255,255,0.05)',
                border:     subject ? '1px solid rgba(0,200,150,0.3)' : '1px solid rgba(255,255,255,0.1)',
                color:      subject ? '#f4f5f2' : '#61665f',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(0,200,150,0.5)'}
              onBlur={e => e.target.style.borderColor = subject ? 'rgba(0,200,150,0.3)' : 'rgba(255,255,255,0.1)'}>
              <option value="" style={{ background: '#111311' }}>Select subject</option>
              {SUBJECTS.map(s => <option key={s} value={s} style={{ background: '#111311' }}>{s}</option>)}
            </select>
          </div>

          <InputField label="Class / Grade" icon={BookOpen} placeholder="e.g. 10A or CSE-A"
            value={grade} onChange={e => setGrade(e.target.value)} />
        </div>
      </div>

      <Div />

      {/* Upload zones */}
      <FileZone label="Question Paper" sublabel="Drop question paper or click to browse"
        file={questionPaper} onFile={setQuestionPaper} onError={onError} />
      <FileZone label="Answer Sheet" sublabel="Drop student answer sheet or click to browse"
        file={answerSheet} onFile={setAnswerSheet} onError={onError}
        onParsed={handleAnswerSheetParsed} />

      <Div />

      {/* Leniency */}
      <LeniencySlider value={leniency} onChange={setLeniency} />

      <Div />

      {/* Marking scheme */}
      <div>
        <button type="button" onClick={() => setShowMs(!showMs)}
          className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium" style={{ color: '#a2a59f' }}>Marking Scheme</span>
            <span className="text-xs" style={{ color: '#61665f' }}>(optional)</span>
          </div>
          {showMs ? <ChevronUp size={13} style={{ color: '#61665f' }} /> : <ChevronDown size={13} style={{ color: '#61665f' }} />}
        </button>

        <AnimatePresence>
          {showMs && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
              <div className="pt-4 space-y-3">
                <FileZone label="Marking scheme file" sublabel="Upload marking scheme image or PDF"
                  file={msFile} onFile={setMsFile} onError={onError} required={false} />
                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: '#a2a59f' }}>Or type instructions</label>
                  <textarea value={msText} onChange={e => setMsText(e.target.value)} rows={4}
                    placeholder={"e.g.\nQ1 (5 marks): Must define chlorophyll, mention light energy.\nQ2 (3 marks): F = ma — explain each variable."}
                    className="w-full rounded-lg px-3 py-2 text-xs text-white font-mono resize-none outline-none transition-all"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                    onFocus={e => e.target.style.borderColor = 'rgba(0,200,150,0.4)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'} />
                </div>
                <div className="flex items-start gap-2 rounded-lg p-3"
                  style={{ background: 'rgba(0,200,150,0.06)', border: '1px solid rgba(0,200,150,0.15)' }}>
                  <Info size={12} style={{ color: '#00d99b', flexShrink: 0, marginTop: 2 }} />
                  <p className="text-xs leading-relaxed" style={{ color: '#7f867c' }}>
                    Without a marking scheme, AI uses its own academic knowledge. Providing one significantly improves accuracy.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Div />

      {/* Submit */}
      <button type="submit" disabled={!canSubmit}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: canSubmit ? 'linear-gradient(135deg, #00c896, #3ee67f)' : 'rgba(255,255,255,0.08)', boxShadow: canSubmit ? '0 0 24px rgba(0,200,150,0.3)' : 'none', color: canSubmit ? '#04110b' : '#f4f5f2' }}>
        {loading ? (
          <>
            <span className="w-3.5 h-3.5 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} />
            Evaluating — 20–40 seconds
          </>
        ) : (
          <><Zap size={14} /> Run AI Evaluation</>
        )}
      </button>

    </form>
  );
}
