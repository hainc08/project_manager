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
 * - Holiday, Site, Tăng ca 1, Tăng ca 2: Multipliers can be passed dynamically via `rules`
 */
function calculateLaborCost(startTime, endTime, hourlyRate, locationType, rules = {}) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const totalDuration = (end - start) / (1000 * 60 * 60);

  // Dynamic Rules with updated fallbacks
  const holidayMult = rules.holiday_multiplier || 2.0; // Updated from 1.5 to 2.0
  const ot1Mult = rules.ot1_multiplier || 1.5;
  const ot2Mult = rules.ot2_multiplier || 1.5;
  const siteMult = rules.site_multiplier || 1.2;

  // Note: For a fully dynamic holiday system, `rules.holidays` (array of 'YYYY-MM-DD') can be passed
  const dateStr = start.toISOString().split('T')[0];
  const isHoliday = (rules.holidays && rules.holidays.includes(dateStr)) || isVietnameseHoliday(start);

  if (isHoliday) {
    const cost = roundMoney(totalDuration * hourlyRate * holidayMult);
    return {
      actual_cost: cost,
      standard_hours: 0,
      ot_hours: roundMoney(totalDuration),
      location_multiplier: 1.0,
      ot_multiplier: holidayMult,
      holiday_multiplier: holidayMult
    };
  }

  // Tăng ca 1: từ 17:15 (1.5x)
  const ot1Cutoff = new Date(start);
  ot1Cutoff.setHours(17, 15, 0, 0);

  // Tăng ca 2: từ 22:15 (2.0x — ca đêm)
  const ot2Cutoff = new Date(start);
  ot2Cutoff.setHours(22, 15, 0, 0);

  const locMult = locationType === 'SITE' ? siteMult : 1.0;

  let stdHours = 0;
  let ot1Hours = 0; // 17:15 - 22:15
  let ot2Hours = 0; // sau 22:15

  // Tính giờ từng phân đoạn
  const segStart = start.getTime();
  const segEnd = end.getTime();
  const cut1 = ot1Cutoff.getTime();
  const cut2 = ot2Cutoff.getTime();

  // Standard hours: before 17:15
  if (segEnd <= cut1) {
    stdHours = totalDuration;
  } else if (segStart >= cut1) {
    // All OT
    if (segEnd <= cut2) {
      ot1Hours = totalDuration;
    } else if (segStart >= cut2) {
      ot2Hours = totalDuration;
    } else {
      ot1Hours = (cut2 - segStart) / (1000 * 60 * 60);
      ot2Hours = (segEnd - cut2)  / (1000 * 60 * 60);
    }
  } else {
    // Spans standard + OT
    stdHours = (cut1 - segStart) / (1000 * 60 * 60);
    if (segEnd <= cut2) {
      ot1Hours = (segEnd - cut1) / (1000 * 60 * 60);
    } else {
      ot1Hours = (cut2 - cut1) / (1000 * 60 * 60);
      ot2Hours = (segEnd - cut2) / (1000 * 60 * 60);
    }
  }

  const costStd = stdHours * hourlyRate * locMult;
  
  // Rule: Site OT is 1.5, Workshop OT is 1.5. 
  // If Site (1.2) but OT, we use 1.5. 
  // We don't multiply 1.2 * 1.5 unless requested.
  const effectiveOt1Mult = locationType === 'SITE' ? Math.max(locMult, ot1Mult) : ot1Mult;
  const effectiveOt2Mult = locationType === 'SITE' ? Math.max(locMult, ot2Mult) : ot2Mult;

  const costOt1 = ot1Hours * hourlyRate * effectiveOt1Mult;
  const costOt2 = ot2Hours * hourlyRate * effectiveOt2Mult;

  const totalOtHours = roundMoney(ot1Hours + ot2Hours);
  // Effective OT multiplier (weighted average for storage)
  const effectiveOtMult = totalOtHours > 0
    ? roundMoney((costOt1 + costOt2) / (totalOtHours * hourlyRate))
    : ot1Mult;

  return {
    actual_cost: roundMoney(costStd + costOt1 + costOt2),
    standard_hours: roundMoney(stdHours),
    ot_hours: totalOtHours,
    ot1_hours: roundMoney(ot1Hours),
    ot2_hours: roundMoney(ot2Hours),
    location_multiplier: locMult,
    ot_multiplier: effectiveOtMult,
    holiday_multiplier: 1.0
  };
}

/**
 * Get current datetime in MySQL format (YYYY-MM-DD HH:MM:SS) 
 * in the local timezone.
 */
function getMySQLDateTime() {
  const now = new Date();
  // Adjust to local timezone offset
  const localTime = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
  return localTime.toISOString().slice(0, 19).replace('T', ' ');
}

module.exports = { 
  roundMoney, 
  calcDurationHours, 
  generateId, 
  isVietnameseHoliday, 
  calculateLaborCost,
  getMySQLDateTime
};
