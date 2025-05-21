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
    
    // Создаем псевдослучайные зеленые пятна для всего фона
    this.generateBackground();
  }
  
  // Функция для генерации псевдослучайного числа на основе seed
  seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }
  
  // Генерация единого фонового изображения для всей игры
  generateBackground() {
    // Создаем отдельный canvas для фона
    this.backgroundCanvas = document.createElement('canvas');
    this.backgroundCanvas.width = this.canvas.width;
    this.backgroundCanvas.height = this.canvas.height;
    const bgCtx = this.backgroundCanvas.getContext('2d');
    
    // Заполняем базовым зеленым цветом
    bgCtx.fillStyle = "#a5ed32"; // LightGreen - базовый цвет травы
    bgCtx.fillRect(0, 0, this.backgroundCanvas.width, this.backgroundCanvas.height);
    
    // Количество зеленых пятен (примерно 8 на клетку)
    const totalPatches = Math.floor(GRID_WIDTH * GRID_HEIGHT * 8);
    
    for (let i = 0; i < totalPatches; i++) {
      // Используем i как часть seed для случайности
      const patchSeed = i * 100;
      
      // Размер пятна (от 3 до 8 пикселей)
      const size = 3 + this.seededRandom(patchSeed) * 5;
      
      // Положение пятна на всем поле
      const patchX = this.seededRandom(patchSeed + 1) * this.backgroundCanvas.width;
      const patchY = this.seededRandom(patchSeed + 2) * this.backgroundCanvas.height;
      
      // Цвет пятна (оттенок зеленого)
      const greenValue = 220 + Math.floor(this.seededRandom(patchSeed + 3) * 40);
      const color = `rgb(0, ${greenValue}, 0)`;
      
      bgCtx.fillStyle = color;
      bgCtx.beginPath();
      bgCtx.arc(patchX, patchY, size, 0, Math.PI * 2);
      bgCtx.fill();
    }
    
    // Рисуем сетку для ориентировки
    bgCtx.strokeStyle = "#ccc";
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        bgCtx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      }
    }
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
    
    // Draw background
    this.ctx.drawImage(this.backgroundCanvas, 0, 0);

    // Draw grid (rails only)
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

    // Настройки линий для рельсов
    this.ctx.strokeStyle = "#555"; // Серый цвет для рельсов
    this.ctx.lineWidth = 2;

    // Отрисовка в зависимости от типа клетки
    switch (cellType) {
      case CELL_TYPES.RAIL_H:
        // Добавляем шпалы (рисуем их первыми)
        this.ctx.strokeStyle = "#CD853F"; // Более светлый коричневый цвет для шпал (Peru)
        const numTiesH = Math.floor(CELL_SIZE / TIE_SPACING);
        const tieSpacingH = CELL_SIZE / numTiesH;
        
        for (let i = 0; i < numTiesH; i++) {
          const tieX = cellX + i * tieSpacingH + tieSpacingH / 2;
          
          this.ctx.beginPath();
          this.ctx.moveTo(tieX, centerY - RAIL_WIDTH - TIE_WIDTH/2);
          this.ctx.lineTo(tieX, centerY + RAIL_WIDTH + TIE_WIDTH/2);
          this.ctx.stroke();
        }
        
        // Горизонтальные рельсы (две параллельные линии)
        this.ctx.strokeStyle = "#555"; // Серый цвет для рельсов
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
        // Добавляем шпалы (рисуем их первыми)
        this.ctx.strokeStyle = "#CD853F"; // Более светлый коричневый цвет для шпал (Peru)
        const numTiesV = Math.floor(CELL_SIZE / TIE_SPACING);
        const tieSpacingV = CELL_SIZE / numTiesV;
        
        for (let i = 0; i < numTiesV; i++) {
          const tieY = cellY + i * tieSpacingV + tieSpacingV / 2;
          
          this.ctx.beginPath();
          this.ctx.moveTo(centerX - RAIL_WIDTH - TIE_WIDTH/2, tieY);
          this.ctx.lineTo(centerX + RAIL_WIDTH + TIE_WIDTH/2, tieY);
          this.ctx.stroke();
        }
        
        // Вертикальные рельсы (две параллельные линии)
        this.ctx.strokeStyle = "#555"; // Серый цвет для рельсов
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
        const radius1RD = CELL_SIZE / 2 - RAIL_WIDTH;
        const radius2RD = CELL_SIZE / 2 + RAIL_WIDTH;
        const centerRD = { x: cellX, y: cellY + CELL_SIZE };
        
        // Добавляем шпалы (рисуем их первыми)
        this.ctx.strokeStyle = "#CD853F"; // Более светлый коричневый цвет для шпал (Peru)
        const numTiesRD = Math.floor((Math.PI/2 * CELL_SIZE/2) / TIE_SPACING);
        const tieAngleSpacingRD = Math.PI/2 / numTiesRD;
        
        for (let i = 0; i < numTiesRD; i++) {
          const angle = -Math.PI/2 + i * tieAngleSpacingRD + tieAngleSpacingRD / 2;
          
          this.ctx.beginPath();
          this.ctx.moveTo(
            centerRD.x + (radius1RD - TIE_WIDTH/2) * Math.cos(angle), 
            centerRD.y + (radius1RD - TIE_WIDTH/2) * Math.sin(angle)
          );
          this.ctx.lineTo(
            centerRD.x + (radius2RD + TIE_WIDTH/2) * Math.cos(angle), 
            centerRD.y + (radius2RD + TIE_WIDTH/2) * Math.sin(angle)
          );
          this.ctx.stroke();
        }
        
        // Рельсы (дуги)
        this.ctx.strokeStyle = "#555"; // Серый цвет для рельсов
        // Внутренняя дуга
        this.ctx.beginPath();
        this.ctx.arc(centerRD.x, centerRD.y, radius1RD, -Math.PI/2, 0);
        this.ctx.stroke();
        
        // Внешняя дуга
        this.ctx.beginPath();
        this.ctx.arc(centerRD.x, centerRD.y, radius2RD, -Math.PI/2, 0);
        this.ctx.stroke();
        break;

      case CELL_TYPES.TURN_LEFT_DOWN:
        const radius1LD = CELL_SIZE / 2 - RAIL_WIDTH;
        const radius2LD = CELL_SIZE / 2 + RAIL_WIDTH;
        const centerLD = { x: cellX + CELL_SIZE, y: cellY + CELL_SIZE };
        
        // Добавляем шпалы (рисуем их первыми)
        this.ctx.strokeStyle = "#CD853F"; // Более светлый коричневый цвет для шпал (Peru)
        const numTiesLD = Math.floor((Math.PI/2 * CELL_SIZE/2) / TIE_SPACING);
        const tieAngleSpacingLD = Math.PI/2 / numTiesLD;
        
        for (let i = 0; i < numTiesLD; i++) {
          const angle = Math.PI + i * tieAngleSpacingLD + tieAngleSpacingLD / 2;
          
          this.ctx.beginPath();
          this.ctx.moveTo(
            centerLD.x + (radius1LD - TIE_WIDTH/2) * Math.cos(angle), 
            centerLD.y + (radius1LD - TIE_WIDTH/2) * Math.sin(angle)
          );
          this.ctx.lineTo(
            centerLD.x + (radius2LD + TIE_WIDTH/2) * Math.cos(angle), 
            centerLD.y + (radius2LD + TIE_WIDTH/2) * Math.sin(angle)
          );
          this.ctx.stroke();
        }
        
        // Рельсы (дуги)
        this.ctx.strokeStyle = "#555"; // Серый цвет для рельсов
        // Внутренняя дуга
        this.ctx.beginPath();
        this.ctx.arc(centerLD.x, centerLD.y, radius1LD, Math.PI, Math.PI * 3/2);
        this.ctx.stroke();
        
        // Внешняя дуга
        this.ctx.beginPath();
        this.ctx.arc(centerLD.x, centerLD.y, radius2LD, Math.PI, Math.PI * 3/2);
        this.ctx.stroke();
        break;

      case CELL_TYPES.TURN_RIGHT_UP:
        const radius1RU = CELL_SIZE / 2 - RAIL_WIDTH;
        const radius2RU = CELL_SIZE / 2 + RAIL_WIDTH;
        const centerRU = { x: cellX + CELL_SIZE, y: cellY };
        
        // Добавляем шпалы (рисуем их первыми)
        this.ctx.strokeStyle = "#CD853F"; // Более светлый коричневый цвет для шпал (Peru)
        const numTiesRU = Math.floor((Math.PI/2 * CELL_SIZE/2) / TIE_SPACING);
        const tieAngleSpacingRU = Math.PI/2 / numTiesRU;
        
        for (let i = 0; i < numTiesRU; i++) {
          const angle = Math.PI/2 + i * tieAngleSpacingRU + tieAngleSpacingRU / 2;
          
          this.ctx.beginPath();
          this.ctx.moveTo(
            centerRU.x + (radius1RU - TIE_WIDTH/2) * Math.cos(angle), 
            centerRU.y + (radius1RU - TIE_WIDTH/2) * Math.sin(angle)
          );
          this.ctx.lineTo(
            centerRU.x + (radius2RU + TIE_WIDTH/2) * Math.cos(angle), 
            centerRU.y + (radius2RU + TIE_WIDTH/2) * Math.sin(angle)
          );
          this.ctx.stroke();
        }
        
        // Рельсы (дуги)
        this.ctx.strokeStyle = "#555"; // Серый цвет для рельсов
        // Внутренняя дуга
        this.ctx.beginPath();
        this.ctx.arc(centerRU.x, centerRU.y, radius1RU, Math.PI / 2, Math.PI);
        this.ctx.stroke();
        
        // Внешняя дуга
        this.ctx.beginPath();
        this.ctx.arc(centerRU.x, centerRU.y, radius2RU, Math.PI / 2, Math.PI);
        this.ctx.stroke();
        break;

      case CELL_TYPES.TURN_LEFT_UP:
        const radius1LU = CELL_SIZE / 2 - RAIL_WIDTH;
        const radius2LU = CELL_SIZE / 2 + RAIL_WIDTH;
        const centerLU = { x: cellX, y: cellY };
        
        // Добавляем шпалы (рисуем их первыми)
        this.ctx.strokeStyle = "#CD853F"; // Более светлый коричневый цвет для шпал (Peru)
        const numTiesLU = Math.floor((Math.PI/2 * CELL_SIZE/2) / TIE_SPACING);
        const tieAngleSpacingLU = Math.PI/2 / numTiesLU;
        
        for (let i = 0; i < numTiesLU; i++) {
          const angle = i * tieAngleSpacingLU + tieAngleSpacingLU / 2;
          
          this.ctx.beginPath();
          this.ctx.moveTo(
            centerLU.x + (radius1LU - TIE_WIDTH/2) * Math.cos(angle), 
            centerLU.y + (radius1LU - TIE_WIDTH/2) * Math.sin(angle)
          );
          this.ctx.lineTo(
            centerLU.x + (radius2LU + TIE_WIDTH/2) * Math.cos(angle), 
            centerLU.y + (radius2LU + TIE_WIDTH/2) * Math.sin(angle)
          );
          this.ctx.stroke();
        }
        
        // Рельсы (дуги)
        this.ctx.strokeStyle = "#555"; // Серый цвет для рельсов
        // Внутренняя дуга
        this.ctx.beginPath();
        this.ctx.arc(centerLU.x, centerLU.y, radius1LU, 0, Math.PI / 2);
        this.ctx.stroke();
        
        // Внешняя дуга
        this.ctx.beginPath();
        this.ctx.arc(centerLU.x, centerLU.y, radius2LU, 0, Math.PI / 2);
        this.ctx.stroke();
        break;

      case CELL_TYPES.EMPTY:
        // Пустая клетка - ничего не рисуем
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
    this.ctx.font = "32px Arial";
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
