import express from "express";
import path from "path";
import fs from "fs";
import http from "http";
import { spawn, execFile } from "child_process";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;
const PHP_INTERNAL_PORT = 8080;
const WORKSPACE_DIR = path.resolve(process.cwd(), "workspace");

// Body parsers
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// Server logs buffer
interface LogEntry {
  id: string;
  timestamp: string;
  type: "server" | "php" | "sql" | "error";
  message: string;
  details?: string;
}
const serverLogs: LogEntry[] = [];
function addLog(type: LogEntry["type"], message: string, details?: string) {
  const entry: LogEntry = {
    id: Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toLocaleTimeString(),
    type,
    message,
    details,
  };
  serverLogs.push(entry);
  if (serverLogs.length > 200) {
    serverLogs.shift();
  }
}

// Ensure workspace directory exists and has starter files
function ensureWorkspace() {
  if (!fs.existsSync(WORKSPACE_DIR)) {
    fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
  }

  const indexPhpPath = path.join(WORKSPACE_DIR, "index.php");
  if (!fs.existsSync(indexPhpPath)) {
    loadTemplate("crud-notes");
  }
}

function loadTemplate(templateId: string) {
  if (!fs.existsSync(WORKSPACE_DIR)) {
    fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
  }

  // Clear workspace
  const files = fs.readdirSync(WORKSPACE_DIR);
  for (const f of files) {
    fs.rmSync(path.join(WORKSPACE_DIR, f), { recursive: true, force: true });
  }

  // Subdirectories
  fs.mkdirSync(path.join(WORKSPACE_DIR, "api"), { recursive: true });
  fs.mkdirSync(path.join(WORKSPACE_DIR, "assets"), { recursive: true });

  if (templateId === "crud-notes") {
    // 1. db.php
    fs.writeFileSync(
      path.join(WORKSPACE_DIR, "db.php"),
      `<?php
// SQLite PDO Database Connection
$dbPath = __DIR__ . '/database.sqlite';

try {
    $pdo = new PDO('sqlite:' . $dbPath);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

    // Auto-create notes table if it does not exist
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            category TEXT DEFAULT 'General',
            is_completed INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            role TEXT DEFAULT 'developer',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    ");

    // Seed default notes if empty
    $count = $pdo->query("SELECT COUNT(*) FROM notes")->fetchColumn();
    if ($count == 0) {
        $stmt = $pdo->prepare("INSERT INTO notes (title, content, category) VALUES (?, ?, ?)");
        $stmt->execute(['Welcome to PHP & SQL IDE', 'This app is running live on native PHP 8.2 with SQLite3.', 'System']);
        $stmt->execute(['Explore Database Studio', 'Use the SQL Studio tab on the left to inspect tables and execute queries.', 'Database']);
        $stmt->execute(['Localhost Server Active', 'Your edits are served instantly through the localhost preview runner.', 'Guides']);
    }

    // Seed default users if empty
    $userCount = $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
    if ($userCount == 0) {
        $stmt = $pdo->prepare("INSERT INTO users (name, email, role) VALUES (?, ?, ?)");
        $stmt->execute(['Alice Developer', 'alice@localhost.dev', 'admin']);
        $stmt->execute(['Bob Builder', 'bob@localhost.dev', 'engineer']);
    }

} catch (PDOException $e) {
    die("Database Connection Error: " . $e->getMessage());
}
`
    );

    // 2. index.php
    fs.writeFileSync(
      path.join(WORKSPACE_DIR, "index.php"),
      `<?php
require_once __DIR__ . '/db.php';

// Handle POST actions
$message = '';
$messageType = 'success';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'create_note') {
        $title = trim($_POST['title'] ?? '');
        $content = trim($_POST['content'] ?? '');
        $category = trim($_POST['category'] ?? 'General');

        if (!empty($title)) {
            $stmt = $pdo->prepare("INSERT INTO notes (title, content, category) VALUES (?, ?, ?)");
            $stmt->execute([$title, $content, $category]);
            $message = "Note created successfully!";
        } else {
            $message = "Note title cannot be empty.";
            $messageType = "danger";
        }
    } elseif ($action === 'toggle_note') {
        $noteId = intval($_POST['id'] ?? 0);
        $current = intval($_POST['status'] ?? 0);
        $newStatus = $current === 1 ? 0 : 1;
        $stmt = $pdo->prepare("UPDATE notes SET is_completed = ? WHERE id = ?");
        $stmt->execute([$newStatus, $noteId]);
        $message = "Note status updated!";
    } elseif ($action === 'delete_note') {
        $noteId = intval($_POST['id'] ?? 0);
        $stmt = $pdo->prepare("DELETE FROM notes WHERE id = ?");
        $stmt->execute([$noteId]);
        $message = "Note deleted!";
    }
}

// Fetch all notes
$notes = $pdo->query("SELECT * FROM notes ORDER BY id DESC")->fetchAll();
$totalNotes = count($notes);
$completedNotes = count(array_filter($notes, fn($n) => $n['is_completed'] == 1));

// Fetch users
$users = $pdo->query("SELECT * FROM users ORDER BY id ASC")->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PHP + SQL Localhost App</title>
    <link rel="stylesheet" href="/assets/style.css">
</head>
<body>
    <div class="container">
        <!-- Top Nav -->
        <header class="header">
            <div class="brand">
                <span class="badge php-badge">PHP <?= phpversion() ?></span>
                <span class="badge sql-badge">SQLite 3.x</span>
                <h1>Localhost Web Application</h1>
            </div>
            <div class="server-meta">
                <span>⚡ Host: <strong>localhost:8080</strong></span>
                <span>🕒 <?= date('H:i:s') ?> UTC</span>
            </div>
        </header>

        <?php if (!empty($message)): ?>
            <div class="alert alert-<?= $messageType ?>">
                <?= htmlspecialchars($message) ?>
            </div>
        <?php endif; ?>

        <!-- Quick Stats -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-num"><?= $totalNotes ?></div>
                <div class="stat-label">Total Notes</div>
            </div>
            <div class="stat-card">
                <div class="stat-num"><?= $completedNotes ?></div>
                <div class="stat-label">Completed</div>
            </div>
            <div class="stat-card">
                <div class="stat-num"><?= count($users) ?></div>
                <div class="stat-label">Active Users</div>
            </div>
            <div class="stat-card">
                <div class="stat-num"><?= round(memory_get_usage() / 1024, 1) ?> KB</div>
                <div class="stat-label">Memory Usage</div>
            </div>
        </div>

        <div class="main-layout">
            <!-- Left: Add Note Form -->
            <div class="card form-card">
                <h2>Add New Record</h2>
                <p class="subtitle">Inserts directly into SQLite database via PHP PDO.</p>
                <form action="/index.php" method="POST" class="note-form">
                    <input type="hidden" name="action" value="create_note">
                    <div class="form-group">
                        <label for="title">Title *</label>
                        <input type="text" id="title" name="title" placeholder="e.g. Build authentication API" required>
                    </div>
                    <div class="form-group">
                        <label for="category">Category</label>
                        <select id="category" name="category">
                            <option value="General">General</option>
                            <option value="Backend">Backend</option>
                            <option value="Database">Database</option>
                            <option value="Frontend">Frontend</option>
                            <option value="Design">Design</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="content">Description</label>
                        <textarea id="content" name="content" rows="3" placeholder="Enter details or task steps..."></textarea>
                    </div>
                    <button type="submit" class="btn btn-primary">Save to SQLite</button>
                </form>
            </div>

            <!-- Right: Database Records -->
            <div class="card list-card">
                <div class="card-header">
                    <h2>Live Database Records</h2>
                    <a href="/api/notes.php" target="_blank" class="api-link">View JSON API &rarr;</a>
                </div>
                
                <?php if (empty($notes)): ?>
                    <p class="empty-state">No notes found. Create your first record on the left!</p>
                <?php else: ?>
                    <div class="notes-list">
                        <?php foreach ($notes as $note): ?>
                            <div class="note-item <?= $note['is_completed'] ? 'completed' : '' ?>">
                                <div class="note-header">
                                    <span class="category-tag"><?= htmlspecialchars($note['category']) ?></span>
                                    <span class="note-date"><?= htmlspecialchars($note['created_at']) ?></span>
                                </div>
                                <h3 class="note-title"><?= htmlspecialchars($note['title']) ?></h3>
                                <?php if (!empty($note['content'])): ?>
                                    <p class="note-content"><?= nl2br(htmlspecialchars($note['content'])) ?></p>
                                <?php endif; ?>
                                <div class="note-actions">
                                    <form action="/index.php" method="POST" style="display:inline;">
                                        <input type="hidden" name="action" value="toggle_note">
                                        <input type="hidden" name="id" value="<?= $note['id'] ?>">
                                        <input type="hidden" name="status" value="<?= $note['is_completed'] ?>">
                                        <button type="submit" class="btn btn-sm <?= $note['is_completed'] ? 'btn-secondary' : 'btn-success' ?>">
                                            <?= $note['is_completed'] ? 'Mark Active' : 'Mark Done' ?>
                                        </button>
                                    </form>
                                    <form action="/index.php" method="POST" style="display:inline;" onsubmit="return confirm('Delete this note?');">
                                        <input type="hidden" name="action" value="delete_note">
                                        <input type="hidden" name="id" value="<?= $note['id'] ?>">
                                        <button type="submit" class="btn btn-sm btn-danger">Delete</button>
                                    </form>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>
            </div>
        </div>
    </div>
    <script src="/assets/app.js"></script>
</body>
</html>
`
    );

    // 3. api/notes.php
    fs.writeFileSync(
      path.join(WORKSPACE_DIR, "api", "notes.php"),
      `<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../db.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM notes ORDER BY id DESC");
    $notes = $stmt->fetchAll();
    echo json_encode([
        'status' => 'success',
        'count' => count($notes),
        'timestamp' => time(),
        'data' => $notes
    ], JSON_PRETTY_PRINT);
    exit;
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $title = $input['title'] ?? $_POST['title'] ?? '';
    $content = $input['content'] ?? $_POST['content'] ?? '';
    $category = $input['category'] ?? $_POST['category'] ?? 'API';

    if (empty($title)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Title is required']);
        exit;
    }

    $stmt = $pdo->prepare("INSERT INTO notes (title, content, category) VALUES (?, ?, ?)");
    $stmt->execute([$title, $content, $category]);
    $newId = $pdo->lastInsertId();

    echo json_encode([
        'status' => 'success',
        'message' => 'Note created via API',
        'id' => $newId
    ], JSON_PRETTY_PRINT);
    exit;
}

http_response_code(405);
echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
`
    );

    // 4. assets/style.css
    fs.writeFileSync(
      path.join(WORKSPACE_DIR, "assets", "style.css"),
      `* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    background-color: #0d1117;
    color: #e6edf3;
    line-height: 1.6;
    padding: 24px 16px;
}

.container {
    max-width: 1040px;
    margin: 0 auto;
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #30363d;
    padding-bottom: 16px;
    margin-bottom: 24px;
    flex-wrap: wrap;
    gap: 12px;
}

.brand {
    display: flex;
    align-items: center;
    gap: 10px;
}

.brand h1 {
    font-size: 1.35rem;
    font-weight: 600;
    color: #f0f6fc;
}

.badge {
    font-size: 0.75rem;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 6px;
    text-transform: uppercase;
}

.php-badge {
    background: #4f5d95;
    color: #ffffff;
}

.sql-badge {
    background: #00758f;
    color: #ffffff;
}

.server-meta {
    font-size: 0.85rem;
    color: #8b949e;
    display: flex;
    gap: 16px;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 14px;
    margin-bottom: 24px;
}

.stat-card {
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 8px;
    padding: 16px;
    text-align: center;
}

.stat-num {
    font-size: 1.8rem;
    font-weight: 700;
    color: #58a6ff;
}

.stat-label {
    font-size: 0.8rem;
    color: #8b949e;
    margin-top: 4px;
}

.alert {
    padding: 12px 16px;
    border-radius: 6px;
    margin-bottom: 20px;
    font-size: 0.9rem;
}

.alert-success {
    background: rgba(46, 160, 67, 0.15);
    border: 1px solid #2ea043;
    color: #3fb950;
}

.alert-danger {
    background: rgba(248, 81, 73, 0.15);
    border: 1px solid #f85149;
    color: #ff7b72;
}

.main-layout {
    display: grid;
    grid-template-columns: 1fr 1.6fr;
    gap: 20px;
}

@media (max-width: 768px) {
    .main-layout {
        grid-template-columns: 1fr;
    }
}

.card {
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 8px;
    padding: 20px;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}

.card h2 {
    font-size: 1.15rem;
    font-weight: 600;
}

.subtitle {
    font-size: 0.82rem;
    color: #8b949e;
    margin-top: 2px;
    margin-bottom: 16px;
}

.api-link {
    font-size: 0.82rem;
    color: #58a6ff;
    text-decoration: none;
}

.api-link:hover {
    text-decoration: underline;
}

.form-group {
    margin-bottom: 14px;
}

.form-group label {
    display: block;
    font-size: 0.85rem;
    font-weight: 500;
    margin-bottom: 6px;
    color: #c9d1d9;
}

input[type="text"], select, textarea {
    width: 100%;
    padding: 9px 12px;
    background: #0d1117;
    border: 1px solid #30363d;
    border-radius: 6px;
    color: #c9d1d9;
    font-size: 0.9rem;
    outline: none;
    transition: border-color 0.15s;
}

input[type="text"]:focus, select:focus, textarea:focus {
    border-color: #58a6ff;
}

.btn {
    display: inline-block;
    padding: 8px 16px;
    font-size: 0.88rem;
    font-weight: 600;
    border-radius: 6px;
    cursor: pointer;
    border: none;
    transition: background 0.15s, opacity 0.15s;
}

.btn-primary {
    background: #238636;
    color: #ffffff;
    width: 100%;
}

.btn-primary:hover {
    background: #2ea043;
}

.btn-secondary {
    background: #30363d;
    color: #c9d1d9;
}

.btn-success {
    background: #1f6feb;
    color: #ffffff;
}

.btn-danger {
    background: #b62324;
    color: #ffffff;
}

.btn-sm {
    padding: 4px 10px;
    font-size: 0.78rem;
}

.notes-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.note-item {
    background: #0d1117;
    border: 1px solid #30363d;
    border-radius: 6px;
    padding: 14px;
    transition: border-color 0.15s;
}

.note-item.completed {
    opacity: 0.65;
    border-color: #238636;
}

.note-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
}

.category-tag {
    font-size: 0.7rem;
    font-weight: 600;
    background: #21262d;
    color: #58a6ff;
    padding: 2px 8px;
    border-radius: 12px;
}

.note-date {
    font-size: 0.75rem;
    color: #8b949e;
}

.note-title {
    font-size: 0.98rem;
    font-weight: 600;
    margin-bottom: 4px;
}

.note-content {
    font-size: 0.85rem;
    color: #8b949e;
    margin-bottom: 12px;
}

.note-actions {
    display: flex;
    gap: 8px;
}

.empty-state {
    text-align: center;
    color: #8b949e;
    padding: 30px;
    font-size: 0.9rem;
}
`
    );

    // 5. assets/app.js
    fs.writeFileSync(
      path.join(WORKSPACE_DIR, "assets", "app.js"),
      `// Frontend JavaScript for PHP & SQL Web App
console.log("Localhost application loaded with PHP backend.");

document.addEventListener("DOMContentLoaded", () => {
    // Smooth highlight on new note
    const alerts = document.querySelectorAll(".alert");
    alerts.forEach(alert => {
        setTimeout(() => {
            alert.style.transition = "opacity 0.5s ease";
            alert.style.opacity = "0.7";
        }, 3000);
    });
});
`
    );

    // 6. schema.sql
    fs.writeFileSync(
      path.join(WORKSPACE_DIR, "schema.sql"),
      `-- Database Schema for PHP & SQL IDE
-- Target: SQLite 3

CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    is_completed INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'developer',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level TEXT DEFAULT 'info',
    action TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed Sample Data
INSERT INTO notes (title, content, category) 
VALUES ('Welcome to PHP & SQL IDE', 'Native PHP 8.2 execution with SQLite3 support.', 'System');

INSERT INTO users (name, email, role) 
VALUES ('Alice Developer', 'alice@localhost.dev', 'admin');

INSERT INTO system_logs (level, action) 
VALUES ('info', 'Database initialized successfully');
`
    );

    // 7. README.md
    fs.writeFileSync(
      path.join(WORKSPACE_DIR, "README.md"),
      `# PHP & SQL Web Project

Welcome to your embedded development workspace.

## Features:
- **PHP 8.2 Runtime**: Native execution of scripts and APIs.
- **SQLite 3 Engine**: Serverless, fast relational database with full PDO support.
- **Localhost Runner**: Test endpoints and pages in the right-hand browser preview.
- **SQL Studio**: Execute custom queries directly against \`database.sqlite\`.

## Files:
- \`index.php\`: Main application page with CRUD forms and live records.
- \`db.php\`: SQLite connection and schema bootstrap.
- \`api/notes.php\`: REST JSON API endpoint.
- \`schema.sql\`: DDL queries for the database.
`
    );
  }

  addLog("server", `Loaded template: ${templateId}`);
}

