import React, { useState, useEffect } from "react";
import {
  Database,
  Play,
  RotateCw,
  Table as TableIcon,
  Download,
  AlertCircle,
  CheckCircle,
  Plus,
  Layers,
  ChevronRight,
  Code,
} from "lucide-react";
import { SqlTable, SqlQueryResult } from "../types";

interface SqlStudioProps {
  onRunQuery?: (query: string) => void;
  compact?: boolean;
}

export const SqlStudio: React.FC<SqlStudioProps> = ({ onRunQuery, compact = false }) => {
  const [tables, setTables] = useState<SqlTable[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [query, setQuery] = useState<string>("SELECT * FROM notes ORDER BY id DESC LIMIT 50;");
  const [result, setResult] = useState<SqlQueryResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [activeTab, setActiveTab] = useState<"query" | "schema" | "tables">("query");

  const fetchTables = async () => {
    setIsLoadingTables(true);
    try {
      const res = await fetch("/api/sql/tables");
      const data = await res.json();
      if (data.tables) {
        setTables(data.tables);
        if (!selectedTable && data.tables.length > 0) {
          setSelectedTable(data.tables[0].name);
        }
      }
    } catch (e) {
      console.error("Failed to load tables", e);
    } finally {
      setIsLoadingTables(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  const executeQuery = async (sqlToRun?: string) => {
    const targetSql = sqlToRun || query;
    if (!targetSql.trim()) return;

    setIsRunning(true);
    try {
      const res = await fetch("/api/sql/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: targetSql }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({
          columns: [],
          rows: [],
          rowCount: 0,
          duration: data.duration || 0,
          isSelect: false,
          error: data.error || "Query failed",
        });
      } else {
        setResult(data);
        // Refresh tables if DDL/DML was run
        if (!data.isSelect) {
          fetchTables();
        }
      }
    } catch (e: any) {
      setResult({
        columns: [],
        rows: [],
        rowCount: 0,
        duration: 0,
        isSelect: false,
        error: e.message,
      });
    } finally {
      setIsRunning(false);
    }
  };

  const selectQuickTable = (tableName: string) => {
    setSelectedTable(tableName);
    const sql = `SELECT * FROM ${tableName} LIMIT 50;`;
    setQuery(sql);
    executeQuery(sql);
  };

  const exportCsv = () => {
    if (!result || !result.rows || result.rows.length === 0) return;
    const cols = result.columns;
    const csvRows = [
      cols.join(","),
      ...result.rows.map((row) =>
        cols.map((col) => `"${String(row[col] ?? "").replace(/"/g, '""')}"`).join(",")
      ),
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `query_result_${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1117] text-[#c9d1d9] overflow-hidden text-xs">
      {/* Studio Header */}
      <div className="h-9 bg-[#161b22] border-b border-[#30363d] px-3 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2">
          <Database className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold text-white">SQLite Database Studio</span>
          <span className="text-[10px] bg-cyan-950/80 border border-cyan-800 text-cyan-300 px-1.5 py-0.5 rounded font-mono">
            database.sqlite
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchTables}
            title="Refresh database tables"
            className="p-1 text-zinc-400 hover:text-white hover:bg-[#21262d] rounded"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoadingTables ? "animate-spin text-cyan-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Studio Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Tables list sidebar (if not compact) */}
        {!compact && (
          <div className="w-48 bg-[#161b22] border-r border-[#30363d] flex flex-col shrink-0 select-none">
            <div className="p-2 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider border-b border-[#30363d] flex items-center justify-between">
              <span>Tables ({tables.length})</span>
            </div>
            <div className="flex-1 overflow-y-auto p-1 space-y-0.5">
              {tables.length === 0 ? (
                <div className="p-3 text-zinc-500 text-center text-[11px]">
                  No tables created yet. Run a CREATE TABLE query or run the PHP app to initialize.
                </div>
              ) : (
                tables.map((tbl) => (
                  <button
                    key={tbl.name}
                    onClick={() => selectQuickTable(tbl.name)}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-left transition-colors ${
                      selectedTable === tbl.name
                        ? "bg-cyan-950/40 text-cyan-300 border border-cyan-800/60 font-medium"
                        : "hover:bg-[#21262d] text-zinc-300"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <TableIcon className="w-3 h-3 text-cyan-400 shrink-0" />
                      <span className="truncate">{tbl.name}</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 bg-[#21262d] px-1 rounded font-mono">
                      {tbl.rowCount}
                    </span>
                  </button>
                ))
              )}
            </div>

            {/* Quick action: sample queries */}
            <div className="p-2 border-t border-[#30363d] bg-[#0d1117] flex flex-col gap-1">
              <button
                onClick={() => {
                  setQuery("SELECT * FROM notes WHERE is_completed = 0;");
                  executeQuery("SELECT * FROM notes WHERE is_completed = 0;");
                }}
                className="text-[11px] text-left text-zinc-400 hover:text-cyan-300 truncate"
              >
                &bull; Active Notes
              </button>
              <button
                onClick={() => {
                  setQuery("SELECT category, COUNT(*) as count FROM notes GROUP BY category;");
                  executeQuery("SELECT category, COUNT(*) as count FROM notes GROUP BY category;");
                }}
                className="text-[11px] text-left text-zinc-400 hover:text-cyan-300 truncate"
              >
                &bull; Category Stats
              </button>
              <button
                onClick={() => {
                  setQuery("SELECT * FROM users;");
                  executeQuery("SELECT * FROM users;");
                }}
                className="text-[11px] text-left text-zinc-400 hover:text-cyan-300 truncate"
              >
                &bull; All Users
              </button>
            </div>
          </div>
        )}

        {/* Right: Query Editor + Results Grid */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Query Input Box */}
          <div className="p-2 bg-[#161b22] border-b border-[#30363d] shrink-0">
            <div className="flex items-center justify-between mb-1 text-[11px] text-zinc-400">
              <span className="font-mono">SQL Query Editor</span>
              <span className="text-zinc-500">Supports SELECT, INSERT, UPDATE, CREATE, PRAGMA</span>
            </div>
            <textarea
              id="sql-query-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter SQL statement (e.g. SELECT * FROM notes;)"
              rows={3}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-md p-2 font-mono text-xs text-white focus:outline-none focus:border-cyan-500 resize-none"
            />
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <button
                  id="btn-execute-sql"
                  onClick={() => executeQuery()}
                  disabled={isRunning}
                  className="flex items-center gap-1.5 px-3 py-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-medium rounded-md shadow-sm transition-colors text-xs active:scale-95"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Execute SQL</span>
                </button>
                {result && (
                  <span className="text-[11px] text-zinc-400 font-mono">
                    {result.duration}ms {result.isSelect ? `(${result.rowCount} rows)` : ""}
                  </span>
                )}
              </div>

              {result && result.isSelect && result.rows.length > 0 && (
                <button
                  onClick={exportCsv}
                  className="flex items-center gap-1 px-2 py-1 bg-[#21262d] hover:bg-[#30363d] text-zinc-300 rounded text-[11px] transition-colors"
                >
                  <Download className="w-3 h-3" />
                  <span>Export CSV</span>
                </button>
              )}
            </div>
          </div>

          {/* Results Area */}
          <div className="flex-1 overflow-auto p-2">
            {isRunning && (
              <div className="flex items-center justify-center p-8 text-zinc-400 gap-2">
                <RotateCw className="w-4 h-4 animate-spin text-cyan-400" />
                <span>Running SQL query against SQLite database...</span>
              </div>
            )}

            {!isRunning && result && result.error && (
              <div className="p-3 bg-red-950/40 border border-red-800/80 rounded-md text-red-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="font-mono">{result.error}</div>
              </div>
            )}

            {!isRunning && result && !result.error && !result.isSelect && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-800/80 rounded-md text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{result.message || "Statement executed successfully."}</span>
              </div>
            )}

            {!isRunning && result && !result.error && result.isSelect && (
              <div>
                {result.rows.length === 0 ? (
                  <div className="p-6 text-center text-zinc-500">
                    Query returned 0 rows.
                  </div>
                ) : (
                  <div className="border border-[#30363d] rounded-md overflow-hidden bg-[#161b22]">
                    <table className="w-full text-left border-collapse font-mono text-xs">
                      <thead>
                        <tr className="bg-[#21262d] border-b border-[#30363d] text-zinc-300">
                          {result.columns.map((col) => (
                            <th key={col} className="p-2 font-semibold">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#30363d]">
                        {result.rows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-[#1a202a] transition-colors">
                            {result.columns.map((col) => (
                              <td key={col} className="p-2 text-zinc-300 truncate max-w-[240px]">
                                {row[col] === null ? (
                                  <span className="text-zinc-500 italic">NULL</span>
                                ) : typeof row[col] === "object" ? (
                                  JSON.stringify(row[col])
                                ) : (
                                  String(row[col])
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {!isRunning && !result && (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 p-6">
                <TableIcon className="w-8 h-8 text-zinc-600 mb-2" />
                <p className="text-xs">Click "Execute SQL" or select a table from the sidebar to view data.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
