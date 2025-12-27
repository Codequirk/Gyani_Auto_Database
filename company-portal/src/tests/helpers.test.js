import { describe, it, expect } from 'vitest';
import { computeDaysRemaining, isPriority, formatDate } from '../utils/helpers';

describe('Frontend Helpers', () => {
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

    it('should return false for dates 3+ days away', () => {
      const threeDaysLater = new Date();
      threeDaysLater.setDate(threeDaysLater.getDate() + 3);
      expect(isPriority(threeDaysLater)).toBe(false);
    });
  });
});
