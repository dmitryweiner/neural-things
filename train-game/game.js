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

const DIRECTIONS = {
  right: "right",
  left: "left",
  up: "up",
  down: "down",
  rightDown: "right-down",
  leftDown: "left-down",
  rightUp: "right-up",
  leftUp: "left-up",
};

// Train states
const TRAIN_STATES = {
  RUNNING: "running",
  CRASHED: "crashed",
};

// Direction mapping for turns
const TURN_DIRECTIONS = {
  [CELL_TYPES.TURN_RIGHT_DOWN]: (x, y, speed, direction, deltaTime) => {
    let nextX = x;
    let nextY = y;
    let nexDirection = direction;
    if (direction === DIRECTIONS.right || direction === DIRECTIONS.rightDown) {
      nextX = x + speed * CELL_SIZE * deltaTime;
      nextY = y + speed * CELL_SIZE * deltaTime;
      nexDirection = DIRECTIONS.rightDown;
    }
    if (direction === DIRECTIONS.up || direction === DIRECTIONS.leftUp) {
      nextX = x - speed * CELL_SIZE * deltaTime;
      nextY = y - speed * CELL_SIZE * deltaTime;
      nexDirection = DIRECTIONS.leftUp;
    }
    return [nextX, nextY, nexDirection];
  },
  [CELL_TYPES.TURN_LEFT_DOWN]: (x, y, speed, direction, deltaTime) => {
    let nextX = x;
    let nextY = y;
    let nexDirection = direction;
    if (
      direction === "left" ||
      direction === DIRECTIONS.leftDown ||
      direction === DIRECTIONS.rightDown
    ) {
      nextX = x - speed * CELL_SIZE * deltaTime;
      nextY = y + speed * CELL_SIZE * deltaTime;
      nexDirection = DIRECTIONS.leftDown;
    }
    if (
      direction === "up" ||
      direction === DIRECTIONS.rightUp ||
      direction === DIRECTIONS.rightUp
    ) {
      nextX = x + speed * CELL_SIZE * deltaTime;
      nextY = y - speed * CELL_SIZE * deltaTime;
      nexDirection = DIRECTIONS.rightUp;
    }
    return [nextX, nextY, nexDirection];
  },
  [CELL_TYPES.TURN_RIGHT_UP]: (x, y, speed, direction, deltaTime) => {
    let nextX = x;
    let nextY = y;
    let nexDirection = direction;
    if (direction === "left" || direction === DIRECTIONS.leftUp) {
      nextX = x - speed * CELL_SIZE * deltaTime;
      nextY = y - speed * CELL_SIZE * deltaTime;
      nexDirection = DIRECTIONS.leftUp;
    }
    if (direction === "down" || direction === DIRECTIONS.rightDown) {
      nextX = x + speed * CELL_SIZE * deltaTime;
      nextY = y + speed * CELL_SIZE * deltaTime;
      nexDirection = DIRECTIONS.rightDown;
    }
    return [nextX, nextY, nexDirection];
  },
  [CELL_TYPES.TURN_LEFT_UP]: (x, y, speed, direction, deltaTime) => {
    let nextX = x;
    let nextY = y;
    let nexDirection = direction;
    if (direction === "right" || direction === DIRECTIONS.rightUp) {
      nextX = x + speed * CELL_SIZE * deltaTime;
      nextY = y - speed * CELL_SIZE * deltaTime;
      nexDirection = DIRECTIONS.rightUp;
    }
    if (direction === "down" || direction === DIRECTIONS.leftDown) {
      nextX = x - speed * CELL_SIZE * deltaTime;
      nextY = y + speed * CELL_SIZE * deltaTime;
      nexDirection = DIRECTIONS.leftDown;
    }
    return [nextX, nextY, nexDirection];
  },
};

class Game {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.gameOverScreen = document.getElementById("gameOver");
    this.playAgainButton = document.getElementById("playAgain");

