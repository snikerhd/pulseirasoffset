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

const CORES = [
  { label: 'Azul', value: 'blue', class: 'bg-blue-500' },
  { label: 'Verde', value: 'green', class: 'bg-green-500' },
  { label: 'Vermelho', value: 'red', class: 'bg-red-500' },
  { label: 'Amarelo', value: 'yellow', class: 'bg-yellow-500' },
  { label: 'Roxo', value: 'purple', class: 'bg-purple-500' },
  { label: 'Rosa', value: 'pink', class: 'bg-pink-500' },
  { label: 'Laranja', value: 'orange', class: 'bg-orange-500' },
  { label: 'Cinza', value: 'gray', class: 'bg-gray-400' },
];

const AUTO_IMPORT_COLORS = ['blue', 'green', 'purple', 'orange', 'pink', 'gray'];

const corClass: Record<string, string> = {
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
  const [cor, setCor] = useState('blue');
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
  const [isReadingXlsx, setIsReadingXlsx] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);

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
      cor,
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
    setCor('blue');
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

  const copySourceCodes = useMemo(() => {
    if (selectedCodes.length > 0) return selectedCodes;
    return filtradas.map((p) => p.codigo);
  }, [filtradas, selectedCodes]);

  const copyGroups = useMemo(() => chunkCodes(copySourceCodes, MAX_PULSEIRAS_PER_COMMAND), [copySourceCodes]);

  useEffect(() => {
    if (copyGroups.length === 0) {
      setCopyPage(0);
      return;
    }

    setCopyPage((prev) => Math.min(prev, copyGroups.length - 1));
  }, [copyGroups.length]);

  const currentCopyPageCodes = copyGroups[copyPage] ?? [];
  const copySourceLabel =
    selectedCodes.length > 0
      ? `seleção manual (${selectedCodes.length})`
      : busca.trim()
        ? `resultados da pesquisa (${filtradas.length})`
        : `todas as pulseiras (${pulseiras.length})`;

  const handleCopyPage = (pageIndex: number) => {
    const pageCodes = copyGroups[pageIndex] ?? [];
    if (pageCodes.length === 0) return;

    const command = buildLocPulseiraCommands(pageCodes, ';');
    navigator.clipboard.writeText(command);
    setCopyPage(pageIndex);

    addLog({
      type: 'copy',
      message: `Página ${pageIndex + 1}/${copyGroups.length} copiada (${pageCodes.length} pulseiras)`,
    });

    showMessage(`Copiada a página ${pageIndex + 1} com ${pageCodes.length} pulseiras.`);
  };

  const handleSelectVisible = () => {
    const visibleCodes = filtradas.map((p) => p.codigo);
    setSelectedCodes((prev) => Array.from(new Set([...prev, ...visibleCodes])));
    showMessage(`${visibleCodes.length} pulseiras visíveis adicionadas à seleção.`);
  };

  const handleDeleteSelected = () => {
    removePulseirasByCodes(selectedCodes, 'seleção manual');
  };

  const handleDeleteVisible = () => {
    removePulseirasByCodes(
      filtradas.map((p) => p.codigo),
      busca.trim() ? 'resultados da pesquisa' : 'pulseiras visíveis'
    );
  };

  const handleUseProfile = (profile: ProfileEntry) => {
    setSelectedCodes(Array.from(new Set(profile.codigos)));
    setCopyPage(0);
    showMessage(`Perfil "${profile.nome}" carregado com ${profile.codigos.length} pulseiras.`);
  };

  const handleDeleteProfile = (profile: ProfileEntry) => {
    if (!confirm(`Apagar o perfil ${profile.nome}?`)) return;
    setProfiles((prev) => prev.filter((item) => item.id !== profile.id));
    addLog({ type: 'profile', message: `Perfil removido: ${profile.nome}` });
  };

  const handleSaveSelectionAsProfile = () => {
    const sourceCodes = copySourceCodes;
    if (sourceCodes.length === 0) {
      alert('Não há pulseiras para guardar num perfil.');
      return;
    }

    const nome = window.prompt('Nome do perfil:', `Perfil ${new Date().toLocaleDateString('pt-PT')}`)?.trim();
    if (!nome) return;

    const novoPerfil: ProfileEntry = {
      id: crypto.randomUUID(),
      nome,
      codigos: Array.from(new Set(sourceCodes)),
      createdAt: new Date().toISOString(),
      source: selectedCodes.length > 0 ? 'manual' : 'import',
    };

    setProfiles((prev) => [novoPerfil, ...prev]);
    addLog({ type: 'profile', message: `Perfil guardado: ${nome} (${novoPerfil.codigos.length} pulseiras)` });
    showMessage(`Perfil "${nome}" guardado com ${novoPerfil.codigos.length} pulseiras.`);
  };

  const upsertImportedPulseiras = (entries: { codigo: string; nome?: string }[]) => {
    const existingCodes = new Set(pulseiras.map((p) => p.codigo));
    const importedMap = new Map(entries.map((entry) => [entry.codigo, entry.nome?.trim() ?? '']));
    const importedCodes = Array.from(new Set(entries.map((entry) => entry.codigo)));
    const newCodes = importedCodes.filter((code) => !existingCodes.has(code));

    setPulseiras((prev) => {
      const updated = prev.map((pulseira) => {
        const importedName = importedMap.get(pulseira.codigo)?.trim();
        if (!importedName) return pulseira;
        return { ...pulseira, descricao: importedName };
      });

      const novasPulseiras: Pulseira[] = newCodes.map((code, index) => ({
        id: crypto.randomUUID(),
        codigo: code,
        descricao: importedMap.get(code)?.trim() || code,
        cor: AUTO_IMPORT_COLORS[index % AUTO_IMPORT_COLORS.length],
        createdAt: new Date().toISOString(),
      }));

      return [...updated, ...novasPulseiras];
    });

    return { importedCodes, newCodes };
  };

  const handleXlsxFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsReadingXlsx(true);

    try {
      const parsed = await parseXlsxPulseiras(file);
      setXlsxPreview(parsed);
      setXlsxFileName(file.name);

      if (parsed.rows.length === 0) {
        showMessage('O XLSX foi lido, mas não encontrei uma coluna de pulseira válida.');
      } else {
        showMessage(`XLSX lido com sucesso: ${parsed.rows.length} pulseiras encontradas.`);
      }
    } catch (error) {
      console.error(error);
      setXlsxPreview(null);
      setXlsxFileName('');
      alert('Não foi possível ler o ficheiro XLSX. Verifica se o ficheiro está correto.');
    } finally {
      setIsReadingXlsx(false);
      event.target.value = '';
    }
  };

  const handleImportXlsxProfile = () => {
    if (!xlsxPreview || xlsxPreview.rows.length === 0) {
      alert('Primeiro escolhe um ficheiro XLSX válido.');
      return;
    }

    const nomePerfil =
      importProfileName.trim() ||
      xlsxFileName.replace(/\.(xlsx|xls)$/i, '').trim() ||
      `Perfil XLSX ${new Date().toLocaleDateString('pt-PT')}`;

    const { importedCodes, newCodes } = upsertImportedPulseiras(xlsxPreview.rows);

    const novoPerfil: ProfileEntry = {
      id: crypto.randomUUID(),
      nome: nomePerfil,
      codigos: importedCodes,
      createdAt: new Date().toISOString(),
      source: 'import',
    };

    setProfiles((prev) => [novoPerfil, ...prev]);
    setSelectedCodes(importedCodes);
    setCopyPage(0);

    addLog({
      type: 'profile',
      message: `Perfil XLSX importado: ${nomePerfil} (${importedCodes.length} pulseiras, ${newCodes.length} novas)`,
    });

    setImportProfileName('');
    setXlsxPreview(null);
    setXlsxFileName('');
    setShowImport(false);

    showMessage(
      `XLSX importado: ${importedCodes.length} pulseiras e ${Math.max(
        1,
        Math.ceil(importedCodes.length / MAX_PULSEIRAS_PER_COMMAND)
      )} páginas criadas.`
    );
  };

  const handleImportProfile = () => {
    if (parsedImportCodes.length === 0) {
      alert('Não encontrei pulseiras válidas no texto colado.');
      return;
    }

    const nomePerfil = importProfileName.trim() || `Perfil Partilhado ${new Date().toLocaleDateString('pt-PT')}`;
    const existingCodes = new Set(pulseiras.map((p) => p.codigo));
    const newCodes = parsedImportCodes.filter((code) => !existingCodes.has(code));

    if (newCodes.length > 0) {
      const novasPulseiras: Pulseira[] = newCodes.map((code, index) => ({
        id: crypto.randomUUID(),
        codigo: code,
        descricao: code,
        cor: AUTO_IMPORT_COLORS[index % AUTO_IMPORT_COLORS.length],
        createdAt: new Date().toISOString(),
      }));

      setPulseiras((prev) => [...prev, ...novasPulseiras]);
    }

    const novoPerfil: ProfileEntry = {
      id: crypto.randomUUID(),
      nome: nomePerfil,
      codigos: parsedImportCodes,
      createdAt: new Date().toISOString(),
      source: 'import',
    };

    setProfiles((prev) => [novoPerfil, ...prev]);
    setSelectedCodes(parsedImportCodes);
    setCopyPage(0);

    addLog({
      type: 'profile',
      message: `Perfil importado: ${nomePerfil} (${parsedImportCodes.length} pulseiras, ${newCodes.length} novas)`,
    });

    setImportText('');
    setImportProfileName('');
    setShowImport(false);

    showMessage(
      `Perfil criado com ${parsedImportCodes.length} pulseiras e dividido em ${Math.max(
        1,
        Math.ceil(parsedImportCodes.length / MAX_PULSEIRAS_PER_COMMAND)
      )} páginas.`
    );
  };

  const handleProfilePageChange = (profileId: string, nextPage: number, totalPages: number) => {
    setProfilePages((prev) => ({
      ...prev,
      [profileId]: Math.min(Math.max(nextPage, 0), Math.max(totalPages - 1, 0)),
    }));
  };

  const handleCopyProfilePage = (profile: ProfileEntry, pageIndex: number) => {
    const pages = chunkCodes(profile.codigos, MAX_PULSEIRAS_PER_COMMAND);
    const pageCodes = pages[pageIndex] ?? [];
    if (pageCodes.length === 0) return;

    navigator.clipboard.writeText(buildLocPulseiraCommands(pageCodes, ';'));
    setProfilePages((prev) => ({ ...prev, [profile.id]: pageIndex }));

    addLog({
      type: 'copy',
      message: `Perfil ${profile.nome}: página ${pageIndex + 1}/${pages.length} copiada (${pageCodes.length})`,
    });

    showMessage(`Perfil "${profile.nome}" — copiada a página ${pageIndex + 1} com ${pageCodes.length} pulseiras.`);
  };

  return (
    <div className="space-y-4">
      <div className="bg-amber-900/20 border border-amber-800 rounded-xl p-4">
        <p className="text-amber-300 text-sm font-medium mb-1">📚 Grupos automáticos de 18</p>
        <p className="text-gray-400 text-xs">
          Agora as pulseiras ficam organizadas por <strong className="text-white">páginas de {MAX_PULSEIRAS_PER_COMMAND}</strong>.
          Se tiveres 20 pulseiras, a página 1 copia 18 e a página 2 copia as 2 restantes.
        </p>
      </div>

      <div className="flex flex-col xl:flex-row gap-4">
        <div className="flex-1 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
              <input
                type="text"
                placeholder="Pesquisar pulseira ou nome..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg pl-9 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-colors"
            >
              <span>➕</span> Nova Pulseira
            </button>
            <button
              onClick={() => setShowImport(!showImport)}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-colors"
            >
              <span>📥</span> Importar Perfil
            </button>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div>
                <p className="text-white font-semibold text-sm">Grupos de cópia</p>
                <p className="text-gray-500 text-xs">
                  Fonte atual: <strong className="text-white">{copySourceLabel}</strong>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleSelectVisible}
                  disabled={filtradas.length === 0}
                  className="bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-gray-200 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                >
                  Selecionar visíveis
                </button>
                <button
                  onClick={() => setSelectedCodes([])}
                  disabled={selectedCodes.length === 0}
                  className="bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-gray-300 px-3 py-2 rounded-lg text-xs font-medium transition-colors border border-gray-700"
                >
                  Limpar seleção
                </button>
                <button
                  onClick={() => setDeleteMode((prev) => !prev)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${
                    deleteMode
                      ? 'bg-red-600 border-red-500 text-white'
                      : 'bg-red-950/40 border-red-900 text-red-300 hover:bg-red-900/40'
                  }`}
                >
                  {deleteMode ? '🛑 Modo apagar ativo' : '🗑️ Modo apagar'}
                </button>
                <button
                  onClick={handleDeleteSelected}
                  disabled={selectedCodes.length === 0}
                  className="bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                >
                  Eliminar selecionadas ({selectedCodes.length})
                </button>
                <button
                  onClick={handleDeleteVisible}
                  disabled={filtradas.length === 0}
                  className="bg-red-950/60 hover:bg-red-900/70 disabled:opacity-40 disabled:cursor-not-allowed text-red-200 px-3 py-2 rounded-lg text-xs font-medium transition-colors border border-red-900"
                >
                  Eliminar visíveis ({filtradas.length})
                </button>
                <button
                  onClick={() => handleCopyPage(copyPage)}
                  disabled={currentCopyPageCodes.length === 0}
                  className="bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                >
                  📋 Copiar página {copyGroups.length > 0 ? copyPage + 1 : 0}
                </button>
                <button
                  onClick={handleSaveSelectionAsProfile}
                  disabled={copySourceCodes.length === 0}
                  className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                >
                  💾 Guardar Perfil
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 items-start">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {copyGroups.length === 0 ? (
                    <span className="text-xs text-gray-500">Sem pulseiras para dividir em páginas.</span>
                  ) : (
                    copyGroups.map((group, index) => (
                      <button
                        key={`copy-page-${index}`}
                        onClick={() => setCopyPage(index)}
                        className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                          copyPage === index
                            ? 'border-purple-500 bg-purple-600 text-white'
                            : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500'
                        }`}
                      >
                        Página {index + 1} · {group.length}
                      </button>
                    ))
                  )}
                </div>

                {currentCopyPageCodes.length > 0 && (
                  <div className="rounded-lg border border-gray-700 bg-gray-950 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-gray-500">
                        Página {copyPage + 1} de {copyGroups.length} · {currentCopyPageCodes.length} pulseiras
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setCopyPage((prev) => Math.max(prev - 1, 0))}
                          disabled={copyPage === 0}
                          className="px-2.5 py-1 rounded-md bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs text-gray-300"
                        >
                          ←
                        </button>
                        <button
                          onClick={() => setCopyPage((prev) => Math.min(prev + 1, copyGroups.length - 1))}
                          disabled={copyPage >= copyGroups.length - 1}
                          className="px-2.5 py-1 rounded-md bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs text-gray-300"
                        >
                          →
                        </button>
                      </div>
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
              <div className="rounded-lg border border-red-800 bg-red-900/20 px-3 py-2 text-xs text-red-300">
                Modo apagar ativo: usa os botões vermelhos para remover mais rapidamente as pulseiras.
              </div>
            )}

            {statusMessage && (
              <div className="rounded-lg border border-blue-800 bg-blue-900/20 px-3 py-2 text-xs text-blue-300">
                {statusMessage}
              </div>
            )}
          </div>

          {showForm && (
            <div className="bg-gray-800 border border-gray-600 rounded-xl p-5 space-y-4">
              <h3 className="text-white font-semibold text-sm">Nova Pulseira</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Código *</label>
                  <input
                    type="text"
                    placeholder="ex: PSS54950"
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
                    placeholder="ex: Jogador Principal"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-2 block">Cor</label>
                <div className="flex flex-wrap gap-2">
                  {CORES.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setCor(c.value)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        cor === c.value
                          ? 'border-white text-white bg-gray-600'
                          : 'border-gray-600 text-gray-400 hover:border-gray-400'
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-full ${c.class}`}></span>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleAdd}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Adicionar
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-5 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

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
                <div className="space-y-3">
                  <div>
                    <label className="text-gray-400 text-xs mb-1 block">Texto colado</label>
                    <textarea
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                      rows={6}
                      placeholder={'locpulseira HYE28866;locpulseira PFB75791;locpulseira EIE58685'}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 text-sm font-mono resize-none"
                    />
                  </div>

                  <div className="rounded-lg border border-gray-700 bg-gray-900/70 p-3">
                    <p className="text-gray-500 text-xs mb-1">Detetadas no texto</p>
                    <p className="text-sm text-white">
                      {parsedImportCodes.length > 0 ? `${parsedImportCodes.length} pulseiras encontradas` : 'Nenhuma pulseira detetada ainda'}
                    </p>
                    {parsedImportCodes.length > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        Isto vai criar {Math.max(1, Math.ceil(parsedImportCodes.length / MAX_PULSEIRAS_PER_COMMAND))} páginas de cópia.
                      </p>
                    )}
                  </div>

                  <button
                    onClick={handleImportProfile}
                    disabled={parsedImportCodes.length === 0}
                    className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    Importar do texto
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-gray-400 text-xs mb-1 block">Ficheiro Excel (.xlsx, .xls)</label>
                    <label className="flex items-center justify-center w-full min-h-32 cursor-pointer rounded-xl border border-dashed border-amber-700 bg-gray-900/50 px-4 py-5 text-center hover:bg-gray-900 transition-colors">
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        className="hidden"
                        onChange={handleXlsxFileChange}
                      />
                      <div>
                        <p className="text-white text-sm font-medium">{isReadingXlsx ? 'A ler ficheiro Excel...' : 'Clicar para escolher ficheiro XLSX/XLS'}</p>
                        <p className="text-gray-500 text-xs mt-1">
                          Exemplo de colunas: pulseira / CC / nome do acusado
                        </p>
                        {xlsxFileName && <p className="text-amber-300 text-xs mt-2">Ficheiro: {xlsxFileName}</p>}
                      </div>
                    </label>
                  </div>

                  <div className="rounded-lg border border-gray-700 bg-gray-900/70 p-3 space-y-2">
                    <p className="text-gray-500 text-xs">Leitura do Excel</p>
                    {xlsxPreview ? (
                      <>
                        <p className="text-sm text-white">{xlsxPreview.rows.length} pulseiras encontradas no Excel</p>
                        <div className="text-xs text-gray-400 space-y-1">
                          <p>Folhas: <span className="text-white">{xlsxPreview.sheetNames.join(', ')}</span></p>
                          <p>Coluna pulseira/CC: <span className="text-white">{xlsxPreview.pulseiraColumn ?? 'não encontrada'}</span></p>
                          <p>Coluna nome: <span className="text-white">{xlsxPreview.nomeColumn ?? 'não encontrada'}</span></p>
                        </div>
                        {xlsxPreview.rows.length > 0 && (
                          <div className="rounded-lg border border-gray-800 bg-gray-950 p-2 max-h-28 overflow-y-auto space-y-1">
                            {xlsxPreview.rows.slice(0, 5).map((row) => (
                              <div key={`${row.sheetName}-${row.rowNumber}-${row.codigo}`} className="text-xs">
                                <span className="font-mono text-green-400">{row.codigo}</span>
                                <span className="text-gray-500"> — </span>
                                <span className="text-white">{row.nome || 'Sem nome'}</span>
                              </div>
                            ))}
                            {xlsxPreview.rows.length > 5 && (
                              <p className="text-xs text-gray-500">+ {xlsxPreview.rows.length - 5} linhas adicionais</p>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-gray-500">Ainda não foi carregado nenhum ficheiro Excel.</p>
                    )}
                  </div>

                  <button
                    onClick={handleImportXlsxProfile}
                    disabled={!xlsxPreview || xlsxPreview.rows.length === 0}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    Importar do Excel
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowImport(false)}
                  className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-5 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          )}

          {filtradas.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <div className="text-5xl mb-3">⌚</div>
              <p className="text-lg font-medium text-gray-400">
                {busca ? 'Nenhuma pulseira encontrada' : 'Nenhuma pulseira adicionada'}
              </p>
              <p className="text-sm mt-1">
                {busca ? 'Tenta outro código ou descrição' : 'Clica em "Nova Pulseira" para começar'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtradas.map((p) => {
                const isSelected = selectedCodes.includes(p.codigo);

                return (
                  <div
                    key={p.id}
                    className={`border rounded-xl px-4 py-3 transition-all hover:border-gray-500 ${
                      deleteMode ? 'ring-1 ring-red-900/40' : ''
                    } ${corClass[p.cor] || corClass.blue}`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <button
                          onClick={() => toggleSelect(p.codigo)}
                          className={`w-5 h-5 rounded-md border flex items-center justify-center text-[10px] transition-all flex-shrink-0 ${
                            isSelected
                              ? 'border-emerald-400 bg-emerald-500 text-white'
                              : 'border-gray-500 hover:border-white text-transparent'
                          }`}
                          title={isSelected ? 'Remover da seleção' : 'Selecionar para grupos de cópia'}
                        >
                          ✓
                        </button>

                        <span className={`w-3 h-3 rounded-full flex-shrink-0 ${corBadge[p.cor] || corBadge.blue}`}></span>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 min-w-0">
                            <span className="font-mono font-bold text-white text-sm truncate">{p.codigo}</span>
                            <span className="text-gray-500 text-xs">
                              {new Date(p.createdAt).toLocaleDateString('pt-PT')}
                            </span>
                          </div>
                          <p className="text-gray-400 text-xs truncate mt-0.5">
                            {p.descricao !== p.codigo ? p.descricao : 'Sem nome associado'}
                          </p>
                          <div className="bg-gray-900/60 rounded-lg px-3 py-2 font-mono text-xs text-gray-300 mt-2 border border-gray-700 overflow-x-auto">
                            locpulseira {p.codigo}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        <button
                          onClick={() => handleLocate(p)}
                          className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                            copied === p.id ? 'bg-green-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                          }`}
                        >
                          {copied === p.id ? '✅ Copiado!' : '📋 Copiar'}
                        </button>
                        <button
                          onClick={() => toggleSelect(p.codigo)}
                          className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                            isSelected
                              ? 'bg-emerald-600 text-white'
                              : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-600'
                          }`}
                        >
                          {isSelected ? 'Selecionada' : 'Selecionar'}
                        </button>
                        <button
                          onClick={() => handleRemove(p)}
                          className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${
                            deleteMode
                              ? 'bg-red-600 hover:bg-red-500 text-white border-red-500 shadow-lg shadow-red-900/30'
                              : 'bg-red-900/30 hover:bg-red-900/60 text-red-400 border-red-900'
                          }`}
                          title="Remover"
                        >
                          🗑️ {deleteMode ? 'Apagar já' : 'Remover'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <aside className="xl:w-[370px] space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold text-sm">👥 Perfis Partilhados</h3>
              <span className="text-xs text-gray-500">{profiles.length}</span>
            </div>
            <p className="text-gray-500 text-xs">
              Cada perfil é dividido automaticamente em páginas de {MAX_PULSEIRAS_PER_COMMAND}. Podes copiar qualquer página separadamente.
            </p>
          </div>

          {profiles.length === 0 ? (
            <div className="bg-gray-900 border border-dashed border-gray-800 rounded-xl p-5 text-center text-gray-500 text-sm">
              Ainda não tens perfis. Importa um texto partilhado ou guarda uma seleção.
            </div>
          ) : (
            profiles.map((profile) => {
              const pages = chunkCodes(profile.codigos, MAX_PULSEIRAS_PER_COMMAND);
              const pageIndex = Math.min(profilePages[profile.id] ?? 0, Math.max(pages.length - 1, 0));
              const pageCodes = pages[pageIndex] ?? [];

              return (
                <div key={profile.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-white text-sm font-semibold truncate">{profile.nome}</p>
                      <p className="text-gray-500 text-xs">
                        {profile.source === 'import' ? 'Importado' : 'Manual'} • {profile.codigos.length} pulseiras • {pages.length} páginas
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteProfile(profile)}
                      className="text-gray-500 hover:text-red-400 transition-colors text-xs"
                      title="Apagar perfil"
                    >
                      🗑️
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {pages.map((page, index) => (
                      <button
                        key={`${profile.id}-page-${index}`}
                        onClick={() => handleProfilePageChange(profile.id, index, pages.length)}
                        className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${
                          pageIndex === index
                            ? 'border-blue-500 bg-blue-600 text-white'
                            : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500'
                        }`}
                      >
                        P{index + 1} · {page.length}
                      </button>
                    ))}
                  </div>

                  {pageCodes.length > 0 && (
                    <div className="rounded-lg bg-gray-950 border border-gray-800 p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-gray-500">
                          Página {pageIndex + 1} de {pages.length}
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleProfilePageChange(profile.id, pageIndex - 1, pages.length)}
                            disabled={pageIndex === 0}
                            className="px-2.5 py-1 rounded-md bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs text-gray-300"
                          >
                            ←
                          </button>
                          <button
                            onClick={() => handleProfilePageChange(profile.id, pageIndex + 1, pages.length)}
                            disabled={pageIndex >= pages.length - 1}
                            className="px-2.5 py-1 rounded-md bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs text-gray-300"
                          >
                            →
                          </button>
                        </div>
                      </div>
                      <code className="text-green-400 text-xs font-mono block whitespace-pre-wrap break-all max-h-24 overflow-y-auto">
                        {buildLocPulseiraCommands(pageCodes, ';')}
                      </code>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleUseProfile(profile)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                    >
                      Usar perfil
                    </button>
                    <button
                      onClick={() => handleCopyProfilePage(profile, pageIndex)}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                    >
                      📋 Copiar página {pageIndex + 1}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </aside>
      </div>
    </div>
  );
}
