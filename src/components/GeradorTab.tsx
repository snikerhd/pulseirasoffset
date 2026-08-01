import { useMemo, useState } from 'react';
import { Pulseira, LogEntry } from '../types';
import {
  buildLocPulseiraCommands,
  limitPulseiraCodes,
  MAX_PULSEIRAS_PER_COMMAND,
  parsePulseiraCodes,
} from '../utils/pulseiras';

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
  const [limitMessage, setLimitMessage] = useState('');

  const parsedInputCodes = useMemo(() => parsePulseiraCodes(input), [input]);

  const applyPrefix = (codes: string[]) => {
    if (prefix.trim().toLowerCase() === 'locpulseira') {
      return buildLocPulseiraCommands(codes, separator);
    }

    const realSeparator = separator === '\n' ? '\n' : separator;
    return codes.map((code) => `${prefix} ${code}`).join(realSeparator);
  };

  const generateWithLimit = (codes: string[], originLabel: string) => {
    const limited = limitPulseiraCodes(codes);
    if (limited.length === 0) return;

    const ignoredCount = Math.max(0, codes.length - limited.length);
    const cmds = applyPrefix(limited);
    setResultado(cmds);

    addLog({
      type: 'copy',
      message:
        ignoredCount > 0
          ? `Gerador: ${limited.length} comandos gerados de ${originLabel} (${ignoredCount} fora por limite)`
          : `Gerador: ${limited.length} comandos gerados de ${originLabel}`,
    });

    setLimitMessage(
      ignoredCount > 0
        ? `O gerador usou só ${limited.length} pulseiras. ${ignoredCount} ficaram de fora por causa do limite.`
        : `Geradas ${limited.length} pulseiras.`
    );
  };

  const gerarFromInput = () => {
    generateWithLimit(parsedInputCodes, 'input manual');
  };

  const gerarFromPulseiras = () => {
    if (selectedPulseiras.length === 0) {
      generateWithLimit(
        pulseiras.map((p) => p.codigo),
        'pulseiras guardadas'
      );
    } else {
      generateWithLimit(selectedPulseiras, 'seleção manual');
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

  const resultadoCount = useMemo(() => {
    if (!resultado) return 0;
    const realSeparator = separator === '\n' ? '\n' : separator;
    return resultado.split(realSeparator).filter(Boolean).length;
  }, [resultado, separator]);

  return (
    <div className="space-y-5">
      <div className="bg-purple-900/20 border border-purple-800 rounded-xl p-4">
        <p className="text-purple-300 text-sm font-medium mb-1">⚡ Gerador de Comandos</p>
        <p className="text-gray-400 text-xs">
          Gera rapidamente uma sequência de comandos <code className="text-yellow-400">locpulseira</code> para vários
          códigos de uma vez. O output é limitado a <strong className="text-white">{MAX_PULSEIRAS_PER_COMMAND}</strong> pulseiras por vez.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">✍️ Inserir Códigos ou Comandos</h3>
            <p className="text-gray-500 text-xs">Podes colar códigos simples ou texto como locpulseira XXX;locpulseira YYY</p>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={'PSS54950\nPSS52414\nlocpulseira PSS99123'}
              rows={6}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm font-mono resize-none"
            />
            <div className="rounded-lg border border-gray-700 bg-gray-900/60 p-3 text-xs text-gray-400">
              Detetadas: <strong className="text-white">{parsedInputCodes.length}</strong>
              {parsedInputCodes.length > MAX_PULSEIRAS_PER_COMMAND && (
                <span className="text-amber-400"> — só entram {MAX_PULSEIRAS_PER_COMMAND} no resultado</span>
              )}
            </div>
            <button
              onClick={gerarFromInput}
              disabled={parsedInputCodes.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white py-2 rounded-lg text-sm font-medium transition-colors"
            >
              ⚡ Gerar
            </button>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">⚙️ Opções</h3>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Prefixo do comando</label>
              <input
                type="text"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-2 block">Separador</label>
              <div className="flex flex-wrap gap-2">
                {exemplos.map((ex) => (
                  <button
                    key={ex.value}
                    onClick={() => setSeparator(ex.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      separator === ex.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-400 hover:text-white border border-gray-600'
                    }`}
                  >
                    {ex.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">📦 Pulseiras Guardadas</h3>
            <p className="text-gray-500 text-xs">
              Clica nas pulseiras para selecionar. Se não selecionares nenhuma, usa todas.
            </p>
            {pulseiras.length === 0 ? (
              <p className="text-gray-600 text-xs">Nenhuma pulseira guardada.</p>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {pulseiras.map((p) => {
                  const active = selectedPulseiras.includes(p.codigo);
                  return (
                    <button
                      key={p.id}
                      onClick={() => togglePulseira(p.codigo)}
                      className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
                        active
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-400 hover:text-white border border-gray-600'
                      }`}
                    >
                      {p.codigo}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="text-xs text-gray-500">
              {selectedPulseiras.length === 0
                ? `Todas as ${pulseiras.length} pulseiras serão usadas`
                : `${selectedPulseiras.length} selecionadas`}
            </div>
            <button
              onClick={gerarFromPulseiras}
              disabled={pulseiras.length === 0}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white py-2 rounded-lg text-sm font-medium transition-colors"
            >
              📦 Gerar das Guardadas
            </button>
          </div>

          {/* Resultado */}
          {resultado && (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold text-sm">📄 Resultado ({resultadoCount} comandos)</h3>
                <button
                  onClick={handleCopy}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    copied
                      ? 'bg-green-600 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {copied ? '✅ Copiado!' : '📋 Copiar'}
                </button>
              </div>
              <code className="block text-green-400 text-xs font-mono whitespace-pre-wrap break-all bg-gray-950 rounded-lg p-3 max-h-48 overflow-y-auto border border-gray-700">
                {resultado}
              </code>
              {limitMessage && (
                <p className="text-amber-400 text-xs">{limitMessage}</p>
              )}
            </div>
          )}

          {!resultado && (
            <div className="text-center py-12 text-gray-500">
              <div className="text-5xl mb-3">⚡</div>
              <p className="text-lg font-medium text-gray-400">Sem resultado</p>
              <p className="text-sm mt-1">Insere códigos ou usa as pulseiras guardadas para gerar comandos</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
