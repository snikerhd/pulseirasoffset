import { useCallback, useRef, useState } from 'react';
import { Pulseira, LogEntry } from '../types';
import * as XLSX from 'xlsx';

interface ExcelImportProps {
  pulseiras: Pulseira[];
  setPulseiras: (p: Pulseira[] | ((prev: Pulseira[]) => Pulseira[])) => void;
  addLog: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  onClose: () => void;
}

type ExcelRow = { row: number; pulseira: string; nome: string };

function normalizeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || /^empty_\d+$/i.test(trimmed)) return '';
    return trimmed;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value).trim();

  if (typeof value === 'object') {
    const text = (value as { w?: string; text?: string }).w ?? (value as { text?: string }).text;
    if (typeof text === 'string') {
      const trimmed = text.trim();
      if (!trimmed || /^empty_\d+$/i.test(trimmed)) return '';
      return trimmed;
    }
  }

  return String(value).trim();
}

function extractPulseiraCode(value: unknown): string {
  const text = normalizeCell(value).toUpperCase();
  if (!text) return '';
  const match = text.match(/^([A-Z]{2,4}\d{3,6})$/);
  return match && match[1].length === 8 ? match[1] : '';
}

function detectColumns(rows: Record<string, unknown>[]): { pulseiraCol: string | null; nomeCol: string | null } {
  if (!rows.length) return { pulseiraCol: null, nomeCol: null };

  const cols = Object.keys(rows[0]);
  const headerLower = cols.map((c) => c.toLowerCase());
  const pulseiraHeaders = ['__empty_4', 'pulseira', 'codigo', 'código', 'code', 'id', 'tag', 'rfid'];
  const nomeHeaders = ['__empty_3', 'nome', 'name', 'acusado', 'pessoa', 'person', 'suspeito', 'suspect', 'jogador'];

  let pulseiraCol: string | null = null;
  let nomeCol: string | null = null;

  for (let i = 0; i < cols.length; i += 1) {
    const lower = headerLower[i];
    if (!pulseiraCol && pulseiraHeaders.some((k) => lower.includes(k))) pulseiraCol = cols[i];
    if (!nomeCol && nomeHeaders.some((k) => lower.includes(k))) nomeCol = cols[i];
  }

  if (!pulseiraCol || !nomeCol) {
    const sample = rows.slice(0, 5);
    for (const col of cols) {
      if (pulseiraCol && nomeCol) break;
      const values = sample.map((r) => normalizeCell(r[col])).filter(Boolean);
      if (!values.length) continue;

      if (!pulseiraCol) {
        const matchedLikePulseira = values.filter((v) => /^[A-Z]{2,4}\d{4}$/i.test(v)).length;
        if (matchedLikePulseira >= Math.ceil(sample.length / 2)) pulseiraCol = col;
      }
      if (!nomeCol) {
        const matchedLikeName = values.filter((v) => v.length > 2 && !/^[A-Z]{2,4}\d{4}$/i.test(v) && /[a-zA-ZÀ-ÿ]/.test(v)).length;
        if (matchedLikeName >= Math.ceil(sample.length / 2)) nomeCol = col;
      }
    }
  }

  return { pulseiraCol, nomeCol };
}

