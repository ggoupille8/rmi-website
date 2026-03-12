const WipWatcher = require('./watcher');
const WipUploader = require('./uploader');
const logger = require('./logger');
const config = require('./config');
const fs = require('fs');
const path = require('path');

// Validate config
if (!config.apiKey) {
  logger.error('WIP_API_KEY is not set. Please add it to .env');
  process.exit(1);
}

if (!fs.existsSync(config.watchPath)) {
  logger.error(`Watch path does not exist: ${config.watchPath}`);
  logger.error('Make sure the P:\\ drive is mapped and accessible.');
  process.exit(1);
}

// Initialize
const uploader = new WipUploader();
const watcher = new WipWatcher(async (filePath) => {
  try {
    await uploader.upload(filePath);
  } catch (error) {
    logger.error(`Unexpected error processing ${filePath}: ${error.message}`);
  }
});

// Start watching
logger.info('=== WIP Sync Agent Starting ===');
logger.info(`Watch path: ${config.watchPath}`);
logger.info(`API endpoint: ${config.apiUrl}`);
logger.info(`Debounce: ${config.debounceMs}ms`);

watcher.start();

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down...');
  watcher.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Shutting down...');
  watcher.stop();
  process.exit(0);
});

// Also handle initial sync on startup — scan for all existing WIP files
// and upload any that haven't been synced yet
async function initialSync() {
  logger.info('Running initial sync of existing files...');
  const files = fs.readdirSync(config.watchPath)
    .filter(f => f.match(/^RMI WIP - \d{4}\.xlsx$/i))
    .map(f => path.join(config.watchPath, f));

  logger.info(`Found ${files.length} WIP files`);

  for (const file of files) {
    await uploader.upload(file);
  }

  logger.info('Initial sync complete. Watching for changes...');
}

// Run initial sync then keep watching
initialSync().catch(err => {
  logger.error(`Initial sync failed: ${err.message}`);
});
