'use client';

import DOMPurify from 'isomorphic-dompurify';
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

type TextMarks = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
};

type TextFragment = {
  text: string;
  marks: TextMarks;
};

type ParagraphBlock = {
  type: 'paragraph';
  fragments: TextFragment[];
};

type BlankBlock = {
  type: 'blank';
};

type ListItemBlock = {
  type: 'list-item';
  fragments: TextFragment[];
  marker: string;
  indentLevel: number;
};

type PdfBlock = ParagraphBlock | BlankBlock | ListItemBlock;

type Segment = {
  text: string;
  marks: TextMarks;
  width: number;
};

type Line = {
  segments: Segment[];
  width: number;
};

const DEFAULT_MARKS: TextMarks = {
  bold: false,
  italic: false,
  underline: false,
  strike: false,
};

const LEGACY_CAPTURE_WIDTH_PX = 720;
const PDF_PAGE_WIDTH_MM = 210;
const LEGACY_MM_PER_PX = PDF_PAGE_WIDTH_MM / LEGACY_CAPTURE_WIDTH_PX;
const PX_TO_PT = 72 / 96;
const MM_PER_PT = 0.352778;

// Match the old html2canvas layout geometry, which rendered a 720px-wide capture
// and then scaled that image to the full A4 width.
const PAGE_MARGIN_X = 40 * LEGACY_MM_PER_PX;
const PAGE_MARGIN_TOP = 40 * LEGACY_MM_PER_PX;
const PAGE_MARGIN_BOTTOM = PAGE_MARGIN_TOP;
const DATE_FONT_SIZE = 18 * PX_TO_PT;
const BODY_FONT_SIZE = 14 * PX_TO_PT;
const BODY_LINE_HEIGHT = BODY_FONT_SIZE * 1.6 * MM_PER_PT;
const DATE_GAP_AFTER = 24 * LEGACY_MM_PER_PX;
const BLOCK_GAP = 0;
const ORDERED_LIST_MARKER_WIDTH_MM = 1.85 * 14 * LEGACY_MM_PER_PX;
const UNORDERED_LIST_MARKER_WIDTH_MM = 1.35 * 14 * LEGACY_MM_PER_PX;
const LIST_INDENT_MM = 2.25 * 14 * LEGACY_MM_PER_PX;
const LIST_MARKER_GAP_MM = 0.35 * 14 * LEGACY_MM_PER_PX;

/** Sanitize editor HTML before turning it into PDF text runs. */
export function sanitizeJournalHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [...ALLOWED_TAGS],
    ALLOWED_ATTR: [],
  });
}

function cloneMarks(marks: TextMarks): TextMarks {
  return { ...marks };
}

function getFontStyle(marks: TextMarks): 'normal' | 'bold' | 'italic' | 'bolditalic' {
  if (marks.bold && marks.italic) return 'bolditalic';
  if (marks.bold) return 'bold';
  if (marks.italic) return 'italic';
  return 'normal';
}

function applyTextStyle(doc: jsPDF, marks: TextMarks, fontSize: number) {
  doc.setFont('helvetica', getFontStyle(marks));
  doc.setFontSize(fontSize);
}

function hasVisibleText(fragments: TextFragment[]) {
  return fragments.some((fragment) => fragment.text.trim().length > 0);
}

function pushTextFragment(fragments: TextFragment[], text: string, marks: TextMarks) {
  if (!text) return;

  const previous = fragments[fragments.length - 1];
  if (
    previous &&
    previous.marks.bold === marks.bold &&
    previous.marks.italic === marks.italic &&
    previous.marks.underline === marks.underline &&
    previous.marks.strike === marks.strike
  ) {
    previous.text += text;
    return;
  }

  fragments.push({
    text,
    marks: cloneMarks(marks),
  });
}

