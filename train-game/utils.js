// Вспомогательные функции для игры
if (typeof window === 'undefined') {
  const { CELL_SIZE, CELL_TYPES, DIRECTIONS } = require('./constants');
  globalThis.CELL_SIZE = CELL_SIZE;
  globalThis.CELL_TYPES = CELL_TYPES;
  globalThis.DIRECTIONS = DIRECTIONS;
}

// Draw function for switch cells with visual indication of state
function drawSwitchCell(ctx, x, y, cellType, isStraight) {
  const centerX = (x + 0.5) * CELL_SIZE;
  const centerY = (y + 0.5) * CELL_SIZE;
  
  // Draw base cell
  drawCell(ctx, x, y, cellType);
  
  // Add visual indicator for switch state
  ctx.beginPath();
  ctx.lineWidth = 2;
  
  // Different colors for different states
  if (isStraight) {
    ctx.strokeStyle = '#00AA00'; // Green for straight
  } else {
    ctx.strokeStyle = '#FF5500'; // Orange for turning
  }
  
  // Draw a small circle in the center to indicate it's a clickable switch
  ctx.arc(centerX, centerY, CELL_SIZE / 6, 0, Math.PI * 2);
  ctx.stroke();
  
  // Draw small line indicating the direction based on switch type and state
  ctx.beginPath();
  
  // Vertical switches ("|┌", "┐|", etc.)
  if (cellType.includes("|")) {
    if (isStraight) {
      // Straight line for vertical direction
      ctx.moveTo(centerX, centerY - CELL_SIZE / 8);
      ctx.lineTo(centerX, centerY + CELL_SIZE / 8);
    } else {
      // Draw diagonal line for turn direction based on switch type
      if (cellType === CELL_TYPES.SWITCH_RIGHT_DOWN_V || 
          cellType === CELL_TYPES.SWITCH_LEFT_UP_V) {
        ctx.moveTo(centerX - CELL_SIZE / 8, centerY - CELL_SIZE / 8);
        ctx.lineTo(centerX + CELL_SIZE / 8, centerY + CELL_SIZE / 8);
      } else {
        ctx.moveTo(centerX + CELL_SIZE / 8, centerY - CELL_SIZE / 8);
        ctx.lineTo(centerX - CELL_SIZE / 8, centerY + CELL_SIZE / 8);
      }
    }
  } 
  // Horizontal switches ("-┌", "┐-", etc.)
  else if (cellType.includes("-")) {
    if (isStraight) {
      // Straight line for horizontal direction
      ctx.moveTo(centerX - CELL_SIZE / 8, centerY);
      ctx.lineTo(centerX + CELL_SIZE / 8, centerY);
    } else {
      // Draw diagonal line for turn direction based on switch type
      if (cellType === CELL_TYPES.SWITCH_RIGHT_DOWN_H || 
          cellType === CELL_TYPES.SWITCH_LEFT_UP_H) {
        ctx.moveTo(centerX - CELL_SIZE / 8, centerY - CELL_SIZE / 8);
        ctx.lineTo(centerX + CELL_SIZE / 8, centerY + CELL_SIZE / 8);
      } else {
        ctx.moveTo(centerX + CELL_SIZE / 8, centerY - CELL_SIZE / 8);
        ctx.lineTo(centerX - CELL_SIZE / 8, centerY + CELL_SIZE / 8);
      }
    }
  }
  
  ctx.stroke();
}

