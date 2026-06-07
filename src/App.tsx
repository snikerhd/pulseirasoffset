import { useState, useCallback } from 'react';
import { Pulseira, LogEntry, BindEntry, Perfil, Tab } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import Header from './components/Header';
import PulseirasTab from './components/PulseirasTab';
import LogsTab from './components/LogsTab';
import BindsTab from './components/BindsTab';
import GeradorTab from './components/GeradorTab';
import PerfisTab from './components/PerfisTab';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('pulseiras');
  const [pulseiras, setPulseiras] = useLocalStorage<Pulseira[]>('fivem_pulseiras', []);
  const [logs, setLogs] = useLocalStorage<LogEntry[]>('fivem_logs', []);
  const [binds, setBinds] = useLocalStorage<BindEntry[]>('fivem_binds', []);
  const [perfis, setPerfis] = useLocalStorage<Perfil[]>('fivem_perfis', []);

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

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalPulseiras={pulseiras.length}
        totalBinds={binds.length}
        totalPerfis={perfis.length}
      />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'pulseiras' && (
          <PulseirasTab
            pulseiras={pulseiras}
            setPulseiras={setPulseiras}
            addLog={addLog}
          />
        )}
        {activeTab === 'logs' && (
          <LogsTab
            logs={logs}
            setLogs={setLogs}
          />
        )}
        {activeTab === 'binds' && (
          <BindsTab
            binds={binds}
            setBinds={setBinds}
            pulseiras={pulseiras}
            addLog={addLog}
          />
        )}
        {activeTab === 'gerador' && (
          <GeradorTab
            pulseiras={pulseiras}
            addLog={addLog}
          />
        )}
        {activeTab === 'perfis' && (
          <PerfisTab
            perfis={perfis}
            setPerfis={setPerfis}
            pulseiras={pulseiras}
            setPulseiras={setPulseiras}
            addLog={addLog}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-10 py-4 text-center text-gray-600 text-xs">
        <p>FiveM Pulseiras Manager — Todos os dados guardados localmente no browser</p>
      </footer>
    </div>
  );
}