function collectInlineFragments(node: Node, marks: TextMarks, fragments: TextFragment[]) {
  if (node.nodeType === Node.TEXT_NODE) {
    pushTextFragment(fragments, node.textContent ?? '', marks);
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const element = node as HTMLElement;
  const tagName = element.tagName.toLowerCase();
  const nextMarks = cloneMarks(marks);

  if (tagName === 'strong' || tagName === 'b') nextMarks.bold = true;
  if (tagName === 'em' || tagName === 'i') nextMarks.italic = true;
  if (tagName === 'u') nextMarks.underline = true;
  if (tagName === 's' || tagName === 'strike' || tagName === 'del') nextMarks.strike = true;

  if (tagName === 'br') {
    pushTextFragment(fragments, '\n', nextMarks);
    return;
  }

  Array.from(element.childNodes).forEach((child) => {
    collectInlineFragments(child, nextMarks, fragments);
  });
}

function getListItemContentFragments(item: HTMLLIElement) {
  const fragments: TextFragment[] = [];

  Array.from(item.childNodes).forEach((child) => {
    if (
      child.nodeType === Node.ELEMENT_NODE &&
      ['ol', 'ul'].includes((child as HTMLElement).tagName.toLowerCase())
    ) {
      return;
    }
    collectInlineFragments(child, DEFAULT_MARKS, fragments);
  });

  return fragments;
}

function collectBlocksFromList(list: HTMLOListElement | HTMLUListElement, indentLevel: number, blocks: PdfBlock[]) {
  const ordered = list.tagName.toLowerCase() === 'ol';
  const items = Array.from(list.children).filter(
    (child): child is HTMLLIElement => child.tagName.toLowerCase() === 'li'
  );

  items.forEach((item, index) => {
    const fragments = getListItemContentFragments(item);

    if (hasVisibleText(fragments)) {
      blocks.push({
        type: 'list-item',
        fragments,
        marker: ordered ? `${index + 1}.` : '\u2022',
        indentLevel,
      });
    }

    Array.from(item.children).forEach((child) => {
      const tagName = child.tagName.toLowerCase();
      if (tagName === 'ol' || tagName === 'ul') {
        collectBlocksFromList(child as HTMLOListElement | HTMLUListElement, indentLevel + 1, blocks);
      }
    });
  });
}

function parseJournalBlocks(html: string): PdfBlock[] {
  const parser = new DOMParser();
  const parsed = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const root = parsed.body.firstElementChild;
  const blocks: PdfBlock[] = [];

  if (!root) return blocks;

  Array.from(root.childNodes).forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent ?? '';
      if (!text.trim()) return;
      blocks.push({
        type: 'paragraph',
        fragments: [{ text, marks: cloneMarks(DEFAULT_MARKS) }],
      });
      return;
    }

    if (child.nodeType !== Node.ELEMENT_NODE) return;

    const element = child as HTMLElement;
    const tagName = element.tagName.toLowerCase();

    if (tagName === 'p') {
      const fragments: TextFragment[] = [];
      collectInlineFragments(element, DEFAULT_MARKS, fragments);

      if (!hasVisibleText(fragments)) {
        blocks.push({ type: 'blank' });
      } else {
        blocks.push({ type: 'paragraph', fragments });
      }
      return;
    }

    if (tagName === 'ol' || tagName === 'ul') {
      collectBlocksFromList(element as HTMLOListElement | HTMLUListElement, 0, blocks);
    }
  });

  return blocks;
}

function tokenizeFragments(fragments: TextFragment, acc: Array<{ text: string; marks: TextMarks; kind: 'word' | 'space' | 'newline' }>) {
  const parts = fragments.text.split(/(\n|\s+)/);

  parts.forEach((part) => {
    if (!part) return;
    if (part === '\n') {
      acc.push({ text: part, marks: fragments.marks, kind: 'newline' });
      return;
    }
    if (/^\s+$/.test(part)) {
      acc.push({ text: ' ', marks: fragments.marks, kind: 'space' });
      return;
    }
    acc.push({ text: part, marks: fragments.marks, kind: 'word' });
  });
}

function getTextWidth(doc: jsPDF, text: string, marks: TextMarks, fontSize: number) {
  applyTextStyle(doc, marks, fontSize);
  return doc.getTextWidth(text);
}

function splitWordToFit(doc: jsPDF, text: string, marks: TextMarks, maxWidth: number, fontSize: number) {
  const pieces: Segment[] = [];
  let current = '';

  for (const char of Array.from(text)) {
    const next = current + char;
    const nextWidth = getTextWidth(doc, next, marks, fontSize);

    if (current && nextWidth > maxWidth) {
      pieces.push({
        text: current,
        marks,
        width: getTextWidth(doc, current, marks, fontSize),
      });
      current = char;
      continue;
    }

    current = next;
  }

  if (current) {
    pieces.push({
      text: current,
      marks,
      width: getTextWidth(doc, current, marks, fontSize),
    });
  }

  return pieces;
}

