const fs = require('fs');
const path = require('path');
const config = require('./config');

// Ensure log directory exists
if (!fs.existsSync(config.logDir)) {
  fs.mkdirSync(config.logDir, { recursive: true });
}

const logFile = path.join(config.logDir, `wip-sync-${new Date().toISOString().slice(0, 10)}.log`);

function formatMessage(level, message) {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] ${message}`;
}

function writeLog(level, message) {
  const formatted = formatMessage(level, message);
  console.log(formatted);
  fs.appendFileSync(logFile, formatted + '\n');
}

module.exports = {
  info: (msg) => writeLog('INFO', msg),
  warn: (msg) => writeLog('WARN', msg),
  error: (msg) => writeLog('ERROR', msg),
  debug: (msg) => {
    if (process.env.WIP_DEBUG === 'true') writeLog('DEBUG', msg);
  },
};
