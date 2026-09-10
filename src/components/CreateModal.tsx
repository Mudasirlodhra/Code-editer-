import React, { useState, useEffect } from "react";
import { X, FilePlus, FolderPlus, Edit2, AlertTriangle, Trash2 } from "lucide-react";

interface CreateModalProps {
  type: "file" | "folder" | "rename" | "delete";
  parentDir?: string;
  targetPath?: string;
  isDirectory?: boolean;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (nameOrPath: string) => void;
}

export const CreateModal: React.FC<CreateModalProps> = ({
  type,
  parentDir,
  targetPath,
  isDirectory,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (type === "rename" && targetPath) {
        setValue(targetPath.split("/").pop() || "");
      } else {
        setValue("");
      }
    }
  }, [isOpen, type, targetPath]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (type === "delete") {
      onSubmit(targetPath || "");
    } else {
      if (!value.trim()) return;
      onSubmit(value.trim());
    }
    onClose();
  };

  const getTitle = () => {
    switch (type) {
      case "file":
        return parentDir ? `Create File in /${parentDir}` : "Create File in Workspace";
      case "folder":
        return parentDir ? `Create Folder in /${parentDir}` : "Create Folder in Workspace";
      case "rename":
        return `Rename ${isDirectory ? "Folder" : "File"}`;
      case "delete":
        return `Delete ${isDirectory ? "Folder" : "File"}`;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl w-full max-w-sm overflow-hidden text-xs text-[#c9d1d9] animate-in fade-in zoom-in-95 duration-150">
        <div className="h-10 px-3 bg-[#21262d] border-b border-[#30363d] flex items-center justify-between font-medium text-white">
          <div className="flex items-center gap-2">
            {type === "file" && <FilePlus className="w-4 h-4 text-purple-400" />}
            {type === "folder" && <FolderPlus className="w-4 h-4 text-amber-400" />}
            {type === "rename" && <Edit2 className="w-4 h-4 text-blue-400" />}
            {type === "delete" && <Trash2 className="w-4 h-4 text-red-400" />}
            <span>{getTitle()}</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-[#30363d] rounded text-zinc-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {type === "delete" ? (
            <div className="space-y-2">
              <p className="text-zinc-300 leading-relaxed">
                Are you sure you want to permanently delete:
              </p>
              <div className="p-2.5 bg-[#0d1117] border border-red-900/40 rounded flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-red-400 shrink-0" />
                <span className="font-mono text-red-300 font-bold truncate">
                  {targetPath}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500">
                This will remove the {isDirectory ? "folder and all its files" : "file"} from the server workspace.
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1 font-medium">
                {type === "rename" ? "New Name" : type === "folder" ? "Folder Name" : "File Name (e.g. index.php)"}
              </label>
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={type === "folder" ? "models" : "user.php"}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                autoFocus
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#30363d]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-[#21262d] hover:bg-[#30363d] text-zinc-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              autoFocus={type === "delete"}
              className={`px-3 py-1.5 rounded font-medium text-white transition-colors flex items-center gap-1.5 ${
                type === "delete"
                  ? "bg-red-600 hover:bg-red-500 shadow-sm"
                  : "bg-purple-600 hover:bg-purple-500"
              }`}
            >
              {type === "delete" && <Trash2 className="w-3.5 h-3.5" />}
              {type === "delete"
                ? isDirectory
                  ? "Delete Folder"
                  : "Delete File"
                : type === "rename"
                ? "Rename"
                : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
