/**
 * evaluations.js
 * Previously used localStorage for persistence.
 * Now delegates to the MongoDB-backed REST API.
 *
 * All load/delete operations are async (return Promises).
 * saveEvaluationRecord is a no-op here — saving now happens via the
 * /evaluation-results API call in EvaluatePage.jsx.
 */
import { api } from './api';

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

/**
 * Load evaluation records from MongoDB via the API.
 * Returns a Promise<Array>.
 */
export async function loadEvaluationRecords() {
  try {
    const res = await api.get('/evaluation-results');
    const raw = Array.isArray(res.data) ? res.data : [];
    // Normalise to the shape the dashboard expects
    return raw.map((r) => ({
      id:          r.id || r._id || '',
      studentName: r.studentName || 'Unknown Student',
      rollNumber:  r.rollNumber  || '',
      classGrade:  r.classGrade  || '',
      subject:     r.subject     || 'Unspecified',
      marks:       Number(r.marks)      || 0,
      max:         Number(r.maxMarks)   || 0,
      percentage:  Number(r.percentage) || 0,
      grade:       r.grade || '',
      date:        r.createdAt ? r.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
      confidence:  r.report ? confidenceLabel(r.report) : 'Medium',
      report:      r.report || null,
    }));
  } catch {
    return [];
  }
}

/**
 * saveEvaluationRecord is kept as a compatibility shim.
 * The real save now happens in EvaluatePage.jsx via /evaluation-results API.
 * Returns null (no-op).
 */
export function saveEvaluationRecord(_result) {
  // No-op: saving is handled via api.post('/evaluation-results') in EvaluatePage.jsx
  return null;
}

/**
 * Delete an evaluation record from MongoDB via the API.
 * Returns a Promise.
 */
export async function deleteEvaluationRecord(id) {
  if (!id) return;
  try {
    await api.delete(`/evaluation-results/${id}`);
  } catch (err) {
    console.warn('Could not delete evaluation result:', err);
  }
}
