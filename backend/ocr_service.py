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


from dataclasses import dataclass
from typing import List

@dataclass
class OCRTextBox:
    text: str
    x1: int
    y1: int
    x2: int
    y2: int


class LayoutAwareOCRProcessor:
    def process_structure(self, boxes: List[OCRTextBox], y_threshold_px: int = 15) -> str:
        """
        Groups independent OCR bounding fragments into organized reading lines based on y-axis proximity,
        then sorts tokens along the x-axis to maintain table structures or columnar logs.
        """
        if not boxes:
            return ""

        cleaned_boxes = [box for box in boxes if box.text and box.text.strip()]
        if not cleaned_boxes:
            return ""
            
        # Step 1: Sort globally top-to-bottom by y1 coordinate
        sorted_boxes = list(cleaned_boxes)
        sorted_boxes.sort(key=lambda b: b.y1)
        
        lines = []
        current_line = [sorted_boxes[0]]
        
        for box in sorted_boxes[1:]:
            # If the block's top coordinate is close enough to the active line's median height, group them
            if box.y1 - current_line[-1].y1 < y_threshold_px:
                current_line.append(box)
            else:
                lines.append(current_line)
                current_line = [box]
        lines.append(current_line)
        
        # Step 2: Formulate string block by sorting elements along the horizontal x-axis within each line
        structured_markdown = []
        for line in lines:
            line.sort(key=lambda b: b.x1)
            # Join line components with tabs or spacing to simulate architectural structure
            line_str = " | ".join(_clean_ocr_text([b.text for b in line]).splitlines())
            if not line_str.strip():
                continue
            structured_markdown.append(f"| {line_str} |")
            
        return "\n".join(structured_markdown)


def extract_text_from_image(image_path: str | Path) -> str:
    """
    Run PaddleOCR on an image file, group text spatially using layout-aware positioning,
    and return the layout structure formatted inside system enhancement delimiters.

    Returns:
        str: Layout-aware structured text, or empty string if nothing detected,
             or an error message string if OCR fails (caller handles gracefully).
    """
    try:
        ocr = _get_ocr()
        result = ocr.ocr(str(image_path), cls=True)

        if not result or result[0] is None:
            return ""

        boxes: List[OCRTextBox] = []
        for block in result:
            if block is None:
                continue
            for line in block:
                # PaddleOCR format: [ [ [x1, y1], [x2, y1], [x2, y2], [x1, y2] ], (text, confidence) ]
                if len(line) < 2 or not line[0]:
                    continue
                text, confidence = line[1]
                # Higher threshold (0.6) for UI screenshots — reduces button-label noise
                if confidence >= 0.6:
                    coords = line[0]
                    x1 = int(min(pt[0] for pt in coords))
                    y1 = int(min(pt[1] for pt in coords))
                    x2 = int(max(pt[0] for pt in coords))
                    y2 = int(max(pt[1] for pt in coords))
                    boxes.append(OCRTextBox(text=text.strip(), x1=x1, y1=y1, x2=x2, y2=y2))

        if not boxes:
            return ""

        processor = LayoutAwareOCRProcessor()
        structured_layout = processor.process_structure(boxes)

        if not structured_layout.strip():
            return ""

        # Inject context format with strict semantic delimiters
        formatted_context = (
            "[USER SYSTEM CONTEXT ENHANCEMENT: SCREENSHOT OCR INGESTION]\n"
            "The user attached a screenshot layout. The following data contains visually extracted structures mapped by position:\n"
            "---\n"
            "IMAGE_METADATA: Unified UI Screen Capture\n"
            "EXTRACTED_LAYOUT:\n"
            "```python\n"
            "# Injected payload from LayoutAwareOCRProcessor\n"
            f"{structured_layout}\n"
            "```\n"
            "---\n"
            "[END OF VISUAL EXTRACTED CONTEXT]"
        )
        return formatted_context


    except Exception as e:
        return f"[OCR error: {e}]"


def is_image_content_type(content_type: str) -> bool:
    """Return True if the MIME type is an image we can run OCR on."""
    return content_type in {
        "image/jpeg", "image/png", "image/gif",
        "image/webp", "image/bmp", "image/tiff"
    }

