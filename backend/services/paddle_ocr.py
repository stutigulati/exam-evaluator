"""PaddleOCR service."""
import time, io
from PIL import Image

def extract(file_bytes: bytes, filename: str) -> dict:
    start = time.time()
    try:
        from paddleocr import PaddleOCR
        ocr = PaddleOCR(use_angle_cls=True, lang='en', show_log=False)
        img = Image.open(io.BytesIO(file_bytes)).convert('RGB')
        buf = io.BytesIO()
        img.save(buf, format='JPEG')
        result = ocr.ocr(buf.getvalue(), cls=True)
        lines, confs = [], []
        for block in (result or []):
            for line in (block or []):
                text_info = line[1]
                lines.append(text_info[0])
                confs.append(text_info[1])
        text = '\n'.join(lines)
        confidence = sum(confs) / max(len(confs), 1) if confs else 0.0
    except ImportError:
        text = '[PaddleOCR not installed — run: pip install paddleocr paddlepaddle]'
        confidence = 0.0
    except Exception as e:
        text = f'[PaddleOCR error: {e}]'
        confidence = 0.0

    elapsed = round((time.time() - start) * 1000)
    return {
        'ocr_engine': 'paddle',
        'extracted_text': text,
        'confidence': round(confidence, 2),
        'processing_time_ms': elapsed,
    }