function isClockwise(cellType, direction) {
  // Нормализуем угол от 0 до 2π
  const TWO_PI = Math.PI * 2;
  const normalized = ((direction % TWO_PI) + TWO_PI) % TWO_PI;

  if (cellType === CELL_TYPES.TURN_RIGHT_UP) {
    if (normalized > 0 && normalized <= Math.PI / 2) {
      return false;
    }
    if (normalized > Math.PI && normalized <= 3 * Math.PI / 2) {
      return true;
    }
  }
  if (cellType === CELL_TYPES.TURN_LEFT_UP) {
    if (normalized === 0 || (normalized > 3 * Math.PI / 2 && normalized <= 2 * Math.PI)) {
      return false;
    }
    if (normalized > Math.PI / 2 && normalized <= Math.PI) {
      return true;
    }
  }
  if (cellType === CELL_TYPES.TURN_RIGHT_DOWN) {
    if (normalized > Math.PI && normalized <= 3 * Math.PI / 2) {
      return false;
    }
    if (normalized >= 0 && normalized <= Math.PI / 2) {
      return true;
    }
  }
  if (cellType === CELL_TYPES.TURN_LEFT_DOWN) {
    if (normalized > Math.PI / 2 && normalized <= Math.PI) {
      return false;
    }
    if (normalized > 3 * Math.PI / 2 && normalized <= 2 * Math.PI) {
      return true;
    }
  }

  return true; // безопасное значение по умолчанию
}

// Вычисляет следующую позицию при повороте
function calculateTurnPosition(cellType, cellX, cellY, pixelX, pixelY, direction, speed, deltaTime) {
  const radius = CELL_SIZE / 2;
  const cellLeft = cellX * CELL_SIZE;
  const cellTop = cellY * CELL_SIZE;

  // Центры окружностей по типу поворота
  const centers = {
    [CELL_TYPES.TURN_RIGHT_UP]: { cx: cellLeft + CELL_SIZE, cy: cellTop },
    [CELL_TYPES.TURN_LEFT_UP]: { cx: cellLeft, cy: cellTop },
    [CELL_TYPES.TURN_RIGHT_DOWN]: { cx: cellLeft, cy: cellTop + CELL_SIZE },
    [CELL_TYPES.TURN_LEFT_DOWN]: { cx: cellLeft + CELL_SIZE, cy: cellTop + CELL_SIZE },
    // Add support for switches when turning
    [CELL_TYPES.SWITCH_RIGHT_UP_V]: { cx: cellLeft + CELL_SIZE, cy: cellTop },
    [CELL_TYPES.SWITCH_LEFT_UP_V]: { cx: cellLeft, cy: cellTop },
    [CELL_TYPES.SWITCH_RIGHT_DOWN_V]: { cx: cellLeft, cy: cellTop + CELL_SIZE },
    [CELL_TYPES.SWITCH_LEFT_DOWN_V]: { cx: cellLeft + CELL_SIZE, cy: cellTop + CELL_SIZE },
    [CELL_TYPES.SWITCH_RIGHT_UP_H]: { cx: cellLeft + CELL_SIZE, cy: cellTop },
    [CELL_TYPES.SWITCH_LEFT_UP_H]: { cx: cellLeft, cy: cellTop },
    [CELL_TYPES.SWITCH_RIGHT_DOWN_H]: { cx: cellLeft, cy: cellTop + CELL_SIZE },
    [CELL_TYPES.SWITCH_LEFT_DOWN_H]: { cx: cellLeft + CELL_SIZE, cy: cellTop + CELL_SIZE }
  };

  // Направление обхода дуги (по часовой стрелке — true)
  const clockwise = isClockwise(cellType, direction);

  const { cx, cy } = centers[cellType];
  const dx = pixelX - cx;
  const dy = pixelY - cy;

  // Угол между объектом и центром окружности
  const theta = Math.atan2(dy, dx);
  
  // Изменение угла за время deltaTime
  const deltaTheta = 2 * speed * deltaTime * (clockwise ? 1 : -1);

  const newTheta = theta + deltaTheta;

  const nextX = cx + radius * Math.cos(newTheta);
  const nextY = cy + radius * Math.sin(newTheta);
  const nextDirection = direction + deltaTheta;

  return { x: nextX, y: nextY, direction: nextDirection };
}

