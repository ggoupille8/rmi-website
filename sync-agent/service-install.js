const path = require('path');
const Service = require('node-windows').Service;

const svc = new Service({
  name: 'RMI WIP Sync Agent',
  description: 'Watches WIP Excel files on P:\\ drive and syncs to RMI database',
  script: path.join(__dirname, 'index.js'),
  workingDirectory: __dirname,
  env: [
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
  console.log('Service started.');
});

svc.on('error', (err) => {
  console.error('Service error:', err);
});

svc.install();
