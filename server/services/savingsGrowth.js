function calculateSavingsGrowth(contribution, frequency, cycleMonths, primeRate) {

    let totalPayments;

    if (frequency == 'Monthly'){
        totalPayments = cycleMonths;
    }
    else if (frequency == 'Weekly'){
        totalPayments = (cycleMonths / 12) * 52;
    }
    else if (frequency == 'Bi-weekly'){
        totalPayments = (cycleMonths / 12) * 26;
    }

    const totalContribution = contribution * totalPayments;
    const interestEarned = Math.round(totalContribution * (primeRate / 100) * 100)/ 100;
    const projectedTotal = Math.round((totalContribution + interestEarned) * 100) / 100;

    return { projectedTotal, interestEarned, totalContribution };

}

module.exports = { calculateSavingsGrowth };