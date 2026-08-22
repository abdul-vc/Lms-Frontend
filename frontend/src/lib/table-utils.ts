export interface StructuredTableData {
  headers: string[];
  rows: string[][];
}

function escapeHtml(str: string): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Robust CSV and Markdown Table Parser (RFC 4180 compliant for CSV)
 */
export function parseCsvToTable(rawText: string): StructuredTableData {
  const clean = (rawText || "").trim();
  if (!clean) {
    return {
      headers: ["Column 1", "Column 2", "Column 3"],
      rows: [["", "", ""], ["", "", ""]],
    };
  }

  // 1. Check if input is Markdown table syntax (| Header 1 | Header 2 |)
  if (clean.includes("|")) {
    const lines = clean.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const mdTableLines = lines.filter(l => l.startsWith("|") && l.endsWith("|"));
    if (mdTableLines.length >= 1) {
      const nonSeparatorLines = mdTableLines.filter(l => !l.match(/^\|(?:\s*:?-+:?\s*\|)+$/));
      if (nonSeparatorLines.length > 0) {
        const parsedRows = nonSeparatorLines.map(line =>
          line
            .slice(1, -1)
            .split("|")
            .map(c => c.trim())
        );
        const headers = parsedRows[0].length > 0 ? parsedRows[0] : ["Column 1"];
        const dataRows = parsedRows.slice(1);
        const maxCols = Math.max(headers.length, ...dataRows.map(r => r.length), 1);
        const normalizedHeaders = Array.from({ length: maxCols }, (_, i) => headers[i] || `Column ${i + 1}`);
        const normalizedRows = (dataRows.length > 0 ? dataRows : [new Array(maxCols).fill("")]).map(r =>
          Array.from({ length: maxCols }, (_, i) => r[i] || "")
        );
        return { headers: normalizedHeaders, rows: normalizedRows };
      }
    }
  }

  // 2. RFC 4180 CSV parsing
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const nextChar = clean[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentCell += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentCell.trim());
        currentCell = "";
      } else if (char === '\n' || char === '\r') {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        currentRow.push(currentCell.trim());
        if (currentRow.some(c => c.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = "";
      } else if (char === '\t' && !clean.includes(',')) {
        currentRow.push(currentCell.trim());
        currentCell = "";
      } else {
        currentCell += char;
      }
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some(c => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  if (rows.length === 0) {
    return {
      headers: ["Column 1", "Column 2", "Column 3"],
      rows: [["", "", ""], ["", "", ""]],
    };
  }

  const rawHeaders = rows[0];
  const maxCols = Math.max(rawHeaders.length, ...rows.map(r => r.length), 1);
  const headers = Array.from({ length: maxCols }, (_, idx) => rawHeaders[idx] || `Column ${idx + 1}`);

  const dataRows = rows.slice(1).map(r => {
    return Array.from({ length: maxCols }, (_, idx) => r[idx] || "");
  });

  return {
    headers,
    rows: dataRows.length > 0 ? dataRows : [new Array(maxCols).fill("")],
  };
}

/**
 * Converts structured table data back into CSV string
 */
export function tableToCsv(data: StructuredTableData): string {
  const escapeCell = (val: string) => {
    const v = String(val ?? "");
    if (v.includes(',') || v.includes('"') || v.includes('\n') || v.includes('\r')) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };
  const headerLine = data.headers.map(escapeCell).join(',');
  const rowLines = data.rows.map(r => r.map(escapeCell).join(','));
  return [headerLine, ...rowLines].join('\n');
}

/**
 * Generates semantic HTML table markup from structured data
 */
export function generateTableHtml(data: StructuredTableData): string {
  const ths = data.headers
    .map(
      h =>
        `<th class="px-4 py-3 text-xs font-bold uppercase tracking-wider text-foreground border-b border-border bg-muted/60 whitespace-normal break-words">${escapeHtml(
          h
        )}</th>`
    )
    .join('');

  const trs = data.rows
    .map(row => {
      const tds = row
        .map(
          cell =>
            `<td class="px-4 py-3 text-xs sm:text-sm text-foreground/90 border-b border-border/40 whitespace-normal break-words">${escapeHtml(
              cell
            )}</td>`
        )
        .join('');
      return `<tr class="hover:bg-muted/20 transition-colors">${tds}</tr>`;
    })
    .join('');

  return `<div class="w-full overflow-x-auto rounded-xl border border-border bg-card/60 shadow-sm my-2 min-w-0 max-w-full"><table class="w-full text-left border-collapse min-w-full"><thead><tr class="border-b border-border">${ths}</tr></thead><tbody class="divide-y divide-border/40">${trs}</tbody></table></div>`;
}
