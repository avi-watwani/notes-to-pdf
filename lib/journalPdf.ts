'use client';

import DOMPurify from 'isomorphic-dompurify';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'strike',
  'del',
  'ol',
  'ul',
  'li',
] as const;

/** Sanitize editor HTML before injecting into the DOM for PDF capture. */
export function sanitizeJournalHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [...ALLOWED_TAGS],
    ALLOWED_ATTR: [],
  });
}

/**
 * PDF-only styles. html2canvas mis-renders native list markers (outside position,
 * staircase alignment with li > p). Use counters + ::before instead.
 */
export const JOURNAL_PDF_CAPTURE_CSS = `
.journal-pdf-root {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 14px;
  line-height: 1.6;
  color: #000000;
  background: #ffffff;
  box-sizing: border-box;
}
.journal-pdf-date { font-size: 18px; font-weight: 700; margin: 0 0 1.5rem 0; }
/* Stack blocks with no extra rules: spacing comes only from what the user typed
   (empty <p> or <p><br></p> = one blank line). */
.journal-pdf-body {
  display: flex;
  flex-direction: column;
  gap: 0;
  overflow-wrap: anywhere;
  word-break: break-word;
  max-width: 100%;
}
.journal-pdf-body > * {
  margin: 0;
}
.journal-pdf-body > p:empty {
  min-height: 1.6em;
}
.journal-pdf-body > p:has(> br:only-child) {
  min-height: 1.6em;
}
.journal-pdf-body ol,
.journal-pdf-body ul {
  list-style: none;
  margin: 0;
  padding-left: 0;
}
.journal-pdf-body ol { counter-reset: journal-pdf-ol; }
.journal-pdf-body li ol { counter-reset: journal-pdf-ol; }
.journal-pdf-body ol > li {
  counter-increment: journal-pdf-ol;
  position: relative;
  padding-left: 2.25em;
  margin: 0.3em 0;
  min-height: 1.5em;
}
.journal-pdf-body ol > li::before {
  content: counter(journal-pdf-ol) ".";
  position: absolute;
  left: 0;
  top: 0.05em;
  width: 1.85em;
  text-align: right;
  font-weight: 400;
  line-height: inherit;
  box-sizing: border-box;
  padding-right: 0.35em;
}
.journal-pdf-body ul > li {
  position: relative;
  padding-left: 1.35em;
  margin: 0.3em 0;
  min-height: 1.5em;
}
.journal-pdf-body ul > li::before {
  content: "\\2022";
  position: absolute;
  left: 0.15em;
  top: 0.05em;
  line-height: inherit;
  font-size: 0.85em;
}
.journal-pdf-body li p {
  margin: 0;
}
.journal-pdf-body strong, .journal-pdf-body b { font-weight: 700; }
.journal-pdf-body em, .journal-pdf-body i { font-style: italic; }
.journal-pdf-body u { text-decoration: underline; }
.journal-pdf-body s, .journal-pdf-body strike, .journal-pdf-body del { text-decoration: line-through; }
`;

export async function generateJournalPdfBlob(
  dateDisplay: string,
  bodyHtml: string
): Promise<Blob> {
  const cleanBody = sanitizeJournalHtml(bodyHtml);

  const tempDiv = document.createElement('div');
  tempDiv.style.position = 'absolute';
  tempDiv.style.left = '-9999px';
  tempDiv.style.top = '0';
  tempDiv.style.boxSizing = 'border-box';
  tempDiv.style.width = '720px';
  tempDiv.style.maxWidth = '720px';
  tempDiv.style.padding = '40px';
  tempDiv.style.backgroundColor = '#ffffff';
  tempDiv.style.overflow = 'visible';
  tempDiv.className = 'journal-pdf-root';

  const styleEl = document.createElement('style');
  styleEl.textContent = JOURNAL_PDF_CAPTURE_CSS;
  tempDiv.appendChild(styleEl);

  const dateEl = document.createElement('p');
  dateEl.className = 'journal-pdf-date';
  dateEl.textContent = dateDisplay;

  const bodyWrap = document.createElement('div');
  bodyWrap.className = 'journal-pdf-body';
  bodyWrap.innerHTML = cleanBody;

  tempDiv.appendChild(dateEl);
  tempDiv.appendChild(bodyWrap);

  document.body.appendChild(tempDiv);

  try {
    // Omit fixed width/height so the clone uses full layout width; explicit
    // dimensions often crop list markers or wide overflow incorrectly.
    const canvas = await html2canvas(tempDiv, {
      useCORS: true,
      logging: false,
      scale: 2,
      backgroundColor: '#ffffff',
    });

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.85);
    const pdfWidth = doc.internal.pageSize.getWidth();
    const pdfHeight = doc.internal.pageSize.getHeight();
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    if (imgHeight <= pdfHeight) {
      doc.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
    } else {
      let heightLeft = imgHeight;
      let position = 0;
      doc.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
      while (heightLeft > 0) {
        position =
          -pdfHeight * (Math.floor((imgHeight - heightLeft) / pdfHeight) + 1);
        doc.addPage();
        doc.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
    }

    return doc.output('blob');
  } finally {
    document.body.removeChild(tempDiv);
  }
}
