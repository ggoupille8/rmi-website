const path = require('path');
const Service = require('node-windows').Service;

const svc = new Service({
  name: 'RMI WIP Sync Agent',
  description: 'Watches WIP Excel files on P:\\ drive and syncs to RMI database',
  script: path.join(__dirname, 'index.js'),
});

svc.on('uninstall', () => {
  console.log('Service uninstalled.');
});

svc.on('alreadyuninstalled', () => {
  console.log('Service is already uninstalled.');
});

svc.on('error', (err) => {
  console.error('Service error:', err);
});

svc.uninstall();
