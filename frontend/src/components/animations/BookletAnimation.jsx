import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ScanLine, FileText, Award, BarChart3, CheckCircle2 } from 'lucide-react';

const PAGE_INTERVAL_MS = 4200;

/* ─── Animated pages only — no real PDF rendering ─── */

function AnimatedTick({ size = 36, color = '#16a34a', delay = 0 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" style={{ overflow: 'visible' }}>
      {/* Tick: short left stroke down-right, long right stroke up-right */}
      <motion.path d="M 6 17 L 14 25 L 30 8" fill="none" stroke={color} strokeWidth="3.2"
        strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.45, delay, ease: 'easeOut' }}
        style={{ filter: `drop-shadow(0 0 3px ${color}88)` }} />
    </svg>
  );
}

function AnimatedCross({ size = 28, color = '#dc2626', delay = 0 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" style={{ overflow: 'visible' }}>
      <motion.path d="M 6 6 L 22 22" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 0.25, delay, ease: 'easeOut' }} />
      <motion.path d="M 22 6 L 6 22" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 0.25, delay: delay + 0.2, ease: 'easeOut' }} />
    </svg>
  );
}

function MarkingAnnotations({ index, visible }) {
  // Marks spread across the page — realistic teacher marking positions
  const layouts = [
    [
      { type:'tick',  top:'14%', left:'6%'  },
      { type:'tick',  top:'32%', left:'8%'  },
      { type:'tick',  top:'52%', left:'5%'  },
      { type:'cross', top:'70%', left:'7%'  },
      { type:'tick',  top:'85%', left:'6%'  },
    ],
    [
      { type:'tick',  top:'18%', left:'5%'  },
      { type:'cross', top:'38%', left:'8%'  },
      { type:'tick',  top:'55%', left:'6%'  },
      { type:'tick',  top:'72%', left:'5%'  },
      { type:'tick',  top:'88%', left:'7%'  },
    ],
    [
      { type:'tick',  top:'12%', left:'7%'  },
      { type:'tick',  top:'30%', left:'5%'  },
      { type:'tick',  top:'48%', left:'8%'  },
      { type:'cross', top:'66%', left:'6%'  },
      { type:'tick',  top:'83%', left:'5%'  },
    ],
    [
      { type:'tick',  top:'16%', left:'6%'  },
      { type:'tick',  top:'35%', left:'7%'  },
      { type:'tick',  top:'54%', left:'5%'  },
      { type:'tick',  top:'74%', left:'8%'  },
      { type:'cross', top:'88%', left:'6%'  },
    ],
    [
      { type:'cross', top:'15%', left:'5%'  },
      { type:'tick',  top:'34%', left:'7%'  },
      { type:'tick',  top:'53%', left:'6%'  },
      { type:'tick',  top:'70%', left:'5%'  },
      { type:'tick',  top:'86%', left:'8%'  },
    ],
    [
      { type:'tick',  top:'20%', left:'6%'  },
      { type:'tick',  top:'40%', left:'5%'  },
      { type:'tick',  top:'60%', left:'7%'  },
      { type:'cross', top:'78%', left:'6%'  },
      { type:'tick',  top:'90%', left:'5%'  },
    ],
  ];
  const marks = layouts[index % layouts.length];
  return (
    <AnimatePresence>
      {visible && marks.map((m, i) => (
        <motion.div key={i}
          initial={{ opacity:0, scale:0.2 }}
          animate={{ opacity:1, scale:1 }}
          exit={{ opacity:0 }}
          transition={{ delay: 0.15 + i * 0.15, type:'spring', stiffness:320, damping:20 }}
          className="absolute pointer-events-none"
          style={{ top: m.top, left: m.left }}>
          {m.type === 'tick'
            ? <AnimatedTick size={28} color="#16a34a" delay={0.15+i*0.15} />
            : <AnimatedCross size={22} color="#dc2626" delay={0.15+i*0.15} />}
        </motion.div>
      ))}
    </AnimatePresence>
  );
}

