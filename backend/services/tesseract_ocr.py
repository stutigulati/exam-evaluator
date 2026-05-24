"""Tesseract OCR service."""
import time, io
from PIL import Image

def extract(file_bytes: bytes, filename: str) -> dict:
    start = time.time()
    try:
        import pytesseract
        img = Image.open(io.BytesIO(file_bytes)).convert('RGB')
        # Upscale for better accuracy
        if min(img.size) < 1000:
            scale = 1000 / min(img.size)
            img = img.resize((int(img.width*scale), int(img.height*scale)), Image.LANCZOS)
        data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
        words, confs = [], []
        for i, word in enumerate(data['text']):
            c = int(data['conf'][i])
            if c > 0 and word.strip():
                words.append(word)
                confs.append(c / 100)
        text = ' '.join(words)
        confidence = sum(confs) / max(len(confs), 1) if confs else 0.0
    except ImportError:
        text = '[pytesseract not installed — run: pip install pytesseract]'
        confidence = 0.0
    except Exception as e:
        text = f'[Tesseract error: {e}]'
        confidence = 0.0

    elapsed = round((time.time() - start) * 1000)
    return {
        'ocr_engine': 'tesseract',
        'extracted_text': text,
        'confidence': round(confidence, 2),
        'processing_time_ms': elapsed,
    }
