import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Service } from 'node-windows';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.join(__dirname, '..', 'dist', 'index.js');

const svc = new Service({
  name: 'RMI MCP Server',
  description: 'MCP server providing Claude with read-only access to P:\\ drive',
  script: scriptPath,
  workingDirectory: path.join(__dirname, '..'),
  env: [
    { name: 'MCP_ROOT_PATH', value: process.env.MCP_ROOT_PATH || 'P:\\' },
    { name: 'MCP_AUTH_TOKEN', value: process.env.MCP_AUTH_TOKEN || '' },
    { name: 'MCP_PORT', value: process.env.MCP_PORT || '3100' },
    { name: 'NODE_ENV', value: 'production' },
  ],
});

svc.on('install', () => {
  console.log('Service installed. Starting...');
  svc.start();
});

svc.on('alreadyinstalled', () => {
  console.log('Service is already installed.');
});

svc.on('start', () => {
  console.log('RMI MCP Server started successfully.');
});

svc.on('error', (err) => {
  console.error('Service error:', err);
});

if (!process.env.MCP_AUTH_TOKEN) {
  console.error('ERROR: MCP_AUTH_TOKEN environment variable is required.');
  console.error('Set it before running this script:');
  console.error('  $env:MCP_AUTH_TOKEN = "<your-64-char-hex-token>"');
  process.exit(1);
}

console.log(`Installing service with script: ${scriptPath}`);
svc.install();
