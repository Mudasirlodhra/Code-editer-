import React from "react";
import {
  Play,
  Save,
  RotateCw,
  FolderPlus,
  FilePlus,
  Terminal,
  Database,
  Layers,
  Sparkles,
  Download,
  Trash2,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { TemplateInfo } from "../types";

interface HeaderProps {
  activeFileName?: string;
  hasUnsavedChanges: boolean;
  onSave: () => void;
  onRunPhp?: () => void;
  onNewFile: () => void;
  onNewFolder: () => void;
  onDeleteActiveFile?: () => void;
  onToggleBottomPanel: () => void;
  isBottomPanelOpen: boolean;
  bottomTab: "terminal" | "sql" | "logs";
  setBottomTab: (tab: "terminal" | "sql" | "logs") => void;
  currentTemplate: string;
  onSelectTemplate: (templateId: string) => void;
  onExportZip: () => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export const TEMPLATES: TemplateInfo[] = [
  {
    id: "crud-notes",
    name: "PHP + SQLite Full CRUD",
    description: "Complete database app with PDO, interactive forms, dynamic views, and JSON API.",
    badge: "Recommended",
  },
  {
    id: "rest-api",
    name: "PHP REST API & JSON",
    description: "Lightweight JSON microservices with routing, parameters, and SQLite models.",
    badge: "Backend",
  },
  {
    id: "sql-playground",
    name: "SQL Analytics & Relational Schema",
    description: "Multi-table relational schema with users, orders, analytical queries, and reports.",
    badge: "Database",
  },
];

export const Header: React.FC<HeaderProps> = ({
  activeFileName,
  hasUnsavedChanges,
  onSave,
  onRunPhp,
  onNewFile,
  onNewFolder,
  onDeleteActiveFile,
  onToggleBottomPanel,
  isBottomPanelOpen,
  bottomTab,
  setBottomTab,
  currentTemplate,
  onSelectTemplate,
  onExportZip,
  isSidebarOpen,
  onToggleSidebar,
}) => {
  const [templateMenuOpen, setTemplateMenuOpen] = React.useState(false);

  return (
    <header className="h-13 bg-[#161b22] border-b border-[#30363d] px-3 flex items-center justify-between select-none text-xs text-[#c9d1d9] shrink-0 z-30">
      {/* Brand & Status */}
      <div className="flex items-center gap-2.5">
        {onToggleSidebar && (
          <button
            id="btn-toggle-sidebar"
            onClick={onToggleSidebar}
            title={isSidebarOpen ? "Collapse Sidebar (Ctrl+B) for Full Width Editor" : "Expand Sidebar (Ctrl+B)"}
            className={`p-1.5 rounded-md border transition-colors ${
              !isSidebarOpen
                ? "bg-purple-950/60 border-purple-700/60 text-purple-300"
                : "bg-[#21262d] border-[#30363d] text-zinc-400 hover:text-white"
            }`}
          >
            {isSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
          </button>
        )}

        <div className="flex items-center gap-2 font-semibold text-white tracking-tight">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-sm text-white font-bold text-xs">
            PHP
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white leading-none">PHP & SQL Web IDE</span>
            <span className="text-[10px] text-zinc-400 leading-tight mt-0.5">Code Editor & SQLite Studio</span>
          </div>
        </div>

        {/* Runtime Badges */}
        <div className="hidden lg:flex items-center gap-2 ml-2 pl-3 border-l border-[#30363d]">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-purple-950/60 border border-purple-800/60 text-[11px] text-purple-300 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            PHP 8.2 (CLI)
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-800/60 text-[11px] text-cyan-300 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            SQLite 3 (PDO)
          </div>
        </div>
      </div>

      {/* Center Actions: Save, Run PHP, New File, New Folder, Delete */}
      <div className="flex items-center gap-2">
        {onRunPhp && (
          <button
            id="btn-run-php"
            onClick={onRunPhp}
            title="Execute Active File in PHP Terminal (Ctrl+Enter)"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-md shadow-sm transition-colors text-xs active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Run PHP</span>
          </button>
        )}

        <button
          id="btn-save-file"
          onClick={onSave}
          title="Save Active File (Ctrl+S)"
          disabled={!activeFileName}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs transition-colors ${
            hasUnsavedChanges
              ? "bg-blue-600/20 border-blue-500 text-blue-300 hover:bg-blue-600/30"
              : "bg-[#21262d] border-[#30363d] text-zinc-300 hover:bg-[#30363d]"
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save</span>
          {hasUnsavedChanges && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
        </button>

        {activeFileName && onDeleteActiveFile && (
          <button
            id="btn-delete-active-file"
            onClick={onDeleteActiveFile}
            title={`Delete ${activeFileName}`}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[#30363d] bg-[#21262d] text-zinc-400 hover:text-red-400 hover:border-red-900/60 hover:bg-red-950/30 text-xs transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Delete</span>
          </button>
        )}

        {/* Templates Dropdown */}
        <div className="relative">
          <button
            id="btn-templates"
            onClick={() => setTemplateMenuOpen(!templateMenuOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded-md text-zinc-300 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Templates</span>
          </button>

          {templateMenuOpen && (
            <div className="absolute top-full mt-1.5 left-0 w-72 bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl p-2 z-50 text-left">
              <div className="text-[11px] font-semibold text-zinc-400 px-2 py-1 uppercase tracking-wider">
                Starter Projects
              </div>
              <div className="flex flex-col gap-1 mt-1">
                {TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    onClick={() => {
                      onSelectTemplate(tmpl.id);
                      setTemplateMenuOpen(false);
                    }}
                    className={`p-2 rounded-md text-left transition-colors flex flex-col gap-0.5 ${
                      currentTemplate === tmpl.id
                        ? "bg-purple-950/50 border border-purple-700/60 text-purple-200"
                        : "hover:bg-[#21262d] text-zinc-300"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium text-white text-xs">{tmpl.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#30363d] text-zinc-300">
                        {tmpl.badge}
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-400 line-clamp-2">{tmpl.description}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick File & Folder Create */}
        <div className="hidden sm:flex items-center gap-1 border-l border-[#30363d] pl-2">
          <button
            id="btn-quick-new-file"
            onClick={onNewFile}
            title="Create New File"
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#21262d] rounded"
          >
            <FilePlus className="w-3.5 h-3.5" />
          </button>
          <button
            id="btn-quick-new-folder"
            onClick={onNewFolder}
            title="Create New Folder"
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#21262d] rounded"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
          <button
            id="btn-export-zip"
            onClick={onExportZip}
            title="Export / Download Files"
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#21262d] rounded"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Right Controls: View Mode & Bottom Drawers */}
      <div className="flex items-center gap-2">
        {/* Bottom Drawer Tabs */}
        <div className="flex items-center bg-[#0d1117] rounded-md p-0.5 border border-[#30363d]">
          <button
            onClick={() => {
              setBottomTab("terminal");
              if (!isBottomPanelOpen) onToggleBottomPanel();
            }}
            title="PHP Terminal / CLI Runner"
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-colors ${
              isBottomPanelOpen && bottomTab === "terminal"
                ? "bg-[#21262d] text-purple-300 font-medium"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Terminal className="w-3 h-3 text-purple-400" />
            <span className="hidden md:inline">PHP CLI</span>
          </button>
          <button
            onClick={() => {
              setBottomTab("sql");
              if (!isBottomPanelOpen) onToggleBottomPanel();
            }}
            title="SQL Studio Console"
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-colors ${
              isBottomPanelOpen && bottomTab === "sql"
                ? "bg-[#21262d] text-cyan-300 font-medium"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Database className="w-3 h-3 text-cyan-400" />
            <span className="hidden md:inline">SQL Console</span>
          </button>
          <button
            onClick={() => {
              setBottomTab("logs");
              if (!isBottomPanelOpen) onToggleBottomPanel();
            }}
            title="Server Logs"
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-colors ${
              isBottomPanelOpen && bottomTab === "logs"
                ? "bg-[#21262d] text-amber-300 font-medium"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <RotateCw className="w-3 h-3 text-amber-400" />
            <span className="hidden md:inline">Logs</span>
          </button>
        </div>
      </div>
    </header>
  );
};
