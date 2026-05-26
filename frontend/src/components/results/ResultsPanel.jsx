import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ClipboardList, Download, Edit3, FileImage, Trash2, X, ShieldCheck,
  ZoomIn, ZoomOut, Maximize2, FileDown
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { cn, pctColor, gradeColor } from '../../lib/utils';
import OverviewTab from './OverviewTab';
import QuestionMarksTab from './QuestionMarksTab';
import AnnotationTab from './AnnotationTab';

const TABS = [
  { id: 'overview', label: 'Overview',            icon: ClipboardList },
  { id: 'marks',    label: 'Question-wise Marks', icon: Edit3         },
];

// ─────────────────────────────────────────────────────────────────────────────
// AnswerBookletPreview
// scrollRef  → the outer scrollable div (used for scroll-sync)
// ─────────────────────────────────────────────────────────────────────────────
function AnswerBookletPreview({ result, scrollRef }) {
  const [objectUrl, setObjectUrl] = useState('');
  const [zoom,      setZoom]      = useState(100);
  const [fitWidth,  setFitWidth]  = useState(true);
  const [page,      setPage]      = useState(1);

  const file       = result.answerSheetFile;
  const remoteUrl  = result.answerSheetUrl || result.answer_sheet_url || result.fileUrl || result.answerScriptUrl || '';
  const previewUrl = objectUrl || remoteUrl;
  const fileName   = file?.name || result.answerSheetFileName || result.fileName || 'Answer booklet';
  const isPdf      = file?.type === 'application/pdf' || /\.pdf($|\?)/i.test(fileName) || /\.pdf($|\?)/i.test(previewUrl);
  const isImage    = file?.type?.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(fileName) || /\.(png|jpe?g|webp)($|\?)/i.test(previewUrl);

  useEffect(() => {
    if (!file) { setObjectUrl(''); return undefined; }
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const viewerUrl = useMemo(() => {
    if (!previewUrl || !isPdf) return previewUrl;
    return `${previewUrl}#page=${page}&zoom=${fitWidth ? 'page-width' : zoom}`;
  }, [fitWidth, isPdf, page, previewUrl, zoom]);

  const downloadFile = () => {
    if (!previewUrl) return;
    const a = document.createElement('a');
    a.href = previewUrl; a.download = fileName; a.target = '_blank'; a.rel = 'noreferrer'; a.click();
  };

  return (
    <div className="rounded-2xl overflow-hidden flex flex-col min-h-0 h-full"
      style={{ background: '#0d0f0d', border: '1px solid rgba(0,200,150,0.15)', boxShadow: '0 18px 44px rgba(0,0,0,0.28)' }}>

      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between gap-3 flex-shrink-0"
        style={{ background: 'linear-gradient(135deg,#111311,#141b15)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#00d99b' }}>Answer Booklet Preview</p>
          <p className="text-sm truncate mt-0.5 text-white">{fileName}</p>
        </div>
        <button onClick={downloadFile} disabled={!previewUrl} title="Download"
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-40"
          style={{ background: 'rgba(0,200,150,0.1)', border: '1px solid rgba(0,200,150,0.2)', color: '#00d99b' }}>
          <FileDown size={14} />
        </button>
      </div>

      {/* Toolbar */}
      <div className="px-3 py-2 flex items-center gap-2 flex-wrap flex-shrink-0"
        style={{ background: '#101210', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => { setFitWidth(false); setZoom(v => Math.max(50, v - 10)); }}
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.05)', color: '#a2a59f' }}><ZoomOut size={14} /></button>
        <span className="text-xs font-mono min-w-[44px] text-center" style={{ color: '#a2a59f' }}>
          {fitWidth ? 'Fit' : `${zoom}%`}
        </span>
        <button onClick={() => { setFitWidth(false); setZoom(v => Math.min(200, v + 10)); }}
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.05)', color: '#a2a59f' }}><ZoomIn size={14} /></button>
        <button onClick={() => setFitWidth(true)} className="h-8 px-3 rounded-lg flex items-center gap-1.5 text-xs"
          style={{ background: fitWidth ? 'rgba(0,200,150,0.14)' : 'rgba(255,255,255,0.05)', color: fitWidth ? '#00d99b' : '#a2a59f' }}>
          <Maximize2 size={13} /> Fit width
        </button>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs" style={{ color: '#61665f' }}>Page</span>
          <input type="number" min="1" value={page}
            onChange={e => setPage(Math.max(1, Number(e.target.value) || 1))}
            className="w-16 h-8 rounded-lg px-2 text-xs outline-none"
            style={{ background: '#0b0d0b', border: '1px solid rgba(255,255,255,0.08)', color: '#e8ede7' }} />
        </div>
      </div>

      {/* ── Scrollable content — THIS div is what scrollRef points to ── */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-auto p-4"
        style={{ background: 'linear-gradient(180deg,#090b09,#050705)' }}
      >
        {previewUrl && isPdf && (
          <iframe
            title="Answer booklet PDF preview"
            src={viewerUrl}
            className="w-full rounded-xl"
            style={{ height: '100%', minHeight: 720, border: '1px solid rgba(255,255,255,0.08)', background: '#fff' }}
          />
        )}
        {previewUrl && isImage && (
          <div className="min-h-full flex justify-center">
            <img
              src={previewUrl}
              alt="Answer booklet preview"
              className="rounded-xl"
              style={{
                width: fitWidth ? '100%' : `${zoom}%`,
                maxWidth: fitWidth ? '100%' : 'none',
                height: 'auto',
                alignSelf: 'flex-start',
                border: '1px solid rgba(255,255,255,0.08)',
                background: '#fff',
              }}
            />
          </div>
        )}
        {!previewUrl && (
          <div className="h-full min-h-[420px] flex flex-col items-center justify-center text-center rounded-xl"
            style={{ border: '1px dashed rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}>
            <FileImage size={26} style={{ color: '#61665f' }} />
            <p className="text-sm mt-3" style={{ color: '#a2a59f' }}>Answer booklet preview is available immediately after upload.</p>
            <p className="text-xs mt-1 max-w-sm" style={{ color: '#61665f' }}>Saved reports keep the evaluation data; reopen a fresh evaluation to preview the uploaded local file.</p>
          </div>
        )}
        {previewUrl && !isPdf && !isImage && (
          <div className="h-full min-h-[420px] flex flex-col items-center justify-center text-center rounded-xl"
            style={{ border: '1px dashed rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}>
            <FileImage size={26} style={{ color: '#61665f' }} />
            <p className="text-sm mt-3" style={{ color: '#a2a59f' }}>This file type cannot be previewed here.</p>
            <button onClick={downloadFile} className="mt-4 px-3 py-2 rounded-lg text-xs font-semibold"
              style={{ background: '#00c896', color: '#051008' }}>Download file</button>
          </div>
        )}
      </div>
    </div>
  );
}

function listText(items, fallback = '-') {
  return Array.isArray(items) && items.length ? items.join(', ') : fallback;
}

function addWrappedText(doc, text, x, y, width, lineHeight = 5) {
  const lines = doc.splitTextToSize(String(text || '-'), width);
  lines.forEach((line) => {
    if (y > 275) { doc.addPage(); y = 18; }
    doc.text(line, x, y);
    y += lineHeight;
  });
  return y;
}

function sectionTitle(doc, title, y) {
  if (y > 260) { doc.addPage(); y = 20; }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(15, 23, 42);
  doc.text(title, 14, y);
  doc.setDrawColor(20, 184, 166); doc.setLineWidth(0.6); doc.line(14, y + 3, 72, y + 3);
  doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.2); doc.line(74, y + 3, 196, y + 3);
  return y + 10;
}

function scoreColor(pct) {
  if (pct >= 75) return [34, 197, 94];
  if (pct >= 50) return [245, 158, 11];
  return [239, 68, 68];
}

function drawProgressBar(doc, x, y, width, height, pct, color = scoreColor(pct)) {
  const safePct = Math.max(0, Math.min(100, Number(pct) || 0));
  doc.setFillColor(226, 232, 240);
  doc.roundedRect(x, y, width, height, height / 2, height / 2, 'F');
  doc.setFillColor(...color);
  doc.roundedRect(x, y, Math.max(height, (width * safePct) / 100), height, height / 2, height / 2, 'F');
}

function drawMetricCard(doc, x, y, width, label, value, color) {
  doc.setDrawColor(...color); doc.setFillColor(248, 250, 252);
  doc.roundedRect(x, y, width, 25, 3, 3, 'FD');
  doc.setFillColor(...color); doc.roundedRect(x, y, 3, 25, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(100, 116, 139);
  doc.text(label, x + 6, y + 8);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(15, 23, 42);
  doc.text(String(value), x + 6, y + 18);
}

function addFooter(doc) {
  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(107, 114, 128);
    doc.text(`GradeAI Evaluation Report • Page ${i} of ${pages}`, 14, 288);
    doc.text(new Date().toLocaleString(), 196, 288, { align: 'right' });
  }
}

function downloadDetailedReport(result) {
  const questions = Array.isArray(result.questions) ? result.questions : [];
  const percentage = Number(result.percentage) || 0;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const safeName = (result.studentName || 'student').replace(/[^a-z0-9]+/gi, '_').toLowerCase();
  const reportId = (result.id || `b${Date.now().toString(16).slice(-8)}`).toLowerCase();
  const LM = 14; const RM = 196; const PW = 182;

  function ensureY(y, need = 14) { if (y + need > 278) { doc.addPage(); return 18; } return y; }

  function bulletList(items, y, textColor = [31, 41, 55]) {
    if (!Array.isArray(items) || !items.length) return y;
    items.forEach((item) => {
      y = ensureY(y, 8);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...textColor);
      doc.text('\u2022', LM + 2, y);
      const lines = doc.splitTextToSize(String(item), PW - 8);
      lines.forEach((line, li) => { y = ensureY(y, 6); doc.text(line, LM + 7, y); if (li < lines.length - 1) y += 5; });
      y += 5.5;
    });
    return y;
  }

  function subHeading(label, y, textColor) {
    y = ensureY(y, 10);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...textColor);
    doc.text(label, LM, y); return y + 6;
  }

  function heading(label, y) {
    y = ensureY(y, 14);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(15, 23, 42);
    doc.text(label, LM, y); y += 2;
    doc.setDrawColor(20, 184, 166); doc.setLineWidth(0.7); doc.line(LM, y, LM + 40, y);
    doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.2); doc.line(LM + 41, y, RM, y);
    return y + 7;
  }

  doc.setFillColor(255, 255, 255); doc.rect(0, 0, 210, 297, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(15, 23, 42); doc.setCharSpace(2.5);
  doc.text('ANSWER SHEET EVALUATION REPORT', LM, 12); doc.setCharSpace(0);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(80, 80, 80); doc.setCharSpace(1);
  doc.text(`REPORT ID : ${reportId.toUpperCase()}`, RM, 12, { align: 'right' }); doc.setCharSpace(0);
  doc.setDrawColor(20, 184, 166); doc.setLineWidth(0.5); doc.line(LM, 15, RM, 15);

  const initials = (result.studentName || 'S').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  doc.setFillColor(20, 184, 166); doc.circle(LM + 7, 26, 7, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(255, 255, 255);
  doc.text(initials, LM + 7, 28.5, { align: 'center' });
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(15, 23, 42);
  doc.text(result.studentName || 'Unknown Student', LM + 17, 24);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(90, 90, 90);
  doc.text([result.subject, result.classGrade].filter(Boolean).join('  •  ') || '-', LM + 17, 30);

  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const recAction = result.recommended_action || 'Auto-accept';
  doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.2); doc.line(LM, 35, RM, 35);

  const col5W = PW / 5;
  const row1 = [
    ['S T U D E N T  I D', result.rollNumber || '-'],
    ['E N R O L L M E N T  N O .', result.enrollmentNo || result.enrollment || '-'],
    ['C L A S S / G R A D E', result.classGrade || '-'],
    ['S U B J E C T', result.subject || '-'],
    ['D A T E', dateStr],
  ];
  row1.forEach(([label, value], i) => {
    const x = LM + i * col5W;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(100, 100, 100); doc.text(label, x, 41);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(15, 23, 42); doc.text(String(value), x, 47);
  });
  doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.2); doc.line(LM, 51, RM, 51);

  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(100, 100, 100);
  doc.text('F I N A L  S C O R E', LM, 57);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(24); doc.setTextColor(...scoreColor(percentage));
  doc.text(String(result.total_marks_awarded ?? 0), LM, 68);
  const bigNumW = doc.getTextWidth(String(result.total_marks_awarded ?? 0));
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(90, 90, 90);
  doc.text(`out of ${result.total_max_marks ?? 0}`, LM + bigNumW + 2, 68);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...scoreColor(percentage));
  doc.text(`${percentage}%`, LM, 75);

  const row2Cells = [
    ['E V A L U A T I O N  M O D E', result.evaluation_mode || 'Question Paper Only'],
    ['C H E C K I N G  L E V E L', `${result.leniency ?? '-'} / 10`],
    ['C O N F I D E N C E', result.confidence || 'High'],
    ['R E C O M M E N D E D\nA C T I O N', recAction],
  ];
  row2Cells.forEach(([label, value], i) => {
    const x = LM + (i + 1) * col5W;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(100, 100, 100);
    label.split('\n').forEach((ll, li) => doc.text(ll, x, 57 + li * 4));
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
    doc.text(String(value), x, 68);
  });
  doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.2); doc.line(LM, 79, RM, 79);

  let y = 79;
  y = heading('OVERALL FEEDBACK', y + 2);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(31, 41, 55);
  y = addWrappedText(doc, result.overall_feedback || '-', LM, y, PW, 5.5) + 6;

  y = ensureY(y, 20); y = heading('QUESTION-WISE REPORT', y);
  questions.forEach((q, qi) => {
    const qPct = q.max_marks ? Math.round((Number(q.marks_awarded || 0) / Number(q.max_marks)) * 100) : 0;
    const strengths = Array.isArray(q.matched_points?.length ? q.matched_points : q.strengths) ? (q.matched_points?.length ? q.matched_points : q.strengths) : [];
    const weak = Array.isArray(q.missing_points?.length ? q.missing_points : q.weaknesses) ? (q.missing_points?.length ? q.missing_points : q.weaknesses) : [];
    const actionText = q.marking_rationale || q.feedback || '';
    y = ensureY(y, 12);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(15, 23, 42);
    const qLabel = `${qi + 1}. ${q.question_text || '-'}`;
    const qLabelLines = doc.splitTextToSize(qLabel, PW - 52);
    doc.text(qLabelLines[0], LM, y);
    const scoreStr = `Score: ${q.marks_awarded ?? 0} / ${q.max_marks ?? 0} \u2022 ${qPct}%`;
    doc.setTextColor(...scoreColor(qPct)); doc.text(scoreStr, RM, y, { align: 'right' });
    if (qLabelLines[1]) { y += 5; doc.setTextColor(15, 23, 42); doc.text(qLabelLines[1], LM, y); }
    y += 6;
    if (strengths.length > 0) { y = subHeading('What Worked Well', y, [21, 128, 61]); y = bulletList(strengths, y, [31, 41, 55]); }
    if (weak.length > 0) { y = subHeading('Scope for Improvement', y, [180, 83, 9]); y = bulletList(weak, y, [31, 41, 55]); }
    if (actionText) {
      y = subHeading('Action Items', y, [31, 41, 55]); y = ensureY(y, 8);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(31, 41, 55); doc.text('\u2022', LM + 2, y);
      const aLines = doc.splitTextToSize(actionText, PW - 8);
      aLines.forEach((line, li) => { y = ensureY(y, 6); doc.text(line, LM + 7, y); if (li < aLines.length - 1) y += 5; });
      y += 5.5;
    }
    y += 2;
  });

  y = ensureY(y, 20); y = heading('OVERALL POINTS SUMMARY', y);
  const allStrengths = questions.flatMap(q => { const pts = q.matched_points?.length ? q.matched_points : (q.strengths || []); return Array.isArray(pts) ? pts : []; });
  const allWeak = questions.flatMap(q => Array.isArray(q.incorrect_points) && q.incorrect_points.length ? q.incorrect_points : []);
  const allMissing = questions.flatMap(q => Array.isArray(q.missing_points) ? q.missing_points : []);
  const allImprovements = questions.flatMap(q => Array.isArray(q.weaknesses) ? q.weaknesses : []);
  if (allStrengths.length > 0) { y = subHeading('C O R R E C T  P O I N T S', y, [15, 23, 42]); y = bulletList(allStrengths, y, [31, 41, 55]); }
  if (allWeak.length > 0) { y = subHeading('W R O N G  O R  W E A K  P O I N T S', y, [15, 23, 42]); y = bulletList(allWeak, y, [31, 41, 55]); }
  if (allMissing.length > 0) { y = subHeading('M I S S I N G  P O I N T S', y, [15, 23, 42]); y = bulletList(allMissing, y, [31, 41, 55]); }
  if (allImprovements.length > 0) { y = subHeading('I M P R O V E M E N T  S U G G E S T I O N S', y, [15, 23, 42]); y = bulletList(allImprovements, y, [31, 41, 55]); }

  y = ensureY(y, 20); y = heading('EVIDENCE LOG \u2014 QUANTITATIVE METRICS', y);
  const metrics = [
    ['Questions Detected', String(questions.length)],
    ['Total Marks Obtained', `${result.total_marks_awarded ?? 0} / ${result.total_max_marks ?? 0}`],
    ['Percentage Score', `${percentage}%`],
    ['Checking Strictness Level', `${result.leniency ?? '-'} / 10`],
    ['OCR Confidence', result.ocr_confidence ? `${result.ocr_confidence}%` : '-'],
    ['AI Confidence', result.ai_confidence ? `${result.ai_confidence}%` : (result.confidence || 'High')],
    ['Overall Confidence', result.confidence || 'High'],
    ['Recommended Action', recAction],
    ['Evaluation Mode', result.evaluation_mode || 'Question Paper Only'],
  ];
  metrics.forEach(([label, value]) => {
    y = ensureY(y, 8);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(31, 41, 55); doc.text(label, LM, y);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42); doc.text(value, RM, y, { align: 'right' });
    y += 3; doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.15); doc.line(LM, y, RM, y); y += 4;
  });

  y = ensureY(y, 20); y += 6;
  doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.3); doc.line(LM, y, RM, y); y += 5;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(15, 23, 42); doc.setCharSpace(1);
  doc.text('AI ANSWER SHEET EVALUATOR \u2014 AUTOMATED OUTPUT', 105, y, { align: 'center' }); doc.setCharSpace(0); y += 5;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(90, 90, 90);
  doc.text(`Report ID: ${reportId}  \u2022  Generated ${new Date().toLocaleString()}`, 105, y, { align: 'center' }); y += 5;
  doc.text(`Student: ${result.studentName || '-'}`, 105, y, { align: 'center' });
  if (result.enrollmentNo || result.enrollment) { y += 5; doc.text(`Enrollment: ${result.enrollmentNo || result.enrollment}`, 105, y, { align: 'center' }); }
  addFooter(doc);
  doc.save(`gradeai_report_${safeName}.pdf`);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function renderBullets(items, emptyText = 'No points available.') {
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!list.length) return `<div class="rpt-muted">${escapeHtml(emptyText)}</div>`;
  return list.map(item => `<div class="rpt-bullet"><span>${escapeHtml(item)}</span></div>`).join('');
}

