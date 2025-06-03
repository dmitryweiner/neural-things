const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const gameOverBanner = document.getElementById('gameOverBanner');
const restartBtn = document.getElementById('restartBtn');

// Game constants
const CAR_WIDTH = 28;  
const CAR_HEIGHT = 40; 
const CAR_SIZE = 40;   
const CUBE_SIZE = 30;
const FUEL_INCREMENT = 25;
const INITIAL_FUEL = 50;
const MAX_SPEED = 5;
const ACCELERATION = 0.01;
const DECELERATION = 0.005;
const ROTATION_SPEED = 0.05;
const CUBE_LIFETIME = 10000; // 10 seconds in milliseconds
const IDLE_FUEL_CONSUMPTION = 0.4;

// Car properties
const   car = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    speed: 0,
    angle: 0,
    sprite: null // сюда загрузим изображение
};

// Game state
let fuel = INITIAL_FUEL;
let cubes = [];
let keys = {};
let isGameOver = false;

// Для подсчёта пройденного пути
let lastX = null;
let lastY = null;
let distanceAccumulator = 0;
const PX_PER_CM = 37.8; // 1 см ≈ 37.8 px (96 dpi)

// Массив для хранения фигур фона
let asphaltShapes = [];

// Кэш для асфальтового фона
let asphaltCanvas = null;
let asphaltCtx = null;

// Загрузка спрайта машинки
const carImage = new Image();
carImage.src = 'car.png';
carImage.onload = () => {
    car.sprite = carImage;
};

// Загрузка спрайта бочки
const barrelImage = new Image();
barrelImage.src = 'oil-barrel.png';

// Препятствия
let obstacles = [];
const OBSTACLE_COUNT = 7;

function generateObstacles() {
    obstacles = [];
    const minSide = Math.min(canvas.width, canvas.height);
    const OBSTACLE_MIN_SIZE = minSide * 0.08; // 8%
    const OBSTACLE_MAX_SIZE = minSide * 0.16; // 16%
    for (let i = 0; i < OBSTACLE_COUNT; i++) {
        let tries = 0;
        let placed = false;
        while (!placed && tries < 30) {
            const w = OBSTACLE_MIN_SIZE + Math.random() * (OBSTACLE_MAX_SIZE - OBSTACLE_MIN_SIZE);
            const h = OBSTACLE_MIN_SIZE + Math.random() * (OBSTACLE_MAX_SIZE - OBSTACLE_MIN_SIZE);
            const x = Math.random() * (canvas.width - w);
            const y = Math.random() * (canvas.height - h);
            // Не слишком близко к центру (старта машины)
            const dx = x + w/2 - canvas.width/2;
            const dy = y + h/2 - canvas.height/2;
            if (Math.sqrt(dx*dx + dy*dy) < 180) { tries++; continue; }
            // Не пересекается с другими препятствиями
            if (obstacles.some(o => !(x + w < o.x || x > o.x + o.w || y + h < o.y || y > o.y + o.h))) { tries++; continue; }
            obstacles.push({x, y, w, h});
            placed = true;
        }
    }
}

// Generate random cube
function generateCube() {
    return {
        x: Math.random() * (canvas.width - CUBE_SIZE),
        y: Math.random() * (canvas.height - CUBE_SIZE),
        createdAt: Date.now()
    };
}

// Initialize cubes
for (let i = 0; i < 5; i++) {
    cubes.push(generateCube());
}

// Handle keyboard input
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// Мобильные кнопки управления
const isMobile = window.innerWidth <= 900;
if (isMobile) {
    const btnUp = document.getElementById('btn-up');
    const btnDown = document.getElementById('btn-down');
    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');

    function pressKey(key) {
        keys[key] = true;
    }
    function releaseKey(key) {
        keys[key] = false;
    }

    // Для тача и мыши (на всякий случай)
    [
        [btnUp, 'ArrowUp'],
        [btnDown, 'ArrowDown'],
        [btnLeft, 'ArrowLeft'],
        [btnRight, 'ArrowRight']
    ].forEach(([btn, key]) => {
        if (!btn) return;
        btn.addEventListener('touchstart', e => { e.preventDefault(); pressKey(key); });
        btn.addEventListener('touchend', e => { e.preventDefault(); releaseKey(key); });
        btn.addEventListener('mousedown', e => { e.preventDefault(); pressKey(key); });
        btn.addEventListener('mouseup', e => { e.preventDefault(); releaseKey(key); });
        btn.addEventListener('mouseleave', e => { e.preventDefault(); releaseKey(key); });
    });
}

