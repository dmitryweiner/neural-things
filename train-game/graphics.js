// Графические функции для игры
if (typeof window === 'undefined') {
  const { CELL_SIZE, CELL_TYPES, RAIL_WIDTH, TIE_WIDTH, TIE_SPACING } = require('./constants');
  globalThis.CELL_SIZE = CELL_SIZE;
  globalThis.CELL_TYPES = CELL_TYPES;
  globalThis.RAIL_WIDTH = RAIL_WIDTH;
  globalThis.TIE_WIDTH = TIE_WIDTH;
  globalThis.TIE_SPACING = TIE_SPACING;
}

// Helper function to check if a cell is a semaphore
function isSemaphoreCell(cellType) {
  return [
    CELL_TYPES.RAIL_H_SEMAPHORE,
    CELL_TYPES.RAIL_V_SEMAPHORE,
    CELL_TYPES.TURN_RIGHT_DOWN_SEMAPHORE,
    CELL_TYPES.TURN_LEFT_DOWN_SEMAPHORE,
    CELL_TYPES.TURN_LEFT_UP_SEMAPHORE,
    CELL_TYPES.TURN_RIGHT_UP_SEMAPHORE
  ].includes(cellType);
}

// Helper function to get the base cell type for a semaphore cell
function getBaseCellType(cellType) {
  switch (cellType) {
    case CELL_TYPES.RAIL_H_SEMAPHORE:
      return CELL_TYPES.RAIL_H;
    case CELL_TYPES.RAIL_V_SEMAPHORE:
      return CELL_TYPES.RAIL_V;
    case CELL_TYPES.TURN_RIGHT_DOWN_SEMAPHORE:
      return CELL_TYPES.TURN_RIGHT_DOWN;
    case CELL_TYPES.TURN_LEFT_DOWN_SEMAPHORE:
      return CELL_TYPES.TURN_LEFT_DOWN;
    case CELL_TYPES.TURN_LEFT_UP_SEMAPHORE:
      return CELL_TYPES.TURN_LEFT_UP;
    case CELL_TYPES.TURN_RIGHT_UP_SEMAPHORE:
      return CELL_TYPES.TURN_RIGHT_UP;
    default:
      return cellType;
  }
}

// Функция для генерации псевдослучайного числа на основе seed
function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Генерация единого фонового изображения для всей игры
function generateBackground(canvas) {
  // Создаем отдельный canvas для фона
  let backgroundCanvas;
  if (typeof document !== 'undefined') {
    // Браузерное окружение
    backgroundCanvas = document.createElement('canvas');
  } else {
    // Node.js окружение (для тестов)
    const { createCanvas } = require('canvas');
    backgroundCanvas = createCanvas(canvas.width, canvas.height);
  }
  
  backgroundCanvas.width = canvas.width;
  backgroundCanvas.height = canvas.height;
  const bgCtx = backgroundCanvas.getContext('2d');
  
  // Заполняем базовым зеленым цветом
  bgCtx.fillStyle = "#a5ed32"; // LightGreen - базовый цвет травы
  bgCtx.fillRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);
  
  // Количество зеленых пятен (примерно 8 на клетку)
  const totalPatches = Math.floor(GRID_WIDTH * GRID_HEIGHT * 8);
  
  for (let i = 0; i < totalPatches; i++) {
    // Используем i как часть seed для случайности
    const patchSeed = i * 100;
    
    // Размер пятна (от 3 до 8 пикселей)
    const size = 3 + seededRandom(patchSeed) * 5;
    
    // Положение пятна на всем поле
    const patchX = seededRandom(patchSeed + 1) * backgroundCanvas.width;
    const patchY = seededRandom(patchSeed + 2) * backgroundCanvas.height;
    
    // Цвет пятна (оттенок зеленого)
    const greenValue = 220 + Math.floor(seededRandom(patchSeed + 3) * 40);
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
  
  return backgroundCanvas;
}

