export interface FsItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  children?: FsItem[];
}

export interface OpenFile {
  path: string;
  name: string;
  content: string;
  originalContent: string;
  isDirty: boolean;
  language: string;
}

export interface SqlColumn {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: any;
  pk: number;
}

export interface SqlTable {
  name: string;
  type: string;
  sql: string;
  rowCount: number;
  columns?: SqlColumn[];
}

export interface SqlQueryResult {
  columns: string[];
  rows: any[];
  rowCount: number;
  duration: number;
  isSelect: boolean;
  message?: string;
  error?: string;
}

export interface ServerLogEntry {
  id: string;
  timestamp: string;
  type: "server" | "php" | "sql" | "error";
  message: string;
  details?: string;
}

export interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  badge: string;
}
