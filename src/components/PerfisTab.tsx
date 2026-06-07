import { useState } from 'react';
import { Perfil, LogEntry, Pulseira } from '../types';

interface PerfisTabProps {
  perfis: Perfil[];
  setPerfis: (p: Perfil[] | ((prev: Perfil[]) => Perfil[])) => void;
  pulseiras: Pulseira[];
  setPulseiras: (p: Pulseira[] | ((prev: Pulseira[]) => Pulseira[])) => void;
  addLog: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;
}


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

export default function PerfisTab({ perfis, setPerfis, pulseiras, setPulseiras, addLog }: PerfisTabProps) {
  const [nomePerfil, setNomePerfil] = useState('');
  const [importText, setImportText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeCor, setActiveCor] = useState('blue');
  const [showImportArea, setShowImportArea] = useState(false);

  // Args da pulseira por código
  const pulseiraPorCodigo = new Map(pulseiras.map((p) => [p.codigo, p]));

  // --- Criar perfil a partir das pulseiras guardadas ---
  const handleCriarPerfil = () => {
    if (pulseiras.length === 0) {
      alert('Adiciona primeiro pulseiras na aba Pulseiras!');
      return;
    }

    const nome = nomePerfil.trim() || `Perfil ${perfis.length + 1}`;

    const novo: Perfil = {
      id: crypto.randomUUID(),
      nome,
      pulseiras: pulseiras.map((p) => p.codigo),
      createdAt: new Date().toISOString(),
    };

    setPerfis((prev) => [novo, ...prev]);
    addLog({ type: 'copy', message: `Perfil criado: "${nome}" com ${pulseiras.length} pulseiras` });
    setNomePerfil('');
  };

  // --- Aplicar perfil (carrega as pulseiras do perfil) ---
  const handleAplicarPerfil = (perfil: Perfil, modo: 'adicionar' | 'substituir') => {
    setActiveCor('blue');
    const codigosExistentes = new Set(modo === 'substituir' ? [] : pulseiras.map((p) => p.codigo));
    const novas: Pulseira[] = [];
    let duplicatas = 0;

    for (const codigo of perfil.pulseiras) {
      const upper = codigo.trim().toUpperCase();
      if (!upper) continue;
      if (codigosExistentes.has(upper)) {
        duplicatas++;
        continue;
      }
      codigosExistentes.add(upper);
      const existente = pulseiraPorCodigo.get(upper);
      if (existente && modo === 'substituir') {
        novas.push(existente);
      } else if (existente) {
        // já existe, não adiciona de novo em modo adicionar
      } else {
        novas.push({
          id: crypto.randomUUID(),
          codigo: upper,
          descricao: upper,
          cor: activeCor,
          createdAt: new Date().toISOString(),
        });
      }
    }

    if (modo === 'substituir') {
      setPulseiras(novas);
    } else {
      setPulseiras((prev) => [...prev, ...novas]);
    }

    const msg = modo === 'substituir'
      ? `Perfil "${perfil.nome}" aplicado (${novas.length} pulseiras)${duplicatas > 0 ? `, ${duplicatas} já existiam` : ''}`
      : `Perfil "${perfil.nome}" adicionado (${novas.length} novas)${duplicatas > 0 ? `, ${duplicatas} duplicatas ignoradas` : ''}`;

    addLog({ type: 'add', message: msg });
  };

  // --- Importar de texto (colar os comandos) ---
  const handleImport = () => {
    const texto = importText.trim();
    if (!texto) return;

    // Parse inteligente: extrai códigos de locpulseira X; locpulseira Y; ou linhas
    const codigos: string[] = [];

    // Tenta split por ;
    const parts = texto.split(';').map((s) => s.trim()).filter(Boolean);

    for (const part of parts) {
      // Tira "locpulseira " do inicio
      let codigo = part.replace(/^locpulseira\s+/i, '').trim();
      // Tenta extrair só o código (primeiro token alfanumérico)
      const match = codigo.match(/^([A-Z]{2,}\d{3,})/i);
      if (match) {
        codigo = match[1].toUpperCase();
      } else if (codigo.length > 0) {
        codigo = codigo.toUpperCase();
      }
      if (codigo) {
        codigos.push(codigo);
      }
    }

    if (codigos.length === 0) {
      alert('Nenhum código encontrado! Cole texto como: locpulseira PSS54950;locpulseira PSS52414');
      return;
    }

    const nome = `Importado ${new Date().toLocaleDateString('pt-PT')}`;

    const novo: Perfil = {
      id: crypto.randomUUID(),
      nome,
      pulseiras: codigos,
      createdAt: new Date().toISOString(),
    };

    setPerfis((prev) => [novo, ...prev]);
    addLog({ type: 'add', message: `${codigos.length} pulseiras importadas como "${nome}"` });
    setImportText('');
    setShowImportArea(false);
  };

  // --- Eliminar perfil ---
  const handleRemoverPerfil = (id: string, nome: string) => {
    if (!confirm(`Remover perfil "${nome}"?`)) return;
    setPerfis((prev) => prev.filter((p) => p.id !== id));
    addLog({ type: 'remove', message: `Perfil removido: "${nome}"` });
  };

  // --- Partilhar perfil (copiar texto) ---
  const handlePartilhar = (perfil: Perfil) => {
    const texto = perfil.pulseiras.map((c) => `locpulseira ${c}`).join(';');
    navigator.clipboard.writeText(texto);
    setCopiedId(perfil.id);
    setTimeout(() => setCopiedId(null), 2000);
    addLog({ type: 'copy', message: `Perfil "${perfil.nome}" copiado para partilhar` });
  };

  // --- Importar perfil partilhado ---
  const handleImportCola = () => {
    if (!navigator.clipboard) {
      alert('Clipboard não disponível! Cola manualmente na caixa de texto.');
      return;
    }
    navigator.clipboard.readText().then((text) => {
      setImportText(text);
      setShowImportArea(true);
    }).catch(() => {
      setShowImportArea(true);
    });
  };


  return (
    <div className="space-y-5">
      {/* Info */}
      <div className="bg-gradient-to-r from-green-900/20 to-blue-900/20 border border-green-800/50 rounded-xl p-4">
        <p className="text-green-300 text-sm font-medium mb-1">📦 Perfis de Pulseiras</p>
        <p className="text-gray-400 text-xs">
          Guarda conjuntos de pulseiras para rapidamente trocar de perfil. Compartilha com amigos passando o conteúdo dos comandos.
          Max {18} pulseiras por perfil para compatibilidade com binds.
        </p>
      </div>

      {/* Barra principal */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Nome do perfil..."
          value={nomePerfil}
          onChange={(e) => setNomePerfil(e.target.value)}
          className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 text-sm"
        />
        <button
          onClick={handleCriarPerfil}
          disabled={pulseiras.length === 0}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg font-medium text-sm transition-colors flex-shrink-0"
        >
          💾 Guardar Perfil
        </button>
        <button
          onClick={handleImportCola}
          className="flex items-center gap-2 bg-blue-700 hover:bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium text-sm transition-colors flex-shrink-0"
        >
          📥 Importar da Área de Transferência
        </button>
        <button
          onClick={() => setShowImportArea(!showImportArea)}
          className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-gray-300 px-5 py-2.5 rounded-lg font-medium text-sm transition-colors flex-shrink-0"
        >
          ✍️ Colar Manualmente
        </button>
      </div>

      {/* Área de importação */}
      {showImportArea && (
        <div className="bg-gray-800 border border-gray-600 rounded-xl p-5 space-y-3">
          <h3 className="text-white font-semibold text-sm">Importar Pulseiras</h3>
          <p className="text-gray-400 text-xs">
            Cola os comandos no formato:{' '}
            <code className="text-green-400 font-mono">locpulseira PSS54950;locpulseira PFB75791</code>
          </p>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={'locpulseira PSS54950 ;locpulseira PFB75791 ;locpulseira EIE58685 ;locpulseira BGL37897 ;locpulseira ILP53296 ;locpulseira SNV25509 ;locpulseira ZYT29365 ;locpulseira NDN65681 ;locpulseira LMW59455 ;locpulseira CFM21154 ;locpulseira WJO90550 ;locpulseira ZUH40160 ;locpulseira YXY34144 ;locpulseira MDG54360 ;locpulseira HQP65449 ;locpulseira DLDT5873 ;locpulseira WUD11574'}
            rows={4}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm font-mono resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleImport}
              disabled={!importText.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              📥 Importar
            </button>
            <button
              onClick={() => { setImportText(''); setShowImportArea(false); }}
              className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-5 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Resultado da importação aparece no PulseirasTab automaticamente */}

      {/* Lista de perfis */}
      {perfis.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-5xl mb-3">📦</div>
          <p className="text-lg font-medium text-gray-400">Nenhum perfil guardado</p>
          <p className="text-sm mt-1">
            Guarda o conjunto atual de pulseiras como um perfil para partilhar ou reutilizar
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {perfis.map((perfil) => {
            const codigosReal = perfil.pulseiras
              .filter((c) => !!c)
              .map((c) => c.trim().toUpperCase())
              .filter((c, i, arr) => arr.indexOf(c) === i); // unique

            return (
              <div
                key={perfil.id}
                className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3"
              >
                {/* Cabeçalho do perfil */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-white font-semibold text-sm truncate">{perfil.nome}</h3>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {codigosReal.length} pulseira{codigosReal.length !== 1 ? 's' : ''} •{' '}
                      {new Date(perfil.createdAt).toLocaleDateString('pt-PT')}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoverPerfil(perfil.id, perfil.nome)}
                    className="text-gray-500 hover:text-red-400 transition-colors"
                    title="Remover perfil"
                  >
                    🗑️
                  </button>
                </div>

                {/* Preview das pulseiras */}
                <div className="bg-gray-900/60 rounded-lg p-2 border border-gray-700 max-h-28 overflow-y-auto">
                  <div className="flex flex-wrap gap-1">
                    {codigosReal.map((c, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 bg-gray-700 text-gray-300 text-xs font-mono px-2 py-0.5 rounded"
                      >
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          pulseiraPorCodigo.get(c)?.cor
                            ? corBadge[pulseiraPorCodigo.get(c)!.cor] || 'bg-gray-400'
                            : 'bg-gray-400'
                        }`}></span>
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Aviso se > 18 */}
                {perfil.pulseiras.length > 18 && (
                  <p className="text-yellow-500 text-xs">
                    ⚠️ {perfil.pulseiras.length} pulseiras ({codigosReal.length} únicas).
                    Limitado a 18 para binds automáticos.
                  </p>
                )}

                {/* Ações */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => handleAplicarPerfil(perfil, 'adicionar')}
                    className="flex-1 min-w-20 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  >
                    ➕ Adicionar
                  </button>
                  <button
                    onClick={() => handleAplicarPerfil(perfil, 'substituir')}
                    className="flex-1 min-w-20 bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  >
                    🔄 {perfil.pulseiras.length > 18 ? 'Lim. 18' : 'Substituir'}
                  </button>
                  <button
                    onClick={() => handlePartilhar(perfil)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      copiedId === perfil.id
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }`}
                  >
                    {copiedId === perfil.id ? '✅' : '📤'}
                  </button>
                </div>

                {/* Bind rápido do perfil */}
                <div className="pt-1 border-t border-gray-700">
                  <p className="text-gray-500 text-xs mb-1">Bind rápido (todas as {Math.min(perfil.pulseiras.length, 18)}):</p>
                  <code className="text-green-400 text-xs font-mono block bg-gray-900 rounded px-2 py-1.5 break-all">
                    bind keyboard F8 "{perfil.pulseiras.slice(0, 18).map((c) => c.trim().toUpperCase()).filter(Boolean).map((c) => `locpulseira ${c}`).join(';')}"
                  </code>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