// Helper function to check if a cell is a switch
function isSwitchCell(cellType) {
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

// Helper function to determine switch behavior based on approach direction
function isApproachingFromBackSide(cellType, direction) {
  // For vertical switches ("|┌", "┐|", etc.)
  if (cellType.includes("|")) {
    // If approaching from vertical direction (up/down)
    const normalizedDirection = ((direction % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    return Math.abs(normalizedDirection - Math.PI/2) < 0.1 || 
           Math.abs(normalizedDirection - Math.PI*1.5) < 0.1;
  } 
  // For horizontal switches ("-┌", "┐-", etc.)
  else if (cellType.includes("-")) {
    // If approaching from horizontal direction (left/right)
    const normalizedDirection = ((direction % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    return Math.abs(normalizedDirection) < 0.1 || 
           Math.abs(normalizedDirection - Math.PI) < 0.1;
  }
  
  return false;
}

// Helper method to determine switch behavior based on approach direction
function getSwitchBehavior(switchType, direction, isStraight) {
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

// Вычисляет следующую позицию при движении по прямой клетке
function calculateStraightPosition(cellType, pixelX, pixelY, direction, speed, deltaTime, cellSize) {
  let nextPixelX = pixelX;
  let nextPixelY = pixelY;
  let nextDirection = direction;

  // Нормализуем угол от 0 до 2π
  const normalizedCurrentAngle = (direction + 2 * Math.PI) % (2 * Math.PI);
        
  if (cellType === CELL_TYPES.RAIL_H || 
      (cellType.includes("-") && isSwitchCell(cellType))) {
    // Если на горизонтальных рельсах, "прилипаем" к горизонтальному движению
    nextDirection = Math.cos(normalizedCurrentAngle) > 0 ? DIRECTIONS.right : DIRECTIONS.left;
  } else if (cellType === CELL_TYPES.RAIL_V || 
            (cellType.includes("|") && isSwitchCell(cellType))) {
    // Если на вертикальных рельсах, "прилипаем" к вертикальному движению
    nextDirection = Math.sin(normalizedCurrentAngle) > 0 ? DIRECTIONS.down : DIRECTIONS.up;
  }

  // Обновляем позицию в зависимости от угла направления
  nextPixelX += Math.cos(nextDirection) * speed * cellSize * deltaTime;
  nextPixelY += Math.sin(nextDirection) * speed * cellSize * deltaTime;

  return { 
    x: nextPixelX, 
    y: nextPixelY, 
    direction: nextDirection 
  };
}

// Вычисляет следующую позицию поезда в зависимости от текущей клетки
function calculateNextPosition(cellType, turnCell, cellX, cellY, pixelX, pixelY, direction, speed, deltaTime, cellSize, switchStates) {
  // Check if cell is a switch
  if (isSwitchCell(cellType)) {
    const key = `${cellX},${cellY}`;
    
    // Handle approach from "back side" of switch
    if (isApproachingFromBackSide(cellType, direction)) {
      // Always use straight movement when approaching from the back side
      return calculateStraightPosition(
        cellType,
        pixelX,
        pixelY,
        direction,
        speed,
        deltaTime,
        cellSize
      );
    }
    
    // For normal approach, use the switch state to determine movement
    const switchState = switchStates ? switchStates[key] : null;
    
    if (switchState && !switchState.isStraight) {
      // Use turn movement if switch is set to turning
      return calculateTurnPosition(
        cellType,
        cellX,
        cellY,
        pixelX,
        pixelY,
        direction,
        speed,
        deltaTime
      );
    } else {
      // Use straight movement if switch is set to straight
      return calculateStraightPosition(
        cellType,
        pixelX,
        pixelY,
        direction,
        speed,
        deltaTime,
        cellSize
      );
    }
  }
  
  // Original logic for non-switch cells
  if (turnCell) {
    // Перемещение на повороте
    return calculateTurnPosition(
      cellType,
      cellX,
      cellY,
      pixelX,
      pixelY,
      direction,
      speed,
      deltaTime
    );
  } else {
    // Перемещение по прямой
    return calculateStraightPosition(
      cellType,
      pixelX,
      pixelY,
      direction,
      speed,
      deltaTime,
      cellSize
    );
  }
}

// Экспортируем функции для тестирования
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateTurnPosition,
    calculateStraightPosition,
    calculateNextPosition,
    drawSwitchCell,
    isSwitchCell,
    isApproachingFromBackSide,
    getSwitchBehavior
  };
} 