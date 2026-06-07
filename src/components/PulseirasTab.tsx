import { useState } from 'react';
import { Pulseira, LogEntry } from '../types';

interface PulseirasTabProps {
  pulseiras: Pulseira[];
  setPulseiras: (p: Pulseira[] | ((prev: Pulseira[]) => Pulseira[])) => void;
  addLog: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;
}

const PER_PAGINA = 24;

export default function PulseirasTab({ pulseiras, setPulseiras, addLog }: PulseirasTabProps) {
  const [codigo, setCodigo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [busca, setBusca] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filtered = pulseiras.filter((p) => {
    const q = busca.trim().toLowerCase();
    if (!q) return true;
    return (
      p.codigo.toLowerCase().includes(q) ||
      (p.descricao || '').toLowerCase().includes(q) ||
      (p.nomePessoa || '').toLowerCase().includes(q)
    );
  });

  const totalPaginas = Math.max(1, Math.ceil(filtered.length / PER_PAGINA));
  const safePagina = Math.min(paginaAtual, totalPaginas);
  const start = (safePagina - 1) * PER_PAGINA;
  const end = start + PER_PAGINA;
  const pageItems = filtered.slice(start, end);

  const handleBusca = (value: string) => {
    setBusca(value);
    setPaginaAtual(1);
    setSelectedIds(new Set());
  };

  const handleAdd = () => {
    const codigoFinal = codigo.trim().toUpperCase();
    if (!codigoFinal) {
      alert('Escreve o código da pulseira');
      return;
    }
    if (pulseiras.find((p) => p.codigo === codigoFinal)) {
      alert('Já existe uma pulseira com esse código');
      return;
    }

    const nova: Pulseira = {
      id: crypto.randomUUID(),
      codigo: codigoFinal,
      descricao: descricao.trim() || codigoFinal,
      cor: 'red',
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

  const handleRemove = (pulseira: Pulseira) => {
    if (!confirm(`Remover pulseira ${pulseira.codigo}?`)) return;
    setPulseiras((prev) => prev.filter((p) => p.id !== pulseira.id));
    addLog({
      type: 'remove',
      message: `Pulseira removida: ${pulseira.codigo}`,
      codigo: pulseira.codigo,
    });
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(pulseira.id);
      return next;
    });
  };

  const handleLocate = (pulseira: Pulseira) => {
    const cmd = `locpulseira ${pulseira.codigo}`;
    navigator.clipboard.writeText(cmd).catch(() => {});
    setCopiedId(pulseira.id);
    setTimeout(() => setCopiedId(null), 1500);
    addLog({
      type: 'locate',
      message: `Comando copiado: ${cmd}`,
      codigo: pulseira.codigo,
    });
  };

  const toggleSelectId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllCurrentPage = () => {
    const allSelected = pageItems.every((p) => selectedIds.has(p.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        pageItems.forEach((p) => next.delete(p.id));
      } else {
        pageItems.forEach((p) => next.add(p.id));
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const deleteSelected = () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Eliminar ${selectedIds.size} pulseira(s) selecionada(s)?`)) return;
    setPulseiras((prev) => prev.filter((p) => !selectedIds.has(p.id)));
    addLog({
      type: 'remove',
      message: `${selectedIds.size} pulseiras eliminadas (seleção múltipla)`,
    });
    setSelectedIds(new Set());
  };

  const goToPage = (page: number) => {
    const safe = Math.max(1, Math.min(page, totalPaginas));
    setPaginaAtual(safe);
    setSelectedIds(new Set());
  };

  const changePage = (delta: number) => {
    setPaginaAtual((prev) => {
      const next = Math.max(1, Math.min(totalPaginas, prev + delta));
      setSelectedIds(new Set());
      return next;
    });
  };

  const pages = Array.from({ length: totalPaginas }, (_, i) => i + 1);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={busca}
            onChange={(e) => handleBusca(e.target.value)}
            placeholder="Pesquisar pulseira..."
            className="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-red-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
          >
            {showForm ? 'Fechar' : 'Nova Pulseira'}
          </button>
        </div>

        {showForm && (
          <div className="rounded-xl border border-gray-700 bg-gray-900 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-300">Código *</label>
                <input
                  type="text"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  placeholder="PSS54950"
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-300">Descrição</label>
                <input
                  type="text"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Nome do acusado / info extra"
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-red-400">
              <span className="inline-block h-3 w-3 rounded-full bg-red-500" />
              Cor fixa: vermelho
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={handleAdd}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
              >
                Adicionar
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm text-gray-300 hover:border-gray-500"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-800 py-12 text-center text-gray-500">
          <p className="text-lg font-medium text-gray-400">Sem pulseiras</p>
          <p className="mt-1 text-sm">Adiciona uma nova para começar.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pageItems.map((p) => {
            const checked = selectedIds.has(p.id);
            return (
              <div
                key={p.id}
                className={`flex items-start gap-3 rounded-xl border p-3 ${
                  checked ? 'border-yellow-500/60 bg-yellow-500/5' : 'border-red-900/40 bg-gray-900/70'
                }`}
              >
                <label className="mt-1 flex items-center gap-2 text-xs text-gray-300">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleSelectId(p.id)}
                    className="h-4 w-4 rounded border-gray-700 text-red-600 focus:ring-red-500"
                  />
                </label>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
                    <span className="font-mono font-semibold text-white">{p.codigo}</span>
                  </div>
                  {p.descricao && p.descricao !== p.codigo && (
                    <p className="mt-1 text-xs text-gray-400">{p.descricao}</p>
                  )}
                  {p.nomePessoa && p.nomePessoa !== p.descricao && (
                    <p className="mt-1 text-xs text-red-300">{p.nomePessoa}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <code className="rounded-md border border-gray-800 bg-gray-950 px-2 py-1 text-xs text-gray-200">
                      locpulseira {p.codigo}
                    </code>
                    <button
                      type="button"
                      onClick={() => handleLocate(p)}
                      className="rounded-md border border-gray-800 bg-gray-900 px-2 py-1 text-xs text-gray-200 hover:border-gray-600"
                    >
                      {copiedId === p.id ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(p)}
                  className="mt-1 text-xs font-medium text-red-400 hover:text-red-300"
                >
                  Eliminar
                </button>
              </div>
            );
          })}
        </div>
      )}

      {filtered.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-800 bg-gray-900/80 px-3 py-2 text-xs text-gray-300">
            <span>
              Página <span className="font-semibold text-white">{safePagina}</span> de{' '}
              <span className="font-semibold text-white">{totalPaginas}</span>
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {selectedIds.size > 0 && (
                <span className="font-semibold text-yellow-400">{selectedIds.size} selecionada(s)</span>
              )}
              <button
                type="button"
                onClick={selectAllCurrentPage}
                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-medium text-white hover:border-gray-500"
              >
                {pageItems.every((p) => selectedIds.has(p.id)) ? 'Desmarcar página' : 'Selecionar página'}
              </button>
              {selectedIds.size > 0 && (
                <>
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-200 hover:border-gray-500"
                  >
                    Limpar seleção
                  </button>
                  <button
                    type="button"
                    onClick={deleteSelected}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-500"
                  >
                    Eliminar selecionadas
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              disabled={safePagina <= 1}
              onClick={() => changePage(-1)}
              className="rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-xs font-medium text-white disabled:opacity-40"
            >
              Anterior
            </button>
            <div className="flex flex-wrap items-center justify-center gap-1">
              {pages.map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => goToPage(page)}
                  className={`h-8 w-8 rounded-lg text-xs font-semibold ${
                    page === safePagina
                      ? 'bg-red-600 text-white'
                      : 'border border-gray-800 bg-gray-900 text-gray-300 hover:border-gray-600'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={safePagina >= totalPaginas}
              onClick={() => changePage(1)}
              className="rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-xs font-medium text-white disabled:opacity-40"
            >
              Seguinte
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
