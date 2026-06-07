import { useState } from 'react';
import { Pulseira, LogEntry } from '../types';
import ExcelImport from './ExcelImport';


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

const PER_PAGINA = 18;

export default function PulseirasTab({ pulseiras, setPulseiras, addLog }: PulseirasTabProps) {
  const [codigo, setCodigo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [cor, setCor] = useState('blue');
  const [busca, setBusca] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkColor, setBulkColor] = useState('blue');
  const [showExcelImport, setShowExcelImport] = useState(false);

  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [paginasSelecionadas, setPaginasSelecionadas] = useState<Set<number>>(new Set());

  const filtered = pulseiras.filter(
    (p) =>
      p.codigo.toLowerCase().includes(busca.toLowerCase()) ||
      p.descricao.toLowerCase().includes(busca.toLowerCase())
  );

  const totalPaginas = Math.max(1, Math.ceil(filtered.length / PER_PAGINA));
  const inicio = (paginaAtual - 1) * PER_PAGINA;
  const pulseirasPagina = filtered.slice(inicio, inicio + PER_PAGINA);

  const handleBusca = (v: string) => {
    setBusca(v);
    setPaginaAtual(1);
    setPaginasSelecionadas(new Set());
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

  const handleBulkImport = () => {
    const texto = bulkText.trim();
    if (!texto) return;

    const codigosEncontrados: string[] = [];

    const parts = texto.split(';').map((s) => s.trim()).filter(Boolean);
    for (const part of parts) {
      let codigo = part.replace(/^locpulseira\s+/i, '').trim().toUpperCase();
      const match = codigo.match(/^([A-Z]{2,}\d{3,})/);
      if (match) {
        codigo = match[1];
      }
      if (codigo && !codigosEncontrados.includes(codigo)) {
        codigosEncontrados.push(codigo);
      }
    }

    if (codigosEncontrados.length === 0) {
      alert('Nenhum código encontrado! Usa o formato: locpulseira PSS54950;locpulseira PFB75791');
      return;
    }

    const existentes = new Set(pulseiras.map((p) => p.codigo));
    const novas: Pulseira[] = [];
    const duplicatas: string[] = [];

    for (const codigo of codigosEncontrados) {
      if (existentes.has(codigo)) {
        duplicatas.push(codigo);
        continue;
      }
      existentes.add(codigo);
      novas.push({
        id: crypto.randomUUID(),
        codigo,
        descricao: codigo,
        cor: bulkColor,
        createdAt: new Date().toISOString(),
      });
    }

    setPulseiras((prev) => [...prev, ...novas]);
    addLog({
      type: 'add',
      message: `Importados ${novas.length} códigos${duplicatas.length > 0 ? ` (${duplicatas.length} duplicatas ignoradas)` : ''}`,
    });

    setBulkText('');
    setShowBulkImport(false);
  };

  const copiarPagina = (numPagina: number) => {
    const start = (numPagina - 1) * PER_PAGINA;
    const lista = filtered.slice(start, start + PER_PAGINA);
    const cmds = lista.map((p) => `locpulseira ${p.codigo}`).join(';');
    navigator.clipboard.writeText(cmds);
    addLog({
      type: 'copy',
      message: `Página ${numPagina} copiada (${lista.length} pulseiras)`,
    });
  };

  const copiarPaginasSelecionadas = () => {
    if (paginasSelecionadas.size === 0) return;

    const todosCodigos: string[] = [];
    const paginasArray = Array.from(paginasSelecionadas).sort((a, b) => a - b);

    for (const pg of paginasArray) {
      const start = (pg - 1) * PER_PAGINA;
      const lista = filtered.slice(start, start + PER_PAGINA);
      for (const p of lista) {
        if (!todosCodigos.includes(p.codigo)) {
          todosCodigos.push(p.codigo);
        }
      }
    }

    const cmds = todosCodigos.map((c) => `locpulseira ${c}`).join(';');
    navigator.clipboard.writeText(cmds);
    addLog({
      type: 'copy',
      message: `${paginasSelecionadas.size} página(s) copiada(s) — ${todosCodigos.length} pulseiras`,
    });
    setPaginasSelecionadas(new Set());
  };

  const togglePaginaSelecionada = (numPagina: number) => {
    setPaginasSelecionadas((prev) => {
      const next = new Set(prev);
      if (next.has(numPagina)) {
        next.delete(numPagina);
      } else {
        next.add(numPagina);
      }
      return next;
    });
  };

  const selecionarTodas = () => {
    const todas = new Set<number>();
    for (let i = 1; i <= totalPaginas; i++) todas.add(i);
    setPaginasSelecionadas(todas);
  };

  const limparSelecao = () => {
    setPaginasSelecionadas(new Set());
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
            onChange={(e) => handleBusca(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg pl-9 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
          />
        </div>
        <button
          onClick={() => setShowBulkImport(!showBulkImport)}
          className="flex items-center gap-2 bg-green-700 hover:bg-green-600 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-colors"
        >
          <span>📥</span> Importar em Bulk
        </button>
        <button
          onClick={() => setShowExcelImport(!showExcelImport)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-colors"
        >
          <span>📊</span> Importar Excel
        </button>
        {showExcelImport && (
          <ExcelImport
            pulseiras={pulseiras}
            setPulseiras={setPulseiras}
            addLog={addLog}
            onClose={() => setShowExcelImport(false)}
          />
        )}
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-colors"
        >
          <span>➕</span> Nova Pulseira
        </button>
      </div>

      {/* Barra de ações de página */}
      {filtered.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between bg-gray-800 border border-gray-700 rounded-xl p-3">
          <div className="text-gray-400 text-xs">
            📄 Página <strong className="text-white">{paginaAtual}</strong> de <strong className="text-white">{totalPaginas}</strong> —{' '}
            <strong className="text-white">{filtered.length}</strong> pulseira{filtered.length !== 1 ? 's' : ''} no total
            {totalPaginas > 1 && (
              <span className="ml-1 text-yellow-500">
                ({PER_PAGINA} por página)
              </span>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => copiarPagina(paginaAtual)}
              className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            >
              📋 Copiar Página {paginaAtual}
            </button>
            {paginasSelecionadas.size > 0 && (
              <button
                onClick={copiarPaginasSelecionadas}
                className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              >
                ✅ Copiar {paginasSelecionadas.size} Página(s)
              </button>
            )}
            {totalPaginas > 1 && paginasSelecionadas.size < totalPaginas && (
              <button
                onClick={selecionarTodas}
                className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              >
                ☑️ Selecionar Todas
              </button>
            )}
            {paginasSelecionadas.size > 0 && (
              <button
                onClick={limparSelecao}
                className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              >
                ✕ Limpar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Navegação de páginas */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-1 flex-wrap bg-gray-800 border border-gray-700 rounded-xl p-3">
          <button
            onClick={() => { setPaginaAtual((p) => Math.max(1, p - 1)); setPaginasSelecionadas(new Set()); }}
            disabled={paginaAtual === 1}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-700 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors"
          >
            ◀ Anterior
          </button>

          {(() => {
            const delta = 2;
            const range = [];
            for (let i = Math.max(2, paginaAtual - delta); i <= Math.min(totalPaginas - 1, paginaAtual + delta); i++) {
              range.push(i);
            }
            if (paginaAtual - delta > 2) range.unshift('...');
            range.unshift(1);
            if (paginaAtual + delta < totalPaginas - 1) range.push('...');
            if (totalPaginas > 1) range.push(totalPaginas);

            return range.map((pg, idx) => {
              if (pg === '...') {
                return <span key={`dots-${idx}`} className="text-gray-500 px-1 text-xs">…</span>;
              }
              const numPg = pg as number;
              const selecionada = paginasSelecionadas.has(numPg);
              return (
                <button
                  key={numPg}
                  onClick={() => { setPaginaAtual(numPg); setPaginasSelecionadas(new Set()); }}
                  onContextMenu={(e) => { e.preventDefault(); togglePaginaSelecionada(numPg); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all min-w-9 ${
                    numPg === paginaAtual
                      ? 'bg-blue-600 text-white border-blue-500 shadow-lg'
                      : selecionada
                      ? 'bg-green-900/40 text-green-300 border-green-600'
                      : 'bg-gray-700 text-gray-300 border-gray-600 hover:border-gray-400'
                  }`}
                  title={
                    selecionada
                      ? `Página ${numPg} selecionada (clicar direito para desselecionar)`
                      : `Página ${numPg} (clicar direito para selecionar multi-cópia)`
                  }
                >
                  {numPg}
                </button>
              );
            });
          })()}

          <button
            onClick={() => { setPaginaAtual((p) => Math.min(totalPaginas, p + 1)); setPaginasSelecionadas(new Set()); }}
            disabled={paginaAtual === totalPaginas}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-700 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors"
          >
            Próxima ▶
          </button>
        </div>
      )}

      {/* Info de seleção multi-página */}
      {paginasSelecionadas.size > 0 && (
        <div className="bg-green-900/20 border border-green-700 rounded-xl p-3 flex items-center justify-between">
          <p className="text-green-300 text-xs">
            📑 Páginas selecionadas:{' '}
            <strong className="text-white">{Array.from(paginasSelecionadas).sort((a, b) => a - b).join(', ')}</strong>
          </p>
          <p className="text-gray-500 text-xs">
            {paginasSelecionadas.size > 1
              ? 'Clica "Copiar X Página(s)" para juntar tudo'
              : 'Seleciona mais páginas (clicar direito) para multi-cópia'}
          </p>
        </div>
      )}

      {/* Importar em bulk */}
      {showBulkImport && (
        <div className="bg-green-900/20 border border-green-700 rounded-xl p-5 space-y-3">
          <h3 className="text-green-300 font-semibold text-sm">📥 Importar Códigos em Bulk</h3>
          <p className="text-gray-400 text-xs">
            Cola os comandos copiados diretamente:{' '}
            <code className="text-green-400 font-mono">
              locpulseira PSS54950;locpulseira PFB75791;locpulseira EIE58685;...
            </code>
          </p>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={'locpulseira HYE28866 ;locpulseira PFB75791 ;locpulseira EIE58685 ;locpulseira BGL37897 ;locpulseira ILP53296 ;locpulseira SNV25509\n...'}
            rows={5}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 text-sm font-mono resize-none"
          />
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Cor para novas pulseiras:</label>
            <div className="flex flex-wrap gap-2">
              {CORES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setBulkColor(c.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    bulkColor === c.value
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
          <div className="flex gap-2">
            <button
              onClick={handleBulkImport}
              disabled={!bulkText.trim()}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              📥 Importar
            </button>
            <button
              onClick={() => { setShowBulkImport(false); setBulkText(''); }}
              className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-5 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

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

      {/* Lista de pulseiras por página */}
      {filtered.length === 0 ? (
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
        <>
          <div className="space-y-2">
            {pulseirasPagina.map((p) => (
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
                {p.descricao && p.descricao !== p.codigo && (
                  <p className="text-gray-400 text-xs mb-3 ml-5">{p.descricao}</p>
                )}
                {p.nomePessoa && p.nomePessoa !== p.descricao && (
                  <p className="text-blue-400 text-xs mb-2 ml-5">👤 {p.nomePessoa}</p>
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

          {/* Navegação inferior (mobile) */}
          <div className="flex items-center justify-between bg-gray-800 border border-gray-700 rounded-xl p-3">
            <button
              onClick={() => { setPaginaAtual((p) => Math.max(1, p - 1)); setPaginasSelecionadas(new Set()); }}
              disabled={paginaAtual === 1}
              className="flex items-center gap-1 px-4 py-2 rounded-lg text-xs font-medium bg-gray-700 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors"
            >
              ◀ Anterior
            </button>
            <span className="text-gray-400 text-xs">
              Página {paginaAtual} de {totalPaginas}
            </span>
            <button
              onClick={() => { setPaginaAtual((p) => Math.min(totalPaginas, p + 1)); setPaginasSelecionadas(new Set()); }}
              disabled={paginaAtual === totalPaginas}
              className="flex items-center gap-1 px-4 py-2 rounded-lg text-xs font-medium bg-gray-700 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors"
            >
              Próxima ▶
            </button>
          </div>
        </>
      )}

      {/* Legenda da paginação */}
      {totalPaginas > 1 && (
        <div className="text-center text-gray-600 text-xs space-y-1">
          <p>📄 <strong className="text-gray-400">{PER_PAGINA}</strong> pulseiras por página</p>
          <p>
            💡 <strong className="text-gray-400">Clicar direito</strong> num número de página para selecionar multi-cópia
          </p>
        </div>
      )}
    </div>
  );
}
