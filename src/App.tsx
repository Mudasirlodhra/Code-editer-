import React, { useState, useEffect, useCallback, useRef } from "react";
import { Header } from "./components/Header";
import { FileExplorer } from "./components/FileExplorer";
import { CodeEditor } from "./components/CodeEditor";
import { BottomPanel } from "./components/BottomPanel";
import { CreateModal } from "./components/CreateModal";
import { FsItem, OpenFile } from "./types";
import { getLanguageFromPath } from "./utils/languages";
import { Database, FolderTree, Code } from "lucide-react";
import { SqlStudio } from "./components/SqlStudio";

export default function App() {
  const [fsTree, setFsTree] = useState<FsItem[]>([]);
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeFilePath, setActiveFilePath] = useState<string | undefined>(undefined);
  const [currentTemplate, setCurrentTemplate] = useState<string>("crud-notes");
  const [executeTrigger, setExecuteTrigger] = useState<number>(0);

  // Prevent duplicate concurrent file opens and double-load in StrictMode
  const loadingFilesRef = useRef<Set<string>>(new Set());
  const initialLoadedRef = useRef(false);

  // Sidebar & Bottom panel states
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState<boolean>(false);
  const [bottomTab, setBottomTab] = useState<"terminal" | "sql" | "logs">("terminal");
  const [sidebarTab, setSidebarTab] = useState<"explorer" | "sql">("explorer");

  // Modal state
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: "file" | "folder" | "rename" | "delete";
    parentDir?: string;
    targetPath?: string;
    isDirectory?: boolean;
  }>({
    isOpen: false,
    type: "file",
  });

  // Fetch file tree
  const fetchTree = useCallback(async () => {
    try {
      const res = await fetch("/api/fs/tree");
      const data = await res.json();
      if (data.tree) {
        setFsTree(data.tree);
      }
    } catch (e) {
      console.error("Failed to fetch tree", e);
    }
  }, []);

  // Open file
  const handleOpenFile = useCallback(async (relPath: string) => {
    // Check if already open
    const existing = openFiles.find((f) => f.path === relPath);
    if (existing) {
      setActiveFilePath(relPath);
      return;
    }

    if (loadingFilesRef.current.has(relPath)) {
      setActiveFilePath(relPath);
      return;
    }

    loadingFilesRef.current.add(relPath);

    try {
      const res = await fetch(`/api/fs/read?path=${encodeURIComponent(relPath)}`);
      const data = await res.json();
      if (res.ok) {
        const fileName = relPath.split("/").pop() || relPath;
        const newFile: OpenFile = {
          path: relPath,
          name: fileName,
          content: data.content ?? "",
          originalContent: data.content ?? "",
          isDirty: false,
          language: getLanguageFromPath(relPath),
        };
        setOpenFiles((prev) => {
          if (prev.some((f) => f.path === relPath)) {
            return prev;
          }
          return [...prev, newFile];
        });
        setActiveFilePath(relPath);
      }
    } catch (e) {
      console.error("Failed to read file", e);
    } finally {
      loadingFilesRef.current.delete(relPath);
    }
  }, [openFiles]);

  // Close tab
  const handleCloseTab = (path: string) => {
    setOpenFiles((prev) => {
      const filtered = prev.filter((f) => f.path !== path);
      if (activeFilePath === path) {
        setActiveFilePath(filtered.length > 0 ? filtered[filtered.length - 1].path : undefined);
      }
      return filtered;
    });
  };

  // Content change
  const handleContentChange = (path: string, newContent: string) => {
    setOpenFiles((prev) =>
      prev.map((f) => {
        if (f.path === path) {
          return {
            ...f,
            content: newContent,
            isDirty: newContent !== f.originalContent,
          };
        }
        return f;
      })
    );
  };

  // Save active file
  const handleSave = async () => {
    const activeFile = openFiles.find((f) => f.path === activeFilePath);
    if (!activeFile) return;

    try {
      const res = await fetch("/api/fs/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: activeFile.path,
          content: activeFile.content,
        }),
      });
      if (res.ok) {
        setOpenFiles((prev) =>
          prev.map((f) =>
            f.path === activeFile.path
              ? { ...f, originalContent: f.content, isDirty: false }
              : f
          )
        );
        fetchTree();
      }
    } catch (e) {
      console.error("Save error", e);
    }
  };

  // Run PHP: Save dirty files, open bottom terminal panel, and trigger CLI execution
  const handleRunPhp = async () => {
    // Save any dirty files first
    for (const f of openFiles) {
      if (f.isDirty) {
        await fetch("/api/fs/write", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: f.path, content: f.content }),
        });
      }
    }
    // Clear dirty state
    setOpenFiles((prev) =>
      prev.map((f) => ({ ...f, originalContent: f.content, isDirty: false }))
    );

    setIsBottomPanelOpen(true);
    setBottomTab("terminal");
    setExecuteTrigger((prev) => prev + 1);
  };

  // Switch template
  const handleSelectTemplate = async (templateId: string) => {
    try {
      const res = await fetch("/api/fs/reset-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: templateId }),
      });
      if (res.ok) {
        setCurrentTemplate(templateId);
        setOpenFiles([]);
        setActiveFilePath(undefined);
        await fetchTree();
        // Automatically open index.php
        setTimeout(() => {
          handleOpenFile("index.php");
        }, 300);
      }
    } catch (e) {
      console.error("Template reset error", e);
    }
  };

  // Modal actions
  const handleModalSubmit = async (val: string) => {
    const { type, parentDir, targetPath } = modalState;

    if (type === "file") {
      const relPath = parentDir ? `${parentDir}/${val}` : val;
      await fetch("/api/fs/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: relPath, isDirectory: false }),
      });
      await fetchTree();
      handleOpenFile(relPath);
    } else if (type === "folder") {
      const relPath = parentDir ? `${parentDir}/${val}` : val;
      await fetch("/api/fs/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: relPath, isDirectory: true }),
      });
      await fetchTree();
    } else if (type === "rename" && targetPath) {
      const parent = targetPath.includes("/")
        ? targetPath.substring(0, targetPath.lastIndexOf("/"))
        : "";
      const newPath = parent ? `${parent}/${val}` : val;
      await fetch("/api/fs/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPath: targetPath, newPath }),
      });
      await fetchTree();
      // Update open file if renamed
      setOpenFiles((prev) =>
        prev.map((f) => (f.path === targetPath ? { ...f, path: newPath, name: val } : f))
      );
      if (activeFilePath === targetPath) {
        setActiveFilePath(newPath);
      }
    } else if (type === "delete" && targetPath) {
      await fetch("/api/fs/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: targetPath }),
      });
      await fetchTree();
      // Close tabs for this file or any file inside this deleted folder
      setOpenFiles((prev) => {
        const remaining = prev.filter(
          (f) => f.path !== targetPath && !f.path.startsWith(`${targetPath}/`)
        );
        if (activeFilePath === targetPath || activeFilePath?.startsWith(`${targetPath}/`)) {
          setActiveFilePath(remaining.length > 0 ? remaining[remaining.length - 1].path : undefined);
        }
        return remaining;
      });
    }
  };

  // Export files as text archive
  const handleExport = () => {
    // Quick download of current open file or workspace summary
    const activeFile = openFiles.find((f) => f.path === activeFilePath);
    if (!activeFile) return;
    const blob = new Blob([activeFile.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = activeFile.name;
    a.click();
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleRunPhp();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setIsSidebarOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [openFiles, activeFilePath]);

  // Initial load
  useEffect(() => {
    fetchTree().then(() => {
      // Auto open index.php on startup (only once)
      if (!initialLoadedRef.current) {
        initialLoadedRef.current = true;
        handleOpenFile("index.php");
      }
    });
  }, [fetchTree, handleOpenFile]);

  const activeFile = openFiles.find((f) => f.path === activeFilePath);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0d1117] text-[#c9d1d9] select-none font-sans">
      {/* Top Header */}
      <Header
        activeFileName={activeFile?.name}
        hasUnsavedChanges={activeFile?.isDirty ?? false}
        onSave={handleSave}
        onRunPhp={handleRunPhp}
        onNewFile={() => setModalState({ isOpen: true, type: "file" })}
        onNewFolder={() => setModalState({ isOpen: true, type: "folder" })}
        onDeleteActiveFile={() =>
          activeFilePath &&
          setModalState({ isOpen: true, type: "delete", targetPath: activeFilePath, isDirectory: false })
        }
        onToggleBottomPanel={() => setIsBottomPanelOpen((prev) => !prev)}
        isBottomPanelOpen={isBottomPanelOpen}
        bottomTab={bottomTab}
        setBottomTab={setBottomTab}
        currentTemplate={currentTemplate}
        onSelectTemplate={handleSelectTemplate}
        onExportZip={handleExport}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
      />

      {/* Main Center Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar (collapsible for full screen editor) */}
        {isSidebarOpen ? (
          <div className="w-64 bg-[#161b22] border-r border-[#30363d] flex flex-col shrink-0 transition-all duration-150">
            {/* Sidebar Tabs */}
            <div className="h-8 bg-[#13171f] border-b border-[#30363d] px-2 flex items-center justify-between text-xs shrink-0">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSidebarTab("explorer")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
                    sidebarTab === "explorer"
                      ? "bg-[#21262d] text-white font-medium"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <FolderTree className="w-3.5 h-3.5 text-amber-400" />
                  <span>Explorer</span>
                </button>
                <button
                  onClick={() => setSidebarTab("sql")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
                    sidebarTab === "sql"
                      ? "bg-[#21262d] text-cyan-300 font-medium"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Database className="w-3.5 h-3.5 text-cyan-400" />
                  <span>SQL Studio</span>
                </button>
              </div>
              <button
                onClick={() => setIsSidebarOpen(false)}
                title="Collapse Sidebar (Ctrl+B) to maximize editor"
                className="p-1 text-zinc-400 hover:text-white rounded hover:bg-[#21262d] transition-colors"
              >
                &larr;
              </button>
            </div>

            {/* Sidebar Body */}
            <div className="flex-1 overflow-hidden">
              {sidebarTab === "explorer" ? (
                <FileExplorer
                  tree={fsTree}
                  activeFilePath={activeFilePath}
                  onOpenFile={handleOpenFile}
                  onCreateFile={(parentDir) =>
                    setModalState({ isOpen: true, type: "file", parentDir })
                  }
                  onCreateFolder={(parentDir) =>
                    setModalState({ isOpen: true, type: "folder", parentDir })
                  }
                  onRename={(targetPath, isDirectory) =>
                    setModalState({ isOpen: true, type: "rename", targetPath, isDirectory })
                  }
                  onDelete={(targetPath, isDirectory) =>
                    setModalState({ isOpen: true, type: "delete", targetPath, isDirectory: !!isDirectory })
                  }
                  onRefresh={fetchTree}
                />
              ) : (
                <SqlStudio compact={true} />
              )}
            </div>
          </div>
        ) : (
          <div className="w-10 bg-[#161b22] border-r border-[#30363d] flex flex-col items-center py-2 shrink-0 select-none">
            <button
              onClick={() => setIsSidebarOpen(true)}
              title="Expand Workspace Explorer (Ctrl+B)"
              className="p-1.5 rounded hover:bg-[#21262d] text-zinc-400 hover:text-white transition-colors mb-2"
            >
              <FolderTree className="w-4 h-4 text-amber-400" />
            </button>
            <button
              onClick={() => {
                setIsSidebarOpen(true);
                setSidebarTab("sql");
              }}
              title="Open SQL Studio"
              className="p-1.5 rounded hover:bg-[#21262d] text-zinc-400 hover:text-cyan-400 transition-colors"
            >
              <Database className="w-4 h-4 text-cyan-400" />
            </button>
            <div className="flex-1" />
            <button
              onClick={() => setIsSidebarOpen(true)}
              title="Click to expand explorer"
              className="p-1 text-zinc-500 hover:text-zinc-300"
            >
              <span className="text-[10px] uppercase font-mono tracking-widest [writing-mode:vertical-lr] rotate-180">
                Workspace
              </span>
            </button>
          </div>
        )}

        {/* Code Editor Area - Complete Open */}
        <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
          <CodeEditor
            openFiles={openFiles}
            activeFilePath={activeFilePath}
            onSelectTab={setActiveFilePath}
            onCloseTab={handleCloseTab}
            onContentChange={handleContentChange}
            onSave={handleSave}
            onRunPhp={handleRunPhp}
            onDeleteFile={(path) =>
              setModalState({ isOpen: true, type: "delete", targetPath: path, isDirectory: false })
            }
          />
        </div>
      </div>

      {/* Dockable Bottom Panel (PHP CLI, SQL Studio, Logs) */}
      <BottomPanel
        isOpen={isBottomPanelOpen}
        onClose={() => setIsBottomPanelOpen(false)}
        activeTab={bottomTab}
        setActiveTab={setBottomTab}
        activeFilePath={activeFilePath}
        executeTrigger={executeTrigger}
      />

      {/* Create / Rename / Delete Modal */}
      <CreateModal
        isOpen={modalState.isOpen}
        type={modalState.type}
        parentDir={modalState.parentDir}
        targetPath={modalState.targetPath}
        isDirectory={modalState.isDirectory}
        onClose={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
        onSubmit={handleModalSubmit}
      />
    </div>
  );
}