export default function ExcelImport({ pulseiras, setPulseiras, addLog, onClose }: ExcelImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [preview, setPreview] = useState<ExcelRow[]>([]);
  const [pulseiraCol, setPulseiraCol] = useState('');
  const [nomeCol, setNomeCol] = useState('');
  const [color, setColor] = useState('blue');
  const [step, setStep] = useState<'upload' | 'config'>('upload');

  const updatePreview = useCallback(
    (data: Record<string, unknown>[], pCol: string, nCol: string) => {
      const previewRows: ExcelRow[] = data.slice(0, 10).map((r, i) => ({
        row: i + 2,
        pulseira: pCol ? extractPulseiraCode(r[pCol]) : '',
        nome: nCol ? normalizeCell(r[nCol]) : '',
      }));
      setPreview(previewRows);
    },
    []
  );

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setFileName(file.name);
      const reader = new FileReader();

      reader.onload = (evt) => {
        try {
          const data = typeof evt.target?.result === 'string' ? evt.target.result : '';
          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheet = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheet];
          const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });

          if (!jsonData.length) {
            alert('O ficheiro Excel está vazio!');
            return;
          }

          const cols = Object.keys(jsonData[0]);
          setHeaders(cols);
          setRows(jsonData);

          const detected = detectColumns(jsonData);
          setPulseiraCol(detected.pulseiraCol ?? '');
          setNomeCol(detected.nomeCol ?? '');
          updatePreview(jsonData, detected.pulseiraCol ?? '', detected.nomeCol ?? '');
          setStep('config');
        } catch (err) {
          console.error(err);
          alert('Erro ao ler o ficheiro. Verifica se é um .xlsx válido.');
        }
      };

      reader.readAsBinaryString(file);
    },
    [updatePreview]
  );

  const handleColChange = (col: string, type: 'pulseira' | 'nome') => {
    if (type === 'pulseira') {
      setPulseiraCol(col);
      updatePreview(rows, col, nomeCol);
      return;
    }
    setNomeCol(col);
    updatePreview(rows, pulseiraCol, col);
  };

  const handleImport = () => {
    if (!pulseiraCol) {
      alert('Seleciona a coluna das PULSEIRAS!');
      return;
    }

    const novas: Pulseira[] = [];
    const duplicatas: string[] = [];
    const existentes = new Set(pulseiras.map((p) => p.codigo));
    let importadas = 0;

    for (let i = 0; i < rows.length; i += 1) {
      const r = rows[i];
      const pulseiraCode = extractPulseiraCode(r[pulseiraCol]);

      if (!pulseiraCode) continue;
      if (existentes.has(pulseiraCode)) {
        duplicatas.push(pulseiraCode);
        continue;
      }

      const nome = nomeCol ? normalizeCell(r[nomeCol]) : `Linha ${i + 2}`;

      existentes.add(pulseiraCode);
      novas.push({
        id: crypto.randomUUID(),
        codigo: pulseiraCode,
        descricao: nome,
        cor: color,
        createdAt: new Date().toISOString(),
        nomePessoa: nome,
      });
      importadas += 1;
    }

    if (importadas === 0 && duplicatas.length === 0) {
      alert('Nenhuma pulseira válida encontrada na coluna selecionada!');
      return;
    }

    setPulseiras((prev) => [...prev, ...novas]);
    addLog({
      type: 'add',
      message: `Excel importado: ${importadas} pulseiras${duplicatas.length > 0 ? ` (${duplicatas.length} duplicatas ignoradas)` : ''} de ${fileName}`,
    });

    onClose();
  };

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-sm flex items-center gap-2">📊 Importar do Excel (.xlsx)</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-sm">✕</button>
      </div>

      {step === 'upload' ? (
        <div className="space-y-3">
          <p className="text-gray-400 text-xs">
            Coloca num ficheiro Excel uma <strong className="text-white">coluna com códigos de pulseira</strong> (ex: PSS54950, HYE28866) e outra com os
            <strong className="text-white"> nomes das pessoas</strong>.
          </p>
          <div className="bg-gray-900/50 border border-dashed border-gray-600 rounded-xl p-6 text-center">
            <p className="text-gray-500 text-xs mb-3">Formato esperado:</p>
            <div className="inline-flex gap-4 text-xs font-mono">
              <div className="text-left">
                <p className="text-yellow-400 font-bold mb-1">Pulseira</p>
                <p className="text-gray-300">PSS54950</p>
                <p className="text-gray-300">HYE28866</p>
                <p className="text-gray-300">EIE58685</p>
              </div>
              <div className="text-left">
                <p className="text-blue-400 font-bold mb-1">Nome do Acusado</p>
                <p className="text-gray-300">João Silva</p>
                <p className="text-gray-300">Maria Santos</p>
                <p className="text-gray-300">Pedro Costa</p>
              </div>
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-lg font-medium text-sm transition-colors"
          >
            <span>📂</span> Selecionar Ficheiro Excel
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-gray-900/50 rounded-lg px-3 py-2 flex items-center justify-between">
            <span className="text-gray-300 text-xs truncate">📄 {fileName}</span>
            <span className="text-gray-500 text-xs">{rows.length} linhas encontradas</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-xs mb-1 block font-medium">📍 Coluna das PULSEIRAS *</label>
              <select
                value={pulseiraCol}
                onChange={(e) => handleColChange(e.target.value, 'pulseira')}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
              >
                <option value="">— Selecione —</option>
                {headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
              {pulseiraCol && <p className="text-green-400 text-xs mt-1">✅ Detetado como coluna de pulseiras</p>}
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block font-medium">👤 Coluna dos NOMES (opcional)</label>
              <select
                value={nomeCol}
                onChange={(e) => handleColChange(e.target.value, 'nome')}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">— Nenhuma / Não tem —</option>
                {headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
              {nomeCol && <p className="text-blue-400 text-xs mt-1">✅ Será guardado como nome da pessoa</p>}
            </div>
          </div>

          <div>
            <label className="text-gray-400 text-xs mb-1 block">Cor para importar:</label>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Azul', value: 'blue', class: 'bg-blue-500' },
                { label: 'Verde', value: 'green', class: 'bg-green-500' },
                { label: 'Vermelho', value: 'red', class: 'bg-red-500' },
                { label: 'Amarelo', value: 'yellow', class: 'bg-yellow-500' },
                { label: 'Roxo', value: 'purple', class: 'bg-purple-500' },
              ].map((c) => (
                <button
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    color === c.value ? 'border-white text-white bg-gray-600' : 'border-gray-600 text-gray-400'
                  }`}
                >
                  <span className={`w-3 h-3 rounded-full ${c.class}`}></span>{c.label}
                </button>
              ))}
            </div>
          </div>

          {preview.length > 0 && (
            <div>
              <p className="text-gray-400 text-xs mb-2">👁️ Preview das primeiras {preview.length} linhas:</p>
              <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-800">
                      <th className="px-3 py-2 text-left text-gray-400 font-medium">Linha</th>
                      <th className="px-3 py-2 text-left text-yellow-400 font-medium">Pulseira {pulseiraCol ? `(${pulseiraCol})` : ''}</th>
                      <th className="px-3 py-2 text-left text-blue-400 font-medium">Nome {nomeCol ? `(${nomeCol})` : ''}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((r, i) => (
                      <tr key={i} className={`border-t border-gray-700 ${r.pulseira ? '' : 'opacity-40'}`}>
                        <td className="px-3 py-2 text-gray-500">{r.row}</td>
                        <td className={`px-3 py-2 font-mono ${r.pulseira ? 'text-green-400' : 'text-red-400'}`}>{r.pulseira || '(vazio)'}</td>
                        <td className="px-3 py-2 text-white">{r.nome || '(sem nome)'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > 10 && <p className="text-gray-500 text-xs mt-1">... e mais {rows.length - 10} linhas</p>}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleImport}
              disabled={!pulseiraCol}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              📥 Importar {rows.length} Linhas
            </button>
            <button
              onClick={() => {
                setStep('upload');
                setFileName('');
                setHeaders([]);
                setRows([]);
                setPreview([]);
              }}
              className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              ← Voltar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