function drawCell(ctx, x, y, cellType) {
  const cellX = x * CELL_SIZE;
  const cellY = y * CELL_SIZE;
  const centerX = cellX + CELL_SIZE / 2;
  const centerY = cellY + CELL_SIZE / 2;

  // Настройки линий для рельсов
  ctx.strokeStyle = "#555"; // Серый цвет для рельсов
  ctx.lineWidth = 2;

  // Отрисовка в зависимости от типа клетки
  switch (cellType) {
    case CELL_TYPES.RAIL_H:
      // Добавляем шпалы (рисуем их первыми)
      ctx.strokeStyle = "#CD853F"; // Более светлый коричневый цвет для шпал (Peru)
      const numTiesH = Math.floor(CELL_SIZE / TIE_SPACING);
      const tieSpacingH = CELL_SIZE / numTiesH;
      
      for (let i = 0; i < numTiesH; i++) {
        const tieX = cellX + i * tieSpacingH + tieSpacingH / 2;
        
        ctx.beginPath();
        ctx.moveTo(tieX, centerY - RAIL_WIDTH - TIE_WIDTH/2);
        ctx.lineTo(tieX, centerY + RAIL_WIDTH + TIE_WIDTH/2);
        ctx.stroke();
      }
      
      // Горизонтальные рельсы (две параллельные линии)
      ctx.strokeStyle = "#555"; // Серый цвет для рельсов
      ctx.beginPath();
      ctx.moveTo(cellX, centerY - RAIL_WIDTH);
      ctx.lineTo(cellX + CELL_SIZE, centerY - RAIL_WIDTH);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cellX, centerY + RAIL_WIDTH);
      ctx.lineTo(cellX + CELL_SIZE, centerY + RAIL_WIDTH);
      ctx.stroke();
      break;

    case CELL_TYPES.RAIL_V:
      // Добавляем шпалы (рисуем их первыми)
      ctx.strokeStyle = "#CD853F"; // Более светлый коричневый цвет для шпал (Peru)
      const numTiesV = Math.floor(CELL_SIZE / TIE_SPACING);
      const tieSpacingV = CELL_SIZE / numTiesV;
      
      for (let i = 0; i < numTiesV; i++) {
        const tieY = cellY + i * tieSpacingV + tieSpacingV / 2;
        
        ctx.beginPath();
        ctx.moveTo(centerX - RAIL_WIDTH - TIE_WIDTH/2, tieY);
        ctx.lineTo(centerX + RAIL_WIDTH + TIE_WIDTH/2, tieY);
        ctx.stroke();
      }
      
      // Вертикальные рельсы (две параллельные линии)
      ctx.strokeStyle = "#555"; // Серый цвет для рельсов
      ctx.beginPath();
      ctx.moveTo(centerX - RAIL_WIDTH, cellY);
      ctx.lineTo(centerX - RAIL_WIDTH, cellY + CELL_SIZE);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(centerX + RAIL_WIDTH, cellY);
      ctx.lineTo(centerX + RAIL_WIDTH, cellY + CELL_SIZE);
      ctx.stroke();
      break;

    case CELL_TYPES.TURN_RIGHT_DOWN:
      const radius1RD = CELL_SIZE / 2 - RAIL_WIDTH;
      const radius2RD = CELL_SIZE / 2 + RAIL_WIDTH;
      const centerRD = { x: cellX, y: cellY + CELL_SIZE };
      
      // Добавляем шпалы (рисуем их первыми)
      ctx.strokeStyle = "#CD853F"; // Более светлый коричневый цвет для шпал (Peru)
      const numTiesRD = Math.floor((Math.PI/2 * CELL_SIZE/2) / TIE_SPACING);
      const tieAngleSpacingRD = Math.PI/2 / numTiesRD;
      
      for (let i = 0; i < numTiesRD; i++) {
        const angle = -Math.PI/2 + i * tieAngleSpacingRD + tieAngleSpacingRD / 2;
        
        ctx.beginPath();
        ctx.moveTo(
          centerRD.x + (radius1RD - TIE_WIDTH/2) * Math.cos(angle), 
          centerRD.y + (radius1RD - TIE_WIDTH/2) * Math.sin(angle)
        );
        ctx.lineTo(
          centerRD.x + (radius2RD + TIE_WIDTH/2) * Math.cos(angle), 
          centerRD.y + (radius2RD + TIE_WIDTH/2) * Math.sin(angle)
        );
        ctx.stroke();
      }
      
      // Рельсы (дуги)
      ctx.strokeStyle = "#555"; // Серый цвет для рельсов
      // Внутренняя дуга
      ctx.beginPath();
      ctx.arc(centerRD.x, centerRD.y, radius1RD, -Math.PI/2, 0);
      ctx.stroke();
      
      // Внешняя дуга
      ctx.beginPath();
      ctx.arc(centerRD.x, centerRD.y, radius2RD, -Math.PI/2, 0);
      ctx.stroke();
      break;

    case CELL_TYPES.TURN_LEFT_DOWN:
      const radius1LD = CELL_SIZE / 2 - RAIL_WIDTH;
      const radius2LD = CELL_SIZE / 2 + RAIL_WIDTH;
      const centerLD = { x: cellX + CELL_SIZE, y: cellY + CELL_SIZE };
      
      // Добавляем шпалы (рисуем их первыми)
      ctx.strokeStyle = "#CD853F"; // Более светлый коричневый цвет для шпал (Peru)
      const numTiesLD = Math.floor((Math.PI/2 * CELL_SIZE/2) / TIE_SPACING);
      const tieAngleSpacingLD = Math.PI/2 / numTiesLD;
      
      for (let i = 0; i < numTiesLD; i++) {
        const angle = Math.PI + i * tieAngleSpacingLD + tieAngleSpacingLD / 2;
        
        ctx.beginPath();
        ctx.moveTo(
          centerLD.x + (radius1LD - TIE_WIDTH/2) * Math.cos(angle), 
          centerLD.y + (radius1LD - TIE_WIDTH/2) * Math.sin(angle)
        );
        ctx.lineTo(
          centerLD.x + (radius2LD + TIE_WIDTH/2) * Math.cos(angle), 
          centerLD.y + (radius2LD + TIE_WIDTH/2) * Math.sin(angle)
        );
        ctx.stroke();
      }
      
      // Рельсы (дуги)
      ctx.strokeStyle = "#555"; // Серый цвет для рельсов
      // Внутренняя дуга
      ctx.beginPath();
      ctx.arc(centerLD.x, centerLD.y, radius1LD, Math.PI, Math.PI * 3/2);
      ctx.stroke();
      
      // Внешняя дуга
      ctx.beginPath();
      ctx.arc(centerLD.x, centerLD.y, radius2LD, Math.PI, Math.PI * 3/2);
      ctx.stroke();
      break;

    case CELL_TYPES.TURN_RIGHT_UP:
      const radius1RU = CELL_SIZE / 2 - RAIL_WIDTH;
      const radius2RU = CELL_SIZE / 2 + RAIL_WIDTH;
      const centerRU = { x: cellX + CELL_SIZE, y: cellY };
      
      // Добавляем шпалы (рисуем их первыми)
      ctx.strokeStyle = "#CD853F"; // Более светлый коричневый цвет для шпал (Peru)
      const numTiesRU = Math.floor((Math.PI/2 * CELL_SIZE/2) / TIE_SPACING);
      const tieAngleSpacingRU = Math.PI/2 / numTiesRU;
      
      for (let i = 0; i < numTiesRU; i++) {
        const angle = Math.PI/2 + i * tieAngleSpacingRU + tieAngleSpacingRU / 2;
        
        ctx.beginPath();
        ctx.moveTo(
          centerRU.x + (radius1RU - TIE_WIDTH/2) * Math.cos(angle), 
          centerRU.y + (radius1RU - TIE_WIDTH/2) * Math.sin(angle)
        );
        ctx.lineTo(
          centerRU.x + (radius2RU + TIE_WIDTH/2) * Math.cos(angle), 
          centerRU.y + (radius2RU + TIE_WIDTH/2) * Math.sin(angle)
        );
        ctx.stroke();
      }
      
      // Рельсы (дуги)
      ctx.strokeStyle = "#555"; // Серый цвет для рельсов
      // Внутренняя дуга
      ctx.beginPath();
      ctx.arc(centerRU.x, centerRU.y, radius1RU, Math.PI / 2, Math.PI);
      ctx.stroke();
      
      // Внешняя дуга
      ctx.beginPath();
      ctx.arc(centerRU.x, centerRU.y, radius2RU, Math.PI / 2, Math.PI);
      ctx.stroke();
      break;

    case CELL_TYPES.TURN_LEFT_UP:
      const radius1LU = CELL_SIZE / 2 - RAIL_WIDTH;
      const radius2LU = CELL_SIZE / 2 + RAIL_WIDTH;
      const centerLU = { x: cellX, y: cellY };
      
      // Добавляем шпалы (рисуем их первыми)
      ctx.strokeStyle = "#CD853F"; // Более светлый коричневый цвет для шпал (Peru)
      const numTiesLU = Math.floor((Math.PI/2 * CELL_SIZE/2) / TIE_SPACING);
      const tieAngleSpacingLU = Math.PI/2 / numTiesLU;
      
      for (let i = 0; i < numTiesLU; i++) {
        const angle = i * tieAngleSpacingLU + tieAngleSpacingLU / 2;
        
        ctx.beginPath();
        ctx.moveTo(
          centerLU.x + (radius1LU - TIE_WIDTH/2) * Math.cos(angle), 
          centerLU.y + (radius1LU - TIE_WIDTH/2) * Math.sin(angle)
        );
        ctx.lineTo(
          centerLU.x + (radius2LU + TIE_WIDTH/2) * Math.cos(angle), 
          centerLU.y + (radius2LU + TIE_WIDTH/2) * Math.sin(angle)
        );
        ctx.stroke();
      }
      
      // Рельсы (дуги)
      ctx.strokeStyle = "#555"; // Серый цвет для рельсов
      // Внутренняя дуга
      ctx.beginPath();
      ctx.arc(centerLU.x, centerLU.y, radius1LU, 0, Math.PI / 2);
      ctx.stroke();
      
      // Внешняя дуга
      ctx.beginPath();
      ctx.arc(centerLU.x, centerLU.y, radius2LU, 0, Math.PI / 2);
      ctx.stroke();
      break;

    case CELL_TYPES.EMPTY:
      // Пустая клетка - ничего не рисуем
      break;

    default:
      // Для других типов клеток оставляем текстовую отрисовку
      ctx.fillStyle = "#000";
      ctx.font = "20px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(cellType, centerX, centerY);
      break;
  }
}

