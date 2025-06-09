const { createTestCanvas, compareCanvasWithReference } = require('./setup');
const { drawSemaphoreCell } = require('../graphics');

describe('Semaphore Cell Rendering Tests', () => {
  // Тестируем каждый тип семафора в обоих состояниях (открыт/закрыт)
  
  test('RAIL_H_SEMAPHORE - горизонтальные рельсы с семафором (открыт)', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    // Очищаем canvas перед отрисовкой
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    // Отрисовываем семафор в открытом состоянии
    drawSemaphoreCell(ctx, 0, 0, CELL_TYPES.RAIL_H_SEMAPHORE, true);
    
    // Проверяем результат
    const { diffPixels } = compareCanvasWithReference(canvas, 'semaphore-rail-h-open');
    expect(diffPixels).toBeLessThan(10);
  });
  
  test('RAIL_H_SEMAPHORE - горизонтальные рельсы с семафором (закрыт)', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    // Отрисовываем семафор в закрытом состоянии
    drawSemaphoreCell(ctx, 0, 0, CELL_TYPES.RAIL_H_SEMAPHORE, false);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'semaphore-rail-h-closed');
    expect(diffPixels).toBeLessThan(10);
  });
  
  test('RAIL_V_SEMAPHORE - вертикальные рельсы с семафором (открыт)', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    drawSemaphoreCell(ctx, 0, 0, CELL_TYPES.RAIL_V_SEMAPHORE, true);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'semaphore-rail-v-open');
    expect(diffPixels).toBeLessThan(10);
  });
  
  test('RAIL_V_SEMAPHORE - вертикальные рельсы с семафором (закрыт)', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    drawSemaphoreCell(ctx, 0, 0, CELL_TYPES.RAIL_V_SEMAPHORE, false);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'semaphore-rail-v-closed');
    expect(diffPixels).toBeLessThan(10);
  });
  
  test('TURN_RIGHT_DOWN_SEMAPHORE - поворот вправо-вниз с семафором (открыт)', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    drawSemaphoreCell(ctx, 0, 0, CELL_TYPES.TURN_RIGHT_DOWN_SEMAPHORE, true);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'semaphore-turn-right-down-open');
    expect(diffPixels).toBeLessThan(10);
  });
  
  test('TURN_RIGHT_DOWN_SEMAPHORE - поворот вправо-вниз с семафором (закрыт)', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    drawSemaphoreCell(ctx, 0, 0, CELL_TYPES.TURN_RIGHT_DOWN_SEMAPHORE, false);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'semaphore-turn-right-down-closed');
    expect(diffPixels).toBeLessThan(10);
  });
  
  test('TURN_LEFT_DOWN_SEMAPHORE - поворот влево-вниз с семафором (открыт)', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    drawSemaphoreCell(ctx, 0, 0, CELL_TYPES.TURN_LEFT_DOWN_SEMAPHORE, true);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'semaphore-turn-left-down-open');
    expect(diffPixels).toBeLessThan(10);
  });
  
  test('TURN_LEFT_DOWN_SEMAPHORE - поворот влево-вниз с семафором (закрыт)', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    drawSemaphoreCell(ctx, 0, 0, CELL_TYPES.TURN_LEFT_DOWN_SEMAPHORE, false);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'semaphore-turn-left-down-closed');
    expect(diffPixels).toBeLessThan(10);
  });
  
  test('TURN_LEFT_UP_SEMAPHORE - поворот влево-вверх с семафором (открыт)', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    drawSemaphoreCell(ctx, 0, 0, CELL_TYPES.TURN_LEFT_UP_SEMAPHORE, true);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'semaphore-turn-left-up-open');
    expect(diffPixels).toBeLessThan(10);
  });
  
  test('TURN_LEFT_UP_SEMAPHORE - поворот влево-вверх с семафором (закрыт)', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    drawSemaphoreCell(ctx, 0, 0, CELL_TYPES.TURN_LEFT_UP_SEMAPHORE, false);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'semaphore-turn-left-up-closed');
    expect(diffPixels).toBeLessThan(10);
  });
  
  test('TURN_RIGHT_UP_SEMAPHORE - поворот вправо-вверх с семафором (открыт)', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    drawSemaphoreCell(ctx, 0, 0, CELL_TYPES.TURN_RIGHT_UP_SEMAPHORE, true);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'semaphore-turn-right-up-open');
    expect(diffPixels).toBeLessThan(10);
  });
  
  test('TURN_RIGHT_UP_SEMAPHORE - поворот вправо-вверх с семафором (закрыт)', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    drawSemaphoreCell(ctx, 0, 0, CELL_TYPES.TURN_RIGHT_UP_SEMAPHORE, false);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'semaphore-turn-right-up-closed');
    expect(diffPixels).toBeLessThan(10);
  });
}); 