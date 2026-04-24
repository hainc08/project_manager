const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const formatMessage = (level, tag, message) => {
  const timestamp = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
  return `[${timestamp}] [${level.toUpperCase()}] [${tag}] ${message}\n`;
};

const writeLog = (level, tag, message) => {
  const formatted = formatMessage(level, tag, message);
  
  // Log to console for dev
  if (level === 'error') {
    console.error(formatted.trim());
  } else {
    console.log(formatted.trim());
  }

  // Append to file
  try {
    fs.appendFileSync(LOG_FILE, formatted);
  } catch (err) {
    console.error('Failed to write to log file:', err);
  }
};

const logger = {
  info: (tag, message) => writeLog('info', tag, message),
  warn: (tag, message) => writeLog('warn', tag, message),
  error: (tag, message) => {
    if (message instanceof Error) {
      writeLog('error', tag, `${message.message}\n${message.stack}`);
    } else {
      writeLog('error', tag, message);
    }
  }
};

module.exports = logger;