function drawTrain(ctx, train) {
  ctx.save();
  ctx.translate(train.pixelX, train.pixelY);
  ctx.rotate(train.direction);
  ctx.fillStyle = "#f00";
  ctx.font = "30px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🚃", 0, 0);
  ctx.restore();
}

// New function to draw different train parts
function drawTrainPart(ctx, part) {
  ctx.save();
  ctx.translate(part.pixelX, part.pixelY);
  ctx.rotate(part.direction);
  ctx.font = "30px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  
  // Draw different emoji based on part type
  if (part.type === 'locomotive') {
    ctx.fillText("🚃", 0, 0); // Locomotive
  } else if (part.type === 'wagon') {
    ctx.fillText("🚋", 0, 0); // Wagon
  }
  
  ctx.restore();
}

// Draw function for switch cells with visual indication of state
function drawSwitchCell(ctx, x, y, cellType, isStraight) {
  const centerX = (x + 0.5) * CELL_SIZE;
  const centerY = (y + 0.5) * CELL_SIZE;

  // Helper function to temporarily set dashed line style
  function withDashedStyle(callback) {
    ctx.save();
    ctx.setLineDash([3, 3]); // Small dashes
    callback();
    ctx.restore();
  }

  // Determine which paths to draw based on switch type
  let straightPath, curvedPath;
  
  switch (cellType) {
    case CELL_TYPES.SWITCH_RIGHT_DOWN_V: // "┐|"
      straightPath = CELL_TYPES.RAIL_V;
      curvedPath = CELL_TYPES.TURN_RIGHT_DOWN;
      break;
    case CELL_TYPES.SWITCH_LEFT_DOWN_V: // "|┌"
      straightPath = CELL_TYPES.RAIL_V;
      curvedPath = CELL_TYPES.TURN_LEFT_DOWN;
      break;
    case CELL_TYPES.SWITCH_LEFT_UP_V: // "┘|"
      straightPath = CELL_TYPES.RAIL_V;
      curvedPath = CELL_TYPES.TURN_LEFT_UP;
      break;
    case CELL_TYPES.SWITCH_RIGHT_UP_V: // "|└"
      straightPath = CELL_TYPES.RAIL_V;
      curvedPath = CELL_TYPES.TURN_RIGHT_UP;
      break;
    case CELL_TYPES.SWITCH_RIGHT_DOWN_H: // "┐-"
      straightPath = CELL_TYPES.RAIL_H;
      curvedPath = CELL_TYPES.TURN_RIGHT_DOWN;
      break;
    case CELL_TYPES.SWITCH_LEFT_DOWN_H: // "-┌"
      straightPath = CELL_TYPES.RAIL_H;
      curvedPath = CELL_TYPES.TURN_LEFT_DOWN;
      break;
    case CELL_TYPES.SWITCH_LEFT_UP_H: // "┘-"
      straightPath = CELL_TYPES.RAIL_H;
      curvedPath = CELL_TYPES.TURN_LEFT_UP;
      break;
    case CELL_TYPES.SWITCH_RIGHT_UP_H: // "-└"
      straightPath = CELL_TYPES.RAIL_H;
      curvedPath = CELL_TYPES.TURN_RIGHT_UP;
      break;
    default:
      // Fallback to original cell drawing
      drawCell(ctx, x, y, cellType);
      return;
  }

  // Draw the paths based on switch state
  if (isStraight) {
    // Straight path is active (solid), curved path is inactive (dashed)
    drawCell(ctx, x, y, straightPath);
    withDashedStyle(() => drawCell(ctx, x, y, curvedPath));
  } else {
    // Curved path is active (solid), straight path is inactive (dashed)
    drawCell(ctx, x, y, curvedPath);
    withDashedStyle(() => drawCell(ctx, x, y, straightPath));
  }
}

