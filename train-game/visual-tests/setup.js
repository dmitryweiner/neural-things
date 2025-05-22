const { createCanvas } = require('canvas');
const { PNG } = require('pngjs');
const fs = require('fs');
const pixelmatch = require('pixelmatch');
const path = require('path');

// Константы, необходимые для отрисовки
global.CELL_SIZE = 40;
global.RAIL_WIDTH = 3;
global.TIE_WIDTH = 2;
global.TIE_SPACING = 10;
global.GRID_WIDTH = 15;
global.GRID_HEIGHT = 10;
global.CELL_TYPES = {
  RAIL_H: "-",
  RAIL_V: "|",
  TURN_RIGHT_DOWN: "┌",
  TURN_LEFT_DOWN: "┐",
  TURN_RIGHT_UP: "└",
  TURN_LEFT_UP: "┘",
  EMPTY: " "
};

// Директории для хранения TURN_DIRECTIONS для использования в тестах
global.DIRECTIONS = {
  right: 0,
  down: Math.PI / 2,
  left: Math.PI,
  up: Math.PI * 3 / 2
};

global.TURN_DIRECTIONS = {
  "┌": { [DIRECTIONS.right]: DIRECTIONS.down },
  "┐": { [DIRECTIONS.left]: DIRECTIONS.down },
  "└": { [DIRECTIONS.up]: DIRECTIONS.right },
  "┘": { [DIRECTIONS.up]: DIRECTIONS.left }
};

// Служебная функция для сравнения изображений
function compareCanvasWithReference(canvas, referenceName, threshold = 0.1) {
  const testDir = path.join(__dirname, 'fixtures');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  const actualBuffer = canvas.toBuffer('image/png');
  const refPath = path.join(testDir, `${referenceName}.png`);
  
  // Создаем эталон, если его нет
  if (!fs.existsSync(refPath)) {
    fs.writeFileSync(refPath, actualBuffer);
    return { diffPixels: 0, message: 'Created reference image' };
  }
  
  // Сравниваем с эталоном
  const expectedBuffer = fs.readFileSync(refPath);
  const actual = PNG.sync.read(actualBuffer);
  const expected = PNG.sync.read(expectedBuffer);
  
  const diffPixels = pixelmatch(
    actual.data, expected.data, null, 
    actual.width, actual.height, 
    { threshold }
  );
  
  // Сохраняем различия, если они есть
  if (diffPixels > 0) {
    const diff = new PNG({ width: actual.width, height: actual.height });
    pixelmatch(
      actual.data, expected.data, diff.data, 
      actual.width, actual.height, 
      { threshold }
    );
    fs.writeFileSync(
      path.join(testDir, `${referenceName}-diff.png`), 
      PNG.sync.write(diff)
    );
  }
  
  return { 
    diffPixels,
    message: diffPixels > 0 ? `${diffPixels} pixels differ` : 'Images match'
  };
}

module.exports = {
  createTestCanvas() {
    return createCanvas(CELL_SIZE, CELL_SIZE);
  },
  compareCanvasWithReference
}; 