// Вспомогательные функции для игры
if (typeof window === 'undefined') {
  const { CELL_SIZE, CELL_TYPES } = require('./constants');
  globalThis.CELL_SIZE = CELL_SIZE;
  globalThis.CELL_TYPES = CELL_TYPES;
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
  };

  // Направление обхода дуги (по часовой стрелке — true)
  const clockwise = isClockwise(cellType, direction);

  const { cx, cy } = centers[cellType];
  const dx = pixelX - cx;
  const dy = pixelY - cy;

  // Угол между объектом и центром окружности
  const theta = Math.atan2(dy, dx);

  // Правильное преобразование линейной скорости в угловую
  // Угловая скорость = Линейная скорость / Радиус
  const angularSpeed = 20 * speed / radius; // TODO: make it correct
  
  // Изменение угла за время deltaTime
  const deltaTheta = angularSpeed * deltaTime * (clockwise ? 1 : -1);

  const newTheta = theta + deltaTheta;

  const nextX = cx + radius * Math.cos(newTheta);
  const nextY = cy + radius * Math.sin(newTheta);
  const nextDirection = direction + deltaTheta;

  return { x: nextX, y: nextY, direction: nextDirection };
}

// Экспортируем функции для тестирования
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateTurnPosition,
  };
} 