// Update car position and handle collisions
function update() {
    if (isGameOver) return;
    // Handle acceleration/deceleration
    if (keys['ArrowUp']) {
        car.speed = Math.min(car.speed + ACCELERATION, MAX_SPEED);
    } else if (keys['ArrowDown']) {
        car.speed = Math.max(car.speed - DECELERATION, -MAX_SPEED / 2);
    } else {
        // Natural deceleration
        if (car.speed > 0) {
            car.speed = Math.max(0, car.speed - DECELERATION);
        } else if (car.speed < 0) {
            car.speed = Math.min(0, car.speed + DECELERATION);
        }
    }

    // Handle rotation
    if (keys['ArrowLeft']) {
        car.angle -= ROTATION_SPEED;
    }
    if (keys['ArrowRight']) {
        car.angle += ROTATION_SPEED;
    }

    // Сохраняем старые координаты
    const oldX = car.x;
    const oldY = car.y;

    // Update position
    car.x += Math.cos(car.angle) * car.speed;
    car.y += Math.sin(car.angle) * car.speed;

    // Проверка выхода за границы
    const wasX = car.x;
    const wasY = car.y;
    car.x = Math.max(CAR_SIZE, Math.min(canvas.width - CAR_SIZE, car.x));
    car.y = Math.max(CAR_SIZE, Math.min(canvas.height - CAR_SIZE, car.y));
    if (car.x !== wasX || car.y !== wasY) {
        car.speed = 0;
    }

    // Проверка коллизии с препятствиями
    if (collidesWithObstacles(car.x, car.y)) {
        car.x = oldX;
        car.y = oldY;
        car.speed = 0;
    }

    // === Подсчёт пройденного пути ===
    if (lastX !== null && lastY !== null) {
        const dx = car.x - lastX;
        const dy = car.y - lastY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        distanceAccumulator += dist;
        while (distanceAccumulator >= PX_PER_CM) {
            fuel -= 1;
            distanceAccumulator -= PX_PER_CM;
        }
        updateFuelDisplay();
    }
    lastX = car.x;
    lastY = car.y;

    // Проверка на окончание топлива
    if (fuel <= 0) {
        fuel = 0;
        updateFuelDisplay();
        isGameOver = true;
        showGameOver();
        return;
    }

    // === Коллизии и lifetime бочек ===
    cubes = cubes.filter(cube => {
        const dx = car.x - cube.x;
        const dy = car.y - cube.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < CAR_SIZE) {
            fuel += FUEL_INCREMENT;
            updateFuelDisplay();
            return false;
        }

        // Remove cube if its lifetime has expired
        if (Date.now() - cube.createdAt > CUBE_LIFETIME) {
            return false;
        }

        return true;
    });

    // Generate new cubes if needed
    while (cubes.length < 5) {
        cubes.push(generateCube());
    }
}

