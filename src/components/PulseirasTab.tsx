import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { LogEntry, ProfileEntry, Pulseira } from '../types';
import {
  buildLocPulseiraCommands,
  chunkCodes,
  MAX_PULSEIRAS_PER_COMMAND,
  parsePulseiraCodes,
} from '../utils/pulseiras';
import { parseXlsxPulseiras, type XlsxImportResult } from '../utils/xlsxImport';

interface PulseirasTabProps {
  pulseiras: Pulseira[];
  setPulseiras: (p: Pulseira[] | ((prev: Pulseira[]) => Pulseira[])) => void;
  profiles: ProfileEntry[];
  setProfiles: (p: ProfileEntry[] | ((prev: ProfileEntry[]) => ProfileEntry[])) => void;
  addLog: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;
}

/* Default import color: blue */

const corClasse: Record<string, string> = {
  blue: 'border-blue-500 text-blue-400 bg-blue-900/20',
  green: 'border-green-500 text-green-400 bg-green-900/20',
  red: 'border-red-500 text-red-400 bg-red-900/20',
  yellow: 'border-yellow-500 text-yellow-400 bg-yellow-900/20',
  purple: 'border-purple-500 text-purple-400 bg-purple-900/20',
  pink: 'border-pink-500 text-pink-400 bg-pink-900/20',
  orange: 'border-orange-500 text-orange-400 bg-orange-900/20',
  gray: 'border-gray-400 text-gray-300 bg-gray-700/20',
};

const corBadge: Record<string, string> = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  red: 'bg-red-500',
  yellow: 'bg-yellow-500',
  purple: 'bg-purple-500',
  pink: 'bg-pink-500',
  orange: 'bg-orange-500',
  gray: 'bg-gray-400',
};

