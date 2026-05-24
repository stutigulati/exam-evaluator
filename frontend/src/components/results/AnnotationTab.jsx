import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Pencil, Type, Square, Circle, Undo2, Redo2, Trash2,
  ZoomIn, ZoomOut, Save, CheckCircle2, Eraser
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const COLORS = ['#f87171', '#fbbf24', '#4ade80', '#00d99b', '#f472b6', '#ffffff'];

const TOOLS = [
  { id: 'pen',    icon: Pencil, label: 'Pen'       },
  { id: 'eraser', icon: Eraser, label: 'Eraser'    },
  { id: 'text',   icon: Type,   label: 'Text'      },
  { id: 'rect',   icon: Square, label: 'Rectangle' },
  { id: 'circle', icon: Circle, label: 'Circle'    },
];

function drawAnnotations(ctx, annotations, currentPath, activeColor, penSize = 2.5, currentTool = 'pen', eraserSize = 20) {
  annotations.forEach(a => {
    ctx.strokeStyle = a.color;
    ctx.fillStyle   = a.color;
    ctx.lineWidth   = penSize;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';

    if ((a.type === 'pen' || a.type === 'eraser') && a.points?.length > 1) {
      ctx.save();
      if (a.type === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = a.size || 20;
      }
      ctx.beginPath();
      ctx.moveTo(a.points[0].x, a.points[0].y);
      a.points.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
      if (a.type === 'eraser') ctx.restore();
    }
    if (a.type === 'text') {
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(a.text, a.x, a.y);
    }
    if (a.type === 'rect') {
      ctx.strokeRect(a.x, a.y, a.w, a.h);
    }
    if (a.type === 'circle') {
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
      ctx.stroke();
    }
  });

  if (currentPath.length > 1) {
    ctx.save();
    if (currentTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = eraserSize || 20;
    } else {
      ctx.strokeStyle = activeColor;
      ctx.lineWidth   = penSize;
    }
    ctx.lineCap  = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(currentPath[0].x, currentPath[0].y);
    currentPath.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.stroke();
    ctx.restore();
  }
}

