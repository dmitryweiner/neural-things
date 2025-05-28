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
      ["|", " ", "┌", "-", "-┌","-", "┘-","-", "-", "-└","-", "┐", " ", " ", "|"],
      ["|", " ", "|", " ", "|", " ", " ", " ", " ", " ", " ", "|", " ", " ", "|"],
      ["|└","-", "┘|"," ", "|└","-", "-", "-", "-", "-", "-", "┘|"," ", " ", "|"],
      ["|", " ", "|┌","-", "-└","-", "-", "-", "-", "-", "-", "┘-","┐", " ", "|"],
      ["└", "-", "┐|"," ", " ", " ", " ", " ", " ", " ", " ", " ", "|┌","-", "┘"],
      [" ", " ", "|S"," ", " ", " ", " ", " ", " ", " ", " ", " ", "|", " ", " "],
      [" ", " ", "└", "-", "-", "-S","-", "-", "-", "-", "-", "-", "┘", " ", " "]
    ];
    
    // Initialize switch states
    this.switchStates = {};
    
    // Scan grid for switches and set default states
    for (let y = 0; y < this.grid.length; y++) {
      for (let x = 0; x < this.grid[y].length; x++) {
        const cell = this.grid[y][x];
        if (isSwitchCell(cell)) {
          this.switchStates[`${x},${y}`] = { 
            state: 'straight', // Default state
            isStraight: true
          };
        }
      }
    }
    
    // Initialize semaphore states
    this.semaphoreStates = {};
    
    // Scan grid for semaphores and set default states
    for (let y = 0; y < this.grid.length; y++) {
      for (let x = 0; x < this.grid[y].length; x++) {
        const cell = this.grid[y][x];
        if (isSemaphoreCell(cell)) {
          this.semaphoreStates[`${x},${y}`] = { 
            isOpen: true // Default state - semaphore is open
          };
        }
      }
    }
    
    // Определяем начальные позиции
    const initialDirection = DIRECTIONS.right;
    
    // Создаем локомотив
    this.trainParts = [{
      type: 'locomotive',
      state: LOCOMOTIVE_STATES.ACCELERATING,
      x: 4, // Начальная позиция
      y: 0,
      direction: initialDirection,
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


  // Toggle switch state when clicked/tapped
  toggleSwitch(x, y) {
    const key = `${x},${y}`;
    if (this.switchStates[key]) {
      // Check if train is on the switch
      if (this.isTrainOnSwitch(x, y)) return;
      
      // Toggle state
      this.switchStates[key].isStraight = !this.switchStates[key].isStraight;
      this.switchStates[key].state = this.switchStates[key].isStraight ? 'straight' : 'turning';
    }
  }

  // Toggle semaphore state when clicked/tapped
  toggleSemaphore(x, y) {
    const key = `${x},${y}`;
    if (this.semaphoreStates[key]) {
      // Toggle state (semaphores can be toggled even if train is on them)
      this.semaphoreStates[key].isOpen = !this.semaphoreStates[key].isOpen;
    }
  }

  // Check if any train part is on the given cell
  isTrainOnSwitch(x, y) {
    return this.trainParts.some(part => part.x === x && part.y === y);
  }

  setupEventListeners() {
    this.playAgainButton.addEventListener("click", () => {
      this.gameOverScreen.classList.add("hidden");
      this.initGame();
    });
    
    // Handle both clicks and taps for switch toggling
    const handleSwitchInteraction = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      
      // Get coordinates (handle both mouse and touch)
      let clientX, clientY;
      if (e.type === 'touchend') {
        // Prevent mouse events from also firing
        e.preventDefault();
        // Use the last touch position
        const touch = e.changedTouches[0];
        clientX = touch.clientX;
        clientY = touch.clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      
      const x = Math.floor((clientX - rect.left) / CELL_SIZE);
      const y = Math.floor((clientY - rect.top) / CELL_SIZE);
      
      // Check if valid grid position
      if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) {
        const cellType = this.grid[y][x];
        if (isSwitchCell(cellType)) {
          this.toggleSwitch(x, y);
        } else if (isSemaphoreCell(cellType)) {
          this.toggleSemaphore(x, y);
        }
      }
    };
    
    // Mouse click
    this.canvas.addEventListener("click", handleSwitchInteraction);
    
    // Touch events for mobile
    this.canvas.addEventListener("touchend", handleSwitchInteraction);
    
    // Prevent scrolling/zooming when touching the canvas on mobile
    this.canvas.addEventListener("touchstart", (e) => {
      if (e.touches.length === 1) {
        e.preventDefault();
      }
    }, { passive: false });
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

    // Check if locomotive is on a semaphore
    const locomotiveCell = this.grid[locomotive.y][locomotive.x];
    if (isSemaphoreCell(locomotiveCell)) {
      const semaphoreKey = `${locomotive.x},${locomotive.y}`;
      const semaphoreState = this.semaphoreStates[semaphoreKey];
      
      if (semaphoreState) {
        if (!semaphoreState.isOpen) {
          if (locomotive.speed > 0) {
            locomotive.state = LOCOMOTIVE_STATES.DECELERATING;
          } else {
            locomotive.state = LOCOMOTIVE_STATES.STOPPED;
          }
        } else {
          locomotive.state = LOCOMOTIVE_STATES.ACCELERATING;
        }
      }
    }

    switch (locomotive.state) {
      case LOCOMOTIVE_STATES.ACCELERATING:
        if (locomotive.speed < TRAIN_MAX_SPEED) {
          locomotive.speed = Math.min(
            TRAIN_MAX_SPEED,
            locomotive.speed + TRAIN_ACCELERATION * deltaTime
          );
        }
        break;
      case LOCOMOTIVE_STATES.DECELERATING:
        if (locomotive.speed > 0) {
          locomotive.speed = Math.max(0, locomotive.speed - TRAIN_DECELERATION * deltaTime);
        }
        break;
      case LOCOMOTIVE_STATES.STOPPED:
        locomotive.speed = 0;
        break;
      case LOCOMOTIVE_STATES.IDLE:
        break;
      default:
        break;
    }

    // Process all train parts in a single loop
    for (let i = 0; i < this.trainParts.length; i++) {
      const trainPart = this.trainParts[i];
      
      // For wagons, use locomotive's speed
      if (i > 0) {
        trainPart.speed = locomotive.speed;
      }

      // Get current cell type
      const currentCellType = this.grid[trainPart.y][trainPart.x];
      const baseCellType = isSemaphoreCell(currentCellType) ? getBaseCellType(currentCellType) : currentCellType;
      const turnCell = TURN_DIRECTIONS[baseCellType];
      
      // Calculate next position using the shared function
      const nextPosition = calculateNextPosition(
        currentCellType,
        turnCell,
        trainPart.x,
        trainPart.y,
        trainPart.pixelX,
        trainPart.pixelY,
        trainPart.direction,
        trainPart.speed,
        deltaTime,
        CELL_SIZE,
        this.switchStates
      );

      const nextPixelX = nextPosition.x;
      const nextPixelY = nextPosition.y;
      trainPart.direction = nextPosition.direction;

      // Convert pixel position to grid position (using center points)
      const nextGridX = Math.floor(nextPixelX / CELL_SIZE);
      const nextGridY = Math.floor(nextPixelY / CELL_SIZE);

      // Check if train part moved to a new cell
      if (nextGridX !== trainPart.x || nextGridY !== trainPart.y) {
        // Check if the new cell is valid
        if (this.isValidMove(nextGridX, nextGridY)) {
          // Update grid position first
          trainPart.x = nextGridX;
          trainPart.y = nextGridY;

          // Then check for turn and update direction
          const cellType = this.grid[trainPart.y][trainPart.x];
          const baseCellTypeForTurn = isSemaphoreCell(cellType) ? getBaseCellType(cellType) : cellType;
          if (
            TURN_DIRECTIONS[baseCellTypeForTurn] &&
            TURN_DIRECTIONS[baseCellTypeForTurn][trainPart.direction]
          ) {
            trainPart.direction =
              TURN_DIRECTIONS[baseCellTypeForTurn][trainPart.direction];
          }
        } else {
          locomotive.state = TRAIN_STATES.CRASHED;
          this.gameOverScreen.classList.remove("hidden");
          return;
        }
      }

      // Update train part pixel position
      trainPart.pixelX = nextPixelX;
      trainPart.pixelY = nextPixelY;
    }
  }

  isValidMove(x, y) {
    // Check if position is within grid
    if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) {
      return false;
    }

    // Check if there are rails at the position
    const cellType = this.grid[y][x];
    const baseCellType = isSemaphoreCell(cellType) ? getBaseCellType(cellType) : cellType;
    return baseCellType !== CELL_TYPES.EMPTY;
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
        // Special handling for switches to show their state
        if (isSwitchCell(cellType)) {
          const switchState = this.switchStates[`${x},${y}`];
          drawSwitchCell(this.ctx, x, y, cellType, switchState ? switchState.isStraight : true);
        } else if (isSemaphoreCell(cellType)) {
          const semaphoreState = this.semaphoreStates[`${x},${y}`];
          drawSemaphoreCell(this.ctx, x, y, cellType, semaphoreState ? semaphoreState.isOpen : true);
        } else {
          drawCell(this.ctx, x, y, cellType);
        }
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
