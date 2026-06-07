export interface Pulseira {
  id: string;
  codigo: string;
  descricao: string;
  cor: string;
  createdAt: string;
  nomePessoa?: string; // nome da pessoa associada (importado do Excel)
}

export interface LogEntry {
  id: string;
  type: 'add' | 'remove' | 'locate' | 'bind' | 'copy';
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

export interface Perfil {
  id: string;
  nome: string;
  pulseiras: string[]; // array de códigos
  createdAt: string;
}

export type Tab = 'pulseiras' | 'logs' | 'binds' | 'gerador' | 'perfis';
