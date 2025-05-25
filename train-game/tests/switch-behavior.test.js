// Tests for the getSwitchBehavior function

// Import constants and functions
const { DIRECTIONS, CELL_TYPES } = require('../constants.js');
const { getSwitchBehavior } = require('../utils.js');

describe('Vertical Switch Behavior', () => {
  describe('SWITCH_RIGHT_DOWN_V', () => {
    test('should go straight when approaching from down (back side)', () => {
      expect(getSwitchBehavior(CELL_TYPES.SWITCH_RIGHT_DOWN_V, DIRECTIONS.down, true)).toBe(false);
      expect(getSwitchBehavior(CELL_TYPES.SWITCH_RIGHT_DOWN_V, DIRECTIONS.down, false)).toBe(false);
    });

    test('should follow switch state when approaching from right', () => {
      expect(getSwitchBehavior(CELL_TYPES.SWITCH_RIGHT_DOWN_V, DIRECTIONS.right, true)).toBe(false);
      expect(getSwitchBehavior(CELL_TYPES.SWITCH_RIGHT_DOWN_V, DIRECTIONS.right, false)).toBe(true);
    });

    test('should follow switch state when approaching from up', () => {
      expect(getSwitchBehavior(CELL_TYPES.SWITCH_RIGHT_DOWN_V, DIRECTIONS.up, true)).toBe(false);
      expect(getSwitchBehavior(CELL_TYPES.SWITCH_RIGHT_DOWN_V, DIRECTIONS.up, false)).toBe(true);
    });
  });

  describe('SWITCH_LEFT_DOWN_V', () => {
    test('should go straight when approaching from down (back side)', () => {
      expect(getSwitchBehavior(CELL_TYPES.SWITCH_LEFT_DOWN_V, DIRECTIONS.down, true)).toBe(false);
      expect(getSwitchBehavior(CELL_TYPES.SWITCH_LEFT_DOWN_V, DIRECTIONS.down, false)).toBe(false);
    });

    test('should follow switch state when approaching from left', () => {
      expect(getSwitchBehavior(CELL_TYPES.SWITCH_LEFT_DOWN_V, DIRECTIONS.left, true)).toBe(false);
      expect(getSwitchBehavior(CELL_TYPES.SWITCH_LEFT_DOWN_V, DIRECTIONS.left, false)).toBe(true);
    });

    test('should follow switch state when approaching from up', () => {
      expect(getSwitchBehavior(CELL_TYPES.SWITCH_LEFT_DOWN_V, DIRECTIONS.up, true)).toBe(false);
      expect(getSwitchBehavior(CELL_TYPES.SWITCH_LEFT_DOWN_V, DIRECTIONS.up, false)).toBe(true);
    });
  });

  describe('SWITCH_LEFT_UP_V', () => {
    test('should go straight when approaching from up (back side)', () => {
      expect(getSwitchBehavior(CELL_TYPES.SWITCH_LEFT_UP_V, DIRECTIONS.up, true)).toBe(false);
      expect(getSwitchBehavior(CELL_TYPES.SWITCH_LEFT_UP_V, DIRECTIONS.up, false)).toBe(false);
    });

    test('should follow switch state when approaching from left', () => {
      expect(getSwitchBehavior(CELL_TYPES.SWITCH_LEFT_UP_V, DIRECTIONS.left, true)).toBe(false);
      expect(getSwitchBehavior(CELL_TYPES.SWITCH_LEFT_UP_V, DIRECTIONS.left, false)).toBe(true);
    });

    test('should follow switch state when approaching from down', () => {
      expect(getSwitchBehavior(CELL_TYPES.SWITCH_LEFT_UP_V, DIRECTIONS.down, true)).toBe(false);
      expect(getSwitchBehavior(CELL_TYPES.SWITCH_LEFT_UP_V, DIRECTIONS.down, false)).toBe(true);
    });
  });

  describe('SWITCH_RIGHT_UP_V', () => {
    test('should go straight when approaching from up (back side)', () => {
      expect(getSwitchBehavior(CELL_TYPES.SWITCH_RIGHT_UP_V, DIRECTIONS.up, true)).toBe(false);
      expect(getSwitchBehavior(CELL_TYPES.SWITCH_RIGHT_UP_V, DIRECTIONS.up, false)).toBe(false);
    });

    test('should follow switch state when approaching from right', () => {
      expect(getSwitchBehavior(CELL_TYPES.SWITCH_RIGHT_UP_V, DIRECTIONS.right, true)).toBe(false);
      expect(getSwitchBehavior(CELL_TYPES.SWITCH_RIGHT_UP_V, DIRECTIONS.right, false)).toBe(true);
    });

    test('should follow switch state when approaching from down', () => {
      expect(getSwitchBehavior(CELL_TYPES.SWITCH_RIGHT_UP_V, DIRECTIONS.down, true)).toBe(false);
      expect(getSwitchBehavior(CELL_TYPES.SWITCH_RIGHT_UP_V, DIRECTIONS.down, false)).toBe(true);
    });
  });
});