export default function AnnotationTab({ result, onAnnotationSaved }) {
  const canvasRef     = useRef(null);
  const baseCanvasRef = useRef(null);

  const [tool,        setTool]        = useState('pen');
  const [color,       setColor]       = useState('#f87171');
  const [penSize,     setPenSize]     = useState(2.5);
  const [eraserSize,  setEraserSize]  = useState(20);
  const [zoom,        setZoom]        = useState(1);
  const [imageReady,  setImageReady]  = useState(false);
  const [imageError,  setImageError]  = useState(false);

  const [drawing,     setDrawing]     = useState(false);
  const [annotations, setAnnotations] = useState([]);
  const [currentPath, setCurrentPath] = useState([]);
  const [undoStack,   setUndoStack]   = useState([]);

  const [textInput,   setTextInput]   = useState('');
  const [textPos,     setTextPos]     = useState(null);

  const [saveState,   setSaveState]   = useState('idle'); // idle | saving | saved
  const [hasChanges,  setHasChanges]  = useState(false);

  // ── Load file into base canvas ──────────────────────────────────────────────
  useEffect(() => {
    const loadFile = async () => {
      setImageReady(false);
      setImageError(false);
      setAnnotations([]);
      setCurrentPath([]);
      setUndoStack([]);
      setHasChanges(false);

      const file = result?.answerSheetFile;
      if (!file) return;

      try {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        if (file.type === 'application/pdf') {
          const buffer    = await file.arrayBuffer();
          const pdf       = await pdfjsLib.getDocument({ data: buffer }).promise;
          const numPages  = pdf.numPages;
          const SCALE     = 1.6;
          const GAP       = 12; // px gap between pages

          // First pass — measure all pages to get total canvas size
          const viewports = [];
          for (let p = 1; p <= numPages; p++) {
            const pg = await pdf.getPage(p);
            viewports.push(pg.getViewport({ scale: SCALE }));
          }
          const maxW     = Math.max(...viewports.map(v => v.width));
          const totalH   = viewports.reduce((sum, v) => sum + v.height, 0) + GAP * (numPages - 1);

          canvas.width  = maxW;
          canvas.height = totalH;

          // Fill white background
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, maxW, totalH);

          // Second pass — render each page at correct Y offset
          let yOffset = 0;
          for (let p = 1; p <= numPages; p++) {
            const pg       = await pdf.getPage(p);
            const viewport = viewports[p - 1];
            // Render to offscreen canvas then stamp onto main canvas
            const offscreen    = document.createElement('canvas');
            offscreen.width    = viewport.width;
            offscreen.height   = viewport.height;
            const offCtx       = offscreen.getContext('2d');
            await pg.render({ canvasContext: offCtx, viewport }).promise;
            ctx.drawImage(offscreen, 0, yOffset);
            yOffset += viewport.height + GAP;
          }

        } else if (file.type.startsWith('image/')) {
          const url = URL.createObjectURL(file);
          const img = new Image();

          await new Promise((resolve, reject) => {
            img.onload  = resolve;
            img.onerror = reject;
            img.src     = url;
          });

          canvas.width  = img.naturalWidth;
          canvas.height = img.naturalHeight;
          ctx.drawImage(img, 0, 0);

          URL.revokeObjectURL(url);
        } else {
          setImageError(true);
          return;
        }

        // Snapshot the clean base layer
        const base  = document.createElement('canvas');
        base.width  = canvas.width;
        base.height = canvas.height;
        base.getContext('2d').drawImage(canvas, 0, 0);
        baseCanvasRef.current = base;

        setImageReady(true);
      } catch (err) {
        console.error('Preview load failed:', err);
        setImageError(true);
      }
    };

    loadFile();
  }, [result?.answerSheetFile]);

  // ── Redraw base + annotations on every change ───────────────────────────────
  useEffect(() => {
    if (!imageReady || !canvasRef.current || !baseCanvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(baseCanvasRef.current, 0, 0);
    drawAnnotations(ctx, annotations, currentPath, color, penSize, tool, eraserSize);
  }, [imageReady, annotations, currentPath, color]);

  // ── Pointer helpers ──────────────────────────────────────────────────────────
  const getPos = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left)  / zoom,
      y: (e.clientY - rect.top)   / zoom,
    };
  }, [zoom]);

  const handleMouseDown = useCallback((e) => {
    if (!imageReady) return;
    const pos = getPos(e);
    if (tool === 'text') { setTextPos(pos); return; }
    setDrawing(true);
    setCurrentPath([pos]);
  }, [getPos, tool, imageReady]);

  const handleMouseMove = useCallback((e) => {
    if (!drawing) return;
    setCurrentPath(prev => [...prev, getPos(e)]);
  }, [drawing, getPos]);

  const handleMouseUp = useCallback(() => {
    if (!drawing) return;
    setDrawing(false);

    if (currentPath.length > 1) {
      const start = currentPath[0];
      const end   = currentPath[currentPath.length - 1];
      let ann     = null;

      if (tool === 'pen')    ann = { type: 'pen', points: currentPath, color };
      if (tool === 'rect')   ann = { type: 'rect',   x: Math.min(start.x, end.x), y: Math.min(start.y, end.y), w: Math.abs(end.x - start.x), h: Math.abs(end.y - start.y), color };
      if (tool === 'circle') ann = { type: 'circle', x: start.x, y: start.y, r: Math.hypot(end.x - start.x, end.y - start.y), color };

      if (ann) { setAnnotations(prev => [...prev, ann]); setHasChanges(true); }
    }

    setCurrentPath([]);
  }, [drawing, currentPath, tool, color]);

  const addText = () => {
    if (!textInput.trim() || !textPos) return;
    setAnnotations(prev => [...prev, { type: 'text', text: textInput, x: textPos.x, y: textPos.y, color }]);
    setTextInput(''); setTextPos(null); setHasChanges(true);
  };

  const undo = () => {
    if (!annotations.length) return;
    setUndoStack(prev => [...prev, annotations[annotations.length - 1]]);
    setAnnotations(prev => prev.slice(0, -1));
    setHasChanges(true);
  };

  const redo = () => {
    if (!undoStack.length) return;
    setAnnotations(prev => [...prev, undoStack[undoStack.length - 1]]);
    setUndoStack(prev => prev.slice(0, -1));
    setHasChanges(true);
  };

  const clearAll = () => { setAnnotations([]); setUndoStack([]); setHasChanges(false); };

  // ── Save — uses synchronous toDataURL so the download fires within the
  //           user-gesture window (toBlob is async and gets blocked) ───────────
  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setSaveState('saving');

    try {
      // Make sure the final annotation layer is drawn before exporting
      if (baseCanvasRef.current) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(baseCanvasRef.current, 0, 0);
        drawAnnotations(ctx, annotations, [], color);
      }

      // toDataURL is synchronous — stays within the click's user-gesture context
      const dataUrl  = canvas.toDataURL('image/png');
      const safeName = (result?.studentName || 'sheet').replace(/\s+/g, '_');
      const filename = `annotated_${safeName}_${Date.now()}.png`;

      // Create a temporary link and trigger the download
      const link = document.createElement('a');
      link.href     = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Notify parent with the saved data
      onAnnotationSaved?.({ dataUrl, filename, annotationCount: annotations.length });

      setSaveState('saved');
      setHasChanges(false);
      setTimeout(() => setSaveState('idle'), 2500);

    } catch (err) {
      console.error('Save annotation failed:', err);
      setSaveState('idle');
    }
  };

  return (
    <div className="space-y-3">

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 flex-wrap rounded-xl px-4 py-3"
        style={{ background: '#111311', border: '1px solid rgba(255,255,255,0.07)' }}>

        {TOOLS.map(t => (
          <button key={t.id} onClick={() => setTool(t.id)} title={t.label}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{
              background: tool === t.id ? 'rgba(0,200,150,0.2)'  : 'rgba(255,255,255,0.04)',
              border:     tool === t.id ? '1px solid rgba(0,200,150,0.4)' : '1px solid transparent',
              color:      tool === t.id ? '#00d99b' : '#7f867c',
            }}>
            <t.icon size={14} />
          </button>
        ))}

        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)' }} />

        {COLORS.map(c => (
          <button key={c} onClick={() => setColor(c)}
            className="w-6 h-6 rounded-full transition-all"
            style={{
              background: c,
              border:    color === c ? '2px solid white' : '2px solid transparent',
              boxShadow: color === c ? `0 0 8px ${c}` : 'none',
            }} />
        ))}

        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)' }} />

        <button onClick={undo} disabled={!annotations.length}
          className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30"
          style={{ background: 'rgba(255,255,255,0.04)', color: '#7f867c' }}>
          <Undo2 size={14} />
        </button>

        <button onClick={redo} disabled={!undoStack.length}
          className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30"
          style={{ background: 'rgba(255,255,255,0.04)', color: '#7f867c' }}>
          <Redo2 size={14} />
        </button>

        <button onClick={clearAll}
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.04)', color: '#f87171' }}>
          <Trash2 size={14} />
        </button>

        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)' }} />

        <button onClick={() => setZoom(z => Math.min(3, z + 0.25))}
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.04)', color: '#7f867c' }}>
          <ZoomIn size={14} />
        </button>

        <button onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.04)', color: '#7f867c' }}>
          <ZoomOut size={14} />
        </button>

        <span className="text-xs font-mono" style={{ color: '#61665f' }}>
          {Math.round(zoom * 100)}%
        </span>

        {/* Pen size */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg ml-1"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Pencil size={10} style={{ color: '#7f867c' }} />
          <input
            type="range" min="1" max="12" step="0.5"
            value={penSize}
            onChange={e => setPenSize(Number(e.target.value))}
            style={{ width: 64, height: 4, accentColor: '#00d99b', cursor: 'pointer' }}
            title={`Pen size: ${penSize}px`}
          />
          <span className="text-[10px] font-mono w-4" style={{ color: '#7f867c' }}>{penSize}</span>
        </div>

        {/* Eraser size — only shown when eraser tool active */}
        {tool === 'eraser' && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg ml-1"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Eraser size={10} style={{ color: '#7f867c' }} />
            <input
              type="range" min="5" max="60" step="1"
              value={eraserSize}
              onChange={e => setEraserSize(Number(e.target.value))}
              style={{ width: 64, height: 4, accentColor: '#f87171', cursor: 'pointer' }}
              title={`Eraser size: ${eraserSize}px`}
            />
            <span className="text-[10px] font-mono w-4" style={{ color: '#7f867c' }}>{eraserSize}</span>
          </div>
        )}

        {/* Save button — always enabled once there are annotations */}
        <button
          onClick={handleSave}
          disabled={saveState === 'saving' || !imageReady || !annotations.length}
          className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={saveState === 'saved'
            ? { background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.35)', color: '#4ade80' }
            : {
                background: hasChanges ? 'linear-gradient(135deg,#00c896,#3ee67f)' : 'rgba(255,255,255,0.06)',
                border:     hasChanges ? 'none' : '1px solid rgba(255,255,255,0.1)',
                color:      hasChanges ? '#04110b' : '#a2a59f',
                boxShadow:  hasChanges ? '0 0 14px rgba(0,200,150,0.35)' : 'none',
              }}>
          {saveState === 'saved'
            ? <><CheckCircle2 size={13} /> Saved!</>
            : saveState === 'saving'
            ? <>Saving…</>
            : <><Save size={13} /> Save Changes</>}
        </button>
      </div>

      {/* Unsaved hint */}
      {hasChanges && saveState === 'idle' && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
          style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.18)', color: '#fbbf24' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
          Unsaved annotations — click "Save Changes" to download the annotated sheet.
        </div>
      )}

      {/* Text input popup */}
      {textPos && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ background: 'rgba(0,200,150,0.08)', border: '1px solid rgba(0,200,150,0.2)' }}>
          <input value={textInput} onChange={e => setTextInput(e.target.value)}
            placeholder="Type annotation text..."
            className="flex-1 bg-transparent text-sm text-white outline-none"
            autoFocus onKeyDown={e => e.key === 'Enter' && addText()} />
          <button onClick={addText} className="text-xs px-3 py-1 rounded-lg font-medium"
            style={{ background: '#00c896', color: 'white' }}>Add</button>
          <button onClick={() => { setTextPos(null); setTextInput(''); }}
            className="text-xs px-2 py-1 rounded-lg" style={{ color: '#f87171' }}>Cancel</button>
        </div>
      )}

      {/* Canvas */}
      <div className="rounded-xl overflow-auto"
        style={{ background: '#0a0a14', border: '1px solid rgba(255,255,255,0.07)', maxHeight: 650, minHeight: 250 }}>
        <canvas
          ref={canvasRef}
          style={{
            display:         imageReady ? 'block' : 'none',
            transform:       `scale(${zoom})`,
            transformOrigin: 'top left',
            cursor:          tool === 'text' ? 'text' : 'crosshair',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />

        {!imageReady && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            {imageError ? (
              <>
                <Pencil size={22} style={{ color: '#f87171' }} />
                <p className="text-sm mt-3" style={{ color: '#f87171' }}>Could not load preview</p>
                <p className="text-xs mt-1" style={{ color: '#4f564f' }}>Only image files (JPG, PNG) and PDFs are supported</p>
              </>
            ) : result?.answerSheetFile ? (
              <>
                <span className="w-6 h-6 border-2 rounded-full animate-spin mb-3"
                  style={{ borderColor: 'rgba(0,200,150,0.2)', borderTopColor: '#00d99b' }} />
                <p className="text-xs" style={{ color: '#61665f' }}>Loading sheet preview…</p>
              </>
            ) : (
              <>
                <Pencil size={22} style={{ color: '#61665f' }} />
                <p className="text-sm mt-3" style={{ color: '#7f867c' }}>No answer sheet uploaded</p>
                <p className="text-xs mt-1" style={{ color: '#4f564f' }}>Upload an answer sheet in the Configuration section</p>
              </>
            )}
          </div>
        )}
      </div>

      {annotations.length > 0 && (
        <p className="text-xs text-center" style={{ color: '#4f564f' }}>
          {annotations.length} annotation{annotations.length !== 1 ? 's' : ''} added
        </p>
      )}
    </div>
  );
}