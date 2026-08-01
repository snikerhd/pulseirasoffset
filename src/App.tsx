import { useState, useCallback, type ChangeEvent } from 'react';
import { Pulseira, LogEntry, BindEntry, ProfileEntry, Tab } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import Header from './components/Header';
import PulseirasTab from './components/PulseirasTab';
import LogsTab from './components/LogsTab';
import BindsTab from './components/BindsTab';
import GeradorTab from './components/GeradorTab';

interface BackupPayload {
  version: number;
  exportedAt: string;
  pulseiras: Pulseira[];
  logs: LogEntry[];
  binds: BindEntry[];
  profiles: ProfileEntry[];
}

function ensureArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function normalizePayload(raw: unknown): BackupPayload {
  const source =
    raw && typeof raw === 'object' && 'data' in (raw as Record<string, unknown>)
      ? ((raw as Record<string, unknown>).data as Record<string, unknown>)
      : (raw as Record<string, unknown> | null);

  return {
    version: Number(source?.version ?? 1),
    exportedAt: String(source?.exportedAt ?? new Date().toISOString()),
    pulseiras: ensureArray<Pulseira>(source?.pulseiras),
    logs: ensureArray<LogEntry>(source?.logs),
    binds: ensureArray<BindEntry>(source?.binds),
    profiles: ensureArray<ProfileEntry>(source?.profiles),
  };
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('pulseiras');
  const [pulseiras, setPulseiras] = useLocalStorage<Pulseira[]>('fivem_pulseiras', []);
  const [logs, setLogs] = useLocalStorage<LogEntry[]>('fivem_logs', []);
  const [binds, setBinds] = useLocalStorage<BindEntry[]>('fivem_binds', []);
  const [profiles, setProfiles] = useLocalStorage<ProfileEntry[]>('fivem_profiles', []);
  const [backupMessage, setBackupMessage] = useState('');

  const showBackupMessage = useCallback((message: string) => {
    setBackupMessage(message);
    window.setTimeout(() => setBackupMessage(''), 3200);
  }, []);

  const addLog = useCallback(
    (log: Omit<LogEntry, 'id' | 'timestamp'>) => {
      const entry: LogEntry = {
        ...log,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      };
      setLogs((prev) => [...prev, entry]);
    },
    [setLogs]
  );

  const buildPayload = useCallback(
    (): BackupPayload => ({
      version: 1,
      exportedAt: new Date().toISOString(),
      pulseiras,
      logs,
      binds,
      profiles,
    }),
    [pulseiras, logs, binds, profiles]
  );

  const applyPayload = useCallback(
    (payload: BackupPayload) => {
      setPulseiras(payload.pulseiras);
      setLogs(payload.logs);
      setBinds(payload.binds);
      setProfiles(payload.profiles);
    },
    [setPulseiras, setLogs, setBinds, setProfiles]
  );

  const handleExportBackup = () => {
    const payload = buildPayload();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pulseiras-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showBackupMessage('Backup exportado com sucesso. Guarda este ficheiro fora do browser.');
  };

  const handleImportBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = normalizePayload(JSON.parse(text));
      applyPayload(parsed);
      showBackupMessage(
        `Backup restaurado: ${parsed.pulseiras.length} pulseiras, ${parsed.profiles.length} perfis e ${parsed.binds.length} binds.`
      );
    } catch (error) {
      console.error(error);
      alert('Não foi possível importar o backup. Verifica se o ficheiro JSON está correto.');
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalPulseiras={pulseiras.length}
        totalBinds={binds.length}
        totalProfiles={profiles.length}
      />

      <section className="border-b border-gray-800 bg-gray-925/60">
        <div className="max-w-7xl mx-auto px-4 py-4 space-y-3">
          <div className="rounded-xl border border-amber-800 bg-amber-900/20 px-4 py-3">
            <p className="text-amber-300 text-sm font-medium">⚠️ Sobre guardar dados</p>
            <p className="text-gray-300 text-xs mt-1">
              Em modo privado/incógnito, o browser pode apagar o armazenamento local quando fechas a sessão.
              Para não perder pulseiras, perfis, binds e logs, usa sempre <strong className="text-white">Exportar Backup</strong>.
            </p>
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900 px-4 py-4 space-y-3">
            <div>
              <p className="text-white text-sm font-medium">💾 Backup local</p>
              <p className="text-gray-500 text-xs mt-1">
                Exporta um ficheiro JSON com todas as pulseiras, perfis, binds e logs. Depois podes restaurar tudo com Importar Backup.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleExportBackup}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                ⬇️ Exportar Backup
              </button>
              <label className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer">
                ⬆️ Importar Backup
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {backupMessage && (
            <div className="rounded-xl border border-green-800 bg-green-900/20 px-4 py-3">
              <p className="text-green-400 text-sm">{backupMessage}</p>
            </div>
          )}
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'pulseiras' && (
          <PulseirasTab
            pulseiras={pulseiras}
            setPulseiras={setPulseiras}
            profiles={profiles}
            setProfiles={setProfiles}
            addLog={addLog}
          />
        )}
        {activeTab === 'logs' && <LogsTab logs={logs} setLogs={setLogs} />}
        {activeTab === 'binds' && (
          <BindsTab
            binds={binds}
            setBinds={setBinds}
            pulseiras={pulseiras}
            addLog={addLog}
          />
        )}
        {activeTab === 'gerador' && <GeradorTab pulseiras={pulseiras} addLog={addLog} />}
      </main>

      <footer className="border-t border-gray-800 py-4 mt-8">
        <p className="text-center text-gray-600 text-xs">
          FiveM Pulseiras Manager · Gestor de Pulseiras Eletrónicas
        </p>
      </footer>
    </div>
  );
}
