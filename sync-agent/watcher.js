const chokidar = require('chokidar');
const path = require('path');
const config = require('./config');
const logger = require('./logger');

class WipWatcher {
  constructor(onFileChanged) {
    this.onFileChanged = onFileChanged;
    this.debounceTimers = new Map();
    this.watcher = null;
  }

  start() {
    const watchGlob = path.join(config.watchPath, config.filePattern);
    logger.info(`Starting file watcher on: ${config.watchPath}`);
    logger.info(`Watching for: ${config.filePattern}`);

    this.watcher = chokidar.watch(watchGlob, {
      persistent: true,
      ignoreInitial: true,         // Don't trigger on existing files at startup
      awaitWriteFinish: {          // Wait for file to be fully written
        stabilityThreshold: 3000,  // File must be stable for 3 seconds
        pollInterval: 1000
      },
      usePolling: true,            // Required for network drives (P:\)
      interval: 5000,              // Poll interval for network drives
    });

    this.watcher
      .on('change', (filePath) => this._handleChange(filePath))
      .on('add', (filePath) => this._handleChange(filePath))
      .on('error', (error) => logger.error(`Watcher error: ${error.message}`));

    logger.info('File watcher started successfully');
  }

  _handleChange(filePath) {
    // Only process .xlsx files matching RMI WIP naming pattern
    const fileName = path.basename(filePath);
    if (!fileName.match(/^RMI WIP - \d{4}\.xlsx$/i)) {
      logger.debug(`Ignoring non-WIP file: ${fileName}`);
      return;
    }

    // Debounce: cancel previous timer for this file, set new one
    if (this.debounceTimers.has(filePath)) {
      clearTimeout(this.debounceTimers.get(filePath));
    }

    logger.info(`File change detected: ${fileName} — waiting ${config.debounceMs}ms for stability...`);

    this.debounceTimers.set(filePath, setTimeout(() => {
      this.debounceTimers.delete(filePath);
      this.onFileChanged(filePath);
    }, config.debounceMs));
  }

  stop() {
    if (this.watcher) {
      this.watcher.close();
      logger.info('File watcher stopped');
    }
    // Clear all pending debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
  }
}

module.exports = WipWatcher;
