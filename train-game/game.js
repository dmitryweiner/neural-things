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
      ["|", " ", " ", " ", "┌", "-", "┘", " ", " ", "└", "-", "┐", " ", " ", "|"],
      ["|", " ", " ", " ", "|", " ", " ", " ", " ", " ", " ", "|", " ", " ", "|"],
      ["|", " ", " ", " ", "└", "-", "-", "-", "-", "-", "-", "┘", " ", " ", "|"],
      ["|", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", "|"],
      ["└", "-", "┐", " ", " ", " ", " ", " ", " ", " ", " ", " ", "┌", "-", "┘"],
      [" ", " ", "|", " ", " ", " ", " ", " ", " ", " ", " ", " ", "|", " ", " "],
      [" ", " ", "└", "-", "-", "-", "-", "-", "-", "-", "-", "-", "┘", " ", " "]
    ];
    // Initialize train at the center of the starting cell
    this.train = {
      x: 1,
      y: 0,
      direction: DIRECTIONS.right,
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

    // Calculate next position based on current speed and direction
    let nextPixelX = this.train.pixelX;
    let nextPixelY = this.train.pixelY;

    // Get current cell type
    const currentCellType = this.grid[this.train.y][this.train.x];
    const turnCell = TURN_DIRECTIONS[currentCellType];

    if (turnCell) {
      const turnResult = calculateTurnPosition(
        currentCellType,
        this.train.x,
        this.train.y,
        this.train.pixelX,
        this.train.pixelY,
        this.train.direction,
        this.train.speed,
        deltaTime
      );

      if (turnResult) {
        nextPixelX = turnResult.x;
        nextPixelY = turnResult.y;
        this.train.direction = turnResult.direction;
      }
    } else {
      // Update direction based on current cell type for diagonal movements
      const currentAngle = this.train.direction;
      const normalizedCurrentAngle = (currentAngle + 2 * Math.PI) % (2 * Math.PI);
            
      if (currentCellType === CELL_TYPES.RAIL_H) {
        // If on horizontal rail, snap to horizontal movement
        this.train.direction = Math.cos(normalizedCurrentAngle) > 0 ? DIRECTIONS.right : DIRECTIONS.left;
      } else if (currentCellType === CELL_TYPES.RAIL_V) {
        // If on vertical rail, snap to vertical movement
        this.train.direction = Math.sin(normalizedCurrentAngle) > 0 ? DIRECTIONS.down : DIRECTIONS.up;
      }

      // Update position based on direction angle
      nextPixelX += Math.cos(this.train.direction) * this.train.speed * CELL_SIZE * deltaTime;
      nextPixelY += Math.sin(this.train.direction) * this.train.speed * CELL_SIZE * deltaTime;
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
    this.ctx.save();
    this.ctx.translate(this.train.pixelX, this.train.pixelY);
    this.ctx.rotate(this.train.direction);
    this.ctx.fillStyle = "#f00";
    this.ctx.font = "24px Arial";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText("🚃", 0, 0);
    this.ctx.restore();
  }
}

// Start the game when the page loads
window.addEventListener("load", () => {
  new Game();
});