    this.lastTime = 0;
    this.setupCanvas();
    this.initGame();
    this.setupEventListeners();
    this.gameLoop();
  }

  setupCanvas() {
    this.canvas.width = GRID_WIDTH * CELL_SIZE;
    this.canvas.height = GRID_HEIGHT * CELL_SIZE;
  }

    initGame() {
        // Initialize game grid
        this.grid = [
            ["┌", "-", "-", "-", "-", "-", "┐", " ", " ", "┌", "-", "-", "-", "-", "┐"],
            ["|", " ", " ", " ", " ", " ", "|", " ", " ", "|", " ", " ", " ", " ", "|"],
            ["|", " ", " ", " ", " ", " ", "|", " ", " ", "|", " ", " ", " ", " ", "|"],
            ["|", " ", " ", " ", " ", " ", "|", " ", " ", "|", " ", " ", " ", " ", "|"],
            ["|", " ", " ", " ", " ", " ", "└", "-", "-", "┘", " ", " ", " ", " ", "|"],
            ["|", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", "|"],
            ["|", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", "|"],
            ["|", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", "|"],
            ["└", "┐", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", "┌", "┘"],
            [" ", "└", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "┘", " "]
          ];
        // Initialize train at the center of the starting cell
        this.train = {
            x: 1,
            y: 0,
      direction: "right",
      state: TRAIN_STATES.RUNNING,
      speed: 0,
      pixelX: (1 + 0.5) * CELL_SIZE, // Center of the cell
      pixelY: (0 + 0.5) * CELL_SIZE, // Center of the cell
    };
  }

  setupEventListeners() {
    this.playAgainButton.addEventListener("click", () => {
      this.gameOverScreen.classList.add("hidden");
      this.initGame();
    });
  }

  gameLoop(currentTime = 0) {
    const deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.draw();
    requestAnimationFrame((time) => this.gameLoop(time));
  }

  update(deltaTime) {
    if (this.train.state !== TRAIN_STATES.RUNNING) return;

    // Update train speed with acceleration
    if (this.train.speed < TRAIN_MAX_SPEED) {
      this.train.speed = Math.min(
        TRAIN_MAX_SPEED,
        this.train.speed + TRAIN_ACCELERATION * deltaTime
      );
    }

    // Calculate next position based on current speed
    let nextPixelX = this.train.pixelX;
    let nextPixelY = this.train.pixelY;

    // Get current cell type
    const currentCellType = this.grid[this.train.y][this.train.x];
    const turnCell = TURN_DIRECTIONS[currentCellType];

    if (turnCell) {
      const [nextX, nextY, nextDirection] = turnCell(
        this.train.pixelX,
        this.train.pixelY,
        this.train.speed,
        this.train.direction,
        deltaTime
      );
      nextPixelX = nextX;
      nextPixelY = nextY;
      this.train.direction = nextDirection;
    } else {
      switch (this.train.direction) {
        case DIRECTIONS.rightDown:
          this.train.direction =
            currentCellType === CELL_TYPES.RAIL_H
              ? DIRECTIONS.right
              : DIRECTIONS.down;
          break;
        case DIRECTIONS.rightUp:
          this.train.direction =
            currentCellType === CELL_TYPES.RAIL_H
              ? DIRECTIONS.right
              : DIRECTIONS.up;
          break;
        case DIRECTIONS.leftDown:
          this.train.direction =
            currentCellType === CELL_TYPES.RAIL_H
              ? DIRECTIONS.left
              : DIRECTIONS.down;
          break;
        case DIRECTIONS.leftUp:
          this.train.direction =
            currentCellType === CELL_TYPES.RAIL_H
              ? DIRECTIONS.left
              : DIRECTIONS.up;
          break;
      }

      const centerX = (this.train.x + 0.5) * CELL_SIZE;
      const centerY = (this.train.y + 0.5) * CELL_SIZE;
      switch (this.train.direction) {
        case DIRECTIONS.right:
          nextPixelX += this.train.speed * CELL_SIZE * deltaTime;
          // Snap Y coordinate to center when moving horizontally
          if (Math.abs(nextPixelY - centerY) < 0.1 * CELL_SIZE) {
            nextPixelY = centerY;
          }
          break;
        case DIRECTIONS.left:
          nextPixelX -= this.train.speed * CELL_SIZE * deltaTime;
          // Snap Y coordinate to center when moving horizontally
          if (Math.abs(nextPixelY - centerY) < 0.1 * CELL_SIZE) {
            nextPixelY = centerY;
          }
          break;
        case DIRECTIONS.up:
          nextPixelY -= this.train.speed * CELL_SIZE * deltaTime;
          // Snap X coordinate to center when moving vertically
          if (Math.abs(nextPixelX - centerX) < 0.1 * CELL_SIZE) {
            nextPixelX = centerX;
          }
          break;
        case DIRECTIONS.down:
          nextPixelY += this.train.speed * CELL_SIZE * deltaTime;
          // Snap X coordinate to center when moving vertically
          if (Math.abs(nextPixelX - centerX) < 0.1 * CELL_SIZE) {
            nextPixelX = centerX;
          }
          break;
      }
    }

    // Convert pixel position to grid position (using center points)
    const nextGridX = Math.floor(nextPixelX / CELL_SIZE);
    const nextGridY = Math.floor(nextPixelY / CELL_SIZE);

    // Check if we've moved to a new cell
    if (nextGridX !== this.train.x || nextGridY !== this.train.y) {
      // Check if the new cell is valid
      if (this.isValidMove(nextGridX, nextGridY)) {
        // Update grid position first
        this.train.x = nextGridX;
        this.train.y = nextGridY;

        // Then check for turn and update direction
        const cellType = this.grid[this.train.y][this.train.x];
        if (
          TURN_DIRECTIONS[cellType] &&
          TURN_DIRECTIONS[cellType][this.train.direction]
        ) {
          this.train.direction =
            TURN_DIRECTIONS[cellType][this.train.direction];
        }
      } else {
        this.train.state = TRAIN_STATES.CRASHED;
        this.gameOverScreen.classList.remove("hidden");
        return;
      }
    }

    // Update pixel position
    this.train.pixelX = nextPixelX;
    this.train.pixelY = nextPixelY;
  }

  isValidMove(x, y) {
    // Check if position is within grid
    if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) {
      return false;
    }

    // Check if there are rails at the position
    const cellType = this.grid[y][x];
    return cellType !== CELL_TYPES.EMPTY;
  }

  draw() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw grid
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const cellType = this.grid[y][x];
        this.drawCell(x, y, cellType);
      }
    }

    // Draw train
    this.drawTrain();
  }

  drawCell(x, y, cellType) {
    const cellX = x * CELL_SIZE;
    const cellY = y * CELL_SIZE;

    // Draw cell background
    this.ctx.fillStyle = "#fff";
    this.ctx.fillRect(cellX, cellY, CELL_SIZE, CELL_SIZE);
    this.ctx.strokeStyle = "#ccc";
    this.ctx.strokeRect(cellX, cellY, CELL_SIZE, CELL_SIZE);

    // Draw cell content
    this.ctx.fillStyle = "#000";
    this.ctx.font = "20px Arial";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText(cellType, cellX + CELL_SIZE / 2, cellY + CELL_SIZE / 2);
  }

  drawTrain() {
    this.ctx.save(); // Save the current canvas state
    
    // Move to train position
    this.ctx.translate(this.train.pixelX, this.train.pixelY);
    
    // Rotate based on direction
    let rotation = 0;
    switch (this.train.direction) {
      case DIRECTIONS.right:
        rotation = 0;
        break;
      case DIRECTIONS.down:
        rotation = Math.PI / 2;
        break;
      case DIRECTIONS.left:
        rotation = Math.PI;
        break;
      case DIRECTIONS.up:
        rotation = -Math.PI / 2;
        break;
      case DIRECTIONS.rightDown:
        rotation = Math.PI / 4;
        break;
      case DIRECTIONS.leftDown:
        rotation = Math.PI * 3/4;
        break;
      case DIRECTIONS.leftUp:
        rotation = -Math.PI * 3/4;
        break;
      case DIRECTIONS.rightUp:
        rotation = -Math.PI / 4;
        break;
    }
    this.ctx.rotate(rotation);
    
    // Draw the train sprite
    this.ctx.fillStyle = "#f00";
    this.ctx.font = "24px Arial";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText("🚃", 0, 0);
    
    this.ctx.restore(); // Restore the canvas state
  }
}

// Start the game when the page loads
window.addEventListener("load", () => {
  new Game();
});