describe('Horizontal Switch Behavior', () => {
  describe('SWITCH_RIGHT_DOWN_H', () => {
    test('should follow switch state when approaching from up', () => {
      expect(getSwitchBehavior(CELL_TYPES.SWITCH_RIGHT_DOWN_H, DIRECTIONS.up, true)).toBe(false);
      expect(getSwitchBehavior(CELL_TYPES.SWITCH_RIGHT_DOWN_H, DIRECTIONS.up, false)).toBe(true);
    });

    test('should follow switch state when approaching from left', () => {
      expect(getSwitchBehavior(CELL_TYPES.SWITCH_RIGHT_DOWN_H, DIRECTIONS.left, true)).toBe(false);
      expect(getSwitchBehavior(CELL_TYPES.SWITCH_RIGHT_DOWN_H, DIRECTIONS.left, false)).toBe(true);
    });

    test('should go straight when approaching from right (back side)', () => {
      expect(getSwitchBehavior(CELL_TYPES.SWITCH_RIGHT_DOWN_H, DIRECTIONS.right, true)).toBe(false);
      expect(getSwitchBehavior(CELL_TYPES.SWITCH_RIGHT_DOWN_H, DIRECTIONS.right, false)).toBe(false);
    });
  });

  describe('SWITCH_LEFT_DOWN_H', () => {
    test('should follow switch state when approaching from up', () => {
      expect(getSwitchBehavior(CELL_TYPES.SWITCH_LEFT_DOWN_H, DIRECTIONS.up, true)).toBe(false);
      expect(getSwitchBehavior(CELL_TYPES.SWITCH_LEFT_DOWN_H, DIRECTIONS.up, false)).toBe(true);
    });

    test('should follow switch state when approaching from right', () => {
      expect(getSwitchBehavior(CELL_TYPES.SWITCH_LEFT_DOWN_H, DIRECTIONS.right, true)).toBe(false);
      expect(getSwitchBehavior(CELL_TYPES.SWITCH_LEFT_DOWN_H, DIRECTIONS.right, false)).toBe(true);
    });

    test('should go straight when approaching from left (back side)', () => {
      expect(getSwitchBehavior(CELL_TYPES.SWITCH_LEFT_DOWN_H, DIRECTIONS.left, true)).toBe(false);
      expect(getSwitchBehavior(CELL_TYPES.SWITCH_LEFT_DOWN_H, DIRECTIONS.left, false)).toBe(false);
    });
  });

  describe('SWITCH_LEFT_UP_H', () => {
    test('should follow switch state when approaching from down', () => {
      expect(getSwitchBehavior(CELL_TYPES.SWITCH_LEFT_UP_H, DIRECTIONS.down, true)).toBe(false);
      expect(getSwitchBehavior(CELL_TYPES.SWITCH_LEFT_UP_H, DIRECTIONS.down, false)).toBe(true);
    });

    test('should go straight when approaching from left (back side)', () => {
      expect(getSwitchBehavior(CELL_TYPES.SWITCH_LEFT_UP_H, DIRECTIONS.left, true)).toBe(false);
      expect(getSwitchBehavior(CELL_TYPES.SWITCH_LEFT_UP_H, DIRECTIONS.left, false)).toBe(false);
    });

    test('should follow switch state when approaching from right', () => {
      expect(getSwitchBehavior(CELL_TYPES.SWITCH_LEFT_UP_H, DIRECTIONS.right, true)).toBe(false);
      expect(getSwitchBehavior(CELL_TYPES.SWITCH_LEFT_UP_H, DIRECTIONS.right, false)).toBe(true);
    });
  });

  describe('SWITCH_RIGHT_UP_H', () => {
    test('should follow switch state when approaching from down', () => {
      expect(getSwitchBehavior(CELL_TYPES.SWITCH_RIGHT_UP_H, DIRECTIONS.down, true)).toBe(false);
      expect(getSwitchBehavior(CELL_TYPES.SWITCH_RIGHT_UP_H, DIRECTIONS.down, false)).toBe(true);
    });

    test('should go straight when approaching from right (back side)', () => {
      expect(getSwitchBehavior(CELL_TYPES.SWITCH_RIGHT_UP_H, DIRECTIONS.right, true)).toBe(false);
      expect(getSwitchBehavior(CELL_TYPES.SWITCH_RIGHT_UP_H, DIRECTIONS.right, false)).toBe(false);
    });

    test('should follow switch state when approaching from left', () => {
      expect(getSwitchBehavior(CELL_TYPES.SWITCH_RIGHT_UP_H, DIRECTIONS.left, true)).toBe(false);
      expect(getSwitchBehavior(CELL_TYPES.SWITCH_RIGHT_UP_H, DIRECTIONS.left, false)).toBe(true);
    });
  });
});

describe('Edge Cases', () => {
  test('should return false for unknown switch types', () => {
    expect(getSwitchBehavior('unknown', DIRECTIONS.up, true)).toBe(false);
    expect(getSwitchBehavior('unknown', DIRECTIONS.up, false)).toBe(false);
  });

  test('should handle edge direction values', () => {
    // Test with slightly off directions that should still be recognized
    const slightlyOffUp = DIRECTIONS.up + 0.05;
    const slightlyOffDown = DIRECTIONS.down + 0.05;
    
    expect(getSwitchBehavior(CELL_TYPES.SWITCH_RIGHT_DOWN_V, slightlyOffUp, true)).toBe(false);
    expect(getSwitchBehavior(CELL_TYPES.SWITCH_RIGHT_DOWN_V, slightlyOffDown, false)).toBe(false);
  });
}); 