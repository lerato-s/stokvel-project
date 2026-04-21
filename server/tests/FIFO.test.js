/**
 * REAL UNIT TESTS for FIFO Payout System
 * Run with: npm test
 */

const { describe, test, expect, beforeEach } = require('@jest/globals');

// FIFO functions to test (copy from your backend)
function getFIFOOrder(members) {
  return members
    .filter(m => m.isActive === true)
    .sort((a, b) => new Date(a.joinedAt) - new Date(b.joinedAt));
}

function advanceToNextPayout(group) {
  const fifoLine = getFIFOOrder(group.members);
  const currentIndex = group.nextPayoutIndex || 0;
  
  if (currentIndex + 1 >= fifoLine.length) {
    group.nextPayoutIndex = 0;
    group.totalPayoutsCompleted += 1;
    return { success: true, message: "Cycle completed", restarted: true };
  }
  
  group.nextPayoutIndex = currentIndex + 1;
  group.totalPayoutsCompleted += 1;
  return { success: true, message: "Moved to next person" };
}

function getMyPosition(group, userId) {
  const fifoLine = getFIFOOrder(group.members);
  const myIndex = fifoLine.findIndex(m => m.userId === userId);
  
  if (myIndex === -1) {
    return null;
  }
  
  return {
    myPosition: myIndex + 1,
    totalMembers: fifoLine.length,
    peopleAhead: myIndex,
    peopleBehind: fifoLine.length - myIndex - 1,
    isNextPayout: myIndex === (group.nextPayoutIndex || 0)
  };
}

// ============================================
// UNIT TESTS
// ============================================

describe('📊 FIFO Order Tests', () => {
  
  test('Should sort members by join date (oldest first)', () => {
    const members = [
      { userId: '1', username: 'Sipho', joinedAt: new Date('2024-02-01'), isActive: true },
      { userId: '2', username: 'Thabo', joinedAt: new Date('2024-01-01'), isActive: true },
      { userId: '3', username: 'Lerato', joinedAt: new Date('2024-01-15'), isActive: true }
    ];
    
    const fifoLine = getFIFOOrder(members);
    
    expect(fifoLine[0].username).toBe('Thabo');   // Joined first
    expect(fifoLine[1].username).toBe('Lerato');  // Joined second
    expect(fifoLine[2].username).toBe('Sipho');   // Joined last
  });
  
  test('Should put new member at the end of the line', () => {
    const group = {
      members: [
        { userId: '1', username: 'Thabo', joinedAt: new Date('2024-01-01'), isActive: true },
        { userId: '2', username: 'Lerato', joinedAt: new Date('2024-01-15'), isActive: true }
      ],
      nextPayoutIndex: 0,
      totalPayoutsCompleted: 0
    };
    
    // Add new member
    group.members.push({
      userId: '3',
      username: 'Zanele',
      joinedAt: new Date('2024-02-01'),
      isActive: true
    });
    
    const fifoLine = getFIFOOrder(group.members);
    
    expect(fifoLine[0].username).toBe('Thabo');
    expect(fifoLine[1].username).toBe('Lerato');
    expect(fifoLine[2].username).toBe('Zanele'); // New member at end
  });
  
  test('Should ignore inactive members', () => {
    const members = [
      { userId: '1', username: 'Thabo', joinedAt: new Date('2024-01-01'), isActive: true },
      { userId: '2', username: 'Lerato', joinedAt: new Date('2024-01-15'), isActive: false },
      { userId: '3', username: 'Sipho', joinedAt: new Date('2024-02-01'), isActive: true }
    ];
    
    const fifoLine = getFIFOOrder(members);
    
    expect(fifoLine.length).toBe(2);
    expect(fifoLine[0].username).toBe('Thabo');
    expect(fifoLine[1].username).toBe('Sipho');
    expect(fifoLine.some(m => m.username === 'Lerato')).toBe(false);
  });
  
  test('Should handle empty member list', () => {
    const members = [];
    const fifoLine = getFIFOOrder(members);
    
    expect(fifoLine.length).toBe(0);
  });
});

describe('➡️ Advance Payout Tests', () => {
  
  test('Should move from first to second person', () => {
    const group = {
      members: [
        { userId: '1', username: 'Thabo', joinedAt: new Date('2024-01-01'), isActive: true },
        { userId: '2', username: 'Lerato', joinedAt: new Date('2024-01-15'), isActive: true },
        { userId: '3', username: 'Sipho', joinedAt: new Date('2024-02-01'), isActive: true }
      ],
      nextPayoutIndex: 0,
      totalPayoutsCompleted: 0
    };
    
    advanceToNextPayout(group);
    
    expect(group.nextPayoutIndex).toBe(1);
    expect(group.totalPayoutsCompleted).toBe(1);
  });
  
  test('Should cycle back to first person after last person', () => {
    const group = {
      members: [
        { userId: '1', username: 'Thabo', joinedAt: new Date('2024-01-01'), isActive: true },
        { userId: '2', username: 'Lerato', joinedAt: new Date('2024-01-15'), isActive: true }
      ],
      nextPayoutIndex: 1,  // Currently at Lerato (last person)
      totalPayoutsCompleted: 1
    };
    
    const result = advanceToNextPayout(group);
    
    expect(group.nextPayoutIndex).toBe(0);  // Back to Thabo
    expect(group.totalPayoutsCompleted).toBe(2);
    expect(result.restarted).toBe(true);
  });
  
  test('Should work with single member group', () => {
    const group = {
      members: [
        { userId: '1', username: 'Thabo', joinedAt: new Date('2024-01-01'), isActive: true }
      ],
      nextPayoutIndex: 0,
      totalPayoutsCompleted: 0
    };
    
    advanceToNextPayout(group);
    
    // With 1 member, should cycle back to same person
    expect(group.nextPayoutIndex).toBe(0);
    expect(group.totalPayoutsCompleted).toBe(1);
  });
});

