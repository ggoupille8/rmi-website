import fs from 'node:fs/promises';
import path from 'node:path';
import { glob } from 'glob';
import { config, resolveSandboxedPath } from '../config.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert an absolute FS path back to a root-relative path with forward slashes. */
function toRelative(absPath: string): string {
  const rootNorm = path.resolve(config.rootPath);
  const rel = path.relative(rootNorm, absPath);
  return '/' + rel.replace(/\\/g, '/');
}

interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  lastModified: string;
  extension: string;
}

async function statEntry(absPath: string): Promise<FileEntry> {
  const stat = await fs.stat(absPath);
  return {
    name: path.basename(absPath),
    path: toRelative(absPath),
    type: stat.isDirectory() ? 'directory' : 'file',
    size: stat.size,
    lastModified: stat.mtime.toISOString(),
    extension: stat.isFile() ? path.extname(absPath).toLowerCase() : '',
  };
}

// ---------------------------------------------------------------------------
// Tool implementations
// ---------------------------------------------------------------------------

/**
 * list_directory — list files and folders at a path.
 */
export async function listDirectory(params: {
  path: string;
  recursive?: boolean;
  maxDepth?: number;
}): Promise<FileEntry[]> {
  const absPath = resolveSandboxedPath(params.path);
  const stat = await fs.stat(absPath);
  if (!stat.isDirectory()) {
    throw new Error(`"${params.path}" is not a directory`);
  }

  if (params.recursive) {
    return listRecursive(absPath, 0, params.maxDepth ?? 3);
  }

  const entries = await fs.readdir(absPath, { withFileTypes: true });
  const results: FileEntry[] = [];
  for (const entry of entries) {
    const entryPath = path.join(absPath, entry.name);
    try {
      results.push(await statEntry(entryPath));
    } catch {
      // Skip entries we can't stat (e.g. broken links)
    }
  }
  return results.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

async function listRecursive(
  dir: string,
  depth: number,
  maxDepth: number,
): Promise<FileEntry[]> {
  if (depth > maxDepth) return [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const results: FileEntry[] = [];
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    try {
      results.push(await statEntry(entryPath));
      if (entry.isDirectory()) {
        const children = await listRecursive(entryPath, depth + 1, maxDepth);
        results.push(...children);
      }
    } catch {
      // skip inaccessible
    }
  }
  return results;
}

/**
 * read_file — read a file's contents (text or base64).
 */
export async function readFile(params: {
  path: string;
  encoding?: string;
}): Promise<{ content: string; truncated: boolean; size: number; encoding: string }> {
  const absPath = resolveSandboxedPath(params.path);
  const stat = await fs.stat(absPath);

  if (stat.isDirectory()) {
    throw new Error(`"${params.path}" is a directory — use list_directory instead`);
  }

  if (stat.size > config.maxFileSize) {
    throw new Error(
      `File is ${(stat.size / 1024 / 1024).toFixed(1)} MB — exceeds the ${config.maxFileSize / 1024 / 1024} MB limit. Use get_file_info for metadata.`,
    );
  }

  const ext = path.extname(absPath).toLowerCase();
  const textExtensions = new Set(['.txt', '.log', '.md', '.csv', '.json', '.xml', '.html', '.css', '.js', '.ts']);
  const isText = textExtensions.has(ext) || params.encoding === 'utf-8';

  if (isText) {
    const buf = await fs.readFile(absPath);
    const truncated = buf.length > config.maxReadSize;
    const content = buf.subarray(0, config.maxReadSize).toString('utf-8');
    return {
      content: truncated ? content + '\n\n[... truncated — file is ' + (stat.size / 1024).toFixed(0) + ' KB total]' : content,
      truncated,
      size: stat.size,
      encoding: 'utf-8',
    };
  }

  // Binary → base64
  const buf = await fs.readFile(absPath);
  const truncated = buf.length > config.maxReadSize;
  const slice = buf.subarray(0, config.maxReadSize);
  return {
    content: slice.toString('base64'),
    truncated,
    size: stat.size,
    encoding: 'base64',
  };
}

/**
 * search_files — search for files matching a glob pattern.
 */
export async function searchFiles(params: {
  pattern: string;
  directory?: string;
  extension?: string;
}): Promise<FileEntry[]> {
  const baseDir = resolveSandboxedPath(params.directory || '/');

  let pattern = params.pattern;
  if (params.extension) {
    // Append extension filter if not already in pattern
    const ext = params.extension.startsWith('.') ? params.extension : '.' + params.extension;
    if (!pattern.endsWith(ext)) {
      pattern = pattern.endsWith('/') ? pattern + `*${ext}` : pattern;
    }
  }

  const matches = await glob(pattern, {
    cwd: baseDir,
    absolute: true,
    nodir: false,
    windowsPathsNoEscape: true,
    maxDepth: 10,
  });

  const results: FileEntry[] = [];
  for (const match of matches.slice(0, 200)) {
    try {
      // Verify each match is still within sandbox
      const rel = toRelative(match);
      resolveSandboxedPath(rel);
      results.push(await statEntry(match));
    } catch {
      // skip
    }
  }

  return results.sort((a, b) => a.path.localeCompare(b.path));
}

/**
 * get_file_info — get metadata about a single file or directory.
 */
export async function getFileInfo(params: { path: string }): Promise<{
  name: string;
  path: string;
  size: number;
  lastModified: string;
  created: string;
  extension: string;
  mimeType: string;
}> {
  const absPath = resolveSandboxedPath(params.path);
  const stat = await fs.stat(absPath);

  const ext = path.extname(absPath).toLowerCase();
  const mimeMap: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xls': 'application/vnd.ms-excel',
    '.csv': 'text/csv',
    '.txt': 'text/plain',
    '.log': 'text/plain',
    '.md': 'text/markdown',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
  };

  return {
    name: path.basename(absPath),
    path: toRelative(absPath),
    size: stat.size,
    lastModified: stat.mtime.toISOString(),
    created: stat.birthtime.toISOString(),
    extension: ext,
    mimeType: mimeMap[ext] || 'application/octet-stream',
  };
}

/**
 * directory_tree — returns a nested tree structure of a directory.
 */
export interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: TreeNode[];
}

export async function directoryTree(params: {
  path: string;
  maxDepth?: number;
  includeFiles?: boolean;
}): Promise<TreeNode> {
  const absPath = resolveSandboxedPath(params.path);
  const stat = await fs.stat(absPath);

  if (!stat.isDirectory()) {
    return {
      name: path.basename(absPath),
      path: toRelative(absPath),
      type: 'file',
    };
  }

  return buildTree(absPath, 0, params.maxDepth ?? 3, params.includeFiles ?? true);
}

async function buildTree(
  dir: string,
  depth: number,
  maxDepth: number,
  includeFiles: boolean,
): Promise<TreeNode> {
  const node: TreeNode = {
    name: path.basename(dir),
    path: toRelative(dir),
    type: 'directory',
    children: [],
  };

  if (depth >= maxDepth) return node;

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        const child = await buildTree(entryPath, depth + 1, maxDepth, includeFiles);
        node.children!.push(child);
      } else if (includeFiles) {
        node.children!.push({
          name: entry.name,
          path: toRelative(entryPath),
          type: 'file',
        });
      }
    }
  } catch {
    // Permission denied or similar — return node without children
  }

  node.children!.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return node;
}
