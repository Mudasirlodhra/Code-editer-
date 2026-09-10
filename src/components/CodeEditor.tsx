import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Search,
  Check,
  Sparkles,
  Code2,
  Copy,
  ChevronDown,
  Trash2,
} from "lucide-react";
import Prism from "prismjs";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-css";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-json";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-php";
import "prismjs/components/prism-markdown";
import { OpenFile } from "../types";

interface CodeEditorProps {
  openFiles: OpenFile[];
  activeFilePath?: string;
  onSelectTab: (path: string) => void;
  onCloseTab: (path: string) => void;
  onContentChange: (path: string, newContent: string) => void;
  onSave: () => void;
  onRunPhp?: () => void;
  onDeleteFile?: (path: string) => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  openFiles,
  activeFilePath,
  onSelectTab,
  onCloseTab,
  onContentChange,
  onSave,
  onRunPhp,
  onDeleteFile,
}) => {
  const activeFile = openFiles.find((f) => f.path === activeFilePath);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLElement>(null);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sync scroll between textarea and syntax highlight block
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (highlightRef.current) {
      highlightRef.current.scrollTop = e.currentTarget.scrollTop;
      highlightRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const handleCursorUpdate = () => {
    if (!textareaRef.current) return;
    const pos = textareaRef.current.selectionStart;
    const text = textareaRef.current.value.substring(0, pos);
    const lines = text.split("\n");
    setCursorPos({
      line: lines.length,
      col: lines[lines.length - 1].length + 1,
    });
  };

  // Keyboard shortcuts in editor
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Save (Ctrl+S or Cmd+S)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      onSave();
      return;
    }

    // Run PHP (Ctrl+Enter or Cmd+Enter)
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (onRunPhp) {
        onRunPhp();
      } else {
        onSave();
      }
      return;
    }

    // Find (Ctrl+F or Cmd+F)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
      e.preventDefault();
      setShowSearch((prev) => !prev);
      return;
    }

    // Tab key: insert 4 spaces
    if (e.key === "Tab") {
      e.preventDefault();
      if (!activeFile || !textareaRef.current) return;
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const val = activeFile.content;
      const newVal = val.substring(0, start) + "    " + val.substring(end);
      onContentChange(activeFile.path, newVal);

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 4;
          handleCursorUpdate();
        }
      }, 0);
    }
  };

  const insertSnippet = (snippet: string) => {
    if (!activeFile || !textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const val = activeFile.content;
    const newVal = val.substring(0, start) + snippet + val.substring(end);
    onContentChange(activeFile.path, newVal);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + snippet.length;
        handleCursorUpdate();
      }
    }, 0);
  };

  const copyCode = () => {
    if (!activeFile) return;
    navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Syntax highlighting HTML string
  const getHighlightedCode = () => {
    if (!activeFile) return "";
    const lang = activeFile.language;
    const prismLang = Prism.languages[lang] || Prism.languages.javascript || Prism.languages.markup;
    try {
      return Prism.highlight(activeFile.content, prismLang, lang);
    } catch {
      return activeFile.content
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }
  };

  const lines = activeFile ? activeFile.content.split("\n") : [];

  if (openFiles.length === 0 || !activeFile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0d1117] text-zinc-500 select-none p-6">
        <Code2 className="w-12 h-12 mb-3 text-zinc-600 stroke-1" />
        <h3 className="text-sm font-medium text-zinc-400 mb-1">No File Open</h3>
        <p className="text-xs text-zinc-500 max-w-sm text-center mb-4">
          Select a file from the workspace explorer on the left or create a new file to start coding.
        </p>
        <div className="flex items-center gap-3 text-xs">
          <span className="px-2 py-1 bg-[#161b22] border border-[#30363d] rounded text-zinc-400 font-mono">
            Ctrl + Enter
          </span>
          <span className="text-zinc-500">&rarr; Run Localhost</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0d1117] overflow-hidden">
      {/* Tab Bar */}
      <div className="h-9 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between overflow-x-auto select-none px-1 text-xs shrink-0">
        <div className="flex items-center h-full gap-1 overflow-x-auto">
          {openFiles.map((file) => {
            const isActive = file.path === activeFilePath;
            return (
              <div
                key={file.path}
                onClick={() => onSelectTab(file.path)}
                className={`flex items-center gap-2 px-3 h-full border-r border-[#30363d] cursor-pointer transition-colors text-xs ${
                  isActive
                    ? "bg-[#0d1117] text-white border-t-2 border-t-purple-500 font-medium"
                    : "text-zinc-400 hover:bg-[#21262d] hover:text-zinc-200"
                }`}
              >
                <span className="truncate max-w-[140px]">{file.name}</span>
                {file.isDirty && (
                  <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" title="Unsaved changes" />
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(file.path);
                  }}
                  className="p-0.5 rounded hover:bg-[#30363d] text-zinc-400 hover:text-white"
                  title="Close tab"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Tab Right Actions */}
        <div className="flex items-center gap-1.5 px-2 shrink-0">
          <button
            onClick={() => setShowSearch(!showSearch)}
            title="Search in file (Ctrl+F)"
            className={`p-1 rounded hover:bg-[#21262d] transition-colors ${
              showSearch ? "text-purple-400" : "text-zinc-400"
            }`}
          >
            <Search className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={copyCode}
            title="Copy file content"
            className="p-1 rounded hover:bg-[#21262d] text-zinc-400 hover:text-white transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          {onDeleteFile && activeFile && (
            <button
              onClick={() => onDeleteFile(activeFile.path)}
              title={`Delete file (${activeFile.name})`}
              className="p-1 rounded hover:bg-red-950/40 text-zinc-400 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Snippets Toolbar */}
      <div className="h-7 bg-[#13171f] border-b border-[#21262d] px-3 flex items-center justify-between text-[11px] text-zinc-400 select-none shrink-0 overflow-x-auto">
        <div className="flex items-center gap-2">
          <span className="text-zinc-500 font-medium">Quick Snippets:</span>
          {activeFile.language === "php" && (
            <>
              <button
                onClick={() => insertSnippet("<?php\n\n?>")}
                className="px-1.5 py-0.5 bg-[#1f242c] hover:bg-[#282e38] text-purple-300 rounded font-mono text-[10px]"
              >
                &lt;?php ?&gt;
              </button>
              <button
                onClick={() => insertSnippet("$stmt = $pdo->prepare('SELECT * FROM notes');\n$stmt->execute();\n$results = $stmt->fetchAll();\n")}
                className="px-1.5 py-0.5 bg-[#1f242c] hover:bg-[#282e38] text-cyan-300 rounded font-mono text-[10px]"
              >
                PDO SELECT
              </button>
              <button
                onClick={() => insertSnippet("header('Content-Type: application/json');\necho json_encode(['status' => 'success', 'data' => []]);\nexit;\n")}
                className="px-1.5 py-0.5 bg-[#1f242c] hover:bg-[#282e38] text-emerald-300 rounded font-mono text-[10px]"
              >
                JSON API
              </button>
            </>
          )}

          {activeFile.language === "sql" && (
            <>
              <button
                onClick={() => insertSnippet("SELECT * FROM notes ORDER BY id DESC LIMIT 20;\n")}
                className="px-1.5 py-0.5 bg-[#1f242c] hover:bg-[#282e38] text-cyan-300 rounded font-mono text-[10px]"
              >
                SELECT *
              </button>
              <button
                onClick={() => insertSnippet("INSERT INTO notes (title, content, category) VALUES ('New Note', 'Details', 'General');\n")}
                className="px-1.5 py-0.5 bg-[#1f242c] hover:bg-[#282e38] text-cyan-300 rounded font-mono text-[10px]"
              >
                INSERT INTO
              </button>
              <button
                onClick={() => insertSnippet("CREATE TABLE IF NOT EXISTS items (\n    id INTEGER PRIMARY KEY AUTOINCREMENT,\n    name TEXT NOT NULL,\n    price REAL DEFAULT 0.0\n);\n")}
                className="px-1.5 py-0.5 bg-[#1f242c] hover:bg-[#282e38] text-amber-300 rounded font-mono text-[10px]"
              >
                CREATE TABLE
              </button>
            </>
          )}

          {activeFile.language === "html" && (
            <button
              onClick={() => insertSnippet("<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n    <meta charset=\"UTF-8\">\n    <title>Title</title>\n</head>\n<body>\n    <h1>Hello World</h1>\n</body>\n</html>\n")}
              className="px-1.5 py-0.5 bg-[#1f242c] hover:bg-[#282e38] text-orange-300 rounded font-mono text-[10px]"
            >
              HTML5 Skeleton
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 text-zinc-500">
          <span>{activeFile.path}</span>
        </div>
      </div>

      {/* Search Bar Overlay */}
      {showSearch && (
        <div className="bg-[#161b22] border-b border-[#30363d] p-2 flex items-center justify-between text-xs z-10 shrink-0">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Find in file..."
              className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-purple-500"
              autoFocus
            />
          </div>
          <button
            onClick={() => setShowSearch(false)}
            className="p-1 hover:bg-[#21262d] rounded text-zinc-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Editing Canvas: Gutter + Textarea / Prism */}
      <div className="flex-1 relative flex overflow-hidden font-mono text-[13px] leading-relaxed">
        {/* Line Numbers Gutter */}
        <div className="w-12 bg-[#0d1117] border-r border-[#21262d] select-none text-right pr-3 py-3 text-zinc-600 shrink-0 overflow-hidden">
          {lines.map((_, i) => (
            <div
              key={i}
              className={`leading-relaxed text-[12px] ${
                cursorPos.line === i + 1 ? "text-purple-400 font-bold" : ""
              }`}
            >
              {i + 1}
            </div>
          ))}
        </div>

        {/* Dual Layer: Syntax Highlight underneath + transparent textarea on top */}
        <div className="relative flex-1 h-full overflow-hidden">
          {/* Syntax highlighted background view */}
          <pre
            ref={highlightRef as any}
            aria-hidden="true"
            className="absolute inset-0 p-3 m-0 overflow-hidden pointer-events-none whitespace-pre font-mono text-[13px] leading-relaxed text-[#c9d1d9]"
            style={{ tabSize: 4 }}
            dangerouslySetInnerHTML={{ __html: getHighlightedCode() + "\n" }}
          />

          {/* Editable textarea overlay */}
          <textarea
            ref={textareaRef}
            id="active-code-editor"
            value={activeFile.content}
            onChange={(e) => {
              onContentChange(activeFile.path, e.target.value);
              handleCursorUpdate();
            }}
            onScroll={handleScroll}
            onClick={handleCursorUpdate}
            onKeyUp={handleCursorUpdate}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            className="absolute inset-0 w-full h-full p-3 m-0 resize-none bg-transparent text-transparent caret-white outline-none border-none whitespace-pre font-mono text-[13px] leading-relaxed overflow-auto z-10 selection:bg-purple-900/50"
            style={{ tabSize: 4 }}
          />
        </div>
      </div>

      {/* Status Bar */}
      <div className="h-6 bg-[#161b22] border-t border-[#30363d] px-3 flex items-center justify-between text-[11px] text-zinc-400 select-none shrink-0 font-mono">
        <div className="flex items-center gap-3">
          <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
          <span>{lines.length} lines</span>
          <span>{activeFile.content.length} chars</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="uppercase text-purple-300 font-semibold">{activeFile.language}</span>
          <span>UTF-8</span>
          <span>Spaces: 4</span>
        </div>
      </div>
    </div>
  );
};
