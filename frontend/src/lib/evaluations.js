const STORAGE_KEY = 'gradeai:evaluations';

function readRecords() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRecords(records) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function confidenceLabel(result) {
  const questions = Array.isArray(result.questions) ? result.questions : [];
  const confidences = questions
    .map((q) => Number(q.confidence))
    .filter((value) => Number.isFinite(value));

  if (!confidences.length) return 'Medium';

  const avg = confidences.reduce((sum, value) => sum + value, 0) / confidences.length;
  if (avg >= 0.75) return 'High';
  if (avg >= 0.5) return 'Medium';
  return 'Low';
}

export function loadEvaluationRecords() {
  if (typeof window === 'undefined') return [];
  return readRecords();
}

export function saveEvaluationRecord(result) {
  if (typeof window === 'undefined' || !result) return null;

  const now = new Date();
  const { answerSheetFile, ...serializableResult } = result;
  const record = {
    id: result.id || `eval-${now.getTime()}`,
    studentName: result.studentName?.trim() || 'Unknown Student',
    rollNumber: result.rollNumber?.trim() || '',
    classGrade: result.classGrade?.trim() || '',
    subject: result.subject || 'Unspecified',
    marks: Number(result.total_marks_awarded) || 0,
    max: Number(result.total_max_marks) || 0,
    percentage: Number(result.percentage) || 0,
    grade: result.grade_letter || result.grade || '',
    date: now.toISOString().slice(0, 10),
    confidence: confidenceLabel(result),
    report: serializableResult,
  };

  const records = readRecords();
  writeRecords([record, ...records]);
  return record;
}

export function deleteEvaluationRecord(id) {
  if (typeof window === 'undefined') return;
  writeRecords(readRecords().filter((record) => record.id !== id));
}
