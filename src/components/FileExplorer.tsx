import React, { useState, useEffect, useRef } from "react";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  File,
  Database,
  Plus,
  Trash2,
  Edit2,
  FolderPlus,
  FilePlus,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { FsItem } from "../types";

interface FileExplorerProps {
  tree: FsItem[];
  activeFilePath?: string;
  onOpenFile: (path: string) => void;
  onCreateFile: (parentDir?: string) => void;
  onCreateFolder: (parentDir?: string) => void;
  onRename: (path: string, isDirectory: boolean) => void;
  onDelete: (path: string, isDirectory?: boolean) => void;
  onRefresh: () => void;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  tree,
  activeFilePath,
  onOpenFile,
  onCreateFile,
  onCreateFolder,
  onRename,
  onDelete,
  onRefresh,
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    api: true,
    assets: true,
  });

  // Right-click context menu state
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    item?: FsItem;
  }>({ visible: false, x: 0, y: 0 });

  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Close context menu on outside click or scroll
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu({ visible: false, x: 0, y: 0 });
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setContextMenu({ visible: false, x: 0, y: 0 });
      }
    };
    if (contextMenu.visible) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [contextMenu.visible]);

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderPath]: !prev[folderPath],
    }));
  };

  const handleContextMenu = (e: React.MouseEvent, item?: FsItem) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      visible: true,
      x: Math.min(e.clientX, window.innerWidth - 180),
      y: Math.min(e.clientY, window.innerHeight - 200),
      item,
    });
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "php":
        return <span className="text-[10px] font-bold text-purple-400 bg-purple-950/80 px-1 py-0.5 rounded">PHP</span>;
      case "sql":
        return <Database className="w-3.5 h-3.5 text-cyan-400" />;
      case "sqlite":
      case "db":
        return <Database className="w-3.5 h-3.5 text-amber-400" />;
      case "html":
      case "htm":
        return <FileCode className="w-3.5 h-3.5 text-orange-400" />;
      case "css":
        return <FileCode className="w-3.5 h-3.5 text-blue-400" />;
      case "js":
        return <FileCode className="w-3.5 h-3.5 text-yellow-400" />;
      case "json":
        return <span className="text-[10px] font-bold text-emerald-400 font-mono">{}</span>;
      case "md":
        return <FileText className="w-3.5 h-3.5 text-zinc-400" />;
      default:
        return <File className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  const renderItem = (item: FsItem, depth = 0) => {
    const isExpanded = expandedFolders[item.path] ?? false;
    const isActive = activeFilePath === item.path;

    if (item.isDirectory) {
      return (
        <div key={item.path} className="select-none">
          <div
            className="group flex items-center justify-between py-1 px-2 hover:bg-[#21262d] rounded cursor-pointer text-xs text-[#c9d1d9] transition-colors"
            style={{ paddingLeft: `${depth * 14 + 8}px` }}
            onClick={() => toggleFolder(item.path)}
            onContextMenu={(e) => handleContextMenu(e, item)}
          >
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              )}
              {isExpanded ? (
                <FolderOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              ) : (
                <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              )}
              <span className="truncate font-medium text-zinc-200">{item.name}</span>
            </div>

            {/* Folder action buttons */}
            <div
              className="opacity-70 sm:opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0 text-zinc-400"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => onCreateFile(item.path)}
                title="New File in folder"
                className="hover:text-white p-1 rounded hover:bg-[#30363d]"
              >
                <Plus className="w-3 h-3" />
              </button>
              <button
                onClick={() => onRename(item.path, true)}
                title="Rename folder"
                className="hover:text-white p-1 rounded hover:bg-[#30363d]"
              >
                <Edit2 className="w-3 h-3" />
              </button>
              <button
                onClick={() => onDelete(item.path, true)}
                title="Delete folder"
                className="hover:text-red-400 p-1 rounded hover:bg-red-950/40 text-zinc-400"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>

          {isExpanded && item.children && (
            <div className="flex flex-col">
              {item.children.map((child) => renderItem(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    // File item
    return (
      <div
        key={item.path}
        className={`group flex items-center justify-between py-1 px-2 rounded cursor-pointer text-xs transition-colors ${
          isActive
            ? "bg-[#1f6feb]/20 text-white border-l-2 border-[#1f6feb] pl-2 font-medium"
            : "hover:bg-[#21262d] text-[#c9d1d9]"
        }`}
        style={{ paddingLeft: `${depth * 14 + 18}px` }}
        onClick={() => onOpenFile(item.path)}
        onContextMenu={(e) => handleContextMenu(e, item)}
      >
        <div className="flex items-center gap-1.5 min-w-0 truncate">
          {getFileIcon(item.name)}
          <span className="truncate">{item.name}</span>
        </div>

        {/* File action buttons */}
        <div
          className="opacity-70 sm:opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0 text-zinc-400"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => onRename(item.path, false)}
            title="Rename file"
            className="hover:text-white p-1 rounded hover:bg-[#30363d]"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button
            onClick={() => onDelete(item.path, false)}
            title={`Delete ${item.name}`}
            className="hover:text-red-400 p-1 rounded hover:bg-red-950/40 text-zinc-400"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div
      className="flex flex-col h-full bg-[#161b22] text-[#c9d1d9] select-none relative"
      onContextMenu={(e) => handleContextMenu(e)}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#30363d] text-xs font-semibold text-zinc-400 uppercase tracking-wider">
        <span className="flex items-center gap-1.5">Project Workspace</span>
        <div className="flex items-center gap-1">
          <button
            id="btn-sidebar-new-file"
            onClick={() => onCreateFile()}
            title="New File in root"
            className="p-1 hover:text-white hover:bg-[#21262d] rounded transition-colors"
          >
            <FilePlus className="w-3.5 h-3.5" />
          </button>
          <button
            id="btn-sidebar-new-folder"
            onClick={() => onCreateFolder()}
            title="New Folder in root"
            className="p-1 hover:text-white hover:bg-[#21262d] rounded transition-colors"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
          {activeFilePath && (
            <button
              id="btn-sidebar-delete-active"
              onClick={() => onDelete(activeFilePath, false)}
              title={`Delete active file (${activeFilePath})`}
              className="p-1 hover:text-red-400 hover:bg-red-950/40 rounded transition-colors text-zinc-400"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            id="btn-sidebar-refresh"
            onClick={onRefresh}
            title="Refresh Files"
            className="p-1 hover:text-white hover:bg-[#21262d] rounded transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tree list */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
        {tree.length === 0 ? (
          <div className="text-center text-zinc-500 p-6 text-xs">
            Workspace is empty. Create a file or select a template above.
          </div>
        ) : (
          tree.map((item) => renderItem(item))
        )}
      </div>

      {/* Bottom helper */}
      <div className="p-2 border-t border-[#30363d] bg-[#0d1117] text-[11px] text-zinc-400 flex items-center justify-between">
        <span className="truncate max-w-[140px]">
          {activeFilePath ? (
            <span className="text-zinc-300 font-mono text-[10px]">{activeFilePath}</span>
          ) : (
            `Files: ${tree.reduce((acc, it) => acc + (it.children?.length ?? 1), 0)}`
          )}
        </span>
        {activeFilePath ? (
          <button
            onClick={() => onDelete(activeFilePath, false)}
            title={`Delete ${activeFilePath}`}
            className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300 hover:underline cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            <span>Delete File</span>
          </button>
        ) : (
          <span className="text-zinc-500">Workspace</span>
        )}
      </div>

      {/* Right-click Context Menu */}
      {contextMenu.visible && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-[#1f242c] border border-[#30363d] rounded-md shadow-2xl py-1 w-44 text-xs text-[#c9d1d9] animate-in fade-in zoom-in-95 duration-100 select-none"
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
        >
          {contextMenu.item ? (
            <>
              <div className="px-3 py-1 text-[10px] text-zinc-500 font-mono truncate border-b border-[#30363d]">
                {contextMenu.item.path}
              </div>
              {!contextMenu.item.isDirectory && (
                <button
                  onClick={() => {
                    onOpenFile(contextMenu.item!.path);
                    setContextMenu({ visible: false, x: 0, y: 0 });
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#282e38] flex items-center gap-2 hover:text-white"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                  <span>Open File</span>
                </button>
              )}
              {contextMenu.item.isDirectory && (
                <>
                  <button
                    onClick={() => {
                      onCreateFile(contextMenu.item!.path);
                      setContextMenu({ visible: false, x: 0, y: 0 });
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#282e38] flex items-center gap-2 hover:text-white"
                  >
                    <Plus className="w-3.5 h-3.5 text-purple-400" />
                    <span>New File Here</span>
                  </button>
                  <button
                    onClick={() => {
                      onCreateFolder(contextMenu.item!.path);
                      setContextMenu({ visible: false, x: 0, y: 0 });
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#282e38] flex items-center gap-2 hover:text-white"
                  >
                    <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
                    <span>New Folder Here</span>
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  onRename(contextMenu.item!.path, contextMenu.item!.isDirectory);
                  setContextMenu({ visible: false, x: 0, y: 0 });
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#282e38] flex items-center gap-2 hover:text-white"
              >
                <Edit2 className="w-3.5 h-3.5 text-yellow-400" />
                <span>Rename</span>
              </button>
              <div className="border-t border-[#30363d] my-1" />
              <button
                onClick={() => {
                  onDelete(contextMenu.item!.path, contextMenu.item!.isDirectory);
                  setContextMenu({ visible: false, x: 0, y: 0 });
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-red-950/50 flex items-center gap-2 text-red-400 hover:text-red-300 font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete {contextMenu.item.isDirectory ? "Folder" : "File"}</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  onCreateFile();
                  setContextMenu({ visible: false, x: 0, y: 0 });
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#282e38] flex items-center gap-2 hover:text-white"
              >
                <FilePlus className="w-3.5 h-3.5 text-purple-400" />
                <span>New File</span>
              </button>
              <button
                onClick={() => {
                  onCreateFolder();
                  setContextMenu({ visible: false, x: 0, y: 0 });
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#282e38] flex items-center gap-2 hover:text-white"
              >
                <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
                <span>New Folder</span>
              </button>
              <div className="border-t border-[#30363d] my-1" />
              <button
                onClick={() => {
                  onRefresh();
                  setContextMenu({ visible: false, x: 0, y: 0 });
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#282e38] flex items-center gap-2 hover:text-white"
              >
                <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                <span>Refresh Workspace</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