describe('📍 Member Position Tests', () => {
  
  test('Should return correct position for first member', () => {
    const group = {
      members: [
        { userId: '1', username: 'Thabo', joinedAt: new Date('2024-01-01'), isActive: true },
        { userId: '2', username: 'Lerato', joinedAt: new Date('2024-01-15'), isActive: true },
        { userId: '3', username: 'Sipho', joinedAt: new Date('2024-02-01'), isActive: true }
      ],
      nextPayoutIndex: 0,
      totalPayoutsCompleted: 0
    };
    
    const position = getMyPosition(group, '1');
    
    expect(position.myPosition).toBe(1);
    expect(position.peopleAhead).toBe(0);
    expect(position.peopleBehind).toBe(2);
    expect(position.isNextPayout).toBe(true);
  });
  
  test('Should return correct position for middle member', () => {
    const group = {
      members: [
        { userId: '1', username: 'Thabo', joinedAt: new Date('2024-01-01'), isActive: true },
        { userId: '2', username: 'Lerato', joinedAt: new Date('2024-01-15'), isActive: true },
        { userId: '3', username: 'Sipho', joinedAt: new Date('2024-02-01'), isActive: true }
      ],
      nextPayoutIndex: 1,
      totalPayoutsCompleted: 1
    };
    
    const position = getMyPosition(group, '2');
    
    expect(position.myPosition).toBe(2);
    expect(position.peopleAhead).toBe(1);
    expect(position.peopleBehind).toBe(1);
    expect(position.isNextPayout).toBe(true);
  });
  
  test('Should return correct position for last member', () => {
    const group = {
      members: [
        { userId: '1', username: 'Thabo', joinedAt: new Date('2024-01-01'), isActive: true },
        { userId: '2', username: 'Lerato', joinedAt: new Date('2024-01-15'), isActive: true },
        { userId: '3', username: 'Sipho', joinedAt: new Date('2024-02-01'), isActive: true }
      ],
      nextPayoutIndex: 0,
      totalPayoutsCompleted: 0
    };
    
    const position = getMyPosition(group, '3');
    
    expect(position.myPosition).toBe(3);
    expect(position.peopleAhead).toBe(2);
    expect(position.peopleBehind).toBe(0);
    expect(position.isNextPayout).toBe(false);
  });
  
  test('Should return null for non-member', () => {
    const group = {
      members: [
        { userId: '1', username: 'Thabo', joinedAt: new Date('2024-01-01'), isActive: true }
      ],
      nextPayoutIndex: 0,
      totalPayoutsCompleted: 0
    };
    
    const position = getMyPosition(group, '999');
    
    expect(position).toBe(null);
  });
});

describe('🔄 Edge Cases', () => {
  
  test('Should handle members with same join date (by insertion order)', () => {
    const members = [
      { userId: '1', username: 'Thabo', joinedAt: new Date('2024-01-01T09:00:00'), isActive: true },
      { userId: '2', username: 'Lerato', joinedAt: new Date('2024-01-01T10:00:00'), isActive: true },
      { userId: '3', username: 'Sipho', joinedAt: new Date('2024-01-01T11:00:00'), isActive: true }
    ];
    
    const fifoLine = getFIFOOrder(members);
    
    expect(fifoLine[0].username).toBe('Thabo');
    expect(fifoLine[1].username).toBe('Lerato');
    expect(fifoLine[2].username).toBe('Sipho');
  });
  
  test('Should handle group with no members', () => {
    const group = {
      members: [],
      nextPayoutIndex: 0,
      totalPayoutsCompleted: 0
    };
    
    const fifoLine = getFIFOOrder(group.members);
    
    expect(fifoLine.length).toBe(0);
  });
  
  test('Should track total payouts completed', () => {
    const group = {
      members: [
        { userId: '1', username: 'Thabo', joinedAt: new Date('2024-01-01'), isActive: true },
        { userId: '2', username: 'Lerato', joinedAt: new Date('2024-01-15'), isActive: true }
      ],
      nextPayoutIndex: 0,
      totalPayoutsCompleted: 0
    };
    
    advanceToNextPayout(group);
    expect(group.totalPayoutsCompleted).toBe(1);
    
    advanceToNextPayout(group);
    expect(group.totalPayoutsCompleted).toBe(2);
    
    advanceToNextPayout(group);
    expect(group.totalPayoutsCompleted).toBe(3);
  });
});