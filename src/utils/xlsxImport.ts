import * as XLSX from 'xlsx';
import { uniqueCodes } from './pulseiras';

export interface XlsxPulseiraRow {
  codigo: string;
  nome: string;
  sheetName: string;
  rowNumber: number;
}

export interface XlsxColumnOption {
  key: string;
  label: string;
  index: number;
}

export interface XlsxImportResult {
  rows: XlsxPulseiraRow[];
  pulseiraColumn: string | null;
  nomeColumn: string | null;
  sheetNames: string[];
  columns: XlsxColumnOption[];
}

interface ParseSheetDataOptions {
  selectedPulseiraColumnKey?: string | null;
  selectedNomeColumnKey?: string | null;
}

const BLOCKED_ROW_PHRASES = [
  'pulseira eletronica retirada',
  'pulseira eletrónica retirada',
  'pulseira electronica retirada',
  'pulseira electrnica retirada',
  'retirada',
];

const PULSEIRA_CANDIDATES = [
  'pulseira',
  'codigo pulseira',
  'código pulseira',
  'cod pulseira',
  'bracelet',
  'bracelete',
  'cc',
  'id pulseira',
  'n pulseira',
  'nº pulseira',
  'numero pulseira',
  'número pulseira',
  'dispositivo',
  'codigo',
  'código',
];

const NAME_CANDIDATES = [
  'nome do acusado',
  'nome acusado',
  'acusado',
  'nome completo',
  'nome',
  'arguido',
  'suspeito',
  'jogador',
  'name',
];