// Draw function for semaphore cells with visual indication of state
function drawSemaphoreCell(ctx, x, y, cellType, isOpen) {
  // First draw the base rail/turn
  const baseCellType = getBaseCellType(cellType);
  drawCell(ctx, x, y, baseCellType);
  
  // Then draw the semaphore indicator
  const centerX = (x + 0.5) * CELL_SIZE;
  const centerY = (y + 0.5) * CELL_SIZE;
  
  const radius = CELL_SIZE * 0.1;
  const semaphoreX = centerX + 10;
  const topCircleY = centerY - 10 - radius;    // Upper circle position
  const bottomCircleY = centerY - 10 + radius; // Lower circle position
  
  if (isOpen) {
    // Semaphore is open: top circle is black, bottom circle is green with black border
    
    // Draw top black circle
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.arc(semaphoreX, topCircleY, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw bottom green circle with black border
    ctx.fillStyle = "#00ff00";
    ctx.beginPath();
    ctx.arc(semaphoreX, bottomCircleY, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Add black border to green circle
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;
    ctx.stroke();
    
  } else {
    // Semaphore is closed: top circle is red with black border, bottom circle is black
    
    // Draw top red circle with black border
    ctx.fillStyle = "#ff0000";
    ctx.beginPath();
    ctx.arc(semaphoreX, topCircleY, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Add black border to red circle
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Draw bottom black circle
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.arc(semaphoreX, bottomCircleY, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Draw function for station cells with house icon underneath
function drawStationCell(ctx, x, y, cellType) {
  const cellX = x * CELL_SIZE;
  const cellY = y * CELL_SIZE;
  const centerX = cellX + CELL_SIZE / 2;
  const centerY = cellY + CELL_SIZE / 2;
  
  // Draw house icon first (underneath the rails)
  ctx.font = `${CELL_SIZE * 0.8}px Arial`; // Size is about half the cell
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#000"; // Black color for the house icon
  ctx.fillText("🏠", centerX, centerY);
  
  // Draw the normal cell content on top
  drawCell(ctx, x, y, cellType);
}

// Экспортируем функции для тестирования
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    seededRandom,
    generateBackground,
    drawCell,
    drawTrain,
    drawTrainPart,
    drawSwitchCell,
    drawSemaphoreCell,
    drawStationCell,
  };
} 