function renderTags(items, variant = 'good') {
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!list.length) return '';
  const mark = variant === 'bad' ? 'x' : '✓';
  return list.map(item => `<span class="rpt-tag rpt-tag-${variant}">${mark} ${escapeHtml(item)}</span>`).join('');
}

function cleanStudentAnswerForReport(answer) {
  let text = String(answer || '').trim();
  if (!text) return 'No student answer detected.';
  text = text.replace(/[\uFFFD\u{FFFD}]+/gu, '').replace(/[|]{2,}/g, ' ').replace(/_{2,}/g, ' ').replace(/\?{2,}/g, '?').replace(/\s+/g, ' ').trim();
  text = text.replace(/\b(?:[A-Za-z]\s+){2,}[A-Za-z]\b/g, match => { const c = match.replace(/\s+/g, ''); return c.length <= 12 ? c : match; });
  return text || 'No student answer detected.';
}

function downloadPrintableReport(result) {
  const questions = Array.isArray(result.questions) ? result.questions : [];
  const percentage = Number(result.percentage) || 0;
  const scoreClass = percentage >= 75 ? 'good' : percentage >= 45 ? 'warn' : 'bad';
  const reportId = (result.id || `GAR-${Date.now()}`).toString().toUpperCase();
  const generated = new Date().toLocaleString('en-IN');
  const studentName = result.studentName || 'Unknown Student';
  const initials = studentName.split(/\s+/).filter(Boolean).map(p => p[0]).slice(0, 2).join('').toUpperCase() || '?';

  const qHtml = questions.map((q, i) => {
    const marks = Number(q.marks_awarded ?? q.edited_marks ?? 0);
    const max   = Number(q.max_marks ?? 0);
    const qPct  = max > 0 ? Math.round((marks / max) * 100) : 0;
    const qClass = qPct >= 75 ? 'good' : qPct >= 45 ? 'warn' : 'bad';
    const matched = q.matched_points?.length ? q.matched_points : q.strengths;
    const missing = [...(Array.isArray(q.incorrect_points) ? q.incorrect_points : []), ...(Array.isArray(q.missing_points) ? q.missing_points : []), ...(Array.isArray(q.weaknesses) ? q.weaknesses : [])];
    const concepts = [...(Array.isArray(q.concepts_tested) ? q.concepts_tested : []), ...(Array.isArray(q.expected_key_points) ? q.expected_key_points : [])].slice(0, 8);
    const title = q.question_text || `Question ${q.question_no || i + 1}`;
    const studentAnswer = cleanStudentAnswerForReport(q.student_answer);
    const note = q.selection_note ? `<div class="rpt-note">${escapeHtml(q.selection_note)}</div>` : '';
    return `
      <div class="rpt-q-card">
        <div class="rpt-q-header">
          <div class="rpt-q-num">Q${escapeHtml(q.question_no || i + 1)}</div>
          <div class="rpt-q-title">${escapeHtml(title)}</div>
          <div class="rpt-q-score">
            <div class="rpt-score-label">Score</div>
            <div class="rpt-score rpt-${qClass}">${escapeHtml(marks)} / ${escapeHtml(max)}</div>
            <div class="rpt-score-pct">${qPct}%</div>
          </div>
        </div>
        <div class="rpt-q-body">
          ${note}
          <div class="rpt-block"><div class="rpt-obs-label">Student Answer</div><div class="rpt-guide-box rpt-student-answer">${escapeHtml(studentAnswer)}</div></div>
          ${concepts.length ? `<div class="rpt-block"><div class="rpt-obs-label">Concepts / Key Points</div><div>${renderTags(concepts, 'good')}</div></div>` : ''}
          <div class="rpt-grid">
            <div class="rpt-panel rpt-panel-good"><div class="rpt-panel-title">What Worked Well</div>${renderBullets(matched, 'No clearly matched points were returned.')}</div>
            <div class="rpt-panel rpt-panel-bad"><div class="rpt-panel-title">Scope for Improvement</div>${renderBullets(missing, 'No major missing or weak points were identified.')}</div>
          </div>
          <div class="rpt-block"><div class="rpt-obs-label">Action Items</div><div class="rpt-guide-box rpt-action">${escapeHtml(q.marking_rationale || q.feedback || 'Review the model answer and key points with the student.')}</div></div>
        </div>
      </div>`;
  }).join('');

  const summaryGood = questions.flatMap(q => q.matched_points?.length ? q.matched_points : (q.strengths || [])).slice(0, 10);
  const summaryWeak = questions.flatMap(q => [...(Array.isArray(q.incorrect_points) ? q.incorrect_points : []), ...(Array.isArray(q.missing_points) ? q.missing_points : [])]).slice(0, 10);

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Report - ${escapeHtml(studentName)}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}body{font-family:Georgia,'Times New Roman',serif;background:#fff;color:#1a1a1a;padding:32px 40px}
  @page{size:A4;margin:12mm}@media print{body{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;padding:0}.no-print{display:none!important}}
  .rpt-wrap{max-width:860px;margin:0 auto}.rpt-label{font-family:Arial,sans-serif;font-size:9px;font-weight:900;letter-spacing:.18em;text-transform:uppercase;color:#6b7280}
  .rpt-divider{border:none;border-top:2px solid #111;margin:0}.rpt-section-title,.rp-sec{font-family:Arial,sans-serif;font-size:12px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:#111}
  .rpt-id-band{margin-top:16px;background:#278556;border-radius:10px;padding:20px 24px;display:flex;align-items:center;gap:20px;flex-wrap:wrap}
  .rpt-avatar{width:56px;height:56px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;font-family:Arial,sans-serif;font-weight:900;font-size:20px;color:#111;flex-shrink:0}
  .rpt-name{font-family:Arial,sans-serif;font-size:22px;font-weight:900;color:#fff;line-height:1.1;margin-bottom:10px}
  .rpt-student-meta{display:flex;flex-wrap:wrap;gap:20px}.rpt-meta-item{display:flex;flex-direction:column;gap:2px}
  .rpt-meta-k{font-size:8.5px;font-family:Arial,sans-serif;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:#060227}
  .rpt-meta-v{font-size:12.5px;font-family:Arial,sans-serif;font-weight:700;color:#f1f5f9}
  .rpt-final{background:#fff;border-radius:10px;padding:14px 22px;text-align:center;min-width:120px;box-shadow:0 0 0 3px rgba(52,211,153,.35)}
  .rpt-final-label{font-size:8.5px;font-family:Arial,sans-serif;font-weight:900;letter-spacing:.16em;text-transform:uppercase;margin-bottom:4px}
  .rpt-final-score{font-family:Arial,sans-serif;font-size:34px;font-weight:900;line-height:1}
  .rpt-good{color:#15803d}.rpt-warn{color:#b45309}.rpt-bad{color:#b91c1c}
  .rpt-meta-strip{margin-top:10px;display:flex;border:1.5px solid #e5e7eb;border-radius:8px;overflow:hidden}
  .rpt-meta-strip>div{flex:1;padding:9px 13px;border-right:1px solid #e5e7eb;background:#fff}
  .rpt-meta-strip>div:nth-child(odd){background:#f9fafb}.rpt-meta-strip>div:last-child{border-right:none}
  .rpt-small-k{font-size:8.5px;font-family:Arial,sans-serif;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:#9ca3af;margin-bottom:3px}
  .rpt-small-v{font-size:11.5px;font-family:Arial,sans-serif;font-weight:700;color:#111827}
  .rpt-feedback{background:#f9fafb;border-left:4px solid #1a1a1a;padding:14px 18px;border-radius:0 6px 6px 0;font-size:13px;line-height:1.7;color:#374151}
  .rpt-q-card{border:1.5px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:20px;page-break-inside:avoid}
  .rpt-q-header{display:flex;align-items:stretch;background:#f9fafb;border-bottom:1.5px solid #e5e7eb}
  .rpt-q-num{background:#1a1a1a;color:#fff;font-family:Arial,sans-serif;font-size:14px;font-weight:900;display:flex;align-items:center;justify-content:center;padding:12px 18px;min-width:60px;letter-spacing:.04em}
  .rpt-q-title{flex:1;padding:12px 16px;font-size:13px;font-weight:700;font-family:Arial,sans-serif;color:#111827;display:flex;align-items:center;line-height:1.35}
  .rpt-q-score{padding:10px 18px;display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:88px;border-left:1.5px solid #e5e7eb}
  .rpt-score-label,.rpt-score-pct{font-family:Arial,sans-serif;font-size:10px;font-weight:800;color:#64748b}
  .rpt-score{font-family:Arial,sans-serif;font-size:14px;font-weight:900;white-space:nowrap;margin-top:3px}
  .rpt-q-body{padding:18px 20px}.rpt-block{margin-bottom:16px}
  .rpt-obs-label{font-family:Arial,sans-serif;font-size:8px;font-weight:900;letter-spacing:.2em;text-transform:uppercase;color:#4b5563;margin-bottom:8px}
  .rpt-guide-box{border-left:4px solid #1a1a1a;background:#f9fafb;padding:12px 16px;border-radius:0 6px 6px 0;font-size:12px;line-height:1.65;color:#1e293b}
  .rpt-student-answer{border-left-color:#278556;background:#f0fdf4}.rpt-action{border-left-color:#1d4ed8}
  .rpt-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}
  .rpt-panel{border:1.5px solid #e5e7eb;border-radius:8px;padding:12px 14px}
  .rpt-panel-good{background:#f0fdf4;border-color:#bbf7d0}.rpt-panel-bad{background:#fef2f2;border-color:#fecaca}
  .rpt-panel-title{font-family:Arial,sans-serif;font-size:12px;font-weight:900;margin-bottom:6px}
  .rpt-panel-good .rpt-panel-title{color:#15803d}.rpt-panel-bad .rpt-panel-title{color:#b91c1c}
  .rpt-tag{display:inline-block;padding:3px 10px;border-radius:4px;font-size:11px;font-family:Arial,sans-serif;font-weight:700;margin:2px 3px 2px 0}
  .rpt-tag-good{background:#f0fdf4;border:1px solid #86efac;color:#15803d}.rpt-tag-bad{background:#fef2f2;border:1px solid #fca5a5;color:#b91c1c}
  .rpt-bullet{display:flex;gap:8px;margin-bottom:6px;align-items:flex-start;font-size:12px;line-height:1.6;color:#1e293b;font-family:Arial,sans-serif}
  .rpt-bullet::before{content:"•";font-weight:900;flex-shrink:0;margin-top:1px}
  .rpt-muted{font-size:12px;line-height:1.6;color:#64748b;font-family:Arial,sans-serif}
  .rpt-note{background:#fffbeb;border:1px solid #fde68a;color:#92400e;border-radius:6px;padding:8px 10px;font-size:11px;font-family:Arial,sans-serif;font-weight:700;margin-bottom:14px}
  .rpt-summary-card{border:1.5px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:14px}
  .rpt-summary-head{padding:10px 16px;font-size:10px;font-weight:900;font-family:Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase}
  .rpt-summary-body{padding:14px 18px;background:#fff}
  .rpt-footer{border-top:2px solid #1a1a1a;padding-top:14px;display:flex;justify-content:space-between;align-items:flex-end;gap:24px}
</style></head><body><div class="rpt-wrap">
  <div style="margin-bottom:28px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
      <div class="rpt-label">Answer Sheet Evaluation Report</div>
      <div class="rpt-label">Report ID: ${escapeHtml(reportId)}</div>
    </div>
    <hr class="rpt-divider"/>
    <div class="rpt-id-band">
      <div class="rpt-avatar">${escapeHtml(initials)}</div>
      <div style="flex:1;min-width:220px;">
        <div class="rpt-name">${escapeHtml(studentName)}</div>
        <div class="rpt-student-meta">
          ${[['Student ID',result.rollNumber||result.studentId],['Enrollment No.',result.enrollmentNo||result.enrollment],['Class / Grade',result.classGrade],['Subject',result.subject],['Date',generated.split(',')[0]]].map(([k,v])=>`<div class="rpt-meta-item"><span class="rpt-meta-k">${escapeHtml(k)}</span><span class="rpt-meta-v">${escapeHtml(v||'N/A')}</span></div>`).join('')}
        </div>
      </div>
      <div class="rpt-final">
        <div class="rpt-final-label rpt-${scoreClass}">Final Score</div>
        <div class="rpt-final-score rpt-${scoreClass}">${escapeHtml(result.total_marks_awarded??'—')}</div>
        <div style="font-size:12px;color:#6b7280;font-family:Arial,sans-serif;font-weight:700;">out of ${escapeHtml(result.total_max_marks??'—')}</div>
        <div class="rpt-${scoreClass}" style="margin-top:6px;font-size:13px;font-weight:900;font-family:Arial,sans-serif;">${percentage}%</div>
      </div>
    </div>
    <div class="rpt-meta-strip">
      ${[['Evaluation Mode',result.marking_scheme_used?'Question Paper + Marking Scheme':'Question Paper Only'],['Checking Level',`${result.leniency??'—'} / 10`],['Confidence','AI Evaluated'],['Recommended Action',percentage>=75?'Accept / Minor Review':percentage>=45?'Teacher Review':'Detailed Review']].map(([k,v])=>`<div><div class="rpt-small-k">${escapeHtml(k)}</div><div class="rpt-small-v">${escapeHtml(v)}</div></div>`).join('')}
    </div>
  </div>
  <div style="margin-bottom:28px;"><div class="rpt-section-title" style="margin-bottom:10px;">Overall Feedback</div><hr class="rpt-divider" style="margin-bottom:14px;"/><div class="rpt-feedback">${escapeHtml(result.overall_feedback||'No overall feedback available.')}</div></div>
  ${questions.length?`<div style="margin-bottom:18px;"><div class="rp-sec" style="margin-bottom:8px;">Question-wise Report</div><hr class="rpt-divider" style="margin-bottom:14px;"/>${qHtml}</div>`:''}
  ${(summaryGood.length||summaryWeak.length)?`<div style="margin-bottom:28px;"><div class="rpt-section-title" style="margin-bottom:10px;">Overall Points Summary</div><hr class="rpt-divider" style="margin-bottom:20px;"/>${summaryGood.length?`<div class="rpt-summary-card"><div class="rpt-summary-head" style="background:#f0fdf4;color:#15803d;border-bottom:1px solid #bbf7d0;">Correct Points</div><div class="rpt-summary-body">${renderBullets(summaryGood)}</div></div>`:''} ${summaryWeak.length?`<div class="rpt-summary-card"><div class="rpt-summary-head" style="background:#fef2f2;color:#b91c1c;border-bottom:1px solid #fecaca;">Wrong / Missing Points</div><div class="rpt-summary-body">${renderBullets(summaryWeak)}</div></div>`:''}</div>`:''}
  <div class="rpt-footer"><div><div style="font-size:10px;font-family:Arial,sans-serif;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:#9ca3af;">AI Answer Sheet Evaluator — Automated Output</div><div style="font-size:10px;font-family:Arial,sans-serif;color:#9ca3af;margin-top:2px;">Report ID: ${escapeHtml(reportId)} • Generated ${escapeHtml(generated)}</div></div><div style="font-size:10px;font-family:Arial,sans-serif;color:#9ca3af;text-align:right;">Student: ${escapeHtml(studentName)}<br/>Enrollment: ${escapeHtml(result.enrollmentNo||result.enrollment||'—')}</div></div>
</div><script>window.onload=function(){setTimeout(function(){window.print();},500);};<\/script></body></html>`;

  const win = window.open('', '_blank');
  if (!win) { alert('Popup blocked. Please allow popups and try again.'); return; }
  win.document.write(html); win.document.close();
}

// ─────────────────────────────────────────────────────────────────────────────
// ResultsPanel  — the main export
// ─────────────────────────────────────────────────────────────────────────────
export function ResultsPanel({ result: initialResult, onClose, onDelete }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [result,    setResult]    = useState(initialResult);

  // Two refs for the scrollable containers
  const leftScrollRef  = useRef(null);  // AnswerBookletPreview scrollable div
  const rightScrollRef = useRef(null);  // Tab-content scrollable div

  const handleUpdateResult = (updated) => { setResult(updated); };

  // ── Scroll-sync ────────────────────────────────────────────────────────────
  // Re-runs every time the active tab changes so that:
  //   (a) refs are guaranteed to point at the live DOM nodes
  //   (b) when the user switches to 'marks' the listeners are fresh
  //
  // We use requestAnimationFrame to ensure React has flushed DOM mutations
  // (especially the right panel re-rendering its new tab content) before
  // we read scrollHeight / attach listeners.
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    // Only wire up sync on the Question-wise Marks tab where it's meaningful
    if (activeTab !== 'marks') return;

    let rafId;
    let removeListeners = () => {};

    rafId = requestAnimationFrame(() => {
      const left  = leftScrollRef.current;
      const right = rightScrollRef.current;

      // Guard: both containers must exist and have scrollable content
      if (!left || !right) return;

      // Local sync-lock — prevents the two handlers from bouncing each other
      let syncing = false;

      const onLeft = () => {
        if (syncing) return;
        syncing = true;
        const leftMax  = left.scrollHeight  - left.clientHeight;
        const rightMax = right.scrollHeight - right.clientHeight;
        if (leftMax > 0 && rightMax > 0) {
          const pct = left.scrollTop / leftMax;
          right.scrollTop = pct * rightMax;
        }
        requestAnimationFrame(() => { syncing = false; });
      };

      const onRight = () => {
        if (syncing) return;
        syncing = true;
        const leftMax  = left.scrollHeight  - left.clientHeight;
        const rightMax = right.scrollHeight - right.clientHeight;
        if (leftMax > 0 && rightMax > 0) {
          const pct = right.scrollTop / rightMax;
          left.scrollTop = pct * leftMax;
        }
        requestAnimationFrame(() => { syncing = false; });
      };

      left.addEventListener('scroll',  onLeft,  { passive: true });
      right.addEventListener('scroll', onRight, { passive: true });

      // Store cleanup so the effect teardown can remove them
      removeListeners = () => {
        left.removeEventListener('scroll',  onLeft);
        right.removeEventListener('scroll', onRight);
      };
    });

    // Cleanup: cancel the pending rAF (if still queued) and remove any
    // listeners that were successfully attached
    return () => {
      cancelAnimationFrame(rafId);
      removeListeners();
    };
  }, [activeTab]); // ← re-attach whenever the tab changes

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-0"
    >
      {/* Report Header */}
      <div className="rounded-t-2xl px-6 py-4 flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg,#111311,#141b15)', border: '1px solid rgba(0,200,150,0.15)', borderBottom: 'none' }}>
        <div>
          <h2 className="text-lg font-bold text-white">Final Evaluation Report</h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {result.studentName && <span className="text-sm" style={{ color: '#a2a59f' }}>{result.studentName}</span>}
            {result.subject     && <span className="text-sm" style={{ color: '#a2a59f' }}>• {result.subject}</span>}
            <span className={cn('text-sm font-semibold', pctColor(result.percentage))}>
              • {result.total_marks_awarded} / {result.total_max_marks}
            </span>
            <span className={cn('text-sm font-semibold', pctColor(result.percentage))}>• {result.percentage}%</span>
            {result.reviewedByTeacher && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>
                <ShieldCheck size={10} /> Edited by teacher
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => downloadPrintableReport(result)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ background: 'linear-gradient(135deg,#00c896,#3ee67f)', color: '#04110b', boxShadow: '0 0 12px rgba(0,200,150,0.3)' }}>
            <Download size={12} /> Download PDF
          </button>
          {onDelete && (
            <button onClick={onDelete}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <Trash2 size={14} style={{ color: '#f87171' }} />
            </button>
          )}
          {onClose && (
            <button onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <X size={14} style={{ color: '#a2a59f' }} />
            </button>
          )}
        </div>
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 p-4 rounded-b-2xl"
        style={{ background: '#080a08', border: '1px solid rgba(0,200,150,0.15)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>

        {/* LEFT — answer booklet with annotation tools */}
        <div className="min-h-0 rounded-2xl overflow-hidden flex flex-col"
          style={{ height: 'calc(100vh - 170px)', minHeight: 520, background: '#0d0f0d', border: '1px solid rgba(0,200,150,0.15)' }}>
          {/* Annotation header */}
          <div className="flex items-center gap-2 px-4 py-2.5 flex-shrink-0"
            style={{ background: '#101210', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <FileImage size={13} style={{ color: '#00d99b' }} />
            <span className="text-xs font-medium text-white">Answer Sheet + Annotate</span>
            <button onClick={() => downloadPrintableReport(result)}
              className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all"
              style={{ background: 'rgba(0,200,150,0.12)', border: '1px solid rgba(0,200,150,0.25)', color: '#00d99b' }}>
              <Download size={11} /> Download Report
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <AnnotationTab result={result} onAnnotationSaved={() => {}} />
          </div>
        </div>

        {/* RIGHT — tabs + content */}
        <div className="rounded-2xl overflow-hidden flex flex-col min-h-0"
          style={{ height: 'calc(100vh - 170px)', minHeight: 520, background: '#0d0f0d', border: '1px solid rgba(0,200,150,0.15)', boxShadow: '0 18px 44px rgba(0,0,0,0.28)' }}>

          {/* Tab bar */}
          <div className="flex gap-0 overflow-x-auto flex-shrink-0"
            style={{ background: '#101210', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn('flex items-center gap-2 px-5 py-3 text-xs font-medium transition-all whitespace-nowrap',
                  activeTab === tab.id ? 'text-white' : 'text-white/40 hover:text-white/70')}
                style={activeTab === tab.id
                  ? { borderBottom: '2px solid #00c896', background: 'rgba(0,200,150,0.06)' }
                  : { borderBottom: '2px solid transparent' }}>
                <tab.icon size={13} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content — THIS div is what rightScrollRef points to */}
          <div
            ref={rightScrollRef}
            className="flex-1 min-h-0 overflow-y-auto p-5 lg:p-6"
          >
            {activeTab === 'overview' && <OverviewTab     result={result} />}
            {activeTab === 'marks'    && <QuestionMarksTab result={result} onUpdateResult={handleUpdateResult} />}
          </div>
        </div>
      </div>

      <p className="text-xs text-center pt-3" style={{ color: '#4f564f' }}>
        AI evaluation results are indicative. Always verify with a qualified teacher.
      </p>
    </motion.div>
  );
}

export function EvaluationSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-xl skeleton" />)}
      </div>
      <div className="h-20 rounded-xl skeleton" />
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => <div key={i} className="h-14 rounded-xl skeleton" />)}
      </div>
    </div>
  );
}