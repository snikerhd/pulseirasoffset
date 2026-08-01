import { useState } from 'react';
import { LogEntry } from '../types';

interface LogsTabProps {
  logs: LogEntry[];
  setLogs: (l: LogEntry[] | ((prev: LogEntry[]) => LogEntry[])) => void;
}

const logIcon: Record<string, string> = {
  add: '➕',
  remove: '🗑️',
  locate: '📍',
  bind: '🎮',
  copy: '📋',
  profile: '👥',
};

const logColor: Record<string, string> = {
  add: 'text-green-400 border-green-800 bg-green-900/10',
  remove: 'text-red-400 border-red-800 bg-red-900/10',
  locate: 'text-blue-400 border-blue-800 bg-blue-900/10',
  bind: 'text-purple-400 border-purple-800 bg-purple-900/10',
  copy: 'text-yellow-400 border-yellow-800 bg-yellow-900/10',
  profile: 'text-amber-400 border-amber-800 bg-amber-900/10',
};

const logTypelabel: Record<string, string> = {
  add: 'ADICIONADA',
  remove: 'REMOVIDA',
  locate: 'LOCALIZAR',
  bind: 'BIND',
  copy: 'CÓPIA',
  profile: 'PERFIL',
};

export default function LogsTab({ logs, setLogs }: LogsTabProps) {
  const [filtro, setFiltro] = useState<string>('all');
  const [busca, setBusca] = useState('');

  const filtrados = logs
    .filter((l) => filtro === 'all' || l.type === filtro)
    .filter(
      (l) =>
        l.message.toLowerCase().includes(busca.toLowerCase()) ||
        (l.codigo && l.codigo.toLowerCase().includes(busca.toLowerCase()))
    )
    .slice()
    .reverse();

  const clearLogs = () => {
    if (!confirm('Limpar todos os logs?')) return;
    setLogs([]);
  };

  const exportLogs = () => {
    const text = logs
      .slice()
      .reverse()
      .map((l) => `[${new Date(l.timestamp).toLocaleString('pt-PT')}] [${l.type.toUpperCase()}] ${l.message}`)
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pulseiras-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Pesquisar nos logs..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg pl-9 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
          />
        </div>
        <select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="all">Todos os tipos</option>
          <option value="add">Adicionadas</option>
          <option value="remove">Removidas</option>
          <option value="locate">Localizar</option>
          <option value="bind">Binds</option>
          <option value="copy">Cópias</option>
          <option value="profile">Perfis</option>
        </select>
        <button
          onClick={exportLogs}
          disabled={logs.length === 0}
          className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-colors"
        >
          💾 Exportar
        </button>
        <button
          onClick={clearLogs}
          disabled={logs.length === 0}
          className="flex items-center gap-2 bg-red-900/50 hover:bg-red-800/60 disabled:opacity-40 disabled:cursor-not-allowed text-red-400 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors border border-red-800"
        >
          🗑️ Limpar
        </button>
      </div>

      {/* Stats */}
      {logs.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {Object.entries(logTypelabel).map(([type, label]) => {
            const count = logs.filter((l) => l.type === type).length;
            return (
              <button
                key={type}
                onClick={() => setFiltro(filtro === type ? 'all' : type)}
                className={`p-2 rounded-lg border text-center transition-all ${
                  filtro === type ? logColor[type] : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500'
                }`}
              >
                <p className="text-lg">{logIcon[type]}</p>
                <p className="font-bold text-sm">{count}</p>
                <p className="text-xs opacity-70">{label}</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Lista de logs */}
      {filtrados.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-5xl mb-3">📋</div>
          <p className="text-lg font-medium text-gray-400">
            {logs.length === 0 ? 'Nenhum log ainda' : 'Sem resultados'}
          </p>
          <p className="text-sm mt-1">
            {logs.length === 0
              ? 'Os logs aparecem quando adicionas ou operas pulseiras'
              : 'Tenta outro filtro ou pesquisa'}
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {filtrados.map((log) => (
            <div
              key={log.id}
              className={`flex items-start gap-3 p-3 rounded-lg border ${logColor[log.type]}`}
            >
              <span className="text-base flex-shrink-0 mt-0.5">{logIcon[log.type]}</span>
              <div className="flex-1 min-w-0">
                <p>
                  <span className="text-xs font-bold opacity-70">{logTypelabel[log.type]}</span>
                  {log.codigo && (
                    <span className="font-mono text-xs bg-gray-900/50 px-2 py-0.5 rounded text-white">
                      {log.codigo}
                    </span>
                  )}
                </p>
                <p className="text-sm mt-0.5 truncate">{log.message}</p>
              </div>
              <span className="text-xs opacity-50 flex-shrink-0">
                {new Date(log.timestamp).toLocaleTimeString('pt-PT')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
