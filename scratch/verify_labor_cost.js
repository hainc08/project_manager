const { calculateLaborCost } = require('./backend/utils/helpers');

function test(name, startTime, endTime, hourlyRate, locationType) {
    const result = calculateLaborCost(startTime, endTime, hourlyRate, locationType);
    console.log(`Test: ${name}`);
    console.log(`  Duration: ${(new Date(endTime) - new Date(startTime)) / (1000 * 60 * 60)}h`);
    console.log(`  Location: ${locationType}`);
    console.log(`  Result:`, result);
    console.log('-------------------');
}

// Scenario 1: Workshop, standard hours (8h - 16h)
test('Workshop Standard', '2024-04-22T08:00:00', '2024-04-22T16:00:00', 100000, 'WORKSHOP');
// Expected: 8h * 100k * 1.0 = 800k

// Scenario 2: Site, standard hours (8h - 16h)
test('Site Standard', '2024-04-22T08:00:00', '2024-04-22T16:00:00', 100000, 'SITE');
// Expected: 8h * 100k * 1.2 = 960k

// Scenario 3: Workshop, OT (8h - 19h)
test('Workshop OT', '2024-04-22T08:00:00', '2024-04-22T19:00:00', 100000, 'WORKSHOP');
// Expected: Std (8-17:15) = 9.25h. OT (17:15-19:00) = 1.75h.
// Cost = (9.25 * 100k * 1.0) + (1.75 * 100k * 1.0 * 1.5) = 925k + 262.5k = 1,187.5k

// Scenario 4: Site, OT (8h - 19h)
test('Site OT', '2024-04-22T08:00:00', '2024-04-22T19:00:00', 100000, 'SITE');
// Expected: Std (9.25h) * 120k + OT (1.75h) * 120k * 1.5 = 1,110k + 315k = 1,425k

// Scenario 5: Holiday (May 1st)
test('Holiday', '2024-05-01T08:00:00', '2024-05-01T12:00:00', 100000, 'WORKSHOP');
// Expected: 4h * 100k * 2.0 = 800k
