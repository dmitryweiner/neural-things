// Game constants
const CELL_SIZE = 40;
const GRID_WIDTH = 15;
const GRID_HEIGHT = 10;

// Train movement constants
const TRAIN_MAX_SPEED = 2; // cells per second
const TRAIN_ACCELERATION = 0.5; // cells per second^2
const TRAIN_DECELERATION = 1; // cells per second^2

// Cell types
const CELL_TYPES = {
  EMPTY: " ",
  RAIL_H: "-",
  RAIL_V: "|",
  RAIL_DIAG1: "/",
  RAIL_DIAG2: "\\",
  SWITCH: "Y",
  TURN_RIGHT_DOWN: "┐",
  TURN_LEFT_DOWN: "┌",
  TURN_LEFT_UP: "┘",
  TURN_RIGHT_UP: "└",
};

// Direction angles in radians
const DIRECTIONS = {
  right: 0,
  rightDown: Math.PI / 4,
  down: Math.PI / 2,
  leftDown: Math.PI * 3/4,
  left: Math.PI,
  leftUp: -Math.PI * 3/4,
  up: -Math.PI / 2,
  rightUp: -Math.PI / 4
};

// Train states
const TRAIN_STATES = {
  RUNNING: "running",
  CRASHED: "crashed",
};

// Direction mapping for turns
const TURN_DIRECTIONS = {
  [CELL_TYPES.TURN_RIGHT_DOWN]: {
    // Поворот направо-вниз
    entryPoints: {
      [DIRECTIONS.right]: {
        centerX: (x) => x * CELL_SIZE + CELL_SIZE,
        centerY: (y) => y * CELL_SIZE,
        startAngle: 0,
        endAngle: Math.PI / 2
      },
      [DIRECTIONS.up]: {
        centerX: (x) => x * CELL_SIZE,
        centerY: (y) => y * CELL_SIZE,
        startAngle: Math.PI,
        endAngle: 3 * Math.PI / 2
      }
    }
  },
  [CELL_TYPES.TURN_LEFT_DOWN]: {
    // Поворот налево-вниз
    entryPoints: {
      [DIRECTIONS.left]: {
        centerX: (x) => x * CELL_SIZE,
        centerY: (y) => y * CELL_SIZE,
        startAngle: Math.PI,
        endAngle: 3 * Math.PI / 2
      },
      [DIRECTIONS.up]: {
        centerX: (x) => x * CELL_SIZE + CELL_SIZE,
        centerY: (y) => y * CELL_SIZE,
        startAngle: Math.PI,
        endAngle: Math.PI / 2
      }
    }
  },
  [CELL_TYPES.TURN_RIGHT_UP]: {
    // Поворот направо-вверх
    entryPoints: {
      [DIRECTIONS.left]: {
        centerX: (x) => x * CELL_SIZE,
        centerY: (y) => y * CELL_SIZE + CELL_SIZE,
        startAngle: Math.PI,
        endAngle: -Math.PI / 2
      },
      [DIRECTIONS.down]: {
        centerX: (x) => x * CELL_SIZE + CELL_SIZE,
        centerY: (y) => y * CELL_SIZE + CELL_SIZE,
        startAngle: Math.PI / 2,
        endAngle: 0
      }
    }
  },
  [CELL_TYPES.TURN_LEFT_UP]: {
    // Поворот налево-вверх
    entryPoints: {
      [DIRECTIONS.right]: {
        centerX: (x) => x * CELL_SIZE + CELL_SIZE,
        centerY: (y) => y * CELL_SIZE + CELL_SIZE,
        startAngle: 0,
        endAngle: -Math.PI / 2
      },
      [DIRECTIONS.down]: {
        centerX: (x) => x * CELL_SIZE,
        centerY: (y) => y * CELL_SIZE + CELL_SIZE,
        startAngle: Math.PI / 2,
        endAngle: Math.PI
      }
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
module.exports = {
  CELL_SIZE,
  GRID_WIDTH,
  GRID_HEIGHT,
  TRAIN_MAX_SPEED,
  TRAIN_ACCELERATION,
  TRAIN_DECELERATION,
  CELL_TYPES,
  DIRECTIONS,
  TRAIN_STATES,
  TURN_DIRECTIONS
  }; 
}