function layoutFragmentsToLines(doc: jsPDF, fragments: TextFragment[], maxWidth: number, fontSize: number): Line[] {
  const tokens: Array<{ text: string; marks: TextMarks; kind: 'word' | 'space' | 'newline' }> = [];
  fragments.forEach((fragment) => tokenizeFragments(fragment, tokens));

  const lines: Line[] = [];
  let currentSegments: Segment[] = [];
  let currentWidth = 0;
  let pendingSpace: Segment | null = null;

  const flushLine = () => {
    lines.push({ segments: currentSegments, width: currentWidth });
    currentSegments = [];
    currentWidth = 0;
    pendingSpace = null;
  };

  tokens.forEach((token) => {
    if (token.kind === 'newline') {
      flushLine();
      return;
    }

    if (token.kind === 'space') {
      if (!currentSegments.length) return;
      pendingSpace = {
        text: ' ',
        marks: token.marks,
        width: getTextWidth(doc, ' ', token.marks, fontSize),
      };
      return;
    }

    const wordWidth = getTextWidth(doc, token.text, token.marks, fontSize);
    const extraWidth = currentSegments.length && pendingSpace ? pendingSpace.width : 0;

    if (wordWidth > maxWidth) {
      const pieces = splitWordToFit(doc, token.text, token.marks, maxWidth, fontSize);

      pieces.forEach((piece) => {
        if (currentSegments.length && pendingSpace) {
          if (currentWidth + pendingSpace.width + piece.width > maxWidth) {
            flushLine();
          } else {
            currentSegments.push(pendingSpace);
            currentWidth += pendingSpace.width;
          }
        }

        if (currentSegments.length && currentWidth + piece.width > maxWidth) {
          flushLine();
        }

        currentSegments.push(piece);
        currentWidth += piece.width;
        pendingSpace = null;
      });

      return;
    }

    if (currentSegments.length && currentWidth + extraWidth + wordWidth > maxWidth) {
      flushLine();
    }

    if (currentSegments.length && pendingSpace) {
      currentSegments.push(pendingSpace);
      currentWidth += pendingSpace.width;
    }

    currentSegments.push({
      text: token.text,
      marks: token.marks,
      width: wordWidth,
    });
    currentWidth += wordWidth;
    pendingSpace = null;
  });

  if (currentSegments.length || !lines.length) {
    lines.push({ segments: currentSegments, width: currentWidth });
  }

  return lines;
}

function ensurePageCapacity(doc: jsPDF, y: number, requiredHeight: number) {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + requiredHeight <= pageHeight - PAGE_MARGIN_BOTTOM) return y;

  doc.addPage();
  return PAGE_MARGIN_TOP;
}

function drawDecorations(doc: jsPDF, x: number, baselineY: number, width: number, marks: TextMarks, fontSize: number) {
  const fontHeightMm = fontSize * MM_PER_PT;

  if (marks.underline) {
    const underlineY = baselineY + fontHeightMm * 0.12;
    doc.setLineWidth(0.2);
    doc.line(x, underlineY, x + width, underlineY);
  }

  if (marks.strike) {
    const strikeY = baselineY - fontHeightMm * 0.32;
    doc.setLineWidth(0.2);
    doc.line(x, strikeY, x + width, strikeY);
  }
}

function renderBodyBlock(doc: jsPDF, block: PdfBlock, startY: number, contentWidth: number) {
  if (block.type === 'blank') {
    return startY + BODY_LINE_HEIGHT;
  }

  const baseX = PAGE_MARGIN_X;
  const markerWidth =
    block.type === 'list-item'
      ? block.marker === '\u2022'
        ? UNORDERED_LIST_MARKER_WIDTH_MM
        : ORDERED_LIST_MARKER_WIDTH_MM
      : 0;
  const indentOffset = block.type === 'list-item' ? block.indentLevel * LIST_INDENT_MM : 0;
  const textX = baseX + indentOffset + (block.type === 'list-item' ? markerWidth + LIST_MARKER_GAP_MM : 0);
  const availableWidth = contentWidth - indentOffset - (block.type === 'list-item' ? markerWidth + LIST_MARKER_GAP_MM : 0);
  const lines = layoutFragmentsToLines(doc, block.fragments, availableWidth, BODY_FONT_SIZE);

  let y = startY;

  lines.forEach((line, index) => {
    y = ensurePageCapacity(doc, y, BODY_LINE_HEIGHT);
    const baselineY = y;

    if (block.type === 'list-item' && index === 0) {
      applyTextStyle(doc, DEFAULT_MARKS, BODY_FONT_SIZE);
      doc.text(block.marker, baseX + indentOffset + markerWidth, baselineY, { align: 'right' });
    }

    let cursorX = textX;
    line.segments.forEach((segment) => {
      if (!segment.text) return;
      applyTextStyle(doc, segment.marks, BODY_FONT_SIZE);
      doc.text(segment.text, cursorX, baselineY);
      drawDecorations(doc, cursorX, baselineY, segment.width, segment.marks, BODY_FONT_SIZE);
      cursorX += segment.width;
    });

    y += BODY_LINE_HEIGHT;
  });

  return y;
}

export async function generateJournalPdfBlob(
  dateDisplay: string,
  bodyHtml: string
): Promise<Blob> {
  const cleanBody = sanitizeJournalHtml(bodyHtml);
  const blocks = parseJournalBlocks(cleanBody);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - PAGE_MARGIN_X * 2;

  let y = PAGE_MARGIN_TOP;

  applyTextStyle(doc, { ...DEFAULT_MARKS, bold: true }, DATE_FONT_SIZE);
  doc.text(dateDisplay, PAGE_MARGIN_X, y);
  y += DATE_FONT_SIZE * 0.352778 + DATE_GAP_AFTER;

  blocks.forEach((block, index) => {
    y = renderBodyBlock(doc, block, y, contentWidth);
    if (index < blocks.length - 1 && block.type !== 'blank') {
      y += BLOCK_GAP;
    }
  });

  return doc.output('blob');
}
