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
    
    // Определяем начальные позиции
    const initialDirection = DIRECTIONS.right;
    
    // Создаем локомотив
    this.trainParts = [{
      type: 'locomotive',
      x: 4, // Начальная позиция
      y: 0,
      direction: initialDirection,
      state: TRAIN_STATES.RUNNING,
      speed: 0,
      pixelX: (4 + 0.5) * CELL_SIZE,
      pixelY: (0 + 0.5) * CELL_SIZE,
    }];
    
    // Добавляем вагон
    this.trainParts.push({
      type: 'wagon',
      x: 3, // Начинаем с предыдущей клетки
      y: 0,
      direction: initialDirection,
      speed: 0,
      pixelX: (3 + 0.5) * CELL_SIZE,
      pixelY: (0 + 0.5) * CELL_SIZE,
    });
    this.trainParts.push({
      type: 'wagon',
      x: 2, // Начинаем с предыдущей клетки
      y: 0,
      direction: initialDirection,
      speed: 0,
      pixelX: (2 + 0.5) * CELL_SIZE,
      pixelY: (0 + 0.5) * CELL_SIZE,
    });
    this.trainParts.push({
      type: 'wagon',
      x: 1, // Начинаем с предыдущей клетки
      y: 0,
      direction: initialDirection,
      speed: 0,
      pixelX: (1 + 0.5) * CELL_SIZE,
      pixelY: (0 + 0.5) * CELL_SIZE,
    });
    
    // Создаем фон
    this.backgroundCanvas = generateBackground(this.canvas);
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
    const locomotive = this.trainParts[0];
    if (locomotive.state !== TRAIN_STATES.RUNNING) return;

    // Update locomotive speed with acceleration
    if (locomotive.speed < TRAIN_MAX_SPEED) {
      locomotive.speed = Math.min(
        TRAIN_MAX_SPEED,
        locomotive.speed + TRAIN_ACCELERATION * deltaTime
      );
    }

    // Get current cell type
    const currentCellType = this.grid[locomotive.y][locomotive.x];
    const turnCell = TURN_DIRECTIONS[currentCellType];

    // Рассчитываем следующую позицию с помощью выделенной функции
    const nextPosition = calculateNextPosition(
      currentCellType,
      turnCell,
      locomotive.x,
      locomotive.y,
      locomotive.pixelX,
      locomotive.pixelY,
      locomotive.direction,
      locomotive.speed,
      deltaTime,
      CELL_SIZE
    );

    const nextPixelX = nextPosition.x;
    const nextPixelY = nextPosition.y;
    locomotive.direction = nextPosition.direction;

    // Convert pixel position to grid position (using center points)
    const nextGridX = Math.floor(nextPixelX / CELL_SIZE);
    const nextGridY = Math.floor(nextPixelY / CELL_SIZE);

    // Check if locomotive moved to a new cell
    if (nextGridX !== locomotive.x || nextGridY !== locomotive.y) {
      // Check if the new cell is valid
      if (this.isValidMove(nextGridX, nextGridY)) {
        // Update grid position first
        locomotive.x = nextGridX;
        locomotive.y = nextGridY;

        // Then check for turn and update direction
        const cellType = this.grid[locomotive.y][locomotive.x];
        if (
          TURN_DIRECTIONS[cellType] &&
          TURN_DIRECTIONS[cellType][locomotive.direction]
        ) {
          locomotive.direction =
            TURN_DIRECTIONS[cellType][locomotive.direction];
        }
      } else {
        locomotive.state = TRAIN_STATES.CRASHED;
        this.gameOverScreen.classList.remove("hidden");
        return;
      }
    }

    // Update locomotive pixel position
    locomotive.pixelX = nextPixelX;
    locomotive.pixelY = nextPixelY;
    
    // Update wagons using the new approach
    this.updateWagons(deltaTime);
  }
  
  // Новая реализация updateWagons без истории пути
  updateWagons(deltaTime) {
    const locomotive = this.trainParts[0];
    
    // Для каждого вагона
    for (let i = 1; i < this.trainParts.length; i++) {
      const wagon = this.trainParts[i];
      
      // Используем ту же скорость, что и у локомотива
      wagon.speed = locomotive.speed;
      
      // Получаем тип клетки под вагоном
      const currentCellType = this.grid[wagon.y][wagon.x];
      const turnCell = TURN_DIRECTIONS[currentCellType];
      
      // Рассчитываем следующую позицию так же, как для локомотива
      const nextPosition = calculateNextPosition(
        currentCellType,
        turnCell,
        wagon.x,
        wagon.y,
        wagon.pixelX,
        wagon.pixelY,
        wagon.direction,
        wagon.speed,
        deltaTime,
        CELL_SIZE
      );
      
      // Обновляем позицию вагона
      const nextPixelX = nextPosition.x;
      const nextPixelY = nextPosition.y;
      wagon.direction = nextPosition.direction;
      
      // Проверяем переход на новую клетку
      const nextGridX = Math.floor(nextPixelX / CELL_SIZE);
      const nextGridY = Math.floor(nextPixelY / CELL_SIZE);
      
      if (nextGridX !== wagon.x || nextGridY !== wagon.y) {
        // Проверяем, что новая клетка допустима
        if (this.isValidMove(nextGridX, nextGridY)) {
          wagon.x = nextGridX;
          wagon.y = nextGridY;
          
          // Проверяем поворот
          const cellType = this.grid[wagon.y][wagon.x];
          if (TURN_DIRECTIONS[cellType] && TURN_DIRECTIONS[cellType][wagon.direction]) {
            wagon.direction = TURN_DIRECTIONS[cellType][wagon.direction];
          }
        } else {
          // Если вагон сходит с рельсов, останавливаем весь поезд
          locomotive.state = TRAIN_STATES.CRASHED;
          this.gameOverScreen.classList.remove("hidden");
          return;
        }
      }
      
      // Обновляем координаты в пикселях
      wagon.pixelX = nextPixelX;
      wagon.pixelY = nextPixelY;
    }
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
    
    // Draw background
    this.ctx.drawImage(this.backgroundCanvas, 0, 0);

    // Draw grid (rails only)
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const cellType = this.grid[y][x];
        drawCell(this.ctx, x, y, cellType);
      }
    }

    // Draw train and all wagons
    this.trainParts.forEach(part => {
      drawTrainPart(this.ctx, part);
    });
  }
}

// Start the game when the page loads
window.addEventListener("load", () => {
  new Game();
});
