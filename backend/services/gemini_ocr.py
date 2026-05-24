"""Gemini Vision OCR service."""
import os, time, base64, io
import google.generativeai as genai
from PIL import Image

def _to_jpeg(image_bytes: bytes) -> bytes:
    img = Image.open(io.BytesIO(image_bytes))
    if img.mode != 'RGB':
        img = img.convert('RGB')
    buf = io.BytesIO()
    img.save(buf, format='JPEG', quality=95)
    return buf.getvalue()

def _pdf_to_images(pdf_bytes: bytes):
    from pdf2image import convert_from_bytes
    pages = convert_from_bytes(pdf_bytes, dpi=200)
    result = []
    for p in pages:
        buf = io.BytesIO()
        p.save(buf, format='JPEG', quality=95)
        result.append(buf.getvalue())
    return result

def extract(file_bytes: bytes, filename: str) -> dict:
    start = time.time()
    api_key = os.getenv('GEMINI_API_KEY')
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-2.5-flash")

    if filename.lower().endswith('.pdf'):
        pages = _pdf_to_images(file_bytes)
        texts = []
        for i, pb in enumerate(pages):
            b64 = base64.b64encode(pb).decode()
            resp = model.generate_content([
                {'inline_data': {'mime_type': 'image/jpeg', 'data': b64}},
                'Extract ALL text from this image exactly as written. Return only the raw text.'
            ])
            if len(pages) > 1:
                texts.append(f'=== Page {i+1} ===\n{resp.text.strip()}')
            else:
                texts.append(resp.text.strip())
        text = '\n\n'.join(texts)
    else:
        jb = _to_jpeg(file_bytes)
        b64 = base64.b64encode(jb).decode()
        resp = model.generate_content([
            {'inline_data': {'mime_type': 'image/jpeg', 'data': b64}},
            'Extract ALL text from this image exactly as written. Return only the raw text.'
        ])
        text = resp.text.strip()

    elapsed = round((time.time() - start) * 1000)
    words = len(text.split())
    confidence = min(1.0, words / 50) if words < 50 else 0.85 + min(0.15, words / 1000)

    return {
        'ocr_engine': 'gemini',
        'extracted_text': text,
        'confidence': round(confidence, 2),
        'processing_time_ms': elapsed,
    }