// Draw game objects
function draw() {
    // Просто копируем кэшированный фон
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (asphaltCanvas) {
        ctx.drawImage(asphaltCanvas, 0, 0);
    }
    // Draw car
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle + Math.PI / 2);
    if (car.sprite) {
        ctx.drawImage(
            car.sprite,
            -CAR_WIDTH / 2,
            -CAR_HEIGHT / 2,
            CAR_WIDTH,
            CAR_HEIGHT
        );
    } else {
        ctx.font = `${CAR_SIZE}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🚗', 0, 0);
    }
    ctx.restore();

    // Draw barrels (cubes)
    cubes.forEach(cube => {
        // Calculate opacity based on remaining lifetime
        const age = Date.now() - cube.createdAt;
        const opacity = 1 - (age / CUBE_LIFETIME);
        ctx.globalAlpha = opacity;
        if (barrelImage.complete && barrelImage.naturalWidth > 0) {
            ctx.drawImage(
                barrelImage,
                cube.x - CUBE_SIZE / 2,
                cube.y - CUBE_SIZE / 2,
                CUBE_SIZE,
                CUBE_SIZE
            );
        } else {
            // fallback: рисуем квадрат
            ctx.fillStyle = 'gray';
            ctx.fillRect(cube.x - CUBE_SIZE / 2, cube.y - CUBE_SIZE / 2, CUBE_SIZE, CUBE_SIZE);
        }
    });
    ctx.globalAlpha = 1; // Reset opacity for other drawings

    // Draw obstacles (concrete blocks)
    obstacles.forEach(o => {
        ctx.save();
        ctx.beginPath();
        ctx.rect(o.x, o.y, o.w, o.h);
        ctx.clip();
        ctx.translate(o.x, o.y);
        // Диагональные полосы (красные и белые)
        const stripeWidth = 16;
        for (let i = -o.h; i < o.w + o.h; i += stripeWidth) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i + o.h, o.h);
            ctx.lineWidth = stripeWidth;
            ctx.strokeStyle = (Math.floor(i / stripeWidth) % 2 === 0) ? '#fff' : '#d22';
            ctx.stroke();
        }
        ctx.restore();
        // Контур
        ctx.save();
        ctx.strokeStyle = '#b00';
        ctx.lineWidth = 2;
        ctx.strokeRect(o.x, o.y, o.w, o.h);
        ctx.restore();
    });
}

// Game loop
function gameLoop() {
    update();
    draw();
    if (!isGameOver) {
        requestAnimationFrame(gameLoop);
    }
}

// Функция для установки размера canvas под размер окна
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // Если машинка вне поля — вернуть внутрь
    car.x = Math.max(CAR_SIZE, Math.min(canvas.width - CAR_SIZE, car.x));
    car.y = Math.max(CAR_SIZE, Math.min(canvas.height - CAR_SIZE, car.y));
    // Переместить кубы внутрь поля
    cubes.forEach(cube => {
        cube.x = Math.max(CUBE_SIZE, Math.min(canvas.width - CUBE_SIZE, cube.x));
        cube.y = Math.max(CUBE_SIZE, Math.min(canvas.height - CUBE_SIZE, cube.y));
    });
    generateAsphaltBackground();
    generateObstacles();
}

function initGameState() {
    let attempts = 0;
    do {
        car.x = canvas.width / 2;
        car.y = canvas.height / 2;
        car.speed = 0;
        car.angle = 0;
        cubes = [];
        for (let i = 0; i < 5; i++) {
            cubes.push(generateCube());
        }
        lastX = null;
        lastY = null;
        distanceAccumulator = 0;
        isGameOver = false;
        hideGameOver();
        generateAsphaltBackground();
        generateObstacles();
        attempts++;
    } while (collidesWithObstacles(car.x, car.y) && attempts < 30);
}

function resetGame() {
    // Сброс состояния
    fuel = INITIAL_FUEL;
    updateFuelDisplay();
    initGameState();
}

// Установить размер canvas при загрузке и при изменении окна
window.addEventListener('resize', resizeCanvas);
resizeCanvas();
initGameState();

// Start the game
gameLoop();
hideGameOver();

// После рестарта снова запускаем цикл, если надо
gameOverBanner && restartBtn && restartBtn.addEventListener('click', () => {
    resetGame();
    requestAnimationFrame(gameLoop);
});

function showGameOver() {
    gameOverBanner.style.visibility = 'visible';
}

function hideGameOver() {
    gameOverBanner.style.visibility = 'hidden';
}

function updateFuelDisplay() {
    scoreElement.textContent = `Fuel: ${fuel <= 0 ? 0 : Math.round(fuel)}`;
}

// Таймер для убывания топлива во времени
setInterval(() => {
    if (!isGameOver) {
        fuel = Math.max(0, fuel - IDLE_FUEL_CONSUMPTION);
        updateFuelDisplay();
        if (fuel <= 0) {
            fuel = 0;
            isGameOver = true;
            showGameOver();
        }
    }
}, 1000);

function generateAsphaltBackground() {
    asphaltShapes = [];
    const area = canvas.width * canvas.height;
    const shapeCount = Math.floor(area / 3500); // больше фигур
    // Создаём offscreen canvas для кэширования
    asphaltCanvas = document.createElement('canvas');
    asphaltCanvas.width = canvas.width;
    asphaltCanvas.height = canvas.height;
    asphaltCtx = asphaltCanvas.getContext('2d');
    // Светло-серый фон
    asphaltCtx.clearRect(0, 0, asphaltCanvas.width, asphaltCanvas.height);
    asphaltCtx.fillStyle = '#e0e0e0';
    asphaltCtx.fillRect(0, 0, asphaltCanvas.width, asphaltCanvas.height);
    for (let i = 0; i < shapeCount; i++) {
        const type = Math.random() < 0.7 ? 'ellipse' : 'circle';
        const x = Math.random() * asphaltCanvas.width;
        const y = Math.random() * asphaltCanvas.height;
        const r1 = 18 + Math.random() * 32;
        const r2 = type === 'ellipse' ? (8 + Math.random() * 24) : r1;
        const gray = Math.floor(150 + Math.random() * 70); // 150-220 (светлее)
        const alpha = 0.13 + Math.random() * 0.13; // чуть прозрачнее
        const blur = 12 + Math.random() * 18; // размытые края
        asphaltCtx.save();
        asphaltCtx.globalAlpha = alpha;
        asphaltCtx.fillStyle = `rgb(${gray},${gray},${gray})`;
        asphaltCtx.shadowBlur = blur;
        asphaltCtx.shadowColor = `rgb(${gray},${gray},${gray})`;
        asphaltCtx.beginPath();
        if (type === 'ellipse') {
            asphaltCtx.ellipse(x, y, r1, r2, 0, 0, 2 * Math.PI);
        } else {
            asphaltCtx.arc(x, y, r1, 0, 2 * Math.PI);
        }
        asphaltCtx.fill();
        asphaltCtx.restore();
    }
}

// Проверка коллизии с препятствиями
function collidesWithObstacles(x, y) {
    // Проверяем пересечение центра машины с любым препятствием
    return obstacles.some(o =>
        x > o.x && x < o.x + o.w && y > o.y && y < o.y + o.h
    );
} 