function normalizeHeader(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cellToString(value: unknown) {
  return String(value ?? '').trim();
}

function normalizeText(value: unknown) {
  return cellToString(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function rowContainsBlockedPhrase(row: unknown[]) {
  const rowText = row.map((cell) => normalizeText(cell)).join(' | ');
  return BLOCKED_ROW_PHRASES.some((phrase) => rowText.includes(phrase));
}

function isValidPulseiraCode(value: string) {
  return value.length >= 5 && /[A-Z]/.test(value) && /\d/.test(value);
}

function isValidManualPulseiraCode(value: string) {
  return value.length >= 3 && !['LOCPULSEIRA', 'KEYBOARD'].includes(value);
}

function extractCode(value: unknown, isManualSelection = false) {
  const text = cellToString(value).toUpperCase();
  if (!text) return '';

  const locMatch = text.match(/LOCPULSEIRA\s+([A-Z0-9]{3,})/);
  if (locMatch?.[1]) {
    const candidate = locMatch[1].replace(/[^A-Z0-9]/g, '');
    if (isManualSelection ? isValidManualPulseiraCode(candidate) : isValidPulseiraCode(candidate)) {
      return candidate;
    }
  }

  const compact = text.replace(/LOCPULSEIRA/g, '').replace(/[^A-Z0-9]/g, '');
  if (compact) {
    const compactIsValid = isManualSelection
      ? isValidManualPulseiraCode(compact)
      : isValidPulseiraCode(compact);
    if (compactIsValid) return compact;
  }

  const matches = text.match(/[A-Z0-9]{3,}/g) ?? [];
  const cleaned = matches
    .map((item) => item.replace(/[^A-Z0-9]/g, ''))
    .filter((item) => {
      const validator = isManualSelection ? isValidManualPulseiraCode : isValidPulseiraCode;
      return validator(item) && item !== 'LOCPULSEIRA' && item !== 'KEYBOARD';
    });

  if (cleaned.length === 0) return '';
  return cleaned.sort((a, b) => b.length - a.length)[0];
}

function normalizeName(value: unknown) {
  return cellToString(value);
}

function isLikelyCode(value: unknown) {
  return extractCode(value).length >= 5;
}

function isLikelyName(value: unknown) {
  const text = normalizeName(value);
  if (!text) return false;
  if (isLikelyCode(text)) return false;
  if (/^\d+$/.test(text)) return false;
  return text.length >= 3;
}

function findBestHeaderIndex(headers: string[], candidates: string[]) {
  const normalizedHeaders = headers.map((header, index) => ({
    index,
    original: header,
    normalized: normalizeHeader(header),
  }));

  const exactNomeDoAcusado = normalizedHeaders.find(
    (header) => header.normalized === 'nome do acusado'
  );
  if (exactNomeDoAcusado && candidates.includes('nome do acusado')) {
    return exactNomeDoAcusado.index;
  }

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeHeader(candidate);
    const found = normalizedHeaders.find((header) => header.normalized === normalizedCandidate);
    if (found) return found.index;
  }

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeHeader(candidate);
    const found = normalizedHeaders.find((header) => header.normalized.includes(normalizedCandidate));
    if (found) return found.index;
  }

  return null;
}

function findHeaderRow(data: unknown[][]) {
  let bestRowIndex = -1;
  let bestScore = -1;
  let bestHeaders: string[] = [];

  const maxRowsToScan = Math.min(data.length, 25);

  for (let rowIndex = 0; rowIndex < maxRowsToScan; rowIndex += 1) {
    const row = data[rowIndex] ?? [];
    const headers = row.map((cell) => cellToString(cell));
    const nonEmptyCount = headers.filter(Boolean).length;
    if (nonEmptyCount === 0) continue;

    const pulseiraIndex = findBestHeaderIndex(headers, PULSEIRA_CANDIDATES);
    const nomeIndex = findBestHeaderIndex(headers, NAME_CANDIDATES);

    let score = nonEmptyCount > 1 ? 1 : 0;
    if (pulseiraIndex !== null) score += 8;
    if (nomeIndex !== null) score += 5;

    if (score > bestScore) {
      bestScore = score;
      bestRowIndex = rowIndex;
      bestHeaders = headers;
    }
  }

  if (bestRowIndex < 0 || bestScore < 3) {
    return { rowIndex: 0, headers: [] as string[] };
  }

  return { rowIndex: bestRowIndex, headers: bestHeaders };
}

function inferPulseiraColumnIndex(data: unknown[][], startRow: number, maxCols: number) {
  let bestIndex: number | null = null;
  let bestScore = 0;

  for (let columnIndex = 0; columnIndex < maxCols; columnIndex += 1) {
    let score = 0;

    for (let rowIndex = startRow; rowIndex < Math.min(data.length, startRow + 80); rowIndex += 1) {
      const value = data[rowIndex]?.[columnIndex];
      if (isLikelyCode(value)) score += 1;
    }

    if (score > bestScore) {
      bestScore = score;
      bestIndex = columnIndex;
    }
  }

  return bestScore >= 1 ? bestIndex : null;
}

function inferNameColumnIndex(
  data: unknown[][],
  startRow: number,
  maxCols: number,
  pulseiraColumnIndex: number | null
) {
  let bestIndex: number | null = null;
  let bestScore = 0;

  for (let columnIndex = 0; columnIndex < maxCols; columnIndex += 1) {
    if (columnIndex === pulseiraColumnIndex) continue;

    let score = 0;

    for (let rowIndex = startRow; rowIndex < Math.min(data.length, startRow + 80); rowIndex += 1) {
      const value = data[rowIndex]?.[columnIndex];
      if (isLikelyName(value)) score += 1;
    }

    if (pulseiraColumnIndex !== null && Math.abs(columnIndex - pulseiraColumnIndex) <= 2) {
      score += 2;
    }

    if (score > bestScore) {
      bestScore = score;
      bestIndex = columnIndex;
    }
  }

  return bestScore >= 2 ? bestIndex : null;
}

function makeDisplayHeaders(rawHeaders: string[], maxCols: number) {
  return Array.from({ length: maxCols }, (_, index) => rawHeaders[index] || `__EMPTY_${index}`);
}

function makeColumns(displayHeaders: string[]) {
  return displayHeaders.map((label, index) => ({
    key: `${index}:${label}`,
    label,
    index,
  }));
}

function parseSheetData(
  rawData: unknown[][],
  sheetName: string,
  options: ParseSheetDataOptions = {}
) {
  const { rowIndex: headerRowIndex, headers: detectedHeaders } = findHeaderRow(rawData);
  const maxCols = Math.max(...rawData.map((row) => row.length), 0);
  const displayHeaders = makeDisplayHeaders(detectedHeaders, maxCols);
  const columns = makeColumns(displayHeaders);

  let pulseiraColumnIndex = detectedHeaders.length > 0 ? findBestHeaderIndex(detectedHeaders, PULSEIRA_CANDIDATES) : null;
  let nomeColumnIndex = detectedHeaders.length > 0 ? findBestHeaderIndex(detectedHeaders, NAME_CANDIDATES) : null;
  const hasManualPulseiraSelection = Boolean(options.selectedPulseiraColumnKey);

  if (options.selectedPulseiraColumnKey) {
    const selected = columns.find((column) => column.key === options.selectedPulseiraColumnKey);
    if (selected) pulseiraColumnIndex = selected.index;
  }

  if (options.selectedNomeColumnKey) {
    const selected = columns.find((column) => column.key === options.selectedNomeColumnKey);
    if (selected) nomeColumnIndex = selected.index;
  }

  const dataStartRow = detectedHeaders.length > 0 ? headerRowIndex + 1 : 0;

  if (pulseiraColumnIndex === null) {
    pulseiraColumnIndex = inferPulseiraColumnIndex(rawData, dataStartRow, maxCols);
  }

  if (nomeColumnIndex === null) {
    nomeColumnIndex = inferNameColumnIndex(rawData, dataStartRow, maxCols, pulseiraColumnIndex);
  }

  const rows: XlsxPulseiraRow[] = [];

  if (pulseiraColumnIndex !== null) {
    for (let rowIndex = dataStartRow; rowIndex < rawData.length; rowIndex += 1) {
      const row = rawData[rowIndex] ?? [];
      if (rowContainsBlockedPhrase(row)) continue;

      const codigo = extractCode(row[pulseiraColumnIndex], hasManualPulseiraSelection);
      if (!codigo) continue;

      const nome = nomeColumnIndex !== null ? normalizeName(row[nomeColumnIndex]) : '';

      rows.push({
        codigo,
        nome,
        sheetName,
        rowNumber: rowIndex + 1,
      });
    }
  }

  return {
    rows,
    columns,
    pulseiraColumn: pulseiraColumnIndex !== null ? displayHeaders[pulseiraColumnIndex] : null,
    nomeColumn: nomeColumnIndex !== null ? displayHeaders[nomeColumnIndex] : null,
  };
}

export async function parseXlsxPulseiras(
  file: File,
  options: ParseSheetDataOptions = {}
): Promise<XlsxImportResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  const rows: XlsxPulseiraRow[] = [];
  let pulseiraColumn: string | null = null;
  let nomeColumn: string | null = null;
  let columns: XlsxColumnOption[] = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: '' });
    if (rawData.length === 0) continue;

    const parsed = parseSheetData(rawData, sheetName, options);

    if (columns.length === 0 && parsed.columns.length > 0) {
      columns = parsed.columns;
    }

    if (!pulseiraColumn && parsed.pulseiraColumn) pulseiraColumn = parsed.pulseiraColumn;
    if (!nomeColumn && parsed.nomeColumn) nomeColumn = parsed.nomeColumn;

    rows.push(...parsed.rows);
  }

  const uniqueRowCodes = uniqueCodes(rows.map((row) => row.codigo));
  const dedupedRows = uniqueRowCodes
    .map((codigo) => rows.find((row) => row.codigo === codigo))
    .filter((row): row is XlsxPulseiraRow => Boolean(row));

  return {
    rows: dedupedRows,
    pulseiraColumn,
    nomeColumn,
    sheetNames: workbook.SheetNames,
    columns,
  };
}
