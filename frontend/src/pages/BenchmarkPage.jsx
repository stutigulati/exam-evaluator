import { useState, useRef } from 'react';
import { Upload, TrendingUp, FileImage, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Container, PageHeader } from '../components/layout/Sidebar';
import { Card, CardHeader, CardContent, Badge, Button, Separator } from '../components/ui/primitives';
import { cn, formatMs } from '../lib/utils';

const ENGINES = [
  { id: 'gemini',        label: 'Gemini Vision',   desc: 'Gemini 2.5 Flash multimodal' },
  { id: 'google_vision', label: 'Google Vision',   desc: 'DOCUMENT_TEXT_DETECTION' },
  { id: 'paddle',        label: 'PaddleOCR',        desc: 'Baidu open-source engine' },
  { id: 'tesseract',     label: 'Tesseract',        desc: 'Tesseract 5 open-source' },
];

function ConfBar({ value }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500';
  const tColor = pct >= 80 ? 'text-green-400' : pct >= 60 ? 'text-amber-400' : 'text-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-white/8 rounded-full h-1">
        <div className={cn(color,'h-1 rounded-full transition-all duration-700')} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn('text-xs font-mono w-8 text-right', tColor)}>{pct}%</span>
    </div>
  );
}

export default function BenchmarkPage() {
  const [file,     setFile]     = useState(null);
  const [selected, setSelected] = useState(['gemini','google_vision']);
  const [results,  setResults]  = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [ocrEngine,setOcrEngine]= useState(null);
  const ref = useRef(null);

  const toggle = (id) => setSelected(prev =>
    prev.includes(id) ? (prev.length > 1 ? prev.filter(e => e !== id) : prev) : [...prev, id]
  );

  const handleFile = (f) => {
    if (!f) return;
    if (!['image/jpeg','image/jpg','image/png','image/webp','application/pdf'].includes(f.type)) {
      setError('Unsupported file type.'); return;
    }
    setFile(f);
  };

  const run = async () => {
    if (!file || !selected.length) return;
    setLoading(true); setResults(null); setError(null);
    const fd = new FormData();
    fd.append('file', file);
    selected.forEach(e => fd.append('engines', e));
    try {
      const res = await axios.post('/api/benchmark', fd, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120_000 });
      setResults(res.data);
      setOcrEngine(Object.keys(res.data)[0]);
    } catch (err) {
      setError(err.response?.data?.detail || 'Benchmark failed.');
    } finally { setLoading(false); }
  };

  const sorted = results
    ? Object.entries(results).sort((a, b) => a[1].processing_time_ms - b[1].processing_time_ms)
    : [];

  return (
    <div className="min-h-screen" style={{ background: '#050705' }}>
      <PageHeader title="OCR Benchmark" description="Compare extraction quality, confidence and speed across multiple OCR engines." gradient />
      <Container className="py-6 space-y-6">

        {/* Config */}
        <div className="bg-bg-1 border border-white/7 rounded-xl p-5 space-y-5">
          {/* File upload */}
          <div>
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-3">Upload Document</p>
            {file ? (
              <div className="flex items-center gap-3 bg-bg-2 border border-white/8 rounded-xl px-4 py-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/12 border border-emerald-500/20 flex items-center justify-center">
                  <FileImage size={15} className="text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{file.name}</p>
                  <p className="text-xs text-text-tertiary">{(file.size/1024).toFixed(0)} KB</p>
                </div>
                <button onClick={() => setFile(null)} className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-text-tertiary hover:text-text-primary">
                  <X size={11} />
                </button>
              </div>
            ) : (
              <div onClick={() => ref.current?.click()}
                className="border border-dashed border-white/10 hover:border-white/20 hover:bg-white/2 rounded-xl p-8 text-center cursor-pointer transition-all">
                <input ref={ref} type="file" className="hidden" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={e => handleFile(e.target.files[0])} />
                <div className="w-10 h-10 rounded-xl bg-white/4 border border-white/8 flex items-center justify-center mx-auto mb-3">
                  <Upload size={16} className="text-text-tertiary" />
                </div>
                <p className="text-sm text-text-secondary font-medium">Drop document or click to browse</p>
                <p className="text-xs text-text-tertiary mt-1">JPG, PNG, PDF · max 10 MB</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Engine selector */}
          <div>
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-3">
              Select Engines — {selected.length} selected
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ENGINES.map(e => {
                const active = selected.includes(e.id);
                return (
                  <button key={e.id} type="button" onClick={() => toggle(e.id)}
                    className={cn('border rounded-xl p-3 text-left transition-all duration-150',
                      active ? 'border-emerald-500/40 bg-emerald-500/8' : 'border-white/8 hover:border-white/15 hover:bg-white/2')}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={cn('text-xs font-medium', active ? 'text-emerald-400' : 'text-text-secondary')}>{e.label}</span>
                      <div className={cn('w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
                        active ? 'border-emerald-500 bg-emerald-500' : 'border-white/15')}>
                        {active && <div className="w-2 h-2 rounded-sm bg-white" />}
                      </div>
                    </div>
                    <p className="text-xs text-text-tertiary">{e.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <Separator />

          <Button onClick={run} disabled={!file || loading || !selected.length} size="lg" className="w-full justify-center !bg-emerald-500 !hover:bg-emerald-600 text-white shadow-glow">
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Running {selected.length} engines in parallel…
              </>
            ) : `Run Benchmark — ${selected.length} engine${selected.length !== 1 ? 's' : ''}`}
          </Button>
        </div>

        {error && (
          <div className="flex items-start gap-3 bg-red-500/6 border border-red-500/20 rounded-xl p-4">
            <AlertCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {sorted.length > 0 && (
          <div className="space-y-4">
            {/* Summary table */}
            <div className="bg-bg-1 border border-white/7 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/6">
                <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">Comparison Summary</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/6">
                      {['Engine','Time','Confidence','Words'].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-xs text-text-tertiary font-medium uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {sorted.map(([engine, data], i) => {
                      const info = ENGINES.find(e => e.id === engine);
                      const words = data.extracted_text?.split(/\s+/).filter(Boolean).length ?? 0;
                      return (
                        <tr key={engine} className="hover:bg-white/2 transition-colors">
                          <td className="px-5 py-3 font-medium text-text-primary flex items-center gap-2">
                            {info?.label ?? engine}
                            {i === 0 && <Badge variant="green">Fastest</Badge>}
                          </td>
                          <td className="px-5 py-3 font-mono text-text-secondary">{formatMs(data.processing_time_ms)}</td>
                          <td className="px-5 py-3 w-40"><ConfBar value={data.confidence} /></td>
                          <td className="px-5 py-3 font-mono text-text-secondary">{words}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Text comparison */}
            <div className="bg-bg-1 border border-white/7 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/6 flex items-center justify-between flex-wrap gap-3">
                <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">Extracted Text Comparison</p>
                <div className="flex gap-1 flex-wrap">
                  {sorted.map(([engine]) => {
                    const info = ENGINES.find(e => e.id === engine);
                    return (
                      <button key={engine} onClick={() => setOcrEngine(engine)}
                        className={cn('px-2.5 py-1 rounded-lg text-xs transition-colors',
                          ocrEngine === engine ? 'bg-white/8 text-text-primary' : 'text-text-tertiary hover:text-text-secondary')}>
                        {info?.label ?? engine}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="px-5 py-4">
                <pre className="text-xs text-text-tertiary font-mono whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto bg-bg-2 rounded-lg p-3 border border-white/6">
                  {ocrEngine && results?.[ocrEngine]?.extracted_text || 'Select an engine to view extracted text'}
                </pre>
              </div>
            </div>
          </div>
        )}

        {!results && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-white/8 rounded-xl">
            <div className="w-12 h-12 rounded-xl bg-bg-2 border border-white/8 flex items-center justify-center mb-4">
              <TrendingUp size={18} className="text-text-tertiary" />
            </div>
            <p className="text-sm text-text-secondary">No benchmark results yet</p>
            <p className="text-xs text-text-tertiary mt-1">Upload a document and select engines to compare</p>
          </div>
        )}

      </Container>
    </div>
  );
}