function PageStamps({ index, evaluated }) {
  const scores = [8,9,7,10,8,6,9,7];
  const score = scores[index % scores.length];
  const max   = [10,10,10,10,10,10,10,10][index % 8];
  return (
    <>
      {/* Red score circle — top right */}
      <AnimatePresence>
        {evaluated && (
          <motion.div initial={{ opacity:0, scale:0.3, rotate:-20 }}
            animate={{ opacity:1, scale:1, rotate:-6 }}
            transition={{ type:'spring', stiffness:280, damping:14, delay:0.3 }}
            className="absolute top-2 right-2 flex flex-col items-center justify-center"
            style={{ width:44, height:44, border:'3px solid #dc2626', borderRadius:'50%',
              background:'rgba(255,255,255,0.95)', boxShadow:'0 2px 8px rgba(220,38,38,0.4)' }}>
            <span style={{ color:'#dc2626', fontFamily:'Georgia,serif', fontSize:15, fontWeight:900, lineHeight:1 }}>{score}</span>
            <div style={{ width:22, height:1, background:'#dc2626', margin:'1px 0' }} />
            <span style={{ color:'#dc2626', fontFamily:'Georgia,serif', fontSize:9, fontWeight:700 }}>{max}</span>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Green tick stamp — bottom right */}
      <AnimatePresence>
        {evaluated && (
          <motion.div initial={{ opacity:0, scale:0, rotate:-15 }}
            animate={{ opacity:1, scale:1, rotate:5 }}
            transition={{ delay:0.55, type:'spring', stiffness:300, damping:16 }}
            className="absolute bottom-2 right-2 flex items-center justify-center"
            style={{ width:46, height:46, borderRadius:'50%',
              background:'rgba(22,163,74,0.12)', border:'2.5px solid #16a34a',
              boxShadow:'0 0 14px rgba(22,163,74,0.45)' }}>
            <AnimatedTick size={28} color="#16a34a" delay={0.65} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function FallbackPage({ index, evaluated, scanning = false }) {
  // Varied line layouts per page for realism
  const layouts = [
    ['88%','72%','91%','65%','83%','70%','94%','58%','79%','86%'],
    ['75%','90%','62%','85%','78%','93%','55%','82%','69%','87%'],
    ['92%','68%','80%','73%','88%','61%','84%','76%','95%','64%'],
    ['70%','85%','77%','92%','63%','89%','74%','81%','67%','90%'],
    ['86%','64%','93%','71%','82%','76%','58%','88%','79%','65%'],
    ['79%','91%','66%','84%','73%','87%','60%','95%','68%','83%'],
  ];
  const lines = layouts[index % layouts.length];

  // Answer blocks — simulate paragraphs of handwriting
  const blocks = [
    { y: '12%', lines: lines.slice(0,3) },
    { y: '40%', lines: lines.slice(3,6) },
    { y: '65%', lines: lines.slice(6,9) },
  ];

  return (
    <div className="w-full h-full relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #fdfdf9 0%, #f7f7ef 100%)' }}>

      {/* Ruled lines background */}
      {[15,22,29,36,43,50,57,64,71,78,85,92].map((pct,i) => (
        <div key={i} className="absolute left-0 right-0"
          style={{ top:`${pct}%`, height:1, background:'rgba(180,200,255,0.25)' }} />
      ))}

      {/* Red margin line */}
      <div className="absolute top-0 bottom-0"
        style={{ left:'18%', width:1, background:'rgba(220,60,60,0.4)' }} />

      {/* Page header */}
      <div className="absolute flex items-center justify-between px-2 pt-1.5"
        style={{ top:0, left:0, right:0 }}>
        <span className="text-[8px] font-mono" style={{ color:'#b0b0a0' }}>Q.{index+1}</span>
        <span className="text-[8px] font-mono" style={{ color:'#b0b0a0' }}>Page {index+1}</span>
      </div>

      {/* Handwriting simulation — blocks of lines */}
      <div className="absolute" style={{ top:'8%', left:'20%', right:'6%' }}>
        {blocks.map((block, bi) => (
          <div key={bi} style={{ marginBottom:'8%' }}>
            {block.lines.map((w, li) => (
              <div key={li} className="mb-1.5 rounded-sm"
                style={{
                  width: w,
                  height: li % 3 === 2 ? 6 : 7,
                  background: `linear-gradient(90deg,
                    rgba(30,30,60,${0.45 + Math.sin(bi*3+li)*0.1}) 0%,
                    rgba(50,50,80,${0.25 + Math.sin(bi+li*2)*0.08}) 100%)`,
                  transform: `rotate(${(li%2===0?-0.15:0.2)}deg)`,
                  borderRadius: 2,
                }} />
            ))}
          </div>
        ))}
      </div>

      {/* Teacher marks — ticks, crosses, circles */}
      <MarkingAnnotations index={index} visible={evaluated} />
      <PageStamps index={index} evaluated={evaluated} />
    </div>
  );
}

/* RealPage removed — using FallbackPage only */

function ScanBeam() {
  return (
    <>
      {/* Main scan line */}
      <motion.div initial={{ y:'-100%' }} animate={{ y:'120%' }}
        transition={{ duration:1.8, repeat:Infinity, ease:'linear' }}
        className="absolute left-0 right-0 pointer-events-none"
        style={{ height:3, background:'rgba(0,217,155,0.9)', boxShadow:'0 0 12px 4px rgba(0,217,155,0.6)' }} />
      {/* Soft glow area */}
      <motion.div initial={{ y:'-100%' }} animate={{ y:'120%' }}
        transition={{ duration:1.8, repeat:Infinity, ease:'linear' }}
        className="absolute left-0 right-0 pointer-events-none"
        style={{ height:50, marginTop:-25, background:'linear-gradient(180deg, rgba(0,217,155,0) 0%, rgba(0,217,155,0.18) 50%, rgba(0,217,155,0) 100%)' }} />
    </>
  );
}

function DuringScanTicks({ index }) {
  const ticksByPage = [
    [{ type:'tick',  top:'14%', left:'5%', d:0.5  },{ type:'tick',  top:'34%', left:'7%', d:1.1  },{ type:'cross', top:'54%', left:'5%', d:1.7  },{ type:'tick',  top:'74%', left:'6%', d:2.2  }],
    [{ type:'tick',  top:'18%', left:'6%', d:0.5  },{ type:'cross', top:'40%', left:'5%', d:1.1  },{ type:'tick',  top:'60%', left:'7%', d:1.7  },{ type:'tick',  top:'80%', left:'5%', d:2.2  }],
    [{ type:'tick',  top:'12%', left:'5%', d:0.5  },{ type:'tick',  top:'32%', left:'7%', d:1.1  },{ type:'tick',  top:'52%', left:'5%', d:1.7  },{ type:'cross', top:'72%', left:'6%', d:2.2  }],
    [{ type:'cross', top:'16%', left:'6%', d:0.5  },{ type:'tick',  top:'36%', left:'5%', d:1.1  },{ type:'tick',  top:'58%', left:'7%', d:1.7  },{ type:'tick',  top:'78%', left:'5%', d:2.2  }],
    [{ type:'tick',  top:'20%', left:'5%', d:0.5  },{ type:'tick',  top:'42%', left:'7%', d:1.1  },{ type:'cross', top:'62%', left:'5%', d:1.7  },{ type:'tick',  top:'82%', left:'6%', d:2.2  }],
    [{ type:'tick',  top:'15%', left:'6%', d:0.5  },{ type:'tick',  top:'38%', left:'5%', d:1.1  },{ type:'tick',  top:'60%', left:'7%', d:1.7  },{ type:'tick',  top:'80%', left:'5%', d:2.2  }],
  ];
  const marks = ticksByPage[index % ticksByPage.length];
  return (
    <>
      {marks.map((m, i) => (
        <motion.div key={`scan-${index}-${i}`}
          initial={{ opacity:0, scale:0.2, x:-4 }}
          animate={{ opacity:1, scale:1, x:0 }}
          transition={{ delay: m.d, type:'spring', stiffness:350, damping:18 }}
          className="absolute pointer-events-none" style={{ top: m.top, left: m.left, zIndex:5 }}>
          {m.type==='tick'
            ? <AnimatedTick size={26} color="#16a34a" delay={m.d} />
            : <AnimatedCross size={20} color="#dc2626" delay={m.d} />}
        </motion.div>
      ))}
    </>
  );
}

function TypeWriter({ text, speed = 22 }) {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    setDisplayed('');
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text]);
  return <>{displayed}</>;
}

/* ─── Report Building (inside booklet container) ─── */
function ReportBuildingView({ }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const delays = [300, 700, 600, 800, 700];
    let total = 0;
    const ids = delays.map((d) => {
      total += d;
      return setTimeout(() => setStep(s => s + 1), total);
    });
    return () => ids.forEach(clearTimeout);
  }, []);

  const mockQuestions = [
    { q: 'Q1', marks: 8,  max: 10, color: '#4ade80' },
    { q: 'Q2', marks: 6,  max: 10, color: '#fbbf24' },
    { q: 'Q3', marks: 9,  max: 10, color: '#4ade80' },
    { q: 'Q4', marks: 5,  max: 10, color: '#fbbf24' },
    { q: 'Q5', marks: 10, max: 10, color: '#4ade80' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
      className="w-full h-full p-4 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #0e1210 0%, #080b09 100%)' }}>

      {/* Header */}
      <AnimatePresence>
        {step >= 1 && (
          <motion.div initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4 }}
            className="flex items-center gap-2 mb-3 pb-2"
            style={{ borderBottom:'1px solid rgba(0,200,150,0.15)' }}>
            <CheckCircle2 size={12} style={{ color:'#00d99b' }} />
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color:'#00d99b' }}>
              Generating Report
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Score bar */}
      <AnimatePresence>
        {step >= 2 && (
          <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.35 }}
            className="mb-3">
            <div className="flex justify-between mb-1">
              <span className="text-[9px]" style={{ color:'#7f867c' }}>Total Score</span>
              <span className="text-[9px] font-bold font-mono" style={{ color:'#4ade80' }}>38 / 50</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.06)' }}>
              <motion.div initial={{ width:0 }} animate={{ width:'76%' }}
                transition={{ duration:1.2, ease:'easeOut', delay:0.2 }}
                className="h-full rounded-full"
                style={{ background:'linear-gradient(90deg,#00c896,#4ade80)' }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grade */}
      <AnimatePresence>
        {step >= 3 && (
          <motion.div initial={{ opacity:0, scale:0.4 }} animate={{ opacity:1, scale:1 }}
            transition={{ type:'spring', stiffness:300, damping:18 }}
            className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background:'rgba(74,222,128,0.15)', border:'2px solid #4ade80', boxShadow:'0 0 12px rgba(74,222,128,0.4)' }}>
              <span className="text-sm font-black" style={{ color:'#4ade80' }}>A</span>
            </div>
            <div>
              <p className="text-[9px] font-semibold text-white">Grade Awarded</p>
              <p className="text-[8px]" style={{ color:'#7f867c' }}>76% · Good Performance</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Question bars */}
      <AnimatePresence>
        {step >= 4 && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.3 }}
            className="space-y-1.5 mb-3">
            {mockQuestions.map((q, i) => (
              <motion.div key={i} initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }}
                transition={{ delay: i * 0.1 }} className="flex items-center gap-1.5">
                <span className="text-[8px] font-mono w-6 flex-shrink-0" style={{ color:'#4f564f' }}>{q.q}</span>
                <div className="flex-1 h-1 rounded-full" style={{ background:'rgba(255,255,255,0.05)' }}>
                  <motion.div initial={{ width:0 }}
                    animate={{ width:`${(q.marks/q.max)*100}%` }}
                    transition={{ delay: i * 0.1 + 0.2, duration:0.6, ease:'easeOut' }}
                    className="h-full rounded-full" style={{ background: q.color }} />
                </div>
                <span className="text-[8px] font-mono flex-shrink-0" style={{ color: q.color }}>
                  {q.marks}/{q.max}
                </span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback typewriter */}
      <AnimatePresence>
        {step >= 5 && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.4 }}
            className="rounded-lg p-2"
            style={{ background:'rgba(0,200,150,0.05)', border:'1px solid rgba(0,200,150,0.12)' }}>
            <p className="text-[8px] font-semibold mb-1 uppercase tracking-wider" style={{ color:'#00d99b' }}>
              Feedback
            </p>
            <p className="text-[9px] leading-relaxed" style={{ color:'#7f867c' }}>
              <TypeWriter
                text="Good understanding demonstrated. Answer structure is clear and well-organised..."
                speed={28}
              />
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pulsing dots */}
      {step < 5 && (
        <div className="flex items-center gap-1 mt-2">
          {[0,1,2].map(i => (
            <motion.div key={i} animate={{ opacity:[0.3,1,0.3] }}
              transition={{ duration:0.9, delay:i*0.2, repeat:Infinity }}
              className="w-1 h-1 rounded-full" style={{ background:'#00d99b' }} />
          ))}
        </div>
      )}
    </motion.div>
  );
}

