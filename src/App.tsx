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

  const handleExportBackup = () => {
    const payload: BackupPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      pulseiras,
      logs,
      binds,
      profiles,
    };

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
      const parsed = JSON.parse(text) as Partial<BackupPayload>;

      const importedPulseiras = ensureArray<Pulseira>(parsed.pulseiras);
      const importedLogs = ensureArray<LogEntry>(parsed.logs);
      const importedBinds = ensureArray<BindEntry>(parsed.binds);
      const importedProfiles = ensureArray<ProfileEntry>(parsed.profiles);

      setPulseiras(importedPulseiras);
      setLogs(importedLogs);
      setBinds(importedBinds);
      setProfiles(importedProfiles);

      showBackupMessage(
        `Backup restaurado: ${importedPulseiras.length} pulseiras, ${importedProfiles.length} perfis e ${importedBinds.length} binds.`
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
            <p className="text-amber-300 text-sm font-medium">⚠️ Aviso sobre modo privado / incógnito</p>
            <p className="text-gray-300 text-xs mt-1">
              No modo privado, o browser pode apagar <strong className="text-white">localStorage</strong> quando fechas a sessão.
              Para não perder pulseiras, perfis, binds e logs, usa sempre <strong className="text-white">Exportar Backup</strong>.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-gray-800 bg-gray-900 px-4 py-3">
            <div>
              <p className="text-white text-sm font-medium">Backup dos dados</p>
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
                <input type="file" accept="application/json,.json" className="hidden" onChange={handleImportBackup} />
              </label>
            </div>
          </div>

          {backupMessage && (
            <div className="rounded-xl border border-blue-800 bg-blue-900/20 px-4 py-3 text-sm text-blue-300">
              {backupMessage}
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
          <BindsTab binds={binds} setBinds={setBinds} pulseiras={pulseiras} addLog={addLog} />
        )}
        {activeTab === 'gerador' && <GeradorTab pulseiras={pulseiras} addLog={addLog} />}
      </main>

      <footer className="border-t border-gray-800 mt-10 py-4 text-center text-gray-600 text-xs">
        <p>FiveM Pulseiras Manager — Dados guardados localmente no browser. Em modo privado, faz backup para não perder tudo.</p>
      </footer>
    </div>
  );
}