// Global reference to spawned php process (disabled running localhost)
let phpServerProcess: any = null;

function stopPhpServer() {
  if (phpServerProcess) {
    try {
      phpServerProcess.kill();
    } catch {
      // ignore
    }
    phpServerProcess = null;
  }
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// 1. Health check & status
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    phpRunning: !!phpServerProcess,
    workspace: WORKSPACE_DIR,
    phpPort: PHP_INTERNAL_PORT,
  });
});

// 2. Server Logs
app.get("/api/logs", (req, res) => {
  res.json({ logs: serverLogs });
});

app.post("/api/logs/clear", (req, res) => {
  serverLogs.length = 0;
  res.json({ status: "cleared" });
});

// 3. File System Tree
interface FsItem {
  name: string;
  path: string; // relative to workspace
  isDirectory: boolean;
  size?: number;
  children?: FsItem[];
}

function scanDir(dirPath: string, relativePath = ""): FsItem[] {
  if (!fs.existsSync(dirPath)) return [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const items: FsItem[] = [];

  // Sort: directories first, then alphabetical
  entries.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });

  for (const entry of entries) {
    // Skip hidden files/directories except .htaccess if any
    if (entry.name.startsWith(".") && entry.name !== ".htaccess") continue;

    const itemRelPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
    const fullItemPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      items.push({
        name: entry.name,
        path: itemRelPath,
        isDirectory: true,
        children: scanDir(fullItemPath, itemRelPath),
      });
    } else {
      const stats = fs.statSync(fullItemPath);
      items.push({
        name: entry.name,
        path: itemRelPath,
        isDirectory: false,
        size: stats.size,
      });
    }
  }

  return items;
}

