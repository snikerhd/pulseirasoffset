import { useState } from 'react';
import { Pulseira, LogEntry } from '../types';

interface GeradorTabProps {
  pulseiras: Pulseira[];
  addLog: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;
}

export default function GeradorTab({ pulseiras, addLog }: GeradorTabProps) {
  const [input, setInput] = useState('');
  const [separator, setSeparator] = useState(';');
  const [prefix, setPrefix] = useState('locpulseira');
  const [resultado, setResultado] = useState('');
  const [copied, setCopied] = useState(false);
  const [selectedPulseiras, setSelectedPulseiras] = useState<string[]>([]);

  const gerarFromInput = () => {
    const linhas = input
      .split('\n')
      .map((l) => l.trim().toUpperCase())
      .filter(Boolean);

    if (linhas.length === 0) return;

    const cmds = linhas.map((l) => `${prefix} ${l}`).join(separator);
    setResultado(cmds);
    addLog({ type: 'copy', message: `Gerador: ${linhas.length} comandos gerados` });
  };

  const gerarFromPulseiras = () => {
    if (selectedPulseiras.length === 0) {
      const cmds = pulseiras.map((p) => `${prefix} ${p.codigo}`).join(separator);
      setResultado(cmds);
      addLog({ type: 'copy', message: `Gerador: todos os ${pulseiras.length} comandos gerados` });
    } else {
      const cmds = selectedPulseiras.map((c) => `${prefix} ${c}`).join(separator);
      setResultado(cmds);
      addLog({ type: 'copy', message: `Gerador: ${selectedPulseiras.length} comandos gerados` });
    }
  };

  const togglePulseira = (codigo: string) => {
    setSelectedPulseiras((prev) =>
      prev.includes(codigo) ? prev.filter((c) => c !== codigo) : [...prev, codigo]
    );
  };

  const handleCopy = () => {
    if (!resultado) return;
    navigator.clipboard.writeText(resultado);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addLog({ type: 'copy', message: 'Resultado do gerador copiado' });
  };

  const exemplos = [
    { label: 'Separador ; (inline)', value: ';' },
    { label: 'Separador | (pipe)', value: '|' },
    { label: 'Nova linha', value: '\n' },
    { label: 'Espaço', value: ' ' },
  ];

  return (
    <div className="space-y-5">
      <div className="bg-purple-900/20 border border-purple-800 rounded-xl p-4">
        <p className="text-purple-300 text-sm font-medium mb-1">⚡ Gerador de Comandos</p>
        <p className="text-gray-400 text-xs">
          Gera rapidamente uma sequência de comandos <code className="text-yellow-400">locpulseira</code> para vários
          códigos de uma vez. Cola o resultado no F8 do FiveM.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Painel esquerdo — Input manual */}
        <div className="space-y-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
              ✍️ Inserir Códigos Manualmente
            </h3>
            <p className="text-gray-500 text-xs">Um código por linha</p>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={'PSS54950\nPSS52414\nPSS99123'}
              rows={6}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm font-mono resize-none"
            />
            <button
              onClick={gerarFromInput}
              disabled={!input.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white py-2 rounded-lg text-sm font-medium transition-colors"
            >
              ⚡ Gerar
            </button>
          </div>

          {/* Pulseiras guardadas */}
          {pulseiras.length > 0 && (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
              <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                ⌚ Das Pulseiras Guardadas
              </h3>
              <p className="text-gray-500 text-xs">
                {selectedPulseiras.length === 0
                  ? 'Seleciona pulseiras ou gera todas'
                  : `${selectedPulseiras.length} selecionadas`}
              </p>
              <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
                {pulseiras.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => togglePulseira(p.codigo)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition-all ${
                      selectedPulseiras.includes(p.codigo)
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'border-gray-600 text-gray-400 hover:border-gray-400 hover:text-white'
                    }`}
                  >
                    {p.codigo}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={gerarFromPulseiras}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {selectedPulseiras.length === 0 ? '⚡ Gerar Todas' : `⚡ Gerar ${selectedPulseiras.length}`}
                </button>
                {selectedPulseiras.length > 0 && (
                  <button
                    onClick={() => setSelectedPulseiras([])}
                    className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-2 rounded-lg text-sm transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Painel direito — Configuração e resultado */}
        <div className="space-y-4">
          {/* Configuração */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
            <h3 className="text-white font-semibold text-sm">⚙️ Configuração</h3>

            <div>
              <label className="text-gray-400 text-xs mb-1 block">Prefixo do comando</label>
              <input
                type="text"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm font-mono"
              />
            </div>

            <div>
              <label className="text-gray-400 text-xs mb-2 block">Separador entre comandos</label>
              <div className="grid grid-cols-2 gap-2">
                {exemplos.map((ex) => (
                  <button
                    key={ex.label}
                    onClick={() => setSeparator(ex.value)}
                    className={`px-3 py-2 rounded-lg text-xs border transition-all text-left ${
                      separator === ex.value
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'border-gray-600 text-gray-400 hover:border-gray-400'
                    }`}
                  >
                    {ex.label}
                  </button>
                ))}
              </div>
              <div className="mt-2">
                <label className="text-gray-400 text-xs mb-1 block">Ou custom:</label>
                <input
                  type="text"
                  value={separator}
                  onChange={(e) => setSeparator(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm font-mono"
                  placeholder=";"
                />
              </div>
            </div>
          </div>

          {/* Resultado */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold text-sm">📤 Resultado</h3>
              {resultado && (
                <span className="text-gray-500 text-xs">
                  {resultado.split(separator === '\n' ? '\n' : separator).filter(Boolean).length} comandos
                </span>
              )}
            </div>

            {resultado ? (
              <>
                <div className="bg-gray-900 rounded-lg p-3 border border-gray-700 max-h-48 overflow-y-auto">
                  <pre className="text-green-400 text-xs font-mono whitespace-pre-wrap break-all leading-relaxed">
                    {resultado}
                  </pre>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                      copied
                        ? 'bg-green-600 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {copied ? '✅ Copiado!' : '📋 Copiar Resultado'}
                  </button>
                  <button
                    onClick={() => setResultado('')}
                    className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-2 rounded-lg text-sm transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </>
            ) : (
              <div className="bg-gray-900/50 rounded-lg p-6 border border-dashed border-gray-700 text-center text-gray-600 text-sm">
                O resultado gerado aparece aqui
              </div>
            )}
          </div>

          {/* Exemplo rápido */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <p className="text-gray-400 text-xs font-medium mb-2">📖 Exemplo de output com separador ";"</p>
            <code className="text-green-400 text-xs font-mono block bg-gray-900 rounded p-2">
              locpulseira PSS54950;locpulseira PSS52414
            </code>
            <p className="text-gray-600 text-xs mt-2">
              Cola este comando diretamente no F8 do FiveM para localizar várias pulseiras de seguida.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
