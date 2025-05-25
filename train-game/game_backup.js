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
      ["|", " ", " ", " ", "|└","-", "-", "-", "-", "-", "-", "┘|"," ", " ", "|"],
      ["|", " ", " ", " ", "└", "-", "-", "-", "-", "-", "-", "┘", " ", " ", "|"],
      ["└", "-", "┐", " ", " ", " ", " ", " ", " ", " ", " ", " ", "┌", "-", "┘"],
      [" ", " ", "|", " ", " ", " ", " ", " ", " ", " ", " ", " ", "|", " ", " "],
      [" ", " ", "└", "-", "-", "-", "-", "-", "-", "-", "-", "-", "┘", " ", " "]
    ];
    
    // Initialize switch states
    this.switchStates = {};
    
    // Scan grid for switches and set default states
    for (let y = 0; y < this.grid.length; y++) {
      for (let x = 0; x < this.grid[y].length; x++) {
        const cell = this.grid[y][x];
        if (this.isSwitchCell(cell)) {
          this.switchStates[`${x},${y}`] = { 
            state: 'straight', // Default state
            isStraight: true
          };
        }
      }
    }
    
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

  // Helper method to detect switch cells
  isSwitchCell(cellType) {
    return [
      CELL_TYPES.SWITCH_RIGHT_DOWN_V, 
      CELL_TYPES.SWITCH_LEFT_DOWN_V,
      CELL_TYPES.SWITCH_LEFT_UP_V,
      CELL_TYPES.SWITCH_RIGHT_UP_V,
      CELL_TYPES.SWITCH_RIGHT_DOWN_H,
      CELL_TYPES.SWITCH_LEFT_DOWN_H, 
      CELL_TYPES.SWITCH_LEFT_UP_H,
      CELL_TYPES.SWITCH_RIGHT_UP_H
    ].includes(cellType);
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
        if (this.isSwitchCell(cellType)) {
          this.toggleSwitch(x, y);
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
    
    // Check if it's a switch cell
    const isSwitchCell = this.isSwitchCell(currentCellType);
    let shouldTurn = turnCell !== undefined;
    
    // If it's a switch, get its state
    if (isSwitchCell) {
      const switchState = this.switchStates[`${locomotive.x},${locomotive.y}`];
      if (switchState) {
        // Determine if we should turn based on switch state and approach direction
        shouldTurn = this.getSwitchBehavior(currentCellType, locomotive.direction, switchState.isStraight);
      }
    }

    // Рассчитываем следующую позицию с помощью выделенной функции
    const nextPosition = calculateNextPosition(
      currentCellType,
      shouldTurn ? turnCell : null,
      locomotive.x,
      locomotive.y,
      locomotive.pixelX,
      locomotive.pixelY,
      locomotive.direction,
      locomotive.speed,
      deltaTime,
      CELL_SIZE,
      this.switchStates
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
  
  // Helper method to determine switch behavior based on approach direction
  getSwitchBehavior(switchType, direction, isStraight) {
    // For vertical switches ("|┌", "┐|", etc.)
    if (switchType.includes("|")) {
      // If approaching from vertical direction (up/down)
      if (Math.abs(direction - DIRECTIONS.up) < 0.1 || 
          Math.abs(direction - DIRECTIONS.down) < 0.1) {
        // Always go straight when approaching vertically, except in specific cases
        if (
          // When approaching from up and the switch type expects that to change
          (Math.abs(direction - DIRECTIONS.up) < 0.1 && 
           (switchType === CELL_TYPES.SWITCH_RIGHT_DOWN_V || 
            switchType === CELL_TYPES.SWITCH_LEFT_DOWN_V)) ||
          // When approaching from down and the switch type expects that to change
          (Math.abs(direction - DIRECTIONS.down) < 0.1 && 
           (switchType === CELL_TYPES.SWITCH_LEFT_UP_V || 
            switchType === CELL_TYPES.SWITCH_RIGHT_UP_V))
        ) {
          return !isStraight; // Use switch state
        }
        return false; // Default: go straight
      }
      // Otherwise use the switch state
      return !isStraight;
    } 
    // For horizontal switches ("-┌", "┐-", etc.)
    else if (switchType.includes("-")) {
      // If approaching from horizontal direction (left/right)
      if (Math.abs(direction) < 0.1 || 
          Math.abs(direction - DIRECTIONS.left) < 0.1) {
        // Always go straight when approaching horizontally, except in specific cases
        if (
          // When approaching from right and the switch type expects that to change
          (Math.abs(direction) < 0.1 && 
           (switchType === CELL_TYPES.SWITCH_LEFT_DOWN_H || 
            switchType === CELL_TYPES.SWITCH_LEFT_UP_H)) ||
          // When approaching from left and the switch type expects that to change
          (Math.abs(direction - DIRECTIONS.left) < 0.1 && 
           (switchType === CELL_TYPES.SWITCH_RIGHT_DOWN_H || 
            switchType === CELL_TYPES.SWITCH_RIGHT_UP_H))
        ) {
          return !isStraight; // Use switch state
        }
        return false; // Default: go straight
      }
      // Otherwise use the switch state
      return !isStraight;
    }
    
    return false;
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
      
      // Check if it's a switch cell
      const isSwitchCell = this.isSwitchCell(currentCellType);
      let shouldTurn = turnCell !== undefined;
      
      // If it's a switch, get its state
      if (isSwitchCell) {
        const switchState = this.switchStates[`${wagon.x},${wagon.y}`];
        if (switchState) {
          // Determine if we should turn based on switch state and approach direction
          shouldTurn = this.getSwitchBehavior(currentCellType, wagon.direction, switchState.isStraight);
        }
      }
      
      // Рассчитываем следующую позицию так же, как для локомотива
      const nextPosition = calculateNextPosition(
        currentCellType,
        shouldTurn ? turnCell : null,
        wagon.x,
        wagon.y,
        wagon.pixelX,
        wagon.pixelY,
        wagon.direction,
        wagon.speed,
        deltaTime,
        CELL_SIZE,
        this.switchStates
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
        // Special handling for switches to show their state
        if (this.isSwitchCell(cellType)) {
          const switchState = this.switchStates[`${x},${y}`];
          drawSwitchCell(this.ctx, x, y, cellType, switchState ? switchState.isStraight : true);
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