app.get("/api/fs/tree", (req, res) => {
  try {
    const tree = scanDir(WORKSPACE_DIR);
    res.json({ tree });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Read File Content
app.get("/api/fs/read", (req, res) => {
  const relPath = req.query.path as string;
  if (!relPath) {
    return res.status(400).json({ error: "File path required" });
  }

  const fullPath = path.resolve(WORKSPACE_DIR, relPath);
  if (!fullPath.startsWith(WORKSPACE_DIR)) {
    return res.status(403).json({ error: "Access denied" });
  }

  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: "File not found" });
  }

  try {
    // Check if binary (e.g. database.sqlite or images)
    const isBinary = relPath.endsWith(".sqlite") || relPath.endsWith(".db") || relPath.endsWith(".png") || relPath.endsWith(".jpg");
    if (isBinary) {
      return res.json({
        content: `[Binary file: ${relPath}]`,
        isBinary: true,
        size: fs.statSync(fullPath).size,
      });
    }

    const content = fs.readFileSync(fullPath, "utf-8");
    res.json({ content, isBinary: false });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Write / Save File
app.post("/api/fs/write", (req, res) => {
  const { path: relPath, content } = req.body;
  if (!relPath) {
    return res.status(400).json({ error: "File path required" });
  }

  const fullPath = path.resolve(WORKSPACE_DIR, relPath);
  if (!fullPath.startsWith(WORKSPACE_DIR)) {
    return res.status(403).json({ error: "Access denied" });
  }

  try {
    const parent = path.dirname(fullPath);
    if (!fs.existsSync(parent)) {
      fs.mkdirSync(parent, { recursive: true });
    }

    fs.writeFileSync(fullPath, content ?? "", "utf-8");
    addLog("server", `Saved file: ${relPath}`);
    res.json({ status: "ok", path: relPath });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Create File / Folder
app.post("/api/fs/create", (req, res) => {
  const { path: relPath, isDirectory } = req.body;
  if (!relPath) {
    return res.status(400).json({ error: "Path required" });
  }

  const fullPath = path.resolve(WORKSPACE_DIR, relPath);
  if (!fullPath.startsWith(WORKSPACE_DIR)) {
    return res.status(403).json({ error: "Access denied" });
  }

  try {
    if (isDirectory) {
      fs.mkdirSync(fullPath, { recursive: true });
      addLog("server", `Created directory: ${relPath}`);
    } else {
      const parent = path.dirname(fullPath);
      if (!fs.existsSync(parent)) {
        fs.mkdirSync(parent, { recursive: true });
      }
      if (!fs.existsSync(fullPath)) {
        fs.writeFileSync(fullPath, "", "utf-8");
      }
      addLog("server", `Created file: ${relPath}`);
    }
    res.json({ status: "ok", path: relPath });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Delete File / Folder
app.post("/api/fs/delete", (req, res) => {
  const { path: relPath } = req.body;
  if (!relPath) {
    return res.status(400).json({ error: "Path required" });
  }

  const fullPath = path.resolve(WORKSPACE_DIR, relPath);
  if (!fullPath.startsWith(WORKSPACE_DIR) || fullPath === WORKSPACE_DIR) {
    return res.status(403).json({ error: "Cannot delete workspace root" });
  }

  try {
    if (fs.existsSync(fullPath)) {
      fs.rmSync(fullPath, { recursive: true, force: true });
      addLog("server", `Deleted: ${relPath}`);
    }
    res.json({ status: "ok" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Rename / Move File / Folder
app.post("/api/fs/rename", (req, res) => {
  const { oldPath, newPath } = req.body;
  if (!oldPath || !newPath) {
    return res.status(400).json({ error: "Both old and new paths are required" });
  }

  const fullOld = path.resolve(WORKSPACE_DIR, oldPath);
  const fullNew = path.resolve(WORKSPACE_DIR, newPath);

  if (!fullOld.startsWith(WORKSPACE_DIR) || !fullNew.startsWith(WORKSPACE_DIR)) {
    return res.status(403).json({ error: "Access denied" });
  }

  try {
    const parentNew = path.dirname(fullNew);
    if (!fs.existsSync(parentNew)) {
      fs.mkdirSync(parentNew, { recursive: true });
    }
    fs.renameSync(fullOld, fullNew);
    addLog("server", `Renamed ${oldPath} to ${newPath}`);
    res.json({ status: "ok" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Reset or switch template
app.post("/api/fs/reset-template", (req, res) => {
  const { template = "crud-notes" } = req.body;
  try {
    loadTemplate(template);
    res.json({ status: "ok", template });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Server Status / Health
app.post("/api/server/restart", (req, res) => {
  stopPhpServer();
  res.json({ status: "ok" });
});

// 11. Run arbitrary PHP code or file via CLI
app.post("/api/php/run", (req, res) => {
  const { code, filePath } = req.body;
  const startTime = Date.now();

  if (filePath) {
    const fullPath = path.resolve(WORKSPACE_DIR, filePath);
    execFile("php", [fullPath], { cwd: WORKSPACE_DIR }, (error, stdout, stderr) => {
      const duration = Date.now() - startTime;
      addLog("php", `Executed ${filePath} (${duration}ms)`);
      res.json({
        stdout,
        stderr,
        exitCode: error ? error.code : 0,
        duration,
      });
    });
  } else if (code) {
    execFile("php", ["-r", code], { cwd: WORKSPACE_DIR }, (error, stdout, stderr) => {
      const duration = Date.now() - startTime;
      addLog("php", `Executed PHP snippet (${duration}ms)`);
      res.json({
        stdout,
        stderr,
        exitCode: error ? error.code : 0,
        duration,
      });
    });
  } else {
    res.status(400).json({ error: "Code or filePath required" });
  }
});

// 12. SQL Database Studio APIs
const DB_FILE = path.join(WORKSPACE_DIR, "database.sqlite");

// List tables and metadata
app.get("/api/sql/tables", (req, res) => {
  if (!fs.existsSync(DB_FILE)) {
    return res.json({ tables: [], exists: false });
  }

  // Use sqlite3 -json to get tables
  const query = `
    SELECT name, type, sql 
    FROM sqlite_master 
    WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%' 
    ORDER BY name ASC;
  `;

  execFile("sqlite3", ["-json", DB_FILE, query], (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: stderr || error.message });
    }

    try {
      const rawTables = stdout.trim() ? JSON.parse(stdout) : [];

      // Get row counts for each table
      const countQueries = rawTables
        .map((t: any) => `SELECT '${t.name}' as tbl, count(*) as count FROM "${t.name}"`)
        .join(" UNION ALL ");

      if (countQueries) {
        execFile("sqlite3", ["-json", DB_FILE, countQueries], (cntErr, cntOut) => {
          const counts: Record<string, number> = {};
          if (!cntErr && cntOut.trim()) {
            try {
              const rows = JSON.parse(cntOut);
              for (const r of rows) {
                counts[r.tbl] = Number(r.count);
              }
            } catch {
              // ignore
            }
          }

          const tables = rawTables.map((t: any) => ({
            name: t.name,
            type: t.type,
            sql: t.sql,
            rowCount: counts[t.name] ?? 0,
          }));

          res.json({ tables, exists: true });
        });
      } else {
        res.json({ tables: rawTables, exists: true });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
});

// Inspect table schema columns
app.get("/api/sql/table-schema", (req, res) => {
  const tableName = req.query.table as string;
  if (!tableName) {
    return res.status(400).json({ error: "Table name required" });
  }

  if (!fs.existsSync(DB_FILE)) {
    return res.status(404).json({ error: "Database file does not exist" });
  }

  execFile("sqlite3", ["-json", DB_FILE, `PRAGMA table_info("${tableName}");`], (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: stderr || error.message });
    }
    try {
      const columns = stdout.trim() ? JSON.parse(stdout) : [];
      res.json({ columns });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
});

// Execute custom SQL query
app.post("/api/sql/execute", (req, res) => {
  const { query } = req.body;
  if (!query || typeof query !== "string") {
    return res.status(400).json({ error: "SQL query required" });
  }

  if (!fs.existsSync(DB_FILE)) {
    // initialize empty sqlite db if not existing
    fs.writeFileSync(DB_FILE, "");
  }

  const startTime = Date.now();
  const trimmed = query.trim();
  const isSelect = /^\s*(SELECT|PRAGMA|EXPLAIN|WITH)/i.test(trimmed);

  if (isSelect) {
    execFile("sqlite3", ["-json", DB_FILE, query], (error, stdout, stderr) => {
      const duration = Date.now() - startTime;
      if (error) {
        addLog("sql", `Query error: ${stderr || error.message}`);
        return res.status(400).json({ error: stderr || error.message, duration });
      }

      try {
        const rows = stdout.trim() ? JSON.parse(stdout) : [];
        const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
        addLog("sql", `Executed SELECT (${rows.length} rows, ${duration}ms)`);
        res.json({
          columns,
          rows,
          rowCount: rows.length,
          duration,
          isSelect: true,
        });
      } catch (e: any) {
        res.status(500).json({ error: "Failed to parse query output: " + e.message, raw: stdout });
      }
    });
  } else {
    // DDL or DML: INSERT, UPDATE, DELETE, CREATE, DROP, etc.
    execFile("sqlite3", [DB_FILE, query], (error, stdout, stderr) => {
      const duration = Date.now() - startTime;
      if (error) {
        addLog("sql", `Execution error: ${stderr || error.message}`);
        return res.status(400).json({ error: stderr || error.message, duration });
      }

      addLog("sql", `Executed statement (${duration}ms)`);
      res.json({
        message: "Statement executed successfully",
        output: stdout,
        duration,
        isSelect: false,
      });
    });
  }
});

// 13. Localhost Runner (Disabled by user request)
app.use("/api/localhost", (req, res) => {
  res.status(200).send(`
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 32px; background: #0d1117; color: #c9d1d9; min-height: 100vh;">
      <h2 style="color: #58a6ff; margin-bottom: 8px;">PHP Localhost Runner Disabled</h2>
      <p style="color: #8b949e; line-height: 1.6;">The localhost server has been removed. You can edit your code in the full editor and run PHP files directly in the CLI Terminal below.</p>
    </div>
  `);
});

// -------------------------------------------------------------
// Vite middleware & Production Server
// -------------------------------------------------------------
async function startServer() {
  // Ensure workspace files exist
  ensureWorkspace();
  stopPhpServer();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Main IDE server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
