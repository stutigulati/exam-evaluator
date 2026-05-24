import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Zap, BarChart2, FileText, Shield, Layers, TrendingUp, CheckCircle, Users, LogIn } from 'lucide-react';
import { cn } from '../lib/utils';

/* Local Container (no sidebar dependency) */
function Container({ children, className = '' }) {
  return (
    <div className={`max-w-7xl mx-auto px-6 sm:px-8 ${className}`}>
      {children}
    </div>
  );
}

const FEATURES = [
  { icon: FileText,   title: 'Smart OCR Extraction',    desc: 'Extract text from handwritten and printed answer sheets using Gemini Vision and Google Vision AI.' },
  { icon: Zap,        title: 'Question-by-Question AI', desc: 'Every question evaluated individually with detailed marks, strengths, weaknesses, and missing concepts.' },
  { icon: BarChart2,  title: 'OCR Engine Benchmark',    desc: 'Compare Gemini, Google Vision, PaddleOCR, and Tesseract side-by-side on the same document.' },
  { icon: Shield,     title: 'Configurable Leniency',   desc: 'Dial grading from 1 (strictest) to 10 (most lenient). Perfect for competitive exams or practice tests.' },
  { icon: Layers,     title: 'Marking Scheme Support',  desc: 'Upload or type a marking scheme. Without one, AI uses its own academic knowledge.' },
  { icon: TrendingUp, title: 'Performance Analytics',   desc: 'Track student rankings, pass/fail rates, and subject-wise performance across all evaluations.' },
];

const HOW = [
  { step: '01', title: 'Upload documents',  desc: 'Drop your question paper and answer sheet. PDFs and images supported.' },
  { step: '02', title: 'Configure grading', desc: 'Set leniency scale and optionally provide a marking scheme for higher accuracy.' },
  { step: '03', title: 'AI evaluates',      desc: 'OCR extracts text. Gemini evaluates each question independently with reasoning.' },
  { step: '04', title: 'Review results',    desc: 'Get marks, feedback, strengths, weaknesses, and missing concepts per question.' },
];

