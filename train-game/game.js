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

    // Get current cell type
    const currentCellType = this.grid[this.train.y][this.train.x];
    const turnCell = TURN_DIRECTIONS[currentCellType];

    // Рассчитываем следующую позицию с помощью выделенной функции
    const nextPosition = calculateNextPosition(
      currentCellType,
      turnCell,
      this.train.x,
      this.train.y,
      this.train.pixelX,
      this.train.pixelY,
      this.train.direction,
      this.train.speed,
      deltaTime,
      CELL_SIZE
    );

    const nextPixelX = nextPosition.x;
    const nextPixelY = nextPosition.y;
    this.train.direction = nextPosition.direction;

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
    const centerX = cellX + CELL_SIZE / 2;
    const centerY = cellY + CELL_SIZE / 2;

    // Draw cell background
    this.ctx.fillStyle = "#fff";
    this.ctx.fillRect(cellX, cellY, CELL_SIZE, CELL_SIZE);
    this.ctx.strokeStyle = "#ccc";
    this.ctx.strokeRect(cellX, cellY, CELL_SIZE, CELL_SIZE);

    // Настройки линий для рельсов
    this.ctx.strokeStyle = "#555";
    this.ctx.lineWidth = 2;

    // Отрисовка в зависимости от типа клетки
    switch (cellType) {
      case CELL_TYPES.RAIL_H:
        // Горизонтальные рельсы (две параллельные линии)
        this.ctx.beginPath();
        this.ctx.moveTo(cellX, centerY - RAIL_WIDTH);
        this.ctx.lineTo(cellX + CELL_SIZE, centerY - RAIL_WIDTH);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(cellX, centerY + RAIL_WIDTH);
        this.ctx.lineTo(cellX + CELL_SIZE, centerY + RAIL_WIDTH);
        this.ctx.stroke();
        break;

      case CELL_TYPES.RAIL_V:
        // Вертикальные рельсы (две параллельные линии)
        this.ctx.beginPath();
        this.ctx.moveTo(centerX - RAIL_WIDTH, cellY);
        this.ctx.lineTo(centerX - RAIL_WIDTH, cellY + CELL_SIZE);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(centerX + RAIL_WIDTH, cellY);
        this.ctx.lineTo(centerX + RAIL_WIDTH, cellY + CELL_SIZE);
        this.ctx.stroke();
        break;

      case CELL_TYPES.TURN_RIGHT_DOWN:
        // Поворот направо-вниз
        const radius1RD = CELL_SIZE / 2 - RAIL_WIDTH;
        const radius2RD = CELL_SIZE / 2 + RAIL_WIDTH;
        
        // Внутренняя дуга
        this.ctx.beginPath();
        this.ctx.arc(cellX, cellY + CELL_SIZE, radius1RD, -Math.PI/2, 0);
        this.ctx.stroke();
        
        // Внешняя дуга
        this.ctx.beginPath();
        this.ctx.arc(cellX, cellY + CELL_SIZE, radius2RD, -Math.PI/2, 0);
        this.ctx.stroke();
        break;

      case CELL_TYPES.TURN_LEFT_DOWN:
        // Поворот налево-вниз
        const radius1LD = CELL_SIZE / 2 - RAIL_WIDTH;
        const radius2LD = CELL_SIZE / 2 + RAIL_WIDTH;
        
        // Внутренняя дуга
        this.ctx.beginPath();
        this.ctx.arc(cellX + CELL_SIZE, cellY + CELL_SIZE, radius1LD, Math.PI, Math.PI * 3/2);
        this.ctx.stroke();
        
        // Внешняя дуга
        this.ctx.beginPath();
        this.ctx.arc(cellX + CELL_SIZE, cellY + CELL_SIZE, radius2LD, Math.PI, Math.PI * 3/2);
        this.ctx.stroke();
        break;

      case CELL_TYPES.TURN_RIGHT_UP:
        // Поворот направо-вверх
        const radius1RU = CELL_SIZE / 2 - RAIL_WIDTH;
        const radius2RU = CELL_SIZE / 2 + RAIL_WIDTH;
        
        // Внутренняя дуга
        this.ctx.beginPath();
        this.ctx.arc(cellX + CELL_SIZE, cellY, radius1RU, Math.PI / 2, Math.PI);
        this.ctx.stroke();
        
        // Внешняя дуга
        this.ctx.beginPath();
        this.ctx.arc(cellX + CELL_SIZE, cellY, radius2RU, Math.PI / 2, Math.PI);
        this.ctx.stroke();
        break;

      case CELL_TYPES.TURN_LEFT_UP:
        // Поворот налево-вверх
        const radius1LU = CELL_SIZE / 2 - RAIL_WIDTH;
        const radius2LU = CELL_SIZE / 2 + RAIL_WIDTH;
        
        // Внутренняя дуга
        this.ctx.beginPath();
        this.ctx.arc(cellX, cellY, radius1LU, 0, Math.PI / 2);
        this.ctx.stroke();
        
        // Внешняя дуга
        this.ctx.beginPath();
        this.ctx.arc(cellX, cellY, radius2LU, 0, Math.PI / 2);
        this.ctx.stroke();
        break;

      case CELL_TYPES.EMPTY:
        // Пустая клетка
        break;

      default:
        // Для других типов клеток оставляем текстовую отрисовку
        this.ctx.fillStyle = "#000";
        this.ctx.font = "20px Arial";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText(cellType, centerX, centerY);
        break;
    }
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
