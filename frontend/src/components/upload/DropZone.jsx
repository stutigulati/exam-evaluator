import { useState, useRef } from 'react';
import { Upload, File, X, FileImage } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const ACCEPTED = ['image/jpeg','image/jpg','image/png','image/webp','application/pdf'];
const MAX_SIZE  = 10 * 1024 * 1024;

export function DropZone({ label, description, file, onFile, onError, required = true, compact = false }) {
  const [drag, setDrag] = useState(false);
  const ref = useRef(null);

  const validate = (f) => {
    if (!f) return;
    if (!ACCEPTED.includes(f.type)) {
      onError?.(`${label}: unsupported type. Use JPG, PNG or PDF.`); return;
    }
    if (f.size > MAX_SIZE) {
      onError?.(`${label}: max size is 10 MB.`); return;
    }
    onFile(f);
  };

  if (file) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-surface-2 border border-border rounded-lg p-3 flex items-center gap-3"
      >
        <div className="w-8 h-8 rounded bg-surface-3 flex items-center justify-center flex-shrink-0">
          <FileImage size={14} className="text-text-secondary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-text-primary truncate">{file.name}</p>
          <p className="text-xs text-text-tertiary">{(file.size / 1024).toFixed(0)} KB</p>
        </div>
        <button
          type="button"
          onClick={() => onFile(null)}
          className="w-6 h-6 rounded flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-surface-3 transition-colors"
        >
          <X size={12} />
        </button>
      </motion.div>
    );
  }

  return (
    <div>
      {label && (
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-xs font-medium text-text-secondary">{label}</span>
          {!required && <span className="text-xs text-text-tertiary">(optional)</span>}
        </div>
      )}
      <div
        onClick={() => ref.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); validate(e.dataTransfer.files[0]); }}
        className={cn(
          'border border-dashed rounded-lg cursor-pointer transition-all duration-150',
          'flex flex-col items-center justify-center text-center',
          compact ? 'p-4 gap-1.5' : 'p-8 gap-2',
          drag
            ? 'border-blue-500/60 bg-blue-500/5'
            : 'border-border hover:border-border-strong hover:bg-surface-2'
        )}
      >
        <input
          ref={ref} type="file" className="hidden"
          accept=".jpg,.jpeg,.png,.webp,.pdf"
          onChange={(e) => validate(e.target.files[0])}
        />
        <div className={cn(
          'rounded bg-surface-3 flex items-center justify-center',
          compact ? 'w-8 h-8' : 'w-10 h-10'
        )}>
          <Upload size={compact ? 14 : 16} className={drag ? 'text-blue-400' : 'text-text-tertiary'} />
        </div>
        {!compact && (
          <>
            <div>
              <p className="text-sm text-text-secondary font-medium">
                {description || 'Drop file or click to browse'}
              </p>
              <p className="text-xs text-text-tertiary mt-0.5">JPG, PNG, PDF — max 10 MB</p>
            </div>
          </>
        )}
        {compact && (
          <p className="text-xs text-text-tertiary">{description || 'Drop or click'}</p>
        )}
      </div>
    </div>
  );
}
