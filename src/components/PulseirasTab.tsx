import { useState } from 'react';
import { Pulseira, LogEntry } from '../types';

interface PulseirasTabProps {
  pulseiras: Pulseira[];
  setPulseiras: (p: Pulseira[] | ((prev: Pulseira[]) => Pulseira[])) => void;
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

export default function PulseirasTab({ pulseiras, setPulseiras, addLog }: PulseirasTabProps) {
  const [codigo, setCodigo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [cor, setCor] = useState('blue');
  const [busca, setBusca] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

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

  const handleRemove = (pulseira: Pulseira) => {
    if (!confirm(`Remover pulseira ${pulseira.codigo}?`)) return;
    setPulseiras((prev) => prev.filter((p) => p.id !== pulseira.id));
    addLog({
      type: 'remove',
      message: `Pulseira removida: ${pulseira.codigo}`,
      codigo: pulseira.codigo,
    });
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

  const filtradas = pulseiras.filter(
    (p) =>
      p.codigo.toLowerCase().includes(busca.toLowerCase()) ||
      p.descricao.toLowerCase().includes(busca.toLowerCase())
  );

  const gerarTodos = () => {
    const cmds = pulseiras.map((p) => `locpulseira ${p.codigo}`).join(';');
    navigator.clipboard.writeText(cmds);
    addLog({ type: 'copy', message: `Todos os comandos copiados (${pulseiras.length} pulseiras)` });
  };

  return (
    <div className="space-y-4">
      {/* Barra de pesquisa e acções */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Pesquisar pulseira..."
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
        {pulseiras.length > 0 && (
          <button
            onClick={gerarTodos}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-colors"
          >
            <span>📋</span> Copiar Todos
          </button>
        )}
      </div>

      {/* Formulário de adição */}
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

      {/* Lista de pulseiras */}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtradas.map((p) => (
            <div
              key={p.id}
              className={`border rounded-xl p-4 transition-all hover:scale-[1.01] ${corClass[p.cor] || corClass.blue}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full flex-shrink-0 ${corBadge[p.cor] || corBadge.blue}`}></span>
                  <span className="font-mono font-bold text-white text-sm">{p.codigo}</span>
                </div>
                <button
                  onClick={() => handleRemove(p)}
                  className="text-gray-500 hover:text-red-400 transition-colors text-xs"
                  title="Remover"
                >
                  🗑️
                </button>
              </div>
              {p.descricao !== p.codigo && (
                <p className="text-gray-400 text-xs mb-3 ml-5">{p.descricao}</p>
              )}
              <div className="ml-5">
                <div className="bg-gray-900/60 rounded-lg px-3 py-2 font-mono text-xs text-gray-300 mb-2 border border-gray-700">
                  locpulseira {p.codigo}
                </div>
                <button
                  onClick={() => handleLocate(p)}
                  className={`w-full py-1.5 rounded-lg text-xs font-medium transition-all ${
                    copied === p.id
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                >
                  {copied === p.id ? '✅ Copiado!' : '📋 Copiar Comando'}
                </button>
              </div>
              <p className="text-gray-600 text-xs mt-2 ml-5">
                {new Date(p.createdAt).toLocaleDateString('pt-PT')}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
