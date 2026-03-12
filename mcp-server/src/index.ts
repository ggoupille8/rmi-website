import 'dotenv/config';
import express from 'express';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { config, RateLimiter } from './config.js';
import { listDirectory, readFile, searchFiles, getFileInfo, directoryTree } from './tools/filesystem.js';
import { readExcel, readPdfText } from './tools/parsers.js';

// ---------------------------------------------------------------------------
// Auth config check
// ---------------------------------------------------------------------------

if (!config.authToken) {
  console.warn('WARNING: No MCP_AUTH_TOKEN set — running without authentication');
}

// ---------------------------------------------------------------------------
// Rate limiter
// ---------------------------------------------------------------------------

const rateLimiter = new RateLimiter(config.maxRequestsPerMinute);

// ---------------------------------------------------------------------------
// MCP Server factory — registers all 7 tools on a fresh server instance
// ---------------------------------------------------------------------------

function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'rmi-file-server',
    version: '1.0.0',
  });

  // 1. list_directory
  server.tool(
    'list_directory',
    'List files and folders at a path on the P:\\ drive',
    {
      path: z.string().describe('Path relative to P:\\ root (e.g., "/" or "/Awarded Contracts")'),
      recursive: z.boolean().optional().describe('List recursively into subdirectories'),
      maxDepth: z.number().optional().describe('Maximum depth for recursive listing (default: 3)'),
    },
    async (params) => {
      const result = await listDirectory(params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // 2. read_file
  server.tool(
    'read_file',
    'Read a file\'s contents (text files as UTF-8, binary as base64)',
    {
      path: z.string().describe('Path to the file relative to P:\\ root'),
      encoding: z.string().optional().describe('Force encoding: "utf-8" for text, "base64" for binary'),
    },
    async (params) => {
      const result = await readFile(params);
      const meta = result.truncated ? `\n\n[Truncated — showing first 1 MB of ${(result.size / 1024).toFixed(0)} KB file]` : '';
      return { content: [{ type: 'text', text: result.content + meta }] };
    },
  );

  // 3. search_files
  server.tool(
    'search_files',
    'Search for files matching a glob pattern (e.g., "**/*.pdf", "**/RMI AR Aging*.pdf")',
    {
      pattern: z.string().describe('Glob pattern to match files'),
      directory: z.string().optional().describe('Directory to search within (default: root)'),
      extension: z.string().optional().describe('Filter by file extension (e.g., ".pdf")'),
    },
    async (params) => {
      const result = await searchFiles(params);
      return {
        content: [{
          type: 'text',
          text: result.length
            ? JSON.stringify(result, null, 2)
            : `No files found matching "${params.pattern}"${params.directory ? ` in ${params.directory}` : ''}`,
        }],
      };
    },
  );

  // 4. get_file_info
  server.tool(
    'get_file_info',
    'Get metadata about a file (size, dates, MIME type) without reading its contents',
    {
      path: z.string().describe('Path to the file relative to P:\\ root'),
    },
    async (params) => {
      const result = await getFileInfo(params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // 5. read_excel
  server.tool(
    'read_excel',
    'Read an Excel/CSV file and return structured data with headers, sheet names, and hidden row flags',
    {
      path: z.string().describe('Path to the Excel file relative to P:\\ root'),
      sheet: z.string().optional().describe('Sheet name to read (default: first sheet)'),
      range: z.string().optional().describe('Cell range to read (e.g., "A1:F50")'),
      headersRow: z.number().optional().describe('Row number containing headers (default: 1)'),
    },
    async (params) => {
      const result = await readExcel(params);
      const summary = [
        `File: ${result.fileName}`,
        `Sheets: ${result.sheets.join(', ')}`,
        `Reading: ${result.activeSheet}`,
        `Rows: ${result.totalRows}${result.truncated ? ` (showing first ${config.maxExcelRows})` : ''}`,
        `Headers: ${result.headers.join(', ')}`,
        result.hiddenRows.length ? `Hidden rows: ${result.hiddenRows.join(', ')}` : null,
      ].filter(Boolean).join('\n');

      return {
        content: [
          { type: 'text', text: summary },
          { type: 'text', text: JSON.stringify(result.data, null, 2) },
        ],
      };
    },
  );

  // 6. read_pdf_text
  server.tool(
    'read_pdf_text',
    'Extract text from a PDF file, optionally selecting specific pages',
    {
      path: z.string().describe('Path to the PDF file relative to P:\\ root'),
      pages: z.array(z.number()).optional().describe('Specific page numbers to extract (default: all)'),
    },
    async (params) => {
      const result = await readPdfText(params);
      const header = `File: ${result.fileName} | Pages: ${result.pageCount}`;
      return {
        content: [
          { type: 'text', text: header },
          { type: 'text', text: result.text },
        ],
      };
    },
  );

  // 7. directory_tree
  server.tool(
    'directory_tree',
    'Get a nested tree view of a directory structure to understand folder organization',
    {
      path: z.string().describe('Path to the directory relative to P:\\ root'),
      maxDepth: z.number().optional().describe('Maximum tree depth (default: 3)'),
      includeFiles: z.boolean().optional().describe('Include files in tree (default: true)'),
    },
    async (params) => {
      const result = await directoryTree(params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  return server;
}

// ---------------------------------------------------------------------------
// Express app with auth + rate limiting
// ---------------------------------------------------------------------------

const app = express();
app.use(express.json());

// Auth middleware — Bearer token check (skipped if no MCP_AUTH_TOKEN set)
if (config.authToken) {
  app.use('/mcp', (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        jsonrpc: '2.0',
        error: { code: -32001, message: 'Unauthorized — Bearer token required' },
        id: null,
      });
      return;
    }

    const token = authHeader.slice(7);
    if (token !== config.authToken) {
      res.status(401).json({
        jsonrpc: '2.0',
        error: { code: -32001, message: 'Unauthorized — invalid token' },
        id: null,
      });
      return;
    }

    next();
  });
}

// Rate limiting middleware
app.use('/mcp', (_req, res, next) => {
  if (!rateLimiter.check()) {
    res.status(429).json({
      jsonrpc: '2.0',
      error: { code: -32002, message: 'Rate limit exceeded — max 60 requests per minute' },
      id: null,
    });
    return;
  }
  next();
});

// ---------------------------------------------------------------------------
// Streamable HTTP transport — session-based
// ---------------------------------------------------------------------------

const transports: Record<string, StreamableHTTPServerTransport> = {};

app.post('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;

  if (sessionId && transports[sessionId]) {
    // Existing session — route to its transport
    await transports[sessionId].handleRequest(req, res, req.body);
    return;
  }

  if (!sessionId && isInitializeRequest(req.body)) {
    // New session — create server + transport
    const server = createMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => {
        transports[id] = transport;
      },
    });

    transport.onclose = () => {
      if (transport.sessionId) {
        delete transports[transport.sessionId];
      }
    };

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    return;
  }

  // Invalid request
  res.status(400).json({
    jsonrpc: '2.0',
    error: { code: -32000, message: 'Bad Request — missing session ID or not an initialize request' },
    id: null,
  });
});

app.get('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Invalid or missing session ID' },
      id: null,
    });
    return;
  }
  await transports[sessionId].handleRequest(req, res);
});

app.delete('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Invalid or missing session ID' },
      id: null,
    });
    return;
  }
  await transports[sessionId].handleRequest(req, res);
});

// Health check
app.get('/healthz', (_req, res) => {
  res.json({
    status: 'ok',
    server: 'rmi-file-server',
    version: '1.0.0',
    rootPath: config.rootPath,
    uptime: process.uptime(),
  });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(config.port, () => {
  console.log(`RMI MCP File Server v1.0.0`);
  console.log(`  Root path : ${config.rootPath}`);
  console.log(`  Port      : ${config.port}`);
  console.log(`  MCP endpoint: http://localhost:${config.port}/mcp`);
  console.log(`  Health check: http://localhost:${config.port}/healthz`);
});
