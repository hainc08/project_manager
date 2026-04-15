/**
 * Round a number to 2 decimal places (Business Rule #3)
 */
function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

/**
 * Calculate duration in hours between two dates
 */
function calcDurationHours(startTime, endTime) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end - start;
  return roundMoney(diffMs / (1000 * 60 * 60));
}

/**
 * Generate a simple UUID v4
 */
function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

module.exports = { roundMoney, calcDurationHours, generateId };
