import { cn, pctColor, gradeColor, leniencyLabel } from '../../lib/utils';
import { Badge, ProgressBar } from '../ui/primitives';

export default function OverviewTab({ result }) {
  const lLabel = leniencyLabel(result.leniency);
  const lColor = result.leniency <= 3 ? '#f87171' : result.leniency <= 6 ? '#fbbf24' : '#34d399';

  return (
    <div className="space-y-3">
      {/* Compact student info row */}
      {(result.studentName || result.subject || result.rollNumber || result.classGrade) && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg px-3 py-2"
          style={{ background: 'rgba(0,200,150,0.05)', border: '1px solid rgba(0,200,150,0.12)' }}>
          {result.studentName && <span className="text-xs font-semibold text-white">{result.studentName}</span>}
          {result.rollNumber  && <Badge variant="green">#{result.rollNumber}</Badge>}
          {result.classGrade  && <Badge variant="default">{result.classGrade}</Badge>}
          {result.subject     && <Badge variant="indigo">{result.subject}</Badge>}
          <div className="ml-auto flex items-center gap-1 text-xs" style={{ color: '#7f867c' }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: lColor }} />
            L{result.leniency}/10
          </div>
        </div>
      )}

      {/* Compact score cards — 4 in one row */}
      <div className="grid grid-cols-4 gap-2">
        <div className="rounded-lg px-3 py-2.5" style={{ background: '#111311', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: '#61665f' }}>Total Score</div>
          <div className={cn('text-xl font-bold font-mono', pctColor(result.percentage))}>
            {result.total_marks_awarded}
            <span className="text-xs font-normal ml-0.5" style={{ color: '#61665f' }}>/{result.total_max_marks}</span>
          </div>
          <ProgressBar value={result.total_marks_awarded} max={result.total_max_marks} className="mt-1.5" />
        </div>
        <div className="rounded-lg px-3 py-2.5" style={{ background: '#111311', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: '#61665f' }}>Grade</div>
          <div className={cn('text-xl font-bold', gradeColor(result.grade_letter || result.grade))}>{result.grade_letter || result.grade}</div>
          <div className="text-[10px] mt-0.5" style={{ color: '#61665f' }}>{result.percentage}%</div>
        </div>
        <div className="rounded-lg px-3 py-2.5" style={{ background: '#111311', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: '#61665f' }}>Questions</div>
          <div className="text-xl font-bold font-mono text-white">{result.questions?.length ?? 0}</div>
          <div className="text-[10px] mt-0.5" style={{ color: '#61665f' }}>detected</div>
        </div>
        <div className="rounded-lg px-3 py-2.5" style={{ background: '#111311', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: '#61665f' }}>Leniency</div>
          <div className="text-xl font-bold font-mono" style={{ color: lColor }}>
            {result.leniency}<span className="text-xs font-normal" style={{ color: '#61665f' }}>/10</span>
          </div>
          <div className="text-[10px] mt-0.5" style={{ color: '#61665f' }}>{lLabel}</div>
        </div>
      </div>

      {/* Overall feedback */}
      <div className="rounded-lg overflow-hidden" style={{ background: '#111311', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="px-4 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#8a9087' }}>Overall Feedback</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-sm leading-relaxed" style={{ color: '#a2a59f' }}>{result.overall_feedback}</p>
          {result.marking_scheme_used && (
            <Badge variant="indigo" className="mt-3">Evaluated against provided marking scheme</Badge>
          )}
        </div>
      </div>

      {/* Quick question summary */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#111311', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="px-5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#8a9087' }}>
            Question Summary — {result.questions?.length} questions
          </p>
        </div>
        <div className="p-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <th className="text-left py-2 pr-4 uppercase tracking-wider font-medium" style={{ color: '#61665f' }}>Q#</th>
                <th className="text-left py-2 pr-4 uppercase tracking-wider font-medium" style={{ color: '#61665f' }}>Section</th>
                <th className="text-left py-2 pr-4 uppercase tracking-wider font-medium" style={{ color: '#61665f' }}>Topic</th>
                <th className="text-left py-2 pr-4 uppercase tracking-wider font-medium" style={{ color: '#61665f' }}>Marks</th>
                <th className="text-left py-2 uppercase tracking-wider font-medium" style={{ color: '#61665f' }}>Feedback</th>
              </tr>
            </thead>
            <tbody>
              {result.questions?.map((q, i) => {
                const pct = q.max_marks > 0 ? Math.round((q.marks_awarded / q.max_marks) * 100) : 0;
                return (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td className="py-3 pr-4 align-top">
                      <span className="inline-flex min-w-[72px] justify-center whitespace-nowrap px-2 py-1 rounded-lg text-xs font-semibold" style={{ background: 'rgba(0,200,150,0.15)', color: '#00d99b' }}>
                        Q{q.question_no}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-xs max-w-[140px] truncate" style={{ color: '#5eead4' }}>{q.section_name || 'General'}</td>
                    <td className="py-3 pr-4 text-white max-w-[200px] truncate">{q.question_text || `Question ${q.question_no}`}</td>
                    <td className="py-3 pr-4">
                      <span className={cn('font-semibold font-mono', pctColor(pct))}>{q.marks_awarded}/{q.max_marks}</span>
                    </td>
                    <td className="py-3 text-xs max-w-[300px] truncate" style={{ color: '#8a9087' }}>{q.feedback}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}