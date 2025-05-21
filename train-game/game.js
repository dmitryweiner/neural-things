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
    
    // Replace single train object with array of train parts
    const initialX = 1;
    const initialY = 0;
    const locX = (initialX + 0.5) * CELL_SIZE; // Center of the cell
    const locY = (initialY + 0.5) * CELL_SIZE; // Center of the cell
    
    // Locomotive
    this.trainParts = [{
      type: 'locomotive',
      x: initialX,
      y: initialY,
      direction: DIRECTIONS.right,
      state: TRAIN_STATES.RUNNING,
      speed: 0,
      pixelX: locX,
      pixelY: locY,
    }];
    
    // Add wagon slightly behind the locomotive with same direction
    const wagonDirection = DIRECTIONS.right;
    const wagonDistance = CELL_SIZE * 0.8; // Reduced distance for tighter coupling
    const wagonX = locX - Math.cos(wagonDirection) * wagonDistance;
    const wagonY = locY - Math.sin(wagonDirection) * wagonDistance;
    
    this.trainParts.push({
      type: 'wagon',
      x: Math.floor(wagonX / CELL_SIZE),
      y: Math.floor(wagonY / CELL_SIZE),
      direction: wagonDirection,
      pixelX: wagonX,
      pixelY: wagonY,
    });
    
    // Store path history for wagons to follow
    this.pathHistory = [];
    // Distance between train parts (reduced for tighter coupling)
    this.wagonDistance = CELL_SIZE * 0.8;
    
    // Pre-fill path history with initial positions to avoid wagons jumping
    for (let i = 0; i < 10; i++) {
      this.pathHistory.push({
        pixelX: locX - i * Math.cos(wagonDirection) * 0.1,
        pixelY: locY - i * Math.sin(wagonDirection) * 0.1,
        direction: wagonDirection
      });
    }
    
    // Создаем псевдослучайные зеленые пятна для всего фона
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

    // Record locomotive's position in path history
    this.pathHistory.unshift({
      pixelX: locomotive.pixelX,
      pixelY: locomotive.pixelY,
      direction: locomotive.direction
    });
    
    // Trim history to reasonable length
    const maxHistoryLength = 100;
    if (this.pathHistory.length > maxHistoryLength) {
      this.pathHistory.pop();
    }

    // Update locomotive pixel position
    locomotive.pixelX = nextPixelX;
    locomotive.pixelY = nextPixelY;
    
    // Update wagons
    this.updateWagons(deltaTime);
  }
  
  // Add new method to update wagons
  updateWagons(deltaTime) {
    const locomotive = this.trainParts[0];
    
    // For each wagon
    for (let i = 1; i < this.trainParts.length; i++) {
      const wagon = this.trainParts[i];
      const targetDistance = i * this.wagonDistance;
      
      // Find position in history at the right distance
      let distanceTraveled = 0;
      let historyIndex = 0;
      
      while (historyIndex < this.pathHistory.length - 1) {
        const current = this.pathHistory[historyIndex];
        const next = this.pathHistory[historyIndex + 1];
        
        const segmentDistance = Math.sqrt(
          Math.pow(next.pixelX - current.pixelX, 2) +
          Math.pow(next.pixelY - current.pixelY, 2)
        );
        
        if (distanceTraveled + segmentDistance >= targetDistance) {
          // Found the right segment, interpolate position
          const remainingDistance = targetDistance - distanceTraveled;
          const ratio = remainingDistance / segmentDistance;
          
          wagon.pixelX = current.pixelX + (next.pixelX - current.pixelX) * ratio;
          wagon.pixelY = current.pixelY + (next.pixelY - current.pixelY) * ratio;
          
          // Use locomotive's direction to keep consistent orientation
          // This ensures wagons maintain the same orientation as the locomotive
          wagon.direction = current.direction;
          
          wagon.x = Math.floor(wagon.pixelX / CELL_SIZE);
          wagon.y = Math.floor(wagon.pixelY / CELL_SIZE);
          break;
        }
        
        distanceTraveled += segmentDistance;
        historyIndex++;
      }
      
      // If we don't have enough history yet, position wagon directly behind locomotive
      if (historyIndex >= this.pathHistory.length - 1) {
        const offsetX = -Math.cos(locomotive.direction) * targetDistance;
        const offsetY = -Math.sin(locomotive.direction) * targetDistance;
        
        wagon.pixelX = locomotive.pixelX + offsetX;
        wagon.pixelY = locomotive.pixelY + offsetY;
        wagon.direction = locomotive.direction;
        wagon.x = Math.floor(wagon.pixelX / CELL_SIZE);
        wagon.y = Math.floor(wagon.pixelY / CELL_SIZE);
      }
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
