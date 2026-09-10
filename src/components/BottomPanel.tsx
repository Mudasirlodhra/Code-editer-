import React, { useState, useEffect } from "react";
import {
  X,
  Terminal,
  Database,
  RotateCw,
  Play,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Clock,
  ChevronUp,
} from "lucide-react";
import { ServerLogEntry } from "../types";
import { SqlStudio } from "./SqlStudio";

interface BottomPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: "terminal" | "sql" | "logs";
  setActiveTab: (tab: "terminal" | "sql" | "logs") => void;
  activeFilePath?: string;
  executeTrigger?: number;
}

export const BottomPanel: React.FC<BottomPanelProps> = ({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  activeFilePath,
  executeTrigger,
}) => {
  const [phpSnippet, setPhpSnippet] = useState(`echo "PHP " . phpversion() . " running on " . PHP_OS . "\\n";\n`);
  const [cliOutput, setCliOutput] = useState<{
    stdout: string;
    stderr: string;
    exitCode: number;
    duration: number;
  } | null>(null);
  const [isExecutingCli, setIsExecutingCli] = useState(false);
  const [logs, setLogs] = useState<ServerLogEntry[]>([]);

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/logs");
      const data = await res.json();
      if (data.logs) {
        setLogs(data.logs);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === "logs") {
      fetchLogs();
      const interval = setInterval(fetchLogs, 2000);
      return () => clearInterval(interval);
    }
  }, [isOpen, activeTab]);

  const clearLogs = async () => {
    try {
      await fetch("/api/logs/clear", { method: "POST" });
      setLogs([]);
    } catch {
      // ignore
    }
  };

  const runCurrentFileCli = async () => {
    if (!activeFilePath) return;
    setIsExecutingCli(true);
    try {
      const res = await fetch("/api/php/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath: activeFilePath }),
      });
      const data = await res.json();
      setCliOutput(data);
    } catch (e: any) {
      setCliOutput({
        stdout: "",
        stderr: e.message,
        exitCode: 1,
        duration: 0,
      });
    } finally {
      setIsExecutingCli(false);
    }
  };

  useEffect(() => {
    if (executeTrigger && activeFilePath) {
      if (activeFilePath.endsWith(".sql")) {
        setActiveTab("sql");
      } else {
        setActiveTab("terminal");
        runCurrentFileCli();
      }
    }
  }, [executeTrigger]);

  const runSnippetCli = async () => {
    if (!phpSnippet.trim()) return;
    setIsExecutingCli(true);
    try {
      const res = await fetch("/api/php/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: phpSnippet }),
      });
      const data = await res.json();
      setCliOutput(data);
    } catch (e: any) {
      setCliOutput({
        stdout: "",
        stderr: e.message,
        exitCode: 1,
        duration: 0,
      });
    } finally {
      setIsExecutingCli(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="h-64 bg-[#0d1117] border-t border-[#30363d] flex flex-col shrink-0 select-none z-20">
      {/* Panel Tab Bar */}
      <div className="h-8 bg-[#161b22] border-b border-[#30363d] px-3 flex items-center justify-between text-xs text-zinc-400 shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab("terminal")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors text-xs ${
              activeTab === "terminal"
                ? "bg-[#0d1117] text-purple-300 font-medium border-t-2 border-purple-500"
                : "hover:bg-[#21262d] text-zinc-400"
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-purple-400" />
            <span>PHP CLI Terminal</span>
          </button>
          <button
            onClick={() => setActiveTab("sql")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors text-xs ${
              activeTab === "sql"
                ? "bg-[#0d1117] text-cyan-300 font-medium border-t-2 border-cyan-500"
                : "hover:bg-[#21262d] text-zinc-400"
            }`}
          >
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span>SQL Studio</span>
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors text-xs ${
              activeTab === "logs"
                ? "bg-[#0d1117] text-amber-300 font-medium border-t-2 border-amber-500"
                : "hover:bg-[#21262d] text-zinc-400"
            }`}
          >
            <RotateCw className="w-3.5 h-3.5 text-amber-400" />
            <span>Localhost Server Logs ({logs.length})</span>
          </button>
        </div>

        <button
          onClick={onClose}
          className="p-1 hover:bg-[#21262d] text-zinc-400 hover:text-white rounded"
          title="Close panel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-hidden">
        {/* Tab 1: PHP CLI Terminal */}
        {activeTab === "terminal" && (
          <div className="flex h-full font-mono text-xs">
            {/* Left: CLI execution controls */}
            <div className="w-80 bg-[#161b22] border-r border-[#30363d] p-3 flex flex-col gap-2 shrink-0">
              <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                <span className="font-semibold text-zinc-300">PHP CLI Command Runner</span>
                <span className="text-purple-400">php -r / php -f</span>
              </div>

              {activeFilePath && activeFilePath.endsWith(".php") && (
                <button
                  onClick={runCurrentFileCli}
                  disabled={isExecutingCli}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded text-xs transition-colors font-sans font-medium active:scale-95"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Run {activeFilePath} in CLI</span>
                </button>
              )}

              <div className="flex flex-col gap-1 flex-1">
                <span className="text-[11px] text-zinc-400 font-sans">Quick PHP Snippet:</span>
                <textarea
                  value={phpSnippet}
                  onChange={(e) => setPhpSnippet(e.target.value)}
                  className="w-full flex-1 bg-[#0d1117] border border-[#30363d] rounded p-2 text-zinc-200 text-xs focus:outline-none focus:border-purple-500 resize-none font-mono"
                />
              </div>

              <button
                onClick={runSnippetCli}
                disabled={isExecutingCli}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-purple-300 border border-purple-800/40 rounded text-xs transition-colors font-sans font-medium"
              >
                <Play className="w-3 h-3" />
                <span>Execute Snippet</span>
              </button>
            </div>

            {/* Right: Output terminal */}
            <div className="flex-1 bg-[#090d13] p-3 overflow-y-auto flex flex-col">
              <div className="flex items-center justify-between text-[11px] text-zinc-500 pb-2 border-b border-[#21262d] mb-2">
                <span>Terminal Output</span>
                {cliOutput && (
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Exit Code {cliOutput.exitCode}
                    </span>
                    <span>{cliOutput.duration}ms</span>
                  </div>
                )}
              </div>

              {isExecutingCli ? (
                <div className="text-purple-400 animate-pulse">Running PHP command...</div>
              ) : cliOutput ? (
                <div className="space-y-2">
                  {cliOutput.stdout && (
                    <pre className="text-zinc-200 whitespace-pre-wrap">{cliOutput.stdout}</pre>
                  )}
                  {cliOutput.stderr && (
                    <pre className="text-red-400 whitespace-pre-wrap">{cliOutput.stderr}</pre>
                  )}
                  {!cliOutput.stdout && !cliOutput.stderr && (
                    <span className="text-zinc-500 italic">[Process completed with no output]</span>
                  )}
                </div>
              ) : (
                <div className="text-zinc-600">
                  Ready to execute PHP CLI commands. Click "Run current file in CLI" or execute a snippet above.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: SQL Studio */}
        {activeTab === "sql" && (
          <div className="h-full">
            <SqlStudio compact={false} />
          </div>
        )}

        {/* Tab 3: Localhost Server Logs */}
        {activeTab === "logs" && (
          <div className="h-full flex flex-col bg-[#090d13] text-xs font-mono">
            <div className="p-2 border-b border-[#21262d] flex items-center justify-between bg-[#161b22] text-[11px] text-zinc-400">
              <div className="flex items-center gap-2">
                <span>Live Localhost Proxy & Server Activity</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <button
                onClick={clearLogs}
                className="flex items-center gap-1 px-2 py-0.5 bg-[#21262d] hover:bg-[#30363d] text-zinc-300 rounded text-[10px]"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {logs.length === 0 ? (
                <div className="text-zinc-600 p-4 text-center">
                  No server logs captured yet. Navigate the localhost browser to see real HTTP requests.
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-2 py-0.5 px-2 hover:bg-[#161b22] rounded text-[11px]"
                  >
                    <span className="text-zinc-500 shrink-0">{log.timestamp}</span>
                    <span
                      className={`px-1 py-0.2 rounded text-[9px] font-bold uppercase shrink-0 ${
                        log.type === "php"
                          ? "bg-purple-950 text-purple-300"
                          : log.type === "sql"
                          ? "bg-cyan-950 text-cyan-300"
                          : log.type === "error"
                          ? "bg-red-950 text-red-300"
                          : "bg-zinc-800 text-zinc-300"
                      }`}
                    >
                      {log.type}
                    </span>
                    <span className="text-zinc-300 truncate">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
