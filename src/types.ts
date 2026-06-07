export interface Pulseira {
  id: string;
  codigo: string;
  descricao: string;
  cor: string;
  createdAt: string;
}

export interface LogEntry {
  id: string;
  type: 'add' | 'remove' | 'locate' | 'bind' | 'copy' | 'profile';
  message: string;
  timestamp: string;
  codigo?: string;
}

export interface BindEntry {
  id: string;
  key: string;
  codigoPulseira: string;
  descricao: string;
  tipo: 'locpulseira' | 'custom';
  comando: string;
}

export interface ProfileEntry {
  id: string;
  nome: string;
  codigos: string[];
  createdAt: string;
  source: 'manual' | 'import';
}

export type Tab = 'pulseiras' | 'logs' | 'binds' | 'gerador';
