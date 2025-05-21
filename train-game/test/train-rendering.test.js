const { createTestCanvas, compareCanvasWithReference } = require('./setup');
const { drawTrain } = require('../graphics');

describe('Train Rendering Tests', () => {
  test('Train rendering at default position', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    // Очищаем canvas перед отрисовкой
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    // Создаем поезд в центре клетки
    const train = {
      pixelX: CELL_SIZE / 2,
      pixelY: CELL_SIZE / 2,
      direction: DIRECTIONS.right
    };
    
    // Отрисовываем поезд
    drawTrain(ctx, train);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'train-default');
    expect(diffPixels).toBeLessThan(10);
  });
  
  test('Train rendering with different directions', () => {
    const directions = [
      { name: 'right', value: DIRECTIONS.right },
      { name: 'down', value: DIRECTIONS.down },
      { name: 'left', value: DIRECTIONS.left },
      { name: 'up', value: DIRECTIONS.up }
    ];
    
    // Тестируем каждое направление
    for (const dir of directions) {
      const canvas = createTestCanvas();
      const ctx = canvas.getContext('2d');
      
      // Очищаем canvas перед отрисовкой
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
      
      const train = {
        pixelX: CELL_SIZE / 2,
        pixelY: CELL_SIZE / 2,
        direction: dir.value
      };
      
      drawTrain(ctx, train);
      
      const { diffPixels } = compareCanvasWithReference(canvas, `train-${dir.name}`);
      expect(diffPixels).toBeLessThan(10);
    }
  });
  
  test('Train rendering at different positions', () => {
    // Тестируем разные позиции
    const positions = [
      { name: 'top-left', x: CELL_SIZE * 0.25, y: CELL_SIZE * 0.25 },
      { name: 'top-right', x: CELL_SIZE * 0.75, y: CELL_SIZE * 0.25 },
      { name: 'bottom-left', x: CELL_SIZE * 0.25, y: CELL_SIZE * 0.75 },
      { name: 'bottom-right', x: CELL_SIZE * 0.75, y: CELL_SIZE * 0.75 }
    ];
    
    for (const pos of positions) {
      const canvas = createTestCanvas();
      const ctx = canvas.getContext('2d');
      
      // Очищаем canvas перед отрисовкой
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
      
      const train = {
        pixelX: pos.x,
        pixelY: pos.y,
        direction: DIRECTIONS.right
      };
      
      drawTrain(ctx, train);
      
      const { diffPixels } = compareCanvasWithReference(canvas, `train-pos-${pos.name}`);
      expect(diffPixels).toBeLessThan(10);
    }
  });
}); 