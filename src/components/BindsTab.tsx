import { useMemo, useState } from 'react';
import { BindEntry, LogEntry, Pulseira } from '../types';
import {
  buildLocPulseiraCommands,
  chunkCodes,
  MAX_PULSEIRAS_PER_COMMAND,
} from '../utils/pulseiras';

interface BindsTabProps {
  pulseiras: Pulseira[];
  binds: BindEntry[];
  setBinds: (b: BindEntry[] | ((prev: BindEntry[]) => BindEntry[])) => void;
  addLog: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;
}

const NUMPAD_KEYS = [
  'NUMPAD0', 'NUMPAD1', 'NUMPAD2', 'NUMPAD3', 'NUMPAD4',
  'NUMPAD5', 'NUMPAD6', 'NUMPAD7', 'NUMPAD8', 'NUMPAD9',
  'NUMPADADD', 'NUMPADMINUS', 'NUMPADMUL', 'NUMPADDIV', 'NUMPADDECIMAL',
  'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
];

const BATCH_SEPARATORS = [
  { value: ';', label: 'Ponto e vírgula (;)' },
  { value: '\\n', label: 'Nova linha' },
  { value: ' && ', label: '&& (encadeado)' },
];

export default function BindsTab({ pulseiras, binds, setBinds, addLog }: BindsTabProps) {
  const [key, setKey] = useState('NUMPAD0');
  const [tipo, setTipo] = useState<'locpulseira' | 'custom'>('locpulseira');
  const [codigoPulseira, setCodigoPulseira] = useState('');
  const [descricao, setDescricao] = useState('');
  const [customCmd, setCustomCmd] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [batchKey, setBatchKey] = useState('NUMPAD0');
  const [batchSeparator, setBatchSeparator] = useState(';');
  const [selectedBatchCodes, setSelectedBatchCodes] = useState<string[]>([]);
  const [batchPage, setBatchPage] = useState(0);

  const usedKeys = binds.map((b) => b.key);

  const selectedCodes = useMemo(() => {
    if (selectedBatchCodes.length > 0) return selectedBatchCodes;
    return pulseiras.map((p) => p.codigo);
  }, [pulseiras, selectedBatchCodes]);

  const batchPages = useMemo(
    () => chunkCodes(selectedCodes, MAX_PULSEIRAS_PER_COMMAND),
    [selectedCodes]
  );
  const safeBatchPage = Math.min(batchPage, Math.max(batchPages.length - 1, 0));
  const currentBatchPageCodes = batchPages[safeBatchPage] ?? [];

  const getComando = () => {
    if (tipo === 'locpulseira') {
      return `locpulseira ${codigoPulseira.trim().toUpperCase()}`;
    }
    return customCmd.trim();
  };

  const getBindLine = (bind: BindEntry) => `bind keyboard ${bind.key} "${bind.comando}"`;

  const getBatchCommand = () => buildLocPulseiraCommands(currentBatchPageCodes, batchSeparator);

  const isKeyUsed = (targetKey: string) => binds.some((bind) => bind.key === targetKey);

  const handleAdd = () => {
    const codigo = codigoPulseira.trim().toUpperCase();
    const cmd = tipo === 'locpulseira' ? `locpulseira ${codigo}` : customCmd.trim();

    if (isKeyUsed(key)) {
      alert('Essa tecla já está em uso. Escolhe outra.');
      return;
    }

    if (!cmd || (tipo === 'locpulseira' && !codigo)) {
      alert('Preenche todos os campos!');
      return;
    }

    const nova: BindEntry = {
      id: crypto.randomUUID(),
      key,
      codigoPulseira: codigo,
      descricao: descricao.trim() || (tipo === 'locpulseira' ? `Localizar ${codigo}` : cmd),
      tipo,
      comando: cmd,
    };

    setBinds((prev) => [...prev, nova]);
    addLog({
      type: 'bind',
      message: `Bind criado: ${key} → ${cmd}`,
      codigo: tipo === 'locpulseira' ? codigo : undefined,
    });

    setCodigoPulseira('');
    setDescricao('');
    setCustomCmd('');
    setShowForm(false);
  };

  const handleCreateBatchBind = () => {
    if (pulseiras.length === 0) {
      alert('Primeiro adiciona pulseiras para criar o bind com todas.');
      return;
    }

    if (isKeyUsed(batchKey)) {
      alert('Essa tecla já está em uso. Escolhe outra.');
      return;
    }

    if (selectedCodes.length === 0 || currentBatchPageCodes.length === 0) {
      alert('Seleciona pelo menos uma pulseira ou uma página válida.');
      return;
    }

    const comando = getBatchCommand();
    const quantidade = currentBatchPageCodes.length;
    const paginaAtual = safeBatchPage + 1;
    const totalPaginas = Math.max(batchPages.length, 1);

    const novo: BindEntry = {
      id: crypto.randomUUID(),
      key: batchKey,
      codigoPulseira:
        quantidade === 1 ? currentBatchPageCodes[0] : `${quantidade} pulseiras · página ${paginaAtual}`,
      descricao: `Localizar ${quantidade} pulseiras (página ${paginaAtual}/${totalPaginas})`,
      tipo: 'custom',
      comando,
    };

    setBinds((prev) => [...prev, novo]);
    addLog({
      type: 'bind',
      message: `Bind em lote criado: ${batchKey} → página ${paginaAtual}/${totalPaginas} com ${quantidade} pulseiras`,
    });

    setSelectedBatchCodes([]);
    setBatchSeparator(';');
    setBatchPage(0);
  };

  const handleRemove = (bind: BindEntry) => {
    if (!confirm(`Remover bind ${bind.key}?`)) return;
    setBinds((prev) => prev.filter((b) => b.id !== bind.id));
  };

  const handleCopy = (bind: BindEntry) => {
    const line = getBindLine(bind);
    navigator.clipboard.writeText(line);
    setCopied(bind.id);
    setTimeout(() => setCopied(null), 2000);
    addLog({ type: 'copy', message: `Bind copiado: ${line}` });
  };

  const handleCopyAll = () => {
    const lines = binds.map(getBindLine).join('\n');
    navigator.clipboard.writeText(lines);
    addLog({ type: 'copy', message: `Todos os binds copiados (${binds.length})` });
  };

  const handleExportCFG = () => {
    const lines = [
      '# FiveM Pulseiras Binds',
      `# Gerado em: ${new Date().toLocaleString('pt-PT')}`,
      '# Cola este conteúdo no F8 do FiveM ou no ficheiro autoexec.cfg',
      '',
      ...binds.map(getBindLine),
    ].join('\n');
    const blob = new Blob([lines], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pulseiras-binds.cfg';
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleBatchCode = (codigo: string) => {
    setSelectedBatchCodes((prev) =>
      prev.includes(codigo) ? prev.filter((item) => item !== codigo) : [...prev, codigo]
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <p className="text-gray-400 text-sm">
            Cria binds de teclado para executar comandos de pulseira no F8 do FiveM.
          </p>
        </div>
        {binds.length > 0 && (
          <>
            <button
              onClick={handleCopyAll}
              className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-colors"
            >
              📋 Copiar Todos
            </button>
            <button
              onClick={handleExportCFG}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-colors"
            >
              💾 Exportar .cfg
            </button>
          </>
        )}
      </div>

      <div className="bg-blue-900/20 border border-blue-800 rounded-xl p-4">
        <p className="text-blue-300 text-sm font-medium mb-1">💡 Como usar no FiveM</p>
        <p className="text-gray-400 text-xs">
          Copia o comando do bind e cola-o no <strong className="text-white">F8</strong> do FiveM.
          Para bind permanente, adiciona ao ficheiro{' '}
          <span className="font-mono text-yellow-400">%AppData%\CitizenFX\fivem.cfg</span> ou usa{' '}
          <strong className="text-white">Exportar .cfg</strong>.
        </p>
      </div>

      <div className="bg-purple-900/20 border border-purple-800 rounded-xl p-5 space-y-4">
        <div>
          <h3 className="text-white font-semibold text-sm">⚡ Bind com "Copiar Todos"</h3>
          <p className="text-gray-400 text-xs mt-1">
            Escolhe uma tecla e cria automaticamente um bind do tipo:
            <span className="font-mono text-green-400"> bind keyboard TECLA "locpulseira ...;locpulseira ..."</span>
            {' '}com limite de <strong className="text-white">{MAX_PULSEIRAS_PER_COMMAND}</strong> pulseiras por bind.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Tecla do bind *</label>
              <select
                value={batchKey}
                onChange={(e) => setBatchKey(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                {NUMPAD_KEYS.map((k) => (
                  <option key={k} value={k} disabled={usedKeys.includes(k)}>
                    {k} {usedKeys.includes(k) ? '(em uso)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-gray-400 text-xs mb-2 block">Página das pulseiras guardadas</label>
              {batchPages.length === 0 ? (
                <p className="text-gray-600 text-xs">
                  Ainda não existem páginas disponíveis.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {batchPages.map((_page, index) => (
                    <button
                      key={index}
                      onClick={() => setBatchPage(index)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        safeBatchPage === index
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-400 hover:text-white border border-gray-600'
                      }`}
                    >
                      Pág {index + 1} ({batchPages[index].length})
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-gray-400 text-xs mb-2 block">Separador dos comandos</label>
              <div className="flex flex-wrap gap-1">
                {BATCH_SEPARATORS.map((item) => (
                  <button
                    key={item.value}
                    onClick={() => setBatchSeparator(item.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      batchSeparator === item.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-400 hover:text-white border border-gray-600'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-gray-400 text-xs block">Pulseiras incluídas</label>
                <button
                  onClick={() => setSelectedBatchCodes([])}
                  className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
                >
                  Limpar
                </button>
              </div>
              <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 max-h-36 overflow-y-auto flex flex-wrap gap-2">
                {pulseiras.length === 0 ? (
                  <p className="text-gray-500 text-xs">Ainda não tens pulseiras guardadas.</p>
                ) : (
                  pulseiras.map((pulseira) => {
                    const active = selectedBatchCodes.includes(pulseira.codigo);
                    return (
                      <button
                        key={pulseira.id}
                        onClick={() => toggleBatchCode(pulseira.codigo)}
                        className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
                          active
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-400 hover:text-white'
                        }`}
                      >
                        {pulseira.codigo}
                      </button>
                    );
                  })
                )}
              </div>
              <p className="text-gray-500 text-xs mt-2">
                {selectedBatchCodes.length === 0
                  ? `Sem seleção manual: foram encontradas ${batchPages.length} páginas de até ${MAX_PULSEIRAS_PER_COMMAND}`
                  : `Selecionadas ${selectedBatchCodes.length} pulseiras, distribuídas em ${batchPages.length} página(s)`}
              </p>
            </div>

            {batchPages.length > 0 && (
              <div className="rounded-lg border border-gray-700 bg-gray-950 p-3 space-y-3">
                <div>
                  <label className="text-gray-400 text-xs block">Página do bind</label>
                  <span className="text-xs text-gray-500">
                    Página {safeBatchPage + 1} de {batchPages.length}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {currentBatchPageCodes.map((code) => (
                    <span key={code} className="px-2 py-0.5 bg-gray-800 text-green-400 text-xs font-mono rounded">
                      {code}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {selectedCodes.length > 0 && currentBatchPageCodes.length > 0 && (
          <div className="bg-gray-950 rounded-lg px-4 py-3 border border-gray-700 space-y-2">
            <p className="text-gray-500 text-xs">Preview do bind em lote:</p>
            <p className="text-xs text-gray-400">
              Vai usar a página {safeBatchPage + 1}/{batchPages.length} com {currentBatchPageCodes.length} pulseiras.
            </p>
            <code className="text-green-400 text-xs sm:text-sm font-mono whitespace-pre-wrap break-all block">
              bind keyboard {batchKey} "{getBatchCommand()}"
            </code>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={handleCreateBatchBind}
            className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            ⚡ Criar Bind em Lote
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-gray-700 hover:bg-gray-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            {showForm ? '✕ Fechar' : '➕ Novo Bind Individual'}
          </button>
          <p className="text-gray-500 text-xs self-center">
            Escolhe a tecla e a página. O bind é criado só com as pulseiras dessa página.
          </p>
        </div>
      </div>

      {showForm && (
        <div className="bg-gray-800 border border-gray-600 rounded-xl p-5 space-y-4">
          <h3 className="text-white font-semibold text-sm">Novo Bind</h3>

          <div className="flex gap-2">
            <button
              onClick={() => setTipo('locpulseira')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                tipo === 'locpulseira' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'
              }`}
            >
              📍 locpulseira
            </button>
            <button
              onClick={() => setTipo('custom')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                tipo === 'custom' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'
              }`}
            >
              ⚙️ Custom
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Tecla *</label>
              <select
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                {NUMPAD_KEYS.map((k) => (
                  <option key={k} value={k} disabled={usedKeys.includes(k)}>
                    {k} {usedKeys.includes(k) ? '(em uso)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {tipo === 'locpulseira' ? (
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Código da Pulseira *</label>
                {pulseiras.length > 0 ? (
                  <select
                    value={codigoPulseira}
                    onChange={(e) => setCodigoPulseira(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Selecionar...</option>
                    {pulseiras.map((p) => (
                      <option key={p.id} value={p.codigo}>
                        {p.codigo} — {p.descricao}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Ex: PSS54950"
                    value={codigoPulseira}
                    onChange={(e) => setCodigoPulseira(e.target.value.toUpperCase())}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm font-mono"
                  />
                )}
              </div>
            ) : (
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Comando Custom *</label>
                <input
                  type="text"
                  placeholder="Ex: say Olá"
                  value={customCmd}
                  onChange={(e) => setCustomCmd(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm font-mono"
                />
              </div>
            )}
          </div>

          <div>
            <label className="text-gray-400 text-xs mb-1 block">Descrição (opcional)</label>
            <input
              type="text"
              placeholder="Descrição do bind"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>

          {(tipo === 'locpulseira' ? codigoPulseira : customCmd) && (
            <div className="bg-gray-900 rounded-lg px-4 py-3 border border-gray-700">
              <p className="text-gray-500 text-xs mb-1">Preview do bind:</p>
              <code className="text-green-400 text-sm font-mono whitespace-pre-wrap break-all block">
                bind keyboard {key} "{getComando()}"
              </code>
            </div>
          )}

          <button
            onClick={handleAdd}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            ✅ Criar Bind
          </button>
        </div>
      )}

      {binds.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <p className="text-gray-400 text-xs font-medium mb-3">🎮 Numpad — Binds Ativos</p>
          <div className="grid grid-cols-4 gap-2 max-w-xs">
            {[
              'NUMPAD7', 'NUMPAD8', 'NUMPAD9', 'NUMPADDIV',
              'NUMPAD4', 'NUMPAD5', 'NUMPAD6', 'NUMPADMUL',
              'NUMPAD1', 'NUMPAD2', 'NUMPAD3', 'NUMPADMINUS',
              'NUMPAD0', '', 'NUMPADDECIMAL', 'NUMPADADD',
            ].map((k, i) => {
              if (!k) return <div key={i} />;
              const bind = binds.find((b) => b.key === k);
              return (
                <div
                  key={k}
                  className={`rounded-lg p-2 text-center text-xs ${
                    bind
                      ? 'bg-blue-900/40 border-blue-600 text-blue-300'
                      : 'bg-gray-700/40 border-gray-600 text-gray-500'
                  }`}
                  title={bind ? bind.comando : k}
                >
                  <p className="font-bold text-xs">{k.replace('NUMPAD', 'Num')}</p>
                  {bind && <p className="truncate text-xs opacity-70 mt-0.5">{bind.codigoPulseira || '⚙️'}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {binds.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-5xl mb-3">🎮</div>
          <p className="text-lg font-medium text-gray-400">Nenhum bind criado</p>
          <p className="text-sm mt-1">Cria binds para executar comandos com uma tecla no FiveM</p>
        </div>
      ) : (
        <div className="space-y-2">
          {binds.map((bind) => (
            <div key={bind.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center gap-4">
              <div className="flex-shrink-0">
                <p className="text-white font-bold text-sm">{bind.key}</p>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{bind.descricao}</p>
                <code className="text-green-400 text-xs font-mono whitespace-pre-wrap break-all block">
                  bind keyboard {bind.key} "{bind.comando}"
                </code>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleCopy(bind)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    copied === bind.id
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:text-white'
                  }`}
                >
                  {copied === bind.id ? '✅' : '📋'}
                </button>
                <button
                  onClick={() => handleRemove(bind)}
                  className="px-3 py-1.5 bg-red-900/50 text-red-400 hover:bg-red-800/60 rounded-lg text-xs font-medium transition-colors border border-red-800"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