function FadeUp({ children, delay = 0, className }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function LandingPage() {
  return (
    /* fixed inset-0 covers the sidebar layout entirely — landing page renders full-screen with no sidebar */
    <div className="fixed inset-0 overflow-y-auto z-50" style={{ background: '#050705' }}>

      {/* ── TOP NAV BAR ──────────────────────────────────────────────── */}
      <nav className="absolute top-0 left-0 right-0 z-20">
        <Container>
          <div className="flex items-center justify-between py-5">
            {/* Logo / brand on the left */}
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-14 h-14 flex items-center justify-center">
                <img src="/logo.png" alt="GradeAI" className="w-full h-full object-contain" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white leading-tight">GradeAI</p>
                <p className="text-[10px] leading-tight" style={{ color: '#7f867c' }}>Exam Evaluator</p>
              </div>
            </Link>

            {/* Login link on the right */}
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              style={{
                background: 'rgba(0,200,150,0.1)',
                border: '1px solid rgba(0,200,150,0.3)',
                color: '#00d99b',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(0,200,150,0.18)';
                e.currentTarget.style.borderColor = 'rgba(0,200,150,0.5)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(0,200,150,0.1)';
                e.currentTarget.style.borderColor = 'rgba(0,200,150,0.3)';
              }}
            >
              <LogIn size={14} />
              Login
            </Link>
          </div>
        </Container>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-32 pb-24 sm:pt-36 sm:pb-32">
        {/* Background orbs */}
        <div className="absolute top-0 left-1/3 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(0,200,150,0.12) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div className="absolute top-20 right-1/4 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(62,230,127,0.08) 0%, transparent 70%)', filter: 'blur(60px)' }} />

        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* Left */}
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium mb-8"
                style={{ border: '1px solid rgba(0,200,150,0.3)', background: 'rgba(0,200,150,0.1)', color: '#00d99b' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                AI-powered answer sheet evaluation
              </div>

              <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-white leading-[1.1] mb-6" style={{ letterSpacing: '-0.02em' }}>
                Grade answer sheets
                <br />
                <span style={{ background: 'linear-gradient(135deg, #00d99b, #7cffb6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  smarter with AI
                </span>
              </h1>

              <p className="text-base leading-relaxed mb-10 max-w-md" style={{ color: '#a2a59f' }}>
                Upload question papers and answer sheets. AI extracts text, evaluates each question, and returns detailed marks with explainable feedback — in under 30 seconds.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link to="/evaluate"
                  className="inline-flex items-center gap-2 text-white px-7 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
                  style={{ background: 'linear-gradient(135deg, #00c896, #3ee67f)', boxShadow: '0 0 30px rgba(0,200,150,0.3)' }}>
                  Start Evaluating
                  <ArrowRight size={15} />
                </Link>
                <Link to="/benchmark"
                  className="inline-flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-medium transition-all duration-200"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#c0c0d8' }}>
                  View OCR Benchmark
                </Link>
              </div>
            </motion.div>

            {/* Right — app mockup */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="relative"
            >
              <div className="absolute inset-8 rounded-3xl pointer-events-none"
                style={{ background: 'rgba(0,200,150,0.12)', filter: 'blur(40px)' }} />

              <div className="relative rounded-2xl overflow-hidden animate-float"
                style={{ background: '#111311', border: '1px solid rgba(255,255,255,0.08)', padding: '20px', boxShadow: '0 32px 64px rgba(0,0,0,0.5)' }}>

                {/* Mac traffic lights */}
                <div className="flex gap-1.5 mb-4">
                  <div className="w-3 h-3 rounded-full" style={{ background: 'rgba(239,68,68,0.6)' }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: 'rgba(251,191,36,0.6)' }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: 'rgba(52,211,153,0.6)' }} />
                </div>

                {/* Score card */}
                <div className="rounded-xl p-4 mb-3"
                  style={{ background: 'linear-gradient(135deg, rgba(0,200,150,0.2), rgba(62,230,127,0.15))', border: '1px solid rgba(0,200,150,0.25)' }}>
                  <p className="text-xs mb-1" style={{ color: '#00d99b' }}>Overall Score</p>
                  <p className="text-3xl font-bold text-white">8.5 <span className="text-lg font-normal" style={{ color: '#7f867c' }}>/ 10</span></p>
                  <div className="w-full h-1.5 rounded-full mt-3" style={{ background: 'rgba(255,255,255,0.1)' }}>
                    <div className="h-1.5 rounded-full" style={{ width: '85%', background: 'linear-gradient(90deg, #00c896, #7cffb6)' }} />
                  </div>
                </div>

                {/* Question rows */}
                {[{ q: 'Q1', marks: '4/5', pct: 80, color: '#4ade80' }, { q: 'Q2', marks: '2/3', pct: 67, color: '#fbbf24' }, { q: 'Q3', marks: '2.5/2', pct: 100, color: '#4ade80' }].map((r, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2.5 mb-2"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-medium flex-shrink-0"
                      style={{ background: 'rgba(255,255,255,0.06)', color: '#a2a59f' }}>{r.q}</span>
                    <div className="flex-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                      <div className="h-1 rounded-full" style={{ width: `${r.pct}%`, background: 'linear-gradient(90deg, #00c896, #3ee67f)' }} />
                    </div>
                    <span className="text-xs font-semibold font-mono" style={{ color: r.color }}>{r.marks}</span>
                  </div>
                ))}

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {['Correct definition', 'Good explanation', 'Missing formula'].map((t, i) => (
                    <span key={i} className="text-xs px-2.5 py-1 rounded-full"
                      style={i < 2
                        ? { background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }
                        : { background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Evaluation complete — bottom right, half on card half below */}
              <div className="absolute z-10" style={{ bottom: -18, right: 20 }}>
                <div className="rounded-xl px-3 py-2.5"
                  style={{ background: '#111311', border: '1px solid rgba(74,222,128,0.25)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.2)' }}>
                      <CheckCircle size={14} style={{ color: '#4ade80' }} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">Evaluation complete</p>
                      <p className="text-xs" style={{ color: '#7f867c' }}>23 seconds</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 rounded-xl px-3 py-2.5"
                style={{ background: '#111311', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                <div className="flex items-center gap-2">
                  <Users size={12} style={{ color: '#00d99b' }} />
                  <span className="text-xs" style={{ color: '#a2a59f' }}>Leniency</span>
                  <span className="text-xs font-semibold" style={{ color: '#00d99b' }}>7/10</span>
                </div>
              </div>
            </motion.div>
          </div>
        </Container>
      </section>

      {/* ── EDUCATOR SECTION ─────────────────────────────────────────── */}
      <section className="py-24" style={{ background: 'rgba(0,200,150,0.03)', borderTop: '1px solid rgba(0,200,150,0.08)', borderBottom: '1px solid rgba(0,200,150,0.08)' }}>
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* Illustration */}
            <FadeUp>
              <div className="relative h-72 flex items-center justify-center">
                <div className="w-72 h-52 rounded-2xl overflow-hidden relative"
                  style={{ background: '#111311', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 24px 48px rgba(0,0,0,0.4)' }}>
                  <div className="flex items-center gap-2 px-4 py-2.5"
                    style={{ background: 'linear-gradient(90deg, rgba(0,200,150,0.25), rgba(62,230,127,0.18))', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-xs text-white font-medium">Live Evaluation</span>
                  </div>
                  <div className="p-4 space-y-2.5">
                    <div className="h-2 rounded" style={{ background: 'rgba(255,255,255,0.08)', width: '100%' }} />
                    <div className="h-2 rounded" style={{ background: 'rgba(0,200,150,0.2)', width: '80%' }} />
                    <div className="h-2 rounded" style={{ background: 'rgba(255,255,255,0.05)', width: '70%' }} />
                    <div className="h-2 rounded" style={{ background: 'rgba(255,255,255,0.08)', width: '90%' }} />
                    <div className="flex gap-2 mt-3">
                      <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }}>Correct</span>
                      <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>Partial</span>
                    </div>
                  </div>
                </div>
                <div className="absolute -top-3 right-12 rounded-lg px-3 py-1.5"
                  style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ade80', fontSize: '12px', fontWeight: 600 }}>
                  A+ · 95%
                </div>
                {/* Student card — bottom left */}
                <div className="absolute bottom-0 -left-6 rounded-xl px-3 py-2.5"
                  style={{ background: '#111311', border: '1px solid rgba(96,165,250,0.2)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', minWidth: 160 }}>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                      style={{ background: 'rgba(96,165,250,0.18)', color: '#60a5fa' }}>S</div>
                    <div>
                      <p className="text-xs font-semibold text-white">Stuti Gulati</p>
                      <p className="text-[10px]" style={{ color: '#7f867c' }}>BT22CSE041 · CSE A</p>
                    </div>
                  </div>
                </div>
              </div>
            </FadeUp>

            {/* Copy */}
            <FadeUp delay={0.15}>
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs mb-5"
                style={{ border: '1px solid rgba(0,200,150,0.25)', background: 'rgba(0,200,150,0.08)', color: '#00d99b' }}>
                Built for educators
              </div>
              <h2 className="text-4xl font-bold text-white tracking-tight mb-5 leading-tight" style={{ letterSpacing: '-0.02em' }}>
                Evaluate faster.<br />
                <span style={{ background: 'linear-gradient(135deg, #00d99b, #7cffb6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Grade smarter.
                </span>
              </h2>
              <p className="text-sm leading-relaxed mb-7 max-w-md" style={{ color: '#a2a59f' }}>
                Save hours of manual grading. GradeAI reads handwritten and printed answer sheets, understands the content, and produces detailed question-by-question feedback instantly.
              </p>
              <div className="space-y-3.5">
                {['Works on handwritten and printed sheets', 'Evaluates without a marking scheme', 'Adjustable grading strictness 1–10', 'Detailed per-question feedback and reasoning'].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(0,200,150,0.2)', border: '1px solid rgba(0,200,150,0.3)' }}>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#00d99b' }} />
                    </div>
                    <span className="text-sm" style={{ color: '#a2a59f' }}>{item}</span>
                  </div>
                ))}
              </div>
              <Link to="/evaluate" className="inline-flex items-center gap-2 text-sm font-medium mt-7 transition-colors"
                style={{ color: '#00d99b' }}>
                Start evaluating now <ArrowRight size={14} />
              </Link>
            </FadeUp>
          </div>
        </Container>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      <section className="py-24">
        <Container>
          <FadeUp className="mb-14">
            <h2 className="text-4xl font-bold text-white tracking-tight mb-3" style={{ letterSpacing: '-0.02em' }}>How it works</h2>
            <p className="text-base" style={{ color: '#a2a59f' }}>Four steps from upload to detailed results</p>
          </FadeUp>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {HOW.map(({ step, title, desc }, i) => (
              <FadeUp key={i} delay={i * 0.08}>
                <div className="rounded-xl p-5 h-full transition-all duration-200 cursor-default"
                  style={{ background: '#111311', border: '1px solid rgba(255,255,255,0.07)' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(0,200,150,0.3)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}>
                  <div className="text-xs font-mono mb-3" style={{ color: 'rgba(0,200,150,0.6)' }}>{step}</div>
                  <h3 className="text-sm font-semibold text-white mb-2">{title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: '#666688' }}>{desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </Container>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────── */}
      <section className="py-24" style={{ background: 'rgba(255,255,255,0.01)' }}>
        <Container>
          <FadeUp className="mb-14">
            <h2 className="text-4xl font-bold text-white tracking-tight mb-3" style={{ letterSpacing: '-0.02em' }}>Platform capabilities</h2>
            <p className="text-base" style={{ color: '#a2a59f' }}>Everything built in, nothing to configure separately.</p>
          </FadeUp>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <FadeUp key={i} delay={i * 0.06}>
                <div className="rounded-xl p-5 h-full transition-all duration-200 cursor-default"
                  style={{ background: '#111311', border: '1px solid rgba(255,255,255,0.07)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,200,150,0.3)'; e.currentTarget.style.background = 'rgba(0,200,150,0.04)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = '#111311'; }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-4"
                    style={{ background: 'rgba(0,200,150,0.12)', border: '1px solid rgba(0,200,150,0.2)' }}>
                    <Icon size={15} style={{ color: '#00d99b' }} />
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-1.5">{title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: '#666688' }}>{desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </Container>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="py-20">
        <Container>
          <FadeUp>
            <div className="rounded-2xl p-10 sm:p-14 relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, rgba(0,200,150,0.15), rgba(62,230,127,0.1), transparent)', border: '1px solid rgba(0,200,150,0.2)' }}>
              <div className="absolute top-0 right-0 w-80 h-80 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(0,200,150,0.1) 0%, transparent 70%)', filter: 'blur(40px)' }} />
              <div className="relative flex flex-col lg:flex-row items-center justify-between gap-8">
                {/* Left */}
                <div className="flex-1">
                  <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">Ready to evaluate?</h2>
                  <p className="text-sm mb-6 max-w-md" style={{ color: '#a2a59f' }}>
                    Upload your first answer sheet and see question-by-question AI evaluation in under 30 seconds.
                  </p>
                  <div className="flex flex-wrap gap-3 mb-6">
                    {[['28s','Avg Time'],['97%','Accuracy'],['20+','Questions'],['PDF','Format']].map(([v,l]) => (
                      <div key={l} className="rounded-lg px-3 py-2 text-center"
                        style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)' }}>
                        <p className="text-base font-black" style={{ color:'#00d99b' }}>{v}</p>
                        <p className="text-[10px]" style={{ color:'#7f867c' }}>{l}</p>
                      </div>
                    ))}
                  </div>
                  <Link to="/evaluate"
                    className="inline-flex items-center gap-2 text-white px-7 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
                    style={{ background: 'linear-gradient(135deg, #00c896, #3ee67f)', boxShadow: '0 0 24px rgba(0,200,150,0.3)' }}>
                    Start free evaluation
                    <ArrowRight size={14} />
                  </Link>
                </div>
                {/* Right — mini results preview */}
                <div className="flex-shrink-0 w-full lg:w-64">
                  <div className="rounded-2xl overflow-hidden"
                    style={{ background:'#0d100d', border:'1px solid rgba(0,200,150,0.2)', boxShadow:'0 0 30px rgba(0,200,150,0.08)' }}>
                    <div className="px-4 py-3"
                      style={{ borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(0,200,150,0.06)' }}>
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black"
                            style={{ background:'linear-gradient(135deg,#00c896,#3ee67f)', color:'#04110b' }}>A</div>
                          <div>
                            <p className="text-xs font-semibold text-white leading-none">Aayushi Gaur</p>
                            <p className="text-[9px] leading-none mt-0.5" style={{ color:'#7f867c' }}>0157CS231004</p>
                          </div>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                          style={{ background:'rgba(74,222,128,0.15)', color:'#4ade80' }}>A+ · 96%</span>
                      </div>
                    </div>
                    <div className="p-4 space-y-2.5">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-[10px]" style={{ color:'#7f867c' }}>Total Score</span>
                          <span className="text-[10px] font-bold font-mono" style={{ color:'#4ade80' }}>46/50</span>
                        </div>
                        <div className="h-1.5 rounded-full" style={{ background:'rgba(255,255,255,0.06)' }}>
                          <div className="h-1.5 rounded-full" style={{ width:'92%', background:'linear-gradient(90deg,#00c896,#4ade80)' }} />
                        </div>
                      </div>
                      {[['Q1','10/10',100,'#4ade80'],['Q2','8/10',80,'#fbbf24'],['Q3','9/10',90,'#4ade80'],['Q4','9/10',90,'#4ade80'],['Q5','10/10',100,'#4ade80']].map(([q,m,p,c],i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-[9px] font-mono w-5 flex-shrink-0" style={{ color:'#7f867c' }}>{q}</span>
                          <div className="flex-1 h-1 rounded-full" style={{ background:'rgba(255,255,255,0.05)' }}>
                            <div className="h-1 rounded-full" style={{ width:`${p}%`, background:c }} />
                          </div>
                          <span className="text-[9px] font-mono w-9 text-right font-bold" style={{ color:c }}>{m}</span>
                        </div>
                      ))}
                      <div className="flex flex-wrap gap-1 pt-1">
                        {['Excellent','Clear','Complete'].map(t => (
                          <span key={t} className="text-[8px] px-1.5 py-0.5 rounded-full"
                            style={{ background:'rgba(74,222,128,0.1)', color:'#4ade80', border:'1px solid rgba(74,222,128,0.2)' }}>{t}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </FadeUp>
        </Container>
      </section>

      {/* Footer */}
      <footer className="py-6" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <Container className="flex items-center justify-between">
          <span className="text-xs" style={{ color: '#4f564f' }}>GradeAI — AI Exam Evaluation Platform</span>
          <span className="text-xs" style={{ color: '#4f564f' }}>Powered by Gemini 2.0 Flash</span>
        </Container>
      </footer>

    </div>
  );
}