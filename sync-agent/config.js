require('dotenv').config();

module.exports = {
  // Watch path — the folder containing WIP Excel files
  watchPath: process.env.WIP_WATCH_PATH || 'P:\\WIP - Financial',

  // File pattern to watch
  filePattern: '**/*.xlsx',

  // API endpoint for uploading
  apiUrl: process.env.WIP_API_URL || 'https://rmi-llc.net/api/admin/wip-upload',

  // API key for authentication
  apiKey: process.env.WIP_API_KEY || '',

  // Debounce delay in ms (Excel saves can trigger multiple write events)
  debounceMs: parseInt(process.env.WIP_DEBOUNCE_MS || '5000', 10),

  // Minimum file size to consider valid (avoids partial saves)
  minFileSizeBytes: 10000,

  // Log directory
  logDir: process.env.WIP_LOG_DIR || './logs',

  // Maximum retries on upload failure
  maxRetries: 3,

  // Retry delay in ms
  retryDelayMs: 10000,
};
