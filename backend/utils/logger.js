const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const getLogFilePath = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return path.join(LOG_DIR, `app-${year}-${month}-${day}.log`);
};

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
    const logFile = getLogFilePath();
    fs.appendFileSync(logFile, formatted);
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

