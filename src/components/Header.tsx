import { Tab } from '../types';

interface HeaderProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  totalPulseiras: number;
  totalBinds: number;
  totalProfiles: number;
}

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'pulseiras', label: 'Pulseiras', icon: '⌚' },
  { id: 'logs', label: 'Logs', icon: '📋' },
  { id: 'binds', label: 'Binds', icon: '🎮' },
  { id: 'gerador', label: 'Gerador', icon: '⚡' },
];

export default function Header({ activeTab, setActiveTab, totalPulseiras, totalBinds, totalProfiles }: HeaderProps) {
  return (
    <header className="bg-gray-900 border-b border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xl shadow-lg shadow-purple-900/40">
              ⌚
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-tight">FiveM Pulseiras</h1>
              <p className="text-gray-400 text-xs">Gestor de Pulseiras para FiveM</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-center">
              <p className="text-blue-400 font-bold text-lg leading-none">{totalPulseiras}</p>
              <p className="text-gray-500 text-xs">Pulseiras</p>
            </div>
            <div className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-center">
              <p className="text-amber-400 font-bold text-lg leading-none">{totalProfiles}</p>
              <p className="text-gray-500 text-xs">Perfis</p>
            </div>
            <div className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-center">
              <p className="text-purple-400 font-bold text-lg leading-none">{totalBinds}</p>
              <p className="text-gray-500 text-xs">Binds</p>
            </div>
          </div>
        </div>
        <nav className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
