const { computeDaysRemaining, isPriority, getDateNDaysFromNow, formatDateForDb } = require('../utils/dateUtils');

describe('dateUtils', () => {
  describe('computeDaysRemaining', () => {
    it('should return 0 for today', () => {
      const today = new Date();
      const days = computeDaysRemaining(today);
      expect(days).toBe(0);
    });

    it('should return positive number for future dates', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const days = computeDaysRemaining(tomorrow);
      expect(days).toBe(1);
    });

    it('should return negative number for past dates', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const days = computeDaysRemaining(yesterday);
      expect(days).toBe(-1);
    });

    it('should return 2 for date 2 days from now', () => {
      const twoDaysLater = new Date();
      twoDaysLater.setDate(twoDaysLater.getDate() + 2);
      const days = computeDaysRemaining(twoDaysLater);
      expect(days).toBe(2);
    });
  });

  describe('isPriority', () => {
    it('should return true for dates within 2 days', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(isPriority(tomorrow)).toBe(true);
    });

    it('should return true for today', () => {
      const today = new Date();
      expect(isPriority(today)).toBe(true);
    });

    it('should return true for dates exactly 2 days away', () => {
      const twoDaysLater = new Date();
      twoDaysLater.setDate(twoDaysLater.getDate() + 2);
      expect(isPriority(twoDaysLater)).toBe(true);
    });

    it('should return false for dates 3+ days away', () => {
      const threeDaysLater = new Date();
      threeDaysLater.setDate(threeDaysLater.getDate() + 3);
      expect(isPriority(threeDaysLater)).toBe(false);
    });

    it('should return false for past dates', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isPriority(yesterday)).toBe(false);
    });
  });

  describe('getDateNDaysFromNow', () => {
    it('should return a date N days from now', () => {
      const futureDate = getDateNDaysFromNow(5);
      const expected = new Date();
      expected.setDate(expected.getDate() + 5);
      
      expect(futureDate.getDate()).toBe(expected.getDate());
      expect(futureDate.getMonth()).toBe(expected.getMonth());
      expect(futureDate.getFullYear()).toBe(expected.getFullYear());
    });

    it('should return today for 0 days', () => {
      const today = getDateNDaysFromNow(0);
      const expected = new Date();
      
      expect(today.getDate()).toBe(expected.getDate());
      expect(today.getMonth()).toBe(expected.getMonth());
    });
  });

  describe('formatDateForDb', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-01-05');
      const formatted = formatDateForDb(date);
      expect(formatted).toMatch(/2024-01-0[45]/); // Accounts for timezone
    });

    it('should pad month and day', () => {
      const date = new Date(2024, 0, 5); // January 5
      const formatted = formatDateForDb(date);
      expect(formatted).toContain('-01-');
    });
  });
});
