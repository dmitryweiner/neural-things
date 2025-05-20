// Импортируем необходимые константы и функции
const { calculateTurnPosition } = require('./utils');
const { CELL_SIZE, CELL_TYPES } = require('./constants');

// Мокаем глобальные константы, которые используются в функции
global.CELL_SIZE = CELL_SIZE;
global.TURN_DIRECTIONS = CELL_TYPES;

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