// Импортируем необходимые константы и функции
const { calculateTurnPosition, calculateStraightPosition } = require('./utils');
const { CELL_SIZE, CELL_TYPES, DIRECTIONS } = require('./constants');

// Мокаем глобальные константы, которые используются в функции
global.CELL_SIZE = CELL_SIZE;
global.CELL_TYPES = CELL_TYPES;
global.DIRECTIONS = DIRECTIONS;

// Простой хелпер, чтобы сравнить числа с допустимой погрешностью
function closeTo(a, b, epsilon = 0.4) {
  return Math.abs(a - b) < epsilon;
}

describe('calculateTurnPosition', () => {
  test('TURN_RIGHT_UP: движение по четверти круга из точки (CELL_SIZE, CELL_SIZE / 2)', () => {
    const radius = CELL_SIZE / 2;
    const speed = 2;
    const deltaTime = 0.008; 

    const result = calculateTurnPosition(
      CELL_TYPES.TURN_RIGHT_UP,
      0, 0,                        // cellX, cellY
      CELL_SIZE, radius,          // pixelX, pixelY (начальная точка на правой стороне окружности)
      Math.PI,                    // угол — смотрим влево
      speed,
      deltaTime
    );

    console.log(result);

    expect(closeTo(result.x, CELL_SIZE)).toBe(true);
    expect(result.x).toBeLessThan(CELL_SIZE);
    expect(closeTo(result.y, radius)).toBe(true);
    expect(result.y).toBeLessThan(radius);
    expect(closeTo(result.direction, Math.PI)).toBe(true);
  });

  test('TURN_LEFT_UP: движение по дуге против часовой стрелки', () => {
    const radius = CELL_SIZE / 2;
    const speed = 2;
    const deltaTime = 0.008; 

    const result = calculateTurnPosition(
      CELL_TYPES.TURN_LEFT_UP,
      0, 0,
      0, radius,
      0, // начальный угол (смотрим вправо)
      speed,
      deltaTime
    );

    const expectedTheta = 0 + (deltaTime * speed) / radius;


    expect(closeTo(result.x, 0)).toBe(true);
    expect(result.x).toBeGreaterThan(0);
    expect(closeTo(result.y, radius)).toBe(true);
    expect(result.y).toBeLessThan(radius);
    expect(closeTo(result.direction, 0)).toBe(true);
  });

  test('TURN_RIGHT_DOWN: движение по четверти круга снизу вверх', () => {
    const radius = CELL_SIZE / 2;
    const speed = 2;
    const deltaTime = 0.008;
    
    const result = calculateTurnPosition(
      CELL_TYPES.TURN_RIGHT_DOWN,
      0, 0,                        // cellX, cellY
      radius, CELL_SIZE,          // pixelX, pixelY (начальная точка внизу окружности)
      -Math.PI/2,                 // угол — смотрим вверх
      speed,
      deltaTime
    );
    
    expect(closeTo(result.x, radius)).toBe(true);
    expect(result.x).toBeLessThan(radius);
    expect(closeTo(result.y, CELL_SIZE)).toBe(true);
    expect(result.y).toBeLessThan(CELL_SIZE);
    expect(closeTo(result.direction, -Math.PI/2)).toBe(true);
    expect(result.direction).toBeLessThan(-Math.PI/2);
  });
  
  test('TURN_RIGHT_DOWN: движение по четверти круга слева направо', () => {
    const radius = CELL_SIZE / 2;
    const speed = 2;
    const deltaTime = 0.008;
    
    const result = calculateTurnPosition(
      CELL_TYPES.TURN_RIGHT_DOWN,
      0, 0,                        // cellX, cellY
      0, CELL_SIZE - radius,      // pixelX, pixelY (начальная точка слева от центра окружности)
      0,                          // угол — смотрим вправо
      speed,
      deltaTime
    );
    
    expect(closeTo(result.x, 0)).toBe(true);
    expect(result.x).toBeGreaterThan(0);
    expect(closeTo(result.y, CELL_SIZE - radius)).toBe(true);
    expect(result.y).toBeGreaterThan(CELL_SIZE - radius);
    expect(closeTo(result.direction, 0)).toBe(true);
  });
  
  test('TURN_LEFT_DOWN: движение по четверти круга справа налево', () => {
    const radius = CELL_SIZE / 2;
    const speed = 2;
    const deltaTime = 0.008;
    
    const result = calculateTurnPosition(
      CELL_TYPES.TURN_LEFT_DOWN,
      0, 0,                        // cellX, cellY
      CELL_SIZE, CELL_SIZE - radius, // pixelX, pixelY (начальная точка справа от центра окружности)
      Math.PI,                    // угол — смотрим влево
      speed,
      deltaTime
    );
    
    expect(closeTo(result.x, CELL_SIZE)).toBe(true);
    expect(result.x).toBeLessThan(CELL_SIZE);
    expect(closeTo(result.y, CELL_SIZE - radius)).toBe(true);
    expect(result.y).toBeGreaterThan(CELL_SIZE - radius);
    expect(closeTo(result.direction, Math.PI)).toBe(true);
  });
  
  test('TURN_LEFT_DOWN: движение по четверти круга снизу вверх', () => {
    const radius = CELL_SIZE / 2;
    const speed = 2;
    const deltaTime = 0.008;
    
    const result = calculateTurnPosition(
      CELL_TYPES.TURN_LEFT_DOWN,
      0, 0,                        // cellX, cellY
      CELL_SIZE - radius, CELL_SIZE, // pixelX, pixelY (начальная точка внизу окружности)
      -Math.PI/2,                 // угол — смотрим вверх
      speed,
      deltaTime
    );
    
    expect(closeTo(result.x, CELL_SIZE - radius)).toBe(true);
    expect(result.x).toBeGreaterThan(CELL_SIZE - radius);
    expect(closeTo(result.y, CELL_SIZE)).toBe(true);
    expect(result.y).toBeLessThan(CELL_SIZE);
    expect(closeTo(result.direction, -Math.PI/2)).toBe(true);
  });

  // Дополнительные тесты для проверки граничных значений
  test('TURN_RIGHT_UP: движение по четверти круга снизу вверх', () => {
    const radius = CELL_SIZE / 2;
    const speed = 2;
    const deltaTime = 0.008;
    
    const result = calculateTurnPosition(
      CELL_TYPES.TURN_RIGHT_UP,
      0, 0,                        // cellX, cellY
      CELL_SIZE - radius, 0,      // pixelX, pixelY (начальная точка внизу окружности)
      Math.PI/2,                  // угол — смотрим вниз
      speed,
      deltaTime
    );
    
    expect(closeTo(result.x, CELL_SIZE - radius)).toBe(true);
    expect(result.x).toBeGreaterThan(CELL_SIZE - radius);
    expect(closeTo(result.y, 0)).toBe(true);
    expect(result.y).toBeGreaterThan(0);
    expect(closeTo(result.direction, Math.PI/2)).toBe(true);
  });
  
  test('TURN_LEFT_UP: движение по четверти круга справа налево', () => {
    const radius = CELL_SIZE / 2;
    const speed = 2;
    const deltaTime = 0.008;
    
    const result = calculateTurnPosition(
      CELL_TYPES.TURN_LEFT_UP,
      0, 0,                        // cellX, cellY
      radius, 0,                  // pixelX, pixelY (начальная точка справа окружности)
      Math.PI/2,                  // угол — смотрим вниз
      speed,
      deltaTime
    );
    
    expect(closeTo(result.x, radius)).toBe(true);
    expect(result.x).toBeLessThan(radius);
    expect(closeTo(result.y, 0)).toBe(true);
    expect(result.y).toBeGreaterThan(0);
    expect(closeTo(result.direction, Math.PI/2)).toBe(true);
  });
});

