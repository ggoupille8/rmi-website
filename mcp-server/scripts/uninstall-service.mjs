import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Service } from 'node-windows';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const svc = new Service({
  name: 'RMI MCP Server',
  description: 'MCP server providing Claude with read-only access to P:\\ drive',
  script: path.join(__dirname, '..', 'dist', 'index.js'),
});

svc.on('uninstall', () => {
  console.log('RMI MCP Server service uninstalled.');
});

svc.on('alreadyuninstalled', () => {
  console.log('Service is already uninstalled.');
});

svc.on('error', (err) => {
  console.error('Service error:', err);
});

svc.uninstall();