/* ─── MAIN BookletAnimation ─── */
export default function BookletAnimation({
  file = null,
  subText = 'Running OCR then AI evaluation — 20–40 seconds',
  showReportPreview = false,
}) {

  const [currentPage, setCurrentPage] = useState(0);
  // subPhase: 0=left evaluating, 1=right evaluating, 2=flipping
  const [subPhase, setSubPhase] = useState(0);

  /* Always animated pages — file prop ignored */

  const totalPages = 6;

  // 3-phase cycle: left eval → right eval → flip
  useEffect(() => {
    if (showReportPreview) return;
    setSubPhase(0); // reset on page change
    const t1 = setTimeout(() => setSubPhase(1), 1300); // right page starts
    const t2 = setTimeout(() => setSubPhase(2), 2600); // flip starts
    const t3 = setTimeout(() => {
      setCurrentPage(p => (p + 1) % totalPages);
      setSubPhase(0);
    }, PAGE_INTERVAL_MS);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [currentPage, showReportPreview]);

  const renderPage = (idx, evaluated) => (
    <FallbackPage index={idx} evaluated={evaluated} />
  );

  return (
    <div className="flex flex-col items-center justify-center py-10 rounded-2xl"
      style={{
        background: 'radial-gradient(ellipse at center, #0c0f0c 0%, #050705 70%)',
        border: '1px solid rgba(0,200,150,0.15)',
        boxShadow: '0 0 60px rgba(0,200,150,0.08), inset 0 0 80px rgba(0,0,0,0.4)',
      }}>

      {/* Top badge */}
      <motion.div initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }}
        className="flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-6"
        style={{ background:'rgba(0,200,150,0.08)', border:'1px solid rgba(0,200,150,0.25)' }}>
        <motion.div animate={{ rotate:360 }} transition={{ duration:2, repeat:Infinity, ease:'linear' }}>
          {showReportPreview
            ? <FileText size={11} style={{ color:'#00d99b' }} />
            : <Sparkles size={11} style={{ color:'#00d99b' }} />}
        </motion.div>
        <span className="text-xs font-semibold" style={{ color:'#00d99b', letterSpacing:'0.5px' }}>
          {showReportPreview
            ? 'BUILDING EVALUATION REPORT…'
            : subPhase === 0 ? `CHECKING LEFT PAGE ${currentPage === 0 ? totalPages : currentPage} OF ${totalPages}`
            : subPhase === 1 ? `EVALUATING PAGE ${currentPage + 1} OF ${totalPages}`
            : `TURNING PAGE ${currentPage + 1}…`}
        </span>
      </motion.div>

      {/* Booklet */}
      <div style={{ perspective: 2000 }} className="relative">
        <div className="absolute left-1/2 -translate-x-1/2"
          style={{ bottom:-18, width:340, height:16, background:'radial-gradient(ellipse, rgba(0,0,0,0.6) 0%, transparent 70%)', filter:'blur(8px)' }} />

        <div className="relative flex"
          style={{ transformStyle:'preserve-3d', transform:'rotateX(8deg) rotateY(-2deg)', width:460, height:320 }}>

          {/* LEFT page — previously evaluated, now shows completed marks */}
          <div className="relative overflow-hidden"
            style={{ width:230, height:320, borderRight:'1px solid rgba(0,0,0,0.08)', borderTopLeftRadius:6, borderBottomLeftRadius:6, boxShadow:'inset -10px 0 20px rgba(0,0,0,0.08)' }}>
            {renderPage(currentPage === 0 ? totalPages - 1 : currentPage - 1, true)}
            {/* Faint green overlay = already checked */}
            <div className="absolute inset-0 pointer-events-none"
              style={{ background:'rgba(0,200,120,0.04)' }} />
          </div>

          {/* RIGHT page */}
          <div className="relative" style={{ width:230, height:320, transformStyle:'preserve-3d' }}>

            {/* Background page */}
            <div className="absolute inset-0 overflow-hidden"
              style={{ borderTopRightRadius:6, borderBottomRightRadius:6, boxShadow:'inset 10px 0 20px rgba(0,0,0,0.08)' }}>
              {renderPage((currentPage + 1) % totalPages, false)}
            </div>

            {/* Flipping page — shows report-building on its front face when showReportPreview */}
            <AnimatePresence mode="wait">
              <motion.div key={showReportPreview ? 'report' : currentPage}
                initial={{ rotateY: 0 }}
                animate={{ rotateY: showReportPreview ? 0 : (subPhase === 2 ? -180 : 0) }}
                exit={{ opacity: 0 }}
                transition={showReportPreview
                  ? { duration: 0 }
                  : { duration: 1.4, ease:[0.45,0.05,0.2,0.95] }}
                className="absolute inset-0 overflow-hidden"
                style={{ transformOrigin:'left center', transformStyle:'preserve-3d', borderTopRightRadius:6, borderBottomRightRadius:6, boxShadow:'0 4px 12px rgba(0,0,0,0.15)' }}>

                {/* Front face */}
                <div className="absolute inset-0 overflow-hidden" style={{ backfaceVisibility:'hidden' }}>
                  <AnimatePresence mode="wait">
                    {showReportPreview ? (
                      /* ── Report building view ── */
                      <motion.div key="report-view" className="absolute inset-0"
                        initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.5 }}>
                        <ReportBuildingView />
                      </motion.div>
                    ) : (
                      /* ── Normal scan view — teacher actively checking ── */
                      <motion.div key="scan-view" className="absolute inset-0">
                        {renderPage(currentPage, false)}
                        {/* Phase 1+: scan beam and ticks appear */}
                        {subPhase >= 1 && (
                          <>
                            <ScanBeam />
                            <DuringScanTicks index={currentPage} />
                            {/* Red pen cursor moving down the page */}
                            <motion.div className="absolute pointer-events-none"
                              initial={{ top:'10%', left:'68%' }}
                              animate={{ top:'85%', left:'72%' }}
                              transition={{ duration: 1.2, ease:'easeInOut' }}
                              style={{ width:3, height:18, background:'rgba(220,80,80,0.75)', borderRadius:2, transform:'rotate(35deg)', boxShadow:'0 0 5px rgba(220,80,80,0.6)' }} />
                          </>
                        )}
                        {subPhase < 1 && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <motion.div initial={{ opacity:0 }} animate={{ opacity:0.5 }}
                              transition={{ delay:0.2 }}
                              className="text-[10px] font-mono uppercase tracking-widest"
                              style={{ color:'#00d99b' }}>
                              waiting…
                            </motion.div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Back face */}
                <div className="absolute inset-0 overflow-hidden"
                  style={{ backfaceVisibility:'hidden', transform:'rotateY(180deg)' }}>
                  {renderPage(currentPage, true)}
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="absolute top-0 bottom-0 right-0 w-1 pointer-events-none"
              style={{ background:'linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.12) 100%)', borderTopRightRadius:6, borderBottomRightRadius:6 }} />
          </div>

          {/* Spine */}
          <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-1 pointer-events-none"
            style={{ background:'linear-gradient(90deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.35) 50%, rgba(0,0,0,0.18) 100%)', boxShadow:'0 0 12px rgba(0,0,0,0.4)' }} />
        </div>
      </div>

      {/* Page dots */}
      <div className="flex items-center gap-1.5 mt-8 flex-wrap justify-center max-w-md">
        {Array.from({ length: totalPages }).map((_, i) => (
          <motion.div key={i}
            animate={{
              scale: showReportPreview ? (i === totalPages - 1 ? 1.4 : 1) : (i === currentPage ? 1.4 : 1),
              opacity: showReportPreview ? 1 : (i <= currentPage ? 1 : 0.3),
            }}
            transition={{ duration:0.3 }}
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: (showReportPreview || i <= currentPage) ? '#00d99b' : '#3a3f3a',
              boxShadow: (showReportPreview ? i === totalPages - 1 : i === currentPage) ? '0 0 8px rgba(0,217,155,0.8)' : 'none',
            }} />
        ))}
      </div>

      {/* Bottom text */}
      <div className="flex items-center gap-2 mt-5">
        <ScanLine size={13} style={{ color:'#00d99b' }} className="animate-pulse" />
        <p className="text-xs font-medium text-white">
          {showReportPreview
            ? 'Compiling results and generating report'
            : 'Reading handwritten answers, page by page'}
        </p>
      </div>
      <p className="text-xs mt-1.5 max-w-sm text-center px-6" style={{ color:'#61665f' }}>
        {showReportPreview ? 'Almost done — your full report is being prepared' : subText}
      </p>
    </div>
  );
}