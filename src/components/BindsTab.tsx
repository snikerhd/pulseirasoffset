import { useState } from 'react';
import { BindEntry, LogEntry, Pulseira } from '../types';

interface BindsTabProps {
  binds: BindEntry[];
  setBinds: (b: BindEntry[] | ((prev: BindEntry[]) => BindEntry[])) => void;
  pulseiras: Pulseira[];
  addLog: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;
}

const F_KEYS = ['F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12'];
const NUMPAD_KEYS = [
  'NUMPAD0','NUMPAD1','NUMPAD2','NUMPAD3','NUMPAD4',
  'NUMPAD5','NUMPAD6','NUMPAD7','NUMPAD8','NUMPAD9',
  'NUMPADADD','NUMPADMINUS','NUMPADMUL','NUMPADDIV','NUMPADENTER','NUMPADDECIMAL'
];
const EXTRA_KEYS = ['INSERT','DELETE','HOME','END','PAGEUP','PAGEDOWN','BACKSPACE'];



export default function BindsTab({ binds, setBinds, pulseiras, addLog }: BindsTabProps) {
  const [key, setKey] = useState('F8');
  const [codigoPulseira, setCodigoPulseira] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState<'locpulseira' | 'custom'>('locpulseira');
  const [customCmd, setCustomCmd] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [quickKey, setQuickKey] = useState('F8');
  const [quickCopied, setQuickCopied] = useState(false);

  const getComando = () => {
    if (tipo === 'locpulseira') {
      return `locpulseira ${codigoPulseira.trim().toUpperCase()}`;
    }
    return customCmd.trim();
  };

  const getBindLine = (bind: BindEntry) =>
    `bind keyboard ${bind.key} "${bind.comando}"`;

  const handleAdd = () => {
    const codigo = codigoPulseira.trim().toUpperCase();
    const cmd = tipo === 'locpulseira'
      ? `locpulseira ${codigo}`
      : customCmd.trim();

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

  const handleCreateQuickBind = () => {
    if (pulseiras.length === 0) {
      alert('Adiciona primeiro pulseiras na aba Pulseiras!');
      return;
    }

    const MAX_PULSEIRAS_BIND = 18;
    const selecionadas = pulseiras.slice(0, MAX_PULSEIRAS_BIND);

    const comando = selecionadas.map((p) => `locpulseira ${p.codigo}`).join(';');

    if (pulseiras.length > MAX_PULSEIRAS_BIND) {
      alert(
        `Bind criado com as primeiras ${MAX_PULSEIRAS_BIND} pulseiras.\nTens ${pulseiras.length} no total — usa a aba Perfis para gerir em grupos de ${MAX_PULSEIRAS_BIND}.`
      );
    }

    const nova: BindEntry = {
      id: crypto.randomUUID(),
      key: quickKey,
      codigoPulseira: '',
      descricao: `Todas as pulseiras (${pulseiras.length})`,
      tipo: 'locpulseira',
      comando,
    };

    setBinds((prev) => [...prev, nova]);
    addLog({ type: 'bind', message: `Bind rápido criado: ${quickKey} → todas as ${pulseiras.length} pulseiras` });

    navigator.clipboard.writeText(`bind keyboard ${quickKey} "${comando}"`);
    setQuickCopied(true);
    setTimeout(() => setQuickCopied(false), 2000);
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

  const usedKeys = binds.map((b) => b.key);

  return (
    <div className="space-y-4">
      {/* Barra de acções */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <p className="text-gray-400 text-sm">
            Cria binds de teclado para executar comandos de pulseira no F8 do FiveM.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-colors flex-shrink-0"
        >
          ➕ Novo Bind
        </button>
        {binds.length > 0 && (
          <>
            <button
              onClick={handleCopyAll}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-colors flex-shrink-0"
            >
              📋 Copiar Todos
            </button>
            <button
              onClick={handleExportCFG}
              className="flex items-center gap-2 bg-green-700 hover:bg-green-600 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-colors flex-shrink-0"
            >
              💾 Exportar .cfg
            </button>
          </>
        )}
      </div>

      {/* ⚡ Bind Rápido — Copiar Todos */}
      {pulseiras.length > 0 && (
        <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-700/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚡</span>
            <p className="text-white font-semibold text-sm">Bind Rápido — Copiar Todos</p>
          </div>
          <p className="text-gray-400 text-xs">
            Cria um bind com uma tecla à tua escolha que executa todos os comandos{' '}
            <code className="text-green-400 font-mono">locpulseira</code> de uma vez.
            Comando gerado:{' '}
            <code className="text-yellow-400 font-mono text-xs">
              locpulseira PSS54950;locpulseira PSS52414;...
            </code>
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={quickKey}
              onChange={(e) => setQuickKey(e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 flex-shrink-0"
            >
              <optgroup label="Teclas de Função">
                {F_KEYS.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </optgroup>
              <optgroup label="Numpad">
                {NUMPAD_KEYS.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </optgroup>
              <optgroup label="Outras">
                {EXTRA_KEYS.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </optgroup>
            </select>
            <button
              onClick={handleCreateQuickBind}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
            >
              {quickCopied ? '✅ Bind copiado!' : '⚡ Criar Bind e Copiar'}
            </button>
          </div>
          <p className="text-gray-500 text-xs">
            💡 O bind já é copiado automaticamente para colares no F8 do FiveM.
          </p>
        </div>
      )}

      {/* Formulário */}
      {showForm && (
        <div className="bg-gray-800 border border-gray-600 rounded-xl p-5 space-y-4">
          <h3 className="text-white font-semibold text-sm">Novo Bind</h3>

          {/* Tipo */}
          <div className="flex gap-2">
            <button
              onClick={() => setTipo('locpulseira')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                tipo === 'locpulseira'
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'border-gray-600 text-gray-400 hover:border-gray-400'
              }`}
            >
              📍 locpulseira
            </button>
            <button
              onClick={() => setTipo('custom')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                tipo === 'custom'
                  ? 'bg-purple-600 border-purple-500 text-white'
                  : 'border-gray-600 text-gray-400 hover:border-gray-400'
              }`}
            >
              ⚙️ Comando Custom
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Tecla */}
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Tecla *</label>
              <select
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <optgroup label="Teclas de Função (F8 recomendado para F8)">
                  {F_KEYS.map((k) => (
                    <option key={k} value={k} disabled={usedKeys.includes(k)}>
                      {k} {usedKeys.includes(k) ? '(em uso)' : ''}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Numpad">
                  {NUMPAD_KEYS.map((k) => (
                    <option key={k} value={k} disabled={usedKeys.includes(k)}>
                      {k} {usedKeys.includes(k) ? '(em uso)' : ''}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Outras Teclas">
                  {EXTRA_KEYS.map((k) => (
                    <option key={k} value={k} disabled={usedKeys.includes(k)}>
                      {k} {usedKeys.includes(k) ? '(em uso)' : ''}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Pulseira ou comando */}
            {tipo === 'locpulseira' ? (
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Código da Pulseira *</label>
                {pulseiras.length > 0 ? (
                  <select
                    value={codigoPulseira}
                    onChange={(e) => setCodigoPulseira(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 font-mono"
                  >
                    <option value="">Selecionar pulseira...</option>
                    {pulseiras.map((p) => (
                      <option key={p.id} value={p.codigo}>
                        {p.codigo} {p.descricao !== p.codigo ? `— ${p.descricao}` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="ex: PSS54950"
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
                  placeholder="ex: e dance"
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
              placeholder="ex: Localizar PSS54950"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>

          {/* Preview */}
          {(tipo === 'locpulseira' ? codigoPulseira : customCmd) && (
            <div className="bg-gray-900 rounded-lg px-4 py-3 border border-gray-700">
              <p className="text-gray-500 text-xs mb-1">Preview do bind:</p>
              <code className="text-green-400 text-sm font-mono">
                bind keyboard {key} "{getComando()}"
              </code>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleAdd}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Criar Bind
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

      {/* Teclado visual Numpad */}
      {binds.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <p className="text-gray-400 text-xs font-medium mb-3">🎮 Numpad — Binds Ativos</p>
          <div className="grid grid-cols-4 gap-2 max-w-xs">
            {['NUMPAD7','NUMPAD8','NUMPAD9','NUMPADDIV',
              'NUMPAD4','NUMPAD5','NUMPAD6','NUMPADMUL',
              'NUMPAD1','NUMPAD2','NUMPAD3','NUMPADMINUS',
              'NUMPAD0','','NUMPADDECIMAL','NUMPADADD'].map((k, i) => {
              if (!k) return <div key={i} />;
              const bind = binds.find((b) => b.key === k);
              return (
                <div
                  key={k}
                  className={`rounded-lg p-2 text-center text-xs border ${
                    bind
                      ? 'bg-blue-900/40 border-blue-600 text-blue-300'
                      : 'bg-gray-700 border-gray-600 text-gray-500'
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

      {/* Lista de binds */}
      {binds.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-5xl mb-3">🎮</div>
          <p className="text-lg font-medium text-gray-400">Nenhum bind criado</p>
          <p className="text-sm mt-1">Cria binds para executar comandos com uma tecla no FiveM</p>
        </div>
      ) : (
        <div className="space-y-2">
          {binds.map((bind) => (
            <div
              key={bind.id}
              className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center gap-4"
            >
              {/* Tecla */}
              <div className="flex-shrink-0">
                <div className="bg-gray-700 border border-gray-500 rounded-lg px-3 py-2 text-center min-w-16">
                  <p className="text-white font-bold text-sm">{bind.key}</p>
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{bind.descricao}</p>
                <code className="text-green-400 text-xs font-mono">
                  bind keyboard {bind.key} "{bind.comando}"
                </code>
              </div>

              {/* Acções */}
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => handleCopy(bind)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    copied === bind.id
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                >
                  {copied === bind.id ? '✅' : '📋'}
                </button>
                <button
                  onClick={() => handleRemove(bind)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-900/30 hover:bg-red-900/60 text-red-400 transition-colors border border-red-900"
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
