const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const gameOverBanner = document.getElementById('gameOverBanner');
const restartBtn = document.getElementById('restartBtn');

// Game constants
const CAR_SIZE = 40;
const CUBE_SIZE = 30;
const FUEL_INCREMENT = 25;
const INITIAL_FUEL = 50;
const MAX_SPEED = 5;
const ACCELERATION = 0.2;
const DECELERATION = 0.1;
const ROTATION_SPEED = 0.1;
const CUBE_LIFETIME = 10000; // 10 seconds in milliseconds

// Car properties
const car = {
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

// Загрузка спрайта машинки
const carImage = new Image();
carImage.src = 'car.png';
carImage.onload = () => {
    car.sprite = carImage;
};

// Загрузка спрайта бочки
const barrelImage = new Image();
barrelImage.src = 'oil-barrel.png';

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
const isMobile = window.innerWidth <= 700;
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

    // Если палец ушёл с экрана — сбросить все
    document.addEventListener('touchend', () => {
        releaseKey('ArrowUp');
        releaseKey('ArrowDown');
        releaseKey('ArrowLeft');
        releaseKey('ArrowRight');
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

    // Update position
    car.x += Math.cos(car.angle) * car.speed;
    car.y += Math.sin(car.angle) * car.speed;

    // Keep car within bounds
    car.x = Math.max(CAR_SIZE, Math.min(canvas.width - CAR_SIZE, car.x));
    car.y = Math.max(CAR_SIZE, Math.min(canvas.height - CAR_SIZE, car.y));

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
        scoreElement.textContent = `Fuel: ${fuel}`;
    }
    lastX = car.x;
    lastY = car.y;

    // Проверка на окончание топлива
    if (fuel <= 0) {
        fuel = 0;
        scoreElement.textContent = `Fuel: 0`;
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
            scoreElement.textContent = `Fuel: ${fuel}`;
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
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw car
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle + Math.PI / 2);
    if (car.sprite) {
        ctx.drawImage(
            car.sprite,
            -CAR_SIZE / 2,
            -CAR_SIZE / 2,
            CAR_SIZE,
            CAR_SIZE
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
}

// Установить размер canvas при загрузке и при изменении окна
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Start the game
gameLoop();
hideGameOver();

// После рестарта снова запускаем цикл, если надо
gameOverBanner && restartBtn && restartBtn.addEventListener('click', () => {
    resetGame();
    requestAnimationFrame(gameLoop);
});

function showGameOver() {
    gameOverBanner.style.display = 'flex';
}

function hideGameOver() {
    gameOverBanner.style.display = 'none';
}

function resetGame() {
    // Сброс состояния
    fuel = INITIAL_FUEL;
    scoreElement.textContent = `Fuel: ${fuel}`;
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
} 