export default function PulseirasTab({
  pulseiras,
  setPulseiras,
  profiles,
  setProfiles,
  addLog,
}: PulseirasTabProps) {
  const [codigo, setCodigo] = useState('');
  const [descricao, setDescricao] = useState('');
  
  const [busca, setBusca] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [importText, setImportText] = useState('');
  const [importProfileName, setImportProfileName] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [copyPage, setCopyPage] = useState(0);
  const [profilePages, setProfilePages] = useState<Record<string, number>>({});
  const [xlsxPreview, setXlsxPreview] = useState<XlsxImportResult | null>(null);
  const [xlsxFileName, setXlsxFileName] = useState('');
  const [xlsxFile, setXlsxFile] = useState<File | null>(null);
  const [isReadingXlsx, setIsReadingXlsx] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedXlsxPulseiraColumn, setSelectedXlsxPulseiraColumn] = useState('');
  const [selectedXlsxNomeColumn, setSelectedXlsxNomeColumn] = useState('');

  const parsedImportCodes = useMemo(() => parsePulseiraCodes(importText), [importText]);

  const showMessage = (message: string) => {
    setStatusMessage(message);
    window.setTimeout(() => setStatusMessage(''), 2800);
  };

  const handleAdd = () => {
    const codigoFinal = codigo.trim().toUpperCase();
    if (!codigoFinal) return;

    if (pulseiras.find((p) => p.codigo === codigoFinal)) {
      alert('Já existe uma pulseira com este código!');
      return;
    }

    const nova: Pulseira = {
      id: crypto.randomUUID(),
      codigo: codigoFinal,
      descricao: descricao.trim() || codigoFinal,
      cor: 'blue',
      createdAt: new Date().toISOString(),
    };

    setPulseiras((prev) => [...prev, nova]);
    addLog({
      type: 'add',
      message: `Pulseira adicionada: ${codigoFinal}`,
      codigo: codigoFinal,
    });

    setCodigo('');
    setDescricao('');
    setShowForm(false);
  };

  const removePulseirasByCodes = (codes: string[], sourceLabel: string) => {
    const uniqueCodes = Array.from(new Set(codes.filter(Boolean)));
    if (uniqueCodes.length === 0) return;

    const confirmMessage =
      uniqueCodes.length === 1
        ? `Remover pulseira ${uniqueCodes[0]}?`
        : `Remover ${uniqueCodes.length} pulseiras (${sourceLabel})?`;

    if (!confirm(confirmMessage)) return;

    const codeSet = new Set(uniqueCodes);

    setPulseiras((prev) => prev.filter((p) => !codeSet.has(p.codigo)));
    setSelectedCodes((prev) => prev.filter((code) => !codeSet.has(code)));
    setProfiles((prev) =>
      prev.map((profile) => ({
        ...profile,
        codigos: profile.codigos.filter((code) => !codeSet.has(code)),
      }))
    );

    if (uniqueCodes.length === 1) {
      addLog({
        type: 'remove',
        message: `Pulseira removida: ${uniqueCodes[0]}`,
        codigo: uniqueCodes[0],
      });
      showMessage(`Pulseira ${uniqueCodes[0]} removida.`);
      return;
    }

    addLog({
      type: 'remove',
      message: `${uniqueCodes.length} pulseiras removidas (${sourceLabel})`,
    });
    showMessage(`${uniqueCodes.length} pulseiras removidas com sucesso.`);
  };

  const handleRemove = (pulseira: Pulseira) => {
    removePulseirasByCodes([pulseira.codigo], pulseira.codigo);
  };

  const handleLocate = (pulseira: Pulseira) => {
    const cmd = `locpulseira ${pulseira.codigo}`;
    navigator.clipboard.writeText(cmd);
    setCopied(pulseira.id);
    setTimeout(() => setCopied(null), 2000);
    addLog({
      type: 'locate',
      message: `Comando copiado: ${cmd}`,
      codigo: pulseira.codigo,
    });
  };

  const toggleSelect = (codigoPulseira: string) => {
    setSelectedCodes((prev) =>
      prev.includes(codigoPulseira)
        ? prev.filter((code) => code !== codigoPulseira)
        : [...prev, codigoPulseira]
    );
  };

  const filtradas = pulseiras.filter(
    (p) =>
      p.codigo.toLowerCase().includes(busca.toLowerCase()) ||
      p.descricao.toLowerCase().includes(busca.toLowerCase())
  );

  // Copy groups logic
  const copySourceCodes = selectedCodes.length > 0
    ? selectedCodes
    : pulseiras.map((p) => p.codigo);

  const copySourceLabel = selectedCodes.length > 0
    ? `${selectedCodes.length} selecionadas`
    : `Todas (${pulseiras.length})`;

  const copyGroups = useMemo(
    () => chunkCodes(copySourceCodes),
    [copySourceCodes]
  );

  const safeCopyPage = Math.min(copyPage, Math.max(copyGroups.length - 1, 0));
  const currentCopyPageCodes = copyGroups[safeCopyPage] ?? [];

  useEffect(() => {
    if (copyPage >= copyGroups.length && copyGroups.length > 0) {
      setCopyPage(copyGroups.length - 1);
    }
  }, [copyGroups.length, copyPage]);

  const handleCopyPage = () => {
    if (currentCopyPageCodes.length === 0) return;
    const commands = buildLocPulseiraCommands(currentCopyPageCodes, ';');
    navigator.clipboard.writeText(commands);
    addLog({
      type: 'copy',
      message: `Página ${safeCopyPage + 1} copiada: ${currentCopyPageCodes.length} pulseiras`,
    });
    showMessage(`Página ${safeCopyPage + 1} copiada com ${currentCopyPageCodes.length} pulseiras.`);
  };

  const handleImportText = () => {
    if (parsedImportCodes.length === 0) {
      alert('Nenhum código encontrado no texto!');
      return;
    }

    const existingCodes = new Set(pulseiras.map((p) => p.codigo));
    let added = 0;
    let duplicates = 0;
    const newPulseiras: Pulseira[] = [];

    for (const code of parsedImportCodes) {
      if (existingCodes.has(code)) {
        duplicates++;
        continue;
      }
      existingCodes.add(code);
      newPulseiras.push({
        id: crypto.randomUUID(),
        codigo: code,
        descricao: code,
        cor: 'blue',
        createdAt: new Date().toISOString(),
      });
      added++;
    }

    if (newPulseiras.length > 0) {
      setPulseiras((prev) => [...prev, ...newPulseiras]);
    }

    // Create profile if name provided
    if (importProfileName.trim() || parsedImportCodes.length > 0) {
      const profileName = importProfileName.trim() || `Importado ${new Date().toLocaleDateString('pt-PT')}`;
      const profile: ProfileEntry = {
        id: crypto.randomUUID(),
        nome: profileName,
        codigos: parsedImportCodes,
        createdAt: new Date().toISOString(),
        source: 'import',
      };
      setProfiles((prev) => [...prev, profile]);
    }

    addLog({
      type: 'add',
      message: `Importadas ${added} pulseiras${duplicates > 0 ? `, ${duplicates} duplicatas ignoradas` : ''}`,
    });

    showMessage(`${added} pulseiras importadas${duplicates > 0 ? `, ${duplicates} duplicatas` : ''}.`);
    setImportText('');
    setImportProfileName('');
    setShowImport(false);
  };

  const handleXlsxFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setXlsxFile(file);
    setXlsxFileName(file.name);
    setIsReadingXlsx(true);
    setSelectedXlsxPulseiraColumn('');
    setSelectedXlsxNomeColumn('');

    try {
      const result = await parseXlsxPulseiras(file);
      setXlsxPreview(result);
    } catch (err) {
      console.error(err);
      alert('Erro ao ler o ficheiro XLSX.');
      setXlsxPreview(null);
    } finally {
      setIsReadingXlsx(false);
    }
  };

  const handleReprocessXlsx = async () => {
    if (!xlsxFile) return;
    setIsReadingXlsx(true);
    try {
      const result = await parseXlsxPulseiras(xlsxFile, {
        selectedPulseiraColumnKey: selectedXlsxPulseiraColumn || null,
        selectedNomeColumnKey: selectedXlsxNomeColumn || null,
      });
      setXlsxPreview(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsReadingXlsx(false);
    }
  };

  useEffect(() => {
    if (selectedXlsxPulseiraColumn || selectedXlsxNomeColumn) {
      handleReprocessXlsx();
    }
  }, [selectedXlsxPulseiraColumn, selectedXlsxNomeColumn]);

  const handleImportXlsx = () => {
    if (!xlsxPreview || xlsxPreview.rows.length === 0) {
      alert('Nenhuma pulseira encontrada no ficheiro!');
      return;
    }

    const existingCodes = new Set(pulseiras.map((p) => p.codigo));
    let added = 0;
    let duplicates = 0;
    const newPulseiras: Pulseira[] = [];

    for (const row of xlsxPreview.rows) {
      if (existingCodes.has(row.codigo)) {
        duplicates++;
        continue;
      }
      existingCodes.add(row.codigo);
      newPulseiras.push({
        id: crypto.randomUUID(),
        codigo: row.codigo,
        descricao: row.nome || row.codigo,
        cor: 'blue',
        createdAt: new Date().toISOString(),
      });
      added++;
    }

    if (newPulseiras.length > 0) {
      setPulseiras((prev) => [...prev, ...newPulseiras]);
    }

    const profileName = importProfileName.trim() || `XLSX ${xlsxFileName}`;
    const profile: ProfileEntry = {
      id: crypto.randomUUID(),
      nome: profileName,
      codigos: xlsxPreview.rows.map((r) => r.codigo),
      createdAt: new Date().toISOString(),
      source: 'import',
    };
    setProfiles((prev) => [...prev, profile]);

    addLog({
      type: 'add',
      message: `XLSX importado: ${added} pulseiras de ${xlsxFileName}${duplicates > 0 ? `, ${duplicates} duplicatas` : ''}`,
    });

    showMessage(`${added} pulseiras importadas do XLSX.`);
    setXlsxPreview(null);
    setXlsxFileName('');
    setXlsxFile(null);
    setImportProfileName('');
    setShowImport(false);
  };

  const handleRemoveAll = () => {
    if (pulseiras.length === 0) return;
    removePulseirasByCodes(
      pulseiras.map((p) => p.codigo),
      'todas'
    );
  };

  const handleRemoveSelected = () => {
    if (selectedCodes.length === 0) return;
    removePulseirasByCodes(selectedCodes, 'selecionadas');
  };

  const handleSelectAll = () => {
    if (selectedCodes.length === pulseiras.length) {
      setSelectedCodes([]);
    } else {
      setSelectedCodes(pulseiras.map((p) => p.codigo));
    }
  };

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="bg-amber-900/20 border border-amber-800 rounded-xl p-4">
        <p className="text-amber-300 text-sm font-medium mb-1">📚 Grupos automáticos de {MAX_PULSEIRAS_PER_COMMAND}</p>
        <p className="text-gray-400 text-xs">
          Agora as pulseiras ficam organizadas por <strong className="text-white">páginas de {MAX_PULSEIRAS_PER_COMMAND}</strong>.
          Se tiveres 20 pulseiras, a página 1 copia {MAX_PULSEIRAS_PER_COMMAND} e a página 2 copia as restantes.
        </p>
      </div>

      <div className="flex flex-col xl:flex-row gap-4">
        {/* Search + Actions */}
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Pesquisar pulseiras..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg pl-9 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {showForm ? '✕ Fechar' : '➕ Nova'}
            </button>
            <button
              onClick={() => setShowImport(!showImport)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {showImport ? '✕ Fechar' : '📥 Importar'}
            </button>
            <button
              onClick={() => setDeleteMode(!deleteMode)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                deleteMode
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              🗑️ {deleteMode ? 'Sair' : 'Apagar'}
            </button>
            {pulseiras.length > 0 && (
              <>
                <button
                  onClick={handleSelectAll}
                  className="px-3 py-2 bg-gray-800 text-gray-400 hover:text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {selectedCodes.length === pulseiras.length ? '☑️ Desselecionar' : '☐ Selecionar'}
                </button>
                {selectedCodes.length > 0 && (
                  <button
                    onClick={handleRemoveSelected}
                    className="px-3 py-2 bg-red-900/30 text-red-400 hover:bg-red-900/50 rounded-lg text-sm font-medium transition-colors"
                  >
                    🗑️ Remover {selectedCodes.length}
                  </button>
                )}
                <button
                  onClick={handleRemoveAll}
                  className="px-3 py-2 bg-red-900/30 text-red-400 hover:bg-red-900/50 rounded-lg text-sm font-medium transition-colors"
                >
                  🗑️ Todas
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Copy groups section */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <p className="text-white font-semibold text-sm">Grupos de cópia</p>
            <p className="text-gray-500 text-xs">
              Fonte atual: <strong className="text-white">{copySourceLabel}</strong>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 items-start">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1">
              {copyGroups.length === 0 ? (
                <span className="text-xs text-gray-500">Sem pulseiras para dividir em páginas.</span>
              ) : (
                copyGroups.map((group, index) => (
                  <button
                    key={index}
                    onClick={() => setCopyPage(index)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      safeCopyPage === index
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    Página {index + 1} ({group.length})
                  </button>
                ))
              )}
            </div>

            {currentCopyPageCodes.length > 0 && (
              <div className="rounded-lg border border-gray-700 bg-gray-950 p-3 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-gray-500">
                    Página {safeCopyPage + 1} de {copyGroups.length} · {currentCopyPageCodes.length} pulseiras
                  </p>
                  <button
                    onClick={handleCopyPage}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors"
                  >
                    📋 Copiar
                  </button>
                </div>
                <code className="block text-green-400 text-xs font-mono whitespace-pre-wrap break-all max-h-28 overflow-y-auto">
                  {buildLocPulseiraCommands(currentCopyPageCodes, ';')}
                </code>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 min-w-[170px]">
            <p className="text-gray-500 text-xs">Resumo</p>
            <p className="text-white text-lg font-bold mt-1">{copySourceCodes.length}</p>
            <p className="text-gray-500 text-xs">pulseiras nesta fonte</p>
            <p className="text-purple-400 text-sm font-semibold mt-3">{copyGroups.length}</p>
            <p className="text-gray-500 text-xs">páginas de cópia</p>
          </div>
        </div>

        {deleteMode && (
          <div className="bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
            <p className="text-red-400 text-xs">
              Modo apagar ativo: usa os botões vermelhos para remover mais rapidamente as pulseiras.
            </p>
          </div>
        )}

        {statusMessage && (
          <div className="bg-green-900/20 border border-green-800 rounded-lg px-3 py-2">
            <p className="text-green-400 text-xs">{statusMessage}</p>
          </div>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-gray-800 border border-gray-600 rounded-xl p-5 space-y-4">
          <h3 className="text-white font-semibold text-sm">Nova Pulseira</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Código *</label>
              <input
                type="text"
                placeholder="Ex: PSS54950"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm font-mono"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Descrição (opcional)</label>
              <input
                type="text"
                placeholder="Ex: João Silva"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>
          </div>
          <div className="rounded-lg border border-blue-900 bg-blue-950/30 px-3 py-2">
            <p className="text-blue-300 text-xs font-medium">Cor fixa ativa</p>
            <p className="text-gray-400 text-xs mt-1">Todas as pulseiras são guardadas automaticamente a azul claro.</p>
          </div>
          <button
            onClick={handleAdd}
            className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            ✅ Adicionar Pulseira
          </button>
        </div>
      )}

      {/* Import section */}
      {showImport && (
        <div className="bg-gray-800 border border-amber-700 rounded-xl p-5 space-y-5">
          <div>
            <h3 className="text-white font-semibold text-sm">Importar perfil partilhado</h3>
            <p className="text-gray-500 text-xs mt-1">
              Podes importar de duas formas: colar comandos <span className="font-mono text-green-400">locpulseira ...</span>
              {' '}ou enviar um ficheiro <span className="text-white">XLSX/XLS</span> com colunas como
              <span className="text-white"> pulseira</span>, <span className="text-white">CC</span> e
              <span className="text-white"> nome do acusado</span>.
            </p>
          </div>

          <div>
            <label className="text-gray-400 text-xs mb-1 block">Nome do perfil (opcional)</label>
            <input
              type="text"
              value={importProfileName}
              onChange={(e) => setImportProfileName(e.target.value)}
              placeholder="ex: Perfil Staff Noite"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Text import */}
            <div className="space-y-3">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Texto colado</label>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="locpulseira PSS54950;locpulseira HYE28866&#10;ou&#10;PSS54950&#10;HYE28866"
                  rows={5}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 text-sm font-mono"
                />
                {parsedImportCodes.length > 0 && (
                  <p className="text-amber-400 text-xs mt-1">
                    {parsedImportCodes.length} código(s) detetado(s)
                  </p>
                )}
              </div>
              <button
                onClick={handleImportText}
                disabled={parsedImportCodes.length === 0}
                className="w-full px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                📥 Importar Texto ({parsedImportCodes.length} códigos)
              </button>
            </div>

            {/* XLSX import */}
            <div className="space-y-3">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Ficheiro XLSX/XLS</label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleXlsxFileChange}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm file:mr-3 file:bg-gray-600 file:text-white file:border-0 file:rounded file:px-3 file:py-1 file:text-xs"
                />
              </div>

              {isReadingXlsx && (
                <p className="text-amber-400 text-xs">⏳ A ler o ficheiro...</p>
              )}

              {xlsxPreview && (
                <div className="space-y-3">
                  <div className="bg-gray-900 rounded-lg p-3">
                    <p className="text-white text-xs font-medium">📄 {xlsxFileName}</p>
                    <p className="text-gray-500 text-xs">{xlsxPreview.rows.length} linhas encontradas</p>
                  </div>

                  {/* Column selection */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-gray-400 text-xs mb-1 block">📍 Coluna das PULSEIRAS *</label>
                      <select
                        value={selectedXlsxPulseiraColumn}
                        onChange={(e) => setSelectedXlsxPulseiraColumn(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Auto-detetar</option>
                        {xlsxPreview.columns.map((col) => (
                          <option key={col.key} value={col.key}>
                            {col.label}
                          </option>
                        ))}
                      </select>
                      {xlsxPreview.pulseiraColumn && (
                        <p className="text-green-400 text-xs mt-1">✅ Detetado como coluna de pulseiras</p>
                      )}
                    </div>
                    <div>
                      <label className="text-gray-400 text-xs mb-1 block">👤 Coluna dos NOMES (opcional)</label>
                      <select
                        value={selectedXlsxNomeColumn}
                        onChange={(e) => setSelectedXlsxNomeColumn(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Auto-detetar</option>
                        {xlsxPreview.columns.map((col) => (
                          <option key={col.key} value={col.key}>
                            {col.label}
                          </option>
                        ))}
                      </select>
                      {xlsxPreview.nomeColumn && (
                        <p className="text-green-400 text-xs mt-1">✅ Será guardado como nome da pessoa</p>
                      )}
                    </div>
                  </div>

                  {/* Preview */}
                  {xlsxPreview.rows.length > 0 && (
                    <div className="bg-gray-950 rounded-lg p-3 max-h-40 overflow-y-auto">
                      <p className="text-gray-400 text-xs mb-2">
                        👁️ Preview das primeiras {Math.min(xlsxPreview.rows.length, 10)} linhas:
                      </p>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-gray-500">
                            <th className="text-left py-1">Linha</th>
                            <th className="text-left py-1">Pulseira</th>
                            <th className="text-left py-1">Nome</th>
                          </tr>
                        </thead>
                        <tbody>
                          {xlsxPreview.rows.slice(0, 10).map((r, i) => (
                            <tr key={i} className="border-t border-gray-800">
                              <td className="py-1 text-gray-600">{r.rowNumber}</td>
                              <td className="py-1 text-green-400 font-mono">{r.codigo || '(vazio)'}</td>
                              <td className="py-1 text-gray-300">{r.nome || '(sem nome)'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {xlsxPreview.rows.length > 10 && (
                        <p className="text-gray-600 text-xs mt-2">
                          ... e mais {xlsxPreview.rows.length - 10} linhas
                        </p>
                      )}
                    </div>
                  )}

                  <button
                    onClick={handleImportXlsx}
                    disabled={xlsxPreview.rows.length === 0}
                    className="w-full px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    📥 Importar XLSX ({xlsxPreview.rows.length} pulseiras)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pulseiras list */}
      {filtradas.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">⌚</p>
          <p className="text-gray-400 font-medium">
            {pulseiras.length === 0 ? 'Nenhuma pulseira guardada' : 'Sem resultados'}
          </p>
          <p className="text-gray-600 text-sm mt-1">
            {pulseiras.length === 0
              ? 'Adiciona pulseiras com o botão + Nova ou importa um perfil'
              : 'Tenta outra pesquisa'}
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtradas.map((pulseira) => {
            const isSelected = selectedCodes.includes(pulseira.codigo);
            return (
              <div
                key={pulseira.id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-900/20'
                    : corClasse[pulseira.cor] || corClasse.blue
                }`}
              >
                <button
                  onClick={() => toggleSelect(pulseira.codigo)}
                  className={`w-5 h-5 rounded border flex items-center justify-center text-xs transition-colors ${
                    isSelected
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'border-gray-600 text-transparent hover:border-gray-400'
                  }`}
                >
                  ✓
                </button>

                <div className={`w-2.5 h-2.5 rounded-full ${corBadge[pulseira.cor] || corBadge.blue}`} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-mono font-bold text-sm">{pulseira.codigo}</span>
                    {pulseira.descricao !== pulseira.codigo && (
                      <span className="text-gray-500 text-xs truncate">— {pulseira.descricao}</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleLocate(pulseira)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      copied === pulseira.id
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-700 text-gray-400 hover:text-white'
                    }`}
                    title="Copiar locpulseira"
                  >
                    {copied === pulseira.id ? '✅' : '📍'}
                  </button>
                  {deleteMode && (
                    <button
                      onClick={() => handleRemove(pulseira)}
                      className="px-2.5 py-1 bg-red-900/40 text-red-400 hover:bg-red-900/60 rounded-lg text-xs font-medium transition-colors"
                      title="Remover"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Profiles section */}
      {profiles.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
          <h3 className="text-white font-semibold text-sm">📦 Perfis Guardados</h3>
          <div className="space-y-2">
            {profiles.map((profile) => {
              const profileCopyGroups = chunkCodes(profile.codigos);
              const profilePageIndex = profilePages[profile.id] ?? 0;
              const safeProfilePage = Math.min(profilePageIndex, Math.max(profileCopyGroups.length - 1, 0));
              const profilePageCodes = profileCopyGroups[safeProfilePage] ?? [];

              return (
                <div
                  key={profile.id}
                  className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium text-sm">{profile.nome}</p>
                      <p className="text-gray-500 text-xs">
                        {profile.codigos.length} pulseiras · {profile.source === 'import' ? 'Importado' : 'Manual'} ·{' '}
                        {new Date(profile.createdAt).toLocaleDateString('pt-PT')}
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => {
                          const existingCodes = new Set(pulseiras.map((p) => p.codigo));
                          const novas: Pulseira[] = [];
                          for (const code of profile.codigos) {
                            if (existingCodes.has(code)) continue;
                            existingCodes.add(code);
                            novas.push({
                              id: crypto.randomUUID(),
                              codigo: code,
                              descricao: code,
                              cor: 'blue',
                              createdAt: new Date().toISOString(),
                            });
                          }
                          if (novas.length > 0) {
                            setPulseiras((prev) => [...prev, ...novas]);
                            addLog({
                              type: 'add',
                              message: `Perfil "${profile.nome}": ${novas.length} pulseiras adicionadas`,
                            });
                            showMessage(`${novas.length} pulseiras do perfil adicionadas.`);
                          } else {
                            showMessage('Todas as pulseiras do perfil já existem.');
                          }
                        }}
                        className="px-3 py-1 bg-green-900/30 text-green-400 hover:bg-green-900/50 rounded-lg text-xs font-medium transition-colors"
                      >
                        ➕ Adicionar
                      </button>
                      <button
                        onClick={() => {
                          const commands = buildLocPulseiraCommands(profilePageCodes, ';');
                          navigator.clipboard.writeText(commands);
                          addLog({
                            type: 'copy',
                            message: `Perfil "${profile.nome}" página ${safeProfilePage + 1} copiada`,
                          });
                          showMessage(`Página ${safeProfilePage + 1} do perfil copiada.`);
                        }}
                        className="px-3 py-1 bg-blue-900/30 text-blue-400 hover:bg-blue-900/50 rounded-lg text-xs font-medium transition-colors"
                      >
                        📋 Copiar Pág {safeProfilePage + 1}
                      </button>
                      <button
                        onClick={() => {
                          if (!confirm(`Remover perfil "${profile.nome}"?`)) return;
                          setProfiles((prev) => prev.filter((p) => p.id !== profile.id));
                          addLog({ type: 'remove', message: `Perfil removido: "${profile.nome}"` });
                        }}
                        className="px-3 py-1 bg-red-900/30 text-red-400 hover:bg-red-900/50 rounded-lg text-xs font-medium transition-colors"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Profile page navigation */}
                  {profileCopyGroups.length > 1 && (
                    <div className="flex flex-wrap gap-1">
                      {profileCopyGroups.map((_g, idx) => (
                        <button
                          key={idx}
                          onClick={() => setProfilePages((prev) => ({ ...prev, [profile.id]: idx }))}
                          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                            safeProfilePage === idx
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-700 text-gray-400 hover:text-white'
                          }`}
                        >
                          Pág {idx + 1} ({profileCopyGroups[idx].length})
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1">
                    {profilePageCodes.map((code) => (
                      <span key={code} className="px-2 py-0.5 bg-gray-700 text-green-400 text-xs font-mono rounded">
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
