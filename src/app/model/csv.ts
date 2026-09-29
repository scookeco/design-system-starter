/**
 * CSV in and out, for imports and error lists: RFC 4180 as spreadsheets write it (quoted fields,
 * doubled quotes, commas and line breaks inside quotes, CRLF or LF, a leading byte-order mark).
 * No library: the format is small, and the import's rules are ours.
 */

export interface ParsedCsv {
  /** The first row: column names, trimmed. */
  headers: string[];
  /** Every row after it, each padded or cut to the header's width. Blank lines are dropped. */
  rows: string[][];
}

/** Split text into rows of fields. Never throws: a stray quote is read as text. */
export const parseCsvRows = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const input = text.startsWith('﻿') ? text.slice(1) : text;
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"' && field === '') quoted = true;
    else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && input[i + 1] === '\n') i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += char;
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
};

/** Headers and rows. An empty file has no headers. */
export const parseCsv = (text: string): ParsedCsv => {
  const [head = [], ...body] = parseCsvRows(text);
  const headers = head.map((h) => h.trim());
  return { headers, rows: body.map((r) => headers.map((_, i) => r[i] ?? '')) };
};

const cell = (value: string) => (/[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value);

/** Rows back to CSV text, CRLF-separated as spreadsheets expect. */
export const toCsv = (rows: readonly (readonly string[])[]) => rows.map((r) => r.map(cell).join(',')).join('\r\n');
