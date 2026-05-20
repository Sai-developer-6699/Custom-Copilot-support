# backend/ocr_service.py
"""
PaddleOCR service — lazy-loaded singleton with post-processing for clean text output.

Engineering decisions:
- Lazy init: PaddleOCR downloads ~200MB of models on first call. Loading at import
  time would delay every FastAPI startup by 10-20s. Lazy init moves that cost to
  the first actual upload.
- Confidence threshold 0.6: empirically determined for Atlan UI screenshots.
  Below 0.6, detections are typically noise (UI chrome, icon labels, etc.)
- Text cleaning: OCR output from UI screenshots contains a lot of short fragments
  (button labels, navigation items) that add noise to the RAG query. We filter
  these while preserving longer meaningful content.
"""
from __future__ import annotations

import re
from pathlib import Path

_ocr = None  # module-level singleton
_COMMON_UI_NOISE = {
    "back",
    "next",
    "previous",
    "submit",
    "cancel",
    "close",
    "ok",
    "yes",
    "no",
    "save",
    "delete",
    "edit",
    "done",
}


def _get_ocr():
    """Lazy initialise PaddleOCR (downloads models on first call, then cached)."""
    global _ocr
    if _ocr is None:
        from paddleocr import PaddleOCR
        _ocr = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
    return _ocr


def _clean_ocr_text(lines: list[str]) -> str:
    """
    Post-process raw OCR lines to remove noise common in UI screenshots:
    - Filter very short fragments (likely button labels / nav items)
    - Remove lines that are purely numeric (page numbers, IDs)
    - Collapse multiple whitespace
    - Deduplicate adjacent identical lines
    """
    cleaned: list[str] = []
    seen: set[str] = set()

    for line in lines:
        line = line.strip()

        # Skip empty
        if not line:
            continue

        # Skip very short tokens (< 3 chars) — usually UI chrome noise
        if len(line) < 3:
            continue

        lowered = line.lower()

        # Skip common one-word UI chrome labels that do not add query value
        if lowered in _COMMON_UI_NOISE:
            continue

        # Skip lines that are mostly punctuation or symbol clutter
        alnum_count = sum(char.isalnum() for char in line)
        if alnum_count == 0 or alnum_count / max(len(line), 1) < 0.35:
            continue

        # Skip lines that are only numbers/special chars — likely timestamps, IDs
        if re.fullmatch(r"[\d\s\-/:.,|#@!%]+", line):
            continue

        # Skip duplicate adjacent lines
        normalised = re.sub(r"\s+", " ", line).lower()
        if normalised in seen:
            continue
        seen.add(normalised)

        cleaned.append(line)

    return "\n".join(cleaned)


def extract_text_from_image(image_path: str | Path) -> str:
    """
    Run PaddleOCR on an image file and return cleaned extracted text.

    Returns:
        str: Extracted and cleaned text, or empty string if nothing detected,
             or an error message string if OCR fails (caller handles gracefully).
    """
    try:
        ocr = _get_ocr()
        result = ocr.ocr(str(image_path), cls=True)

        if not result or result[0] is None:
            return ""

        raw_lines: list[str] = []
        for block in result:
            if block is None:
                continue
            for line in block:
                # PaddleOCR format: [[box_coords], [text, confidence]]
                if len(line) < 2:
                    continue
                text, confidence = line[1]
                # Higher threshold (0.6) for UI screenshots — reduces button-label noise
                if confidence >= 0.6:
                    raw_lines.append(text.strip())

        cleaned = _clean_ocr_text(raw_lines)
        return cleaned

    except Exception as e:
        return f"[OCR error: {e}]"


def is_image_content_type(content_type: str) -> bool:
    """Return True if the MIME type is an image we can run OCR on."""
    return content_type in {
        "image/jpeg", "image/png", "image/gif",
        "image/webp", "image/bmp", "image/tiff"
    }