describe('calculateStraightPosition', () => {
  // Тестовые параметры
  const pixelX = 100;
  const pixelY = 100;
  const speed = 2;
  const deltaTime = 0.1;
  
  describe('Горизонтальные рельсы (RAIL_H)', () => {
    const cellType = CELL_TYPES.RAIL_H;
    
    test('Движение справа налево (направление - left)', () => {
      const direction = DIRECTIONS.left;
      const result = calculateStraightPosition(
        cellType, pixelX, pixelY, direction, speed, deltaTime, CELL_SIZE
      );
      
      // Проверяем, что направление осталось DIRECTIONS.left
      expect(result.direction).toBe(DIRECTIONS.left);
      
      // Проверяем, что x уменьшилось (движение влево)
      expect(result.x).toBeLessThan(pixelX);
      
      // Проверяем, что y не изменилось
      expect(result.y).toBe(pixelY);
      
      // Проверяем точные значения
      const expectedX = pixelX + Math.cos(DIRECTIONS.left) * speed * CELL_SIZE * deltaTime;
      expect(result.x).toBeCloseTo(expectedX);
    });
    
    test('Движение слева направо (направление - right)', () => {
      const direction = DIRECTIONS.right;
      const result = calculateStraightPosition(
        cellType, pixelX, pixelY, direction, speed, deltaTime, CELL_SIZE
      );
      
      expect(result.direction).toBe(DIRECTIONS.right);
      expect(result.x).toBeGreaterThan(pixelX);
      expect(result.y).toBe(pixelY);
      
      const expectedX = pixelX + Math.cos(DIRECTIONS.right) * speed * CELL_SIZE * deltaTime;
      expect(result.x).toBeCloseTo(expectedX);
    });
    
    test('Коррекция направления при подходе под углом (снизу)', () => {
      // Подход под углом снизу (слегка справа)
      const direction = Math.PI / 4; // 45 градусов, между right и down
      const result = calculateStraightPosition(
        cellType, pixelX, pixelY, direction, speed, deltaTime, CELL_SIZE
      );
      
      // Должно скорректировать направление на right
      expect(result.direction).toBe(DIRECTIONS.right);
      
      // X должен увеличиться
      expect(result.x).toBeGreaterThan(pixelX);
      
      // Y не должен измениться
      expect(result.y).toBe(pixelY);
    });
    
    test('Коррекция направления при подходе под углом (сверху)', () => {
      // Подход под углом сверху (слегка слева)
      const direction = 5 * Math.PI / 4; // 225 градусов, между left и up
      const result = calculateStraightPosition(
        cellType, pixelX, pixelY, direction, speed, deltaTime, CELL_SIZE
      );
      
      // Должно скорректировать направление на left
      expect(result.direction).toBe(DIRECTIONS.left);
      
      // X должен уменьшиться
      expect(result.x).toBeLessThan(pixelX);
      
      // Y не должен измениться
      expect(result.y).toBe(pixelY);
    });
  });
  
  describe('Вертикальные рельсы (RAIL_V)', () => {
    const cellType = CELL_TYPES.RAIL_V;
    
    test('Движение сверху вниз (направление - down)', () => {
      const direction = DIRECTIONS.down;
      const result = calculateStraightPosition(
        cellType, pixelX, pixelY, direction, speed, deltaTime, CELL_SIZE
      );
      
      expect(result.direction).toBe(DIRECTIONS.down);
      expect(result.y).toBeGreaterThan(pixelY);
      expect(result.x).toBe(pixelX);
      
      const expectedY = pixelY + Math.sin(DIRECTIONS.down) * speed * CELL_SIZE * deltaTime;
      expect(result.y).toBeCloseTo(expectedY);
    });
    
    test('Движение снизу вверх (направление - up)', () => {
      const direction = DIRECTIONS.up;
      const result = calculateStraightPosition(
        cellType, pixelX, pixelY, direction, speed, deltaTime, CELL_SIZE
      );
      
      expect(result.direction).toBe(DIRECTIONS.up);
      expect(result.y).toBeLessThan(pixelY);
      expect(result.x).toBe(pixelX);
      
      const expectedY = pixelY + Math.sin(DIRECTIONS.up) * speed * CELL_SIZE * deltaTime;
      expect(result.y).toBeCloseTo(expectedY);
    });
    
    test('Коррекция направления при подходе под углом (справа)', () => {
      // Подход под углом справа (слегка снизу)
      const direction = 7 * Math.PI / 4; // 315 градусов, между right и up
      const result = calculateStraightPosition(
        cellType, pixelX, pixelY, direction, speed, deltaTime, CELL_SIZE
      );
      
      // Должно скорректировать направление на up
      expect(result.direction).toBe(DIRECTIONS.up);
      
      // Y должен уменьшиться
      expect(result.y).toBeLessThan(pixelY);
      
      // X не должен измениться
      expect(result.x).toBe(pixelX);
    });
    
    test('Коррекция направления при подходе под углом (слева)', () => {
      // Подход под углом слева (слегка сверху)
      const direction = 3 * Math.PI / 4; // 135 градусов, между left и down
      const result = calculateStraightPosition(
        cellType, pixelX, pixelY, direction, speed, deltaTime, CELL_SIZE
      );
      
      // Должно скорректировать направление на down
      expect(result.direction).toBe(DIRECTIONS.down);
      
      // Y должен увеличиться
      expect(result.y).toBeGreaterThan(pixelY);
      
      // X не должен измениться
      expect(result.x).toBe(pixelX);
    });
  });
  
  describe('Проверка скорости и deltaTime', () => {
    test('Проверка нулевой скорости', () => {
      const result = calculateStraightPosition(
        CELL_TYPES.RAIL_H, pixelX, pixelY, DIRECTIONS.right, 0, deltaTime, CELL_SIZE
      );
      
      // Координаты не должны измениться
      expect(result.x).toBe(pixelX);
      expect(result.y).toBe(pixelY);
    });
    
    test('Проверка нулевого deltaTime', () => {
      const result = calculateStraightPosition(
        CELL_TYPES.RAIL_H, pixelX, pixelY, DIRECTIONS.right, speed, 0, CELL_SIZE
      );
      
      // Координаты не должны измениться
      expect(result.x).toBe(pixelX);
      expect(result.y).toBe(pixelY);
    });
    
    test('Проверка влияния скорости на перемещение', () => {
      const slowSpeed = 1;
      const fastSpeed = 4;
      
      const slowResult = calculateStraightPosition(
        CELL_TYPES.RAIL_H, pixelX, pixelY, DIRECTIONS.right, slowSpeed, deltaTime, CELL_SIZE
      );
      
      const fastResult = calculateStraightPosition(
        CELL_TYPES.RAIL_H, pixelX, pixelY, DIRECTIONS.right, fastSpeed, deltaTime, CELL_SIZE
      );
      
      // Перемещение с fastSpeed должно быть больше
      expect(fastResult.x - pixelX).toBeGreaterThan(slowResult.x - pixelX);
      
      // Должно быть пропорционально соотношению скоростей
      const ratio = (fastResult.x - pixelX) / (slowResult.x - pixelX);
      expect(ratio).toBeCloseTo(fastSpeed / slowSpeed);
    });
  });
  
  describe('Другие типы клеток', () => {
    test('Для других типов клеток направление не меняется', () => {
      const direction = Math.PI / 6; // Произвольный угол
      const result = calculateStraightPosition(
        CELL_TYPES.EMPTY, pixelX, pixelY, direction, speed, deltaTime, CELL_SIZE
      );
      
      // Направление должно остаться прежним
      expect(result.direction).toBe(direction);
      
      // Должно переместиться в этом направлении
      expect(result.x).not.toBe(pixelX);
      expect(result.y).not.toBe(pixelY);
    });
  });
});