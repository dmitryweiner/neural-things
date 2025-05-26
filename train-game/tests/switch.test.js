// Tests for train game switch functionality

// Import constants and functions
const { DIRECTIONS, CELL_TYPES } = require('../constants.js');
const { 
  calculateNextPosition, 
  isSwitchCell,
  isApproachingFromBackSide
} = require('../utils.js');

// Mock global constants
global.CELL_SIZE = 40;
global.GRID_WIDTH = 15;
global.GRID_HEIGHT = 10;

describe('Switch Detection', () => {
  test('should detect vertical switches', () => {
    expect(isSwitchCell(CELL_TYPES.SWITCH_RIGHT_DOWN_V)).toBe(true);
    expect(isSwitchCell(CELL_TYPES.SWITCH_LEFT_DOWN_V)).toBe(true);
    expect(isSwitchCell(CELL_TYPES.SWITCH_LEFT_UP_V)).toBe(true);
    expect(isSwitchCell(CELL_TYPES.SWITCH_RIGHT_UP_V)).toBe(true);
  });

  test('should detect horizontal switches', () => {
    expect(isSwitchCell(CELL_TYPES.SWITCH_RIGHT_DOWN_H)).toBe(true);
    expect(isSwitchCell(CELL_TYPES.SWITCH_LEFT_DOWN_H)).toBe(true);
    expect(isSwitchCell(CELL_TYPES.SWITCH_LEFT_UP_H)).toBe(true);
    expect(isSwitchCell(CELL_TYPES.SWITCH_RIGHT_UP_H)).toBe(true);
  });

  test('should not detect regular rails as switches', () => {
    expect(isSwitchCell(CELL_TYPES.RAIL_H)).toBe(false);
    expect(isSwitchCell(CELL_TYPES.RAIL_V)).toBe(false);
    expect(isSwitchCell(CELL_TYPES.TURN_RIGHT_DOWN)).toBe(false);
    expect(isSwitchCell(CELL_TYPES.TURN_LEFT_UP)).toBe(false);
  });
});

describe('Switch Movement Calculation', () => {
  const CELL_SIZE = 40;
  
  describe('Straight state movement', () => {
    test('vertical switch should continue straight when in straight state', () => {
      const switchStates = {
        '5,5': { isStraight: true }
      };
      
      const result = calculateNextPosition(
        CELL_TYPES.SWITCH_RIGHT_UP_V,
        null,
        5, 5,
        5.5 * CELL_SIZE, 5.5 * CELL_SIZE,
        DIRECTIONS.up,
        1.0,
        0.1,
        CELL_SIZE,
        switchStates
      );
      
      expect(result.direction).toBeCloseTo(DIRECTIONS.up, 1);
      expect(result.y).toBeLessThan(5.5 * CELL_SIZE);
    });

    test('horizontal switch should continue straight when in straight state', () => {
      const switchStates = {
        '5,5': { isStraight: true }
      };
      
      const result = calculateNextPosition(
        CELL_TYPES.SWITCH_RIGHT_UP_H,
        null,
        5, 5,
        5.5 * CELL_SIZE, 5.5 * CELL_SIZE,
        DIRECTIONS.right,
        1.0,
        0.1,
        CELL_SIZE,
        switchStates
      );
      
      expect(result.direction).toBeCloseTo(DIRECTIONS.right, 1);
      expect(result.x).toBeGreaterThan(5.5 * CELL_SIZE);
    });
  });

  describe('Turning state movement', () => {
    test('vertical switch should turn when in turning state and not approaching from back', () => {
      const switchStates = {
        '5,5': { isStraight: false }
      };
      
      const result = calculateNextPosition(
        CELL_TYPES.SWITCH_RIGHT_UP_V,
        null,
        5, 5,
        5.5 * CELL_SIZE, 5.5 * CELL_SIZE,
        DIRECTIONS.right, // Approaching from side (not back)
        1.0,
        0.1,
        CELL_SIZE,
        switchStates
      );
      
      // Direction should change when turning
      expect(Math.abs(result.direction - DIRECTIONS.right)).toBeGreaterThan(0.05);
    });

    test('horizontal switch should turn when in turning state and not approaching from back', () => {
      const switchStates = {
        '5,5': { isStraight: false }
      };
      
      const result = calculateNextPosition(
        CELL_TYPES.SWITCH_RIGHT_UP_H,
        null,
        5, 5,
        5.5 * CELL_SIZE, 5.5 * CELL_SIZE,
        DIRECTIONS.up, // Approaching from vertical (not back)
        1.0,
        0.1,
        CELL_SIZE,
        switchStates
      );
      
      // Direction should change when turning
      expect(Math.abs(result.direction - DIRECTIONS.up)).toBeGreaterThan(0.05);
    });
  });

  describe('Back side approach behavior', () => {
    test('should ignore switch state when approaching from back side', () => {
      const switchStates = {
        '5,5': { isStraight: false } // Switch set to turning
      };
      
      // Vertical switch approached from below (back side)
      const result = calculateNextPosition(
        CELL_TYPES.SWITCH_RIGHT_UP_V,
        null,
        5, 5,
        5.5 * CELL_SIZE, 5.5 * CELL_SIZE,
        DIRECTIONS.down, // Back side approach
        1.0,
        0.1,
        CELL_SIZE,
        switchStates
      );
      
      // Should continue straight regardless of switch state
      expect(result.direction).toBeCloseTo(DIRECTIONS.down, 1);
      expect(result.y).toBeGreaterThan(5.5 * CELL_SIZE);
    });

    test('horizontal switch should ignore state when approaching from back side', () => {
      const switchStates = {
        '5,5': { isStraight: false } // Switch set to turning
      };
      
      // Horizontal switch approached from left (back side)
      const result = calculateNextPosition(
        CELL_TYPES.SWITCH_RIGHT_UP_H,
        null,
        5, 5,
        5.5 * CELL_SIZE, 5.5 * CELL_SIZE,
        DIRECTIONS.left, // Back side approach
        1.0,
        0.1,
        CELL_SIZE,
        switchStates
      );
      
      // Should continue straight regardless of switch state
      expect(result.direction).toBeCloseTo(DIRECTIONS.left, 1);
      expect(result.x).toBeLessThan(5.5 * CELL_SIZE);
    });
  });

  describe('Edge cases', () => {
    test('should handle missing switch state gracefully', () => {
      const switchStates = {}; // No state for this switch
      
      const result = calculateNextPosition(
        CELL_TYPES.SWITCH_RIGHT_UP_V,
        null,
        5, 5,
        5.5 * CELL_SIZE, 5.5 * CELL_SIZE,
        DIRECTIONS.up,
        1.0,
        0.1,
        CELL_SIZE,
        switchStates
      );
      
      // Should default to straight movement
      expect(result.direction).toBeCloseTo(DIRECTIONS.up, 1);
      expect(result.y).toBeLessThan(5.5 * CELL_SIZE);
    });

    test('should handle null switchStates parameter', () => {
      const result = calculateNextPosition(
        CELL_TYPES.SWITCH_RIGHT_UP_V,
        null,
        5, 5,
        5.5 * CELL_SIZE, 5.5 * CELL_SIZE,
        DIRECTIONS.up,
        1.0,
        0.1,
        CELL_SIZE,
        null // No switch states
      );
      
      // Should default to straight movement
      expect(result.direction).toBeCloseTo(DIRECTIONS.up, 1);
      expect(result.y).toBeLessThan(5.5 * CELL_SIZE);
    });
  });
}); 