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

/**
 * Check if a date is a Vietnamese public holiday
 * (Fixed dates + Pre-defined Tet holiday ranges for 2024-2025)
 */
function isVietnameseHoliday(dateObj) {
  const month = dateObj.getMonth() + 1; // 1-12
  const day = dateObj.getDate();
  const year = dateObj.getFullYear();

  // 1. Fixed holidays
  if (month === 1 && day === 1) return true; // New Year
  if (month === 4 && day === 30) return true; // Reunification Day
  if (month === 5 && day === 1) return true; // Labor Day
  if (month === 9 && day === 2) return true; // National Day

  // 2. Pre-defined Tet/Lunar holidays (simplified for 2024-2025)
  // 2024 Tet: Feb 8 - Feb 14
  if (year === 2024 && month === 2 && day >= 8 && day <= 14) return true;
  // 2025 Tet: Jan 28 - Feb 3
  if (year === 2025 && month === 1 && day >= 28) return true;
  if (year === 2025 && month === 2 && day <= 3) return true;

  return false;
}

/**
 * Calculate detailed labor cost based on business rules
 * Rules:
 * - Holiday: 2.0x multiplier for all hours
 * - Site: 1.2x base multiplier
 * - OT (after 17:15): 1.5x multiplier on base
 */
function calculateLaborCost(startTime, endTime, hourlyRate, locationType) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const totalDuration = (end - start) / (1000 * 60 * 60);

  if (isVietnameseHoliday(start)) {
    const cost = roundMoney(totalDuration * hourlyRate * 2.0);
    return {
      actual_cost: cost,
      standard_hours: totalDuration,
      ot_hours: 0,
      location_multiplier: 1.0,
      ot_multiplier: 1.0,
      holiday_multiplier: 2.0
    };
  }

  // Define cutoff for OT (17:15)
  const otCutoff = new Date(start);
  otCutoff.setHours(17, 15, 0, 0);

  let stdHours = 0;
  let otHours = 0;

  if (end <= otCutoff) {
    stdHours = totalDuration;
  } else if (start >= otCutoff) {
    otHours = totalDuration;
  } else {
    stdHours = (otCutoff - start) / (1000 * 60 * 60);
    otHours = (end - otCutoff) / (1000 * 60 * 60);
  }

  const locMult = locationType === 'SITE' ? 1.2 : 1.0;
  const otMult = 1.5;

  const costStd = stdHours * hourlyRate * locMult;
  const costOt = otHours * hourlyRate * locMult * otMult;

  return {
    actual_cost: roundMoney(costStd + costOt),
    standard_hours: roundMoney(stdHours),
    ot_hours: roundMoney(otHours),
    location_multiplier: locMult,
    ot_multiplier: otMult,
    holiday_multiplier: 1.0
  };
}

module.exports = { 
  roundMoney, 
  calcDurationHours, 
  generateId, 
  isVietnameseHoliday, 
  calculateLaborCost 
};
