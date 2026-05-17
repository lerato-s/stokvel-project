const { calculateSavingsGrowth } = require('../services/savingsGrowth');

describe('SAVINGS GROWTH TESTS', () => {


    // MONTHLY FREQUENCY

    test('Should calculate correct growth for a monthly payment with a 6 month cycle duration', () => {
        // monthlyAmount=500, frequency=Monthly, cycleDuration=6, primeRate=10.25
        const result = calculateSavingsGrowth(500, 'Monthly', 6, 10.25);
            //total contribution = 500 * 6 = 3000
            //interest = 3000 * 10,25/100 = 307,50
            //projected = total + interest = 3307,50
        expect(result.projectedTotal).toBe(3307.50);
        expect(result.interestEarned).toBe(307.50);
    });

    test('Should calculate correct growth for a monthly payment with a 12 month cycle duration', () => {
        // monthlyAmount=500, frequency=Monthly, cycleDuration=12, primeRate=10.25
        const result = calculateSavingsGrowth(500, 'Monthly', 12, 10.25);
            //total contribution = 500 * 12 = 6000
            //interest = 6000 * 10,25/100 = 615
            //projected = total + interest = 6615
        expect(result.projectedTotal).toBe(6615);
        expect(result.interestEarned).toBe(615);
    });

    test('Should calculate correct growth for a monthly payment with a 18 month cycle duration', () => {
        // monthlyAmount=500, frequency=Monthly, cycleDuration=18, primeRate=10.25
        const result = calculateSavingsGrowth(500, 'Monthly', 18, 10.25);
            //total contribution = 500 * 18 = 9000
            //interest = 9000 * 10,25/100 = 922.50
            //projected = total + interest = 9922.5
        expect(result.projectedTotal).toBe(9922.50);
        expect(result.interestEarned).toBe(922.50);
    });

    test('Should calculate correct growth for a monthly payment with a 24 month cycle duration', () => {
        // monthlyAmount=500, frequency=Monthly, cycleDuration=24, primeRate=10.25
        const result = calculateSavingsGrowth(500, 'Monthly', 24, 10.25);
            //total contribution = 500 * 24 = 12000
            //interest = 12000 * 10,25/100 = 1230
            //projected = total + interest = 13230
        expect(result.projectedTotal).toBe(13230);
        expect(result.interestEarned).toBe(1230);
    });



    // WEEKLY FREQUENCY

    test('Should calculate correct growth for a weekly payment with a 6 month cycle duration', () => {
        // monthlyAmount=500, frequency=weekly, cycleDuration=6, primeRate=10.25
        const result = calculateSavingsGrowth(500, 'Weekly', 6, 10.25);
            //total contribution = 500 * 26 = 13000
            //interest = 13000 * 10,25/100 = 1332.50
            //projected = total + interest = 14332.50
        expect(result.projectedTotal).toBe(14332.50);
        expect(result.interestEarned).toBe(1332.50);
    });

    test('Should calculate correct growth for a weekly payment with a 12 month cycle duration', () => {
        // monthlyAmount=500, frequency=weekly, cycleDuration=12, primeRate=10.25
        const result = calculateSavingsGrowth(500, 'Weekly', 12, 10.25);
            //total contribution = 500 * 52 = 26000
            //interest = 26000 * 10,25/100 = 2665
            //projected = total + interest = 28665
        expect(result.projectedTotal).toBe(28665);
        expect(result.interestEarned).toBe(2665);
    });

    test('Should calculate correct growth for a weekly payment with a 18 month cycle duration', () => {
        // monthlyAmount=500, frequency=weekly, cycleDuration=18, primeRate=10.25
        const result = calculateSavingsGrowth(500, 'Weekly', 18, 10.25);
            //total contribution = 500 * 78 = 39000
            //interest = 39000 * 10,25/100 = 3997.50
            //projected = total + interest = 42997.50
        expect(result.projectedTotal).toBe(42997.50);
        expect(result.interestEarned).toBe(3997.50);
    });

    test('Should calculate correct growth for a weekly payment with a 24 month cycle duration', () => {
        // monthlyAmount=500, frequency=weekly, cycleDuration=24, primeRate=10.25
        const result = calculateSavingsGrowth(500, 'Weekly', 24, 10.25);
            //total contribution = 500 * 104 = 52000
            //interest = 52000 * 10,25/100 = 5330
            //projected = total + interest = 57330
        expect(result.projectedTotal).toBe(57330);
        expect(result.interestEarned).toBe(5330);
    });



    // BIWEEKLY FREQUENCY

    test('Should calculate correct growth for a bi-weekly payment with a 6 month cycle duration', () => {
        // monthlyAmount=500, frequency=bi-weekly, cycleDuration=6, primeRate=10.25
        const result = calculateSavingsGrowth(500, 'Bi-weekly', 6, 10.25);
            //total contribution = 500 * 13 = 6500
            //interest = 6500 * 10,25/100 = 666.25
            //projected = total + interest = 7166.25
        expect(result.projectedTotal).toBe(7166.25);
        expect(result.interestEarned).toBe(666.25);
    });

    test('Should calculate correct growth for a bi-weekly payment with a 12 month cycle duration', () => {
        // monthlyAmount=500, frequency=bi-weekly, cycleDuration=12, primeRate=10.25
        const result = calculateSavingsGrowth(500, 'Bi-weekly', 12, 10.25);
            //total contribution = 500 * 26 = 13000
            //interest = 13000 * 10,25/100 = 1332.50
            //projected = total + interest = 14332.50
        expect(result.projectedTotal).toBe(14332.50);
        expect(result.interestEarned).toBe(1332.50);
    });

    test('Should calculate correct growth for a bi-weekly payment with a 18 month cycle duration', () => {
        // monthlyAmount=500, frequency=bi-weekly, cycleDuration=18, primeRate=10.25
        const result = calculateSavingsGrowth(500, 'Bi-weekly', 18, 10.25);
            //total contribution = 500 * 39 = 19500
            //interest = 19500 * 10,25/100 = 1998.75
            //projected = total + interest = 21498.75
        expect(result.projectedTotal).toBe(21498.75);
        expect(result.interestEarned).toBe(1998.75);
    });

    test('Should calculate correct growth for a bi-weekly payment with a 24 month cycle duration', () => {
        // monthlyAmount=500, frequency=bi-weekly, cycleDuration=24, primeRate=10.25
        const result = calculateSavingsGrowth(500, 'Bi-weekly', 24, 10.25);
            //total contribution = 500 * 52 = 26000
            //interest = 52000 * 10,25/100 = 2665
            //projected = total + interest = 28665
        expect(result.projectedTotal).toBe(28665);
        expect(result.interestEarned).toBe(2665);
    });

    // EDGE CASES

    //contribution is 0

    test('Should return 0 when contribution amount is 0', () => {
        const result = calculateSavingsGrowth(0, 'Monthly', 12, 10.25);
        expect(result.projectedTotal).toBe(0);
        expect(result.interestEarned).toBe(0);
    });

    // prime rate is 0
    test('Should return only contributions when prime rate is 0', () => {
        const result = calculateSavingsGrowth(500, 'Monthly', 12, 0);
        expect(result.projectedTotal).toBe(6000);
        expect(result.interestEarned).toBe(0);
    });


});