const canvas = document.getElementById('game-board');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const gameOverModal = document.getElementById('game-over-modal');
const finalScoreElement = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');

const startScreenModal = document.getElementById('start-screen-modal');
const startBtn = document.getElementById('start-btn');

// Game constants
const GRID_SIZE = 20;
const TILE_COUNT = canvas.width / GRID_SIZE;
const GAME_SPEED = 150; // ms per frame - Slower for easier difficulty

// Game state
let score = 0;
let highScore = localStorage.getItem('snakeHighScore') || 0;
let snake = [];
let food = { x: 0, y: 0 };
let dx = 0;
let dy = 0;
let gameLoop;
let isGameRunning = false;

// Initialize high score display
highScoreElement.textContent = highScore;

// Event listeners
document.addEventListener('keydown', handleInput);
restartBtn.addEventListener('click', startGame);
startBtn.addEventListener('click', startGame);

// Touch controls variables
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
}, { passive: false });

document.addEventListener('touchmove', e => {
    e.preventDefault(); // Prevent scrolling
}, { passive: false });

document.addEventListener('touchend', e => {
    const touchEndX = e.changedTouches[0].screenX;
    const touchEndY = e.changedTouches[0].screenY;
    handleSwipe(touchStartX, touchStartY, touchEndX, touchEndY);
}, { passive: false });


function startGame() {
    // Reset state
    score = 0;
    snake = [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 }
    ];
    dx = 1;
    dy = 0;
    isGameRunning = true;
    scoreElement.textContent = score;
    gameOverModal.classList.add('hidden');
    startScreenModal.classList.add('hidden');

    spawnFood();

    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(update, GAME_SPEED);
}

function update() {
    if (!isGameRunning) return;

    moveSnake();
    checkCollision();
    draw();
}

function moveSnake() {
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    snake.unshift(head);

    // Check if food eaten
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreElement.textContent = score;
        spawnFood();
        // Increase speed slightly or add effects here if desired
    } else {
        snake.pop();
    }
}

function checkCollision() {
    const head = snake[0];

    // Wall collision
    if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
        gameOver();
    }

    // Self collision
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            gameOver();
        }
    }
}

function gameOver() {
    isGameRunning = false;
    clearInterval(gameLoop);

    if (score > highScore) {
        highScore = score;
        localStorage.setItem('snakeHighScore', highScore);
        highScoreElement.textContent = highScore;
    }

    finalScoreElement.textContent = score;
    gameOverModal.classList.remove('hidden');
}

function spawnFood() {
    food.x = Math.floor(Math.random() * TILE_COUNT);
    food.y = Math.floor(Math.random() * TILE_COUNT);

    // Ensure food doesn't spawn on snake
    for (let segment of snake) {
        if (food.x === segment.x && food.y === segment.y) {
            spawnFood();
            return;
        }
    }
}

function draw() {
    // Clear canvas
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Snake
    snake.forEach((segment, index) => {
        // Gradient for snake
        if (index === 0) {
            ctx.fillStyle = '#4ade80'; // Head
        } else {
            ctx.fillStyle = '#22c55e'; // Body
        }

        // Add glow effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#4ade80';

        ctx.fillRect(segment.x * GRID_SIZE, segment.y * GRID_SIZE, GRID_SIZE - 2, GRID_SIZE - 2);

        // Reset shadow
        ctx.shadowBlur = 0;
    });

    // Draw Food
    ctx.fillStyle = '#f87171';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#f87171';
    ctx.beginPath();
    ctx.arc(
        food.x * GRID_SIZE + GRID_SIZE / 2,
        food.y * GRID_SIZE + GRID_SIZE / 2,
        GRID_SIZE / 2 - 2,
        0,
        Math.PI * 2
    );
    ctx.fill();
    ctx.shadowBlur = 0;
}

function handleInput(e) {
    if (!isGameRunning) return; // Prevent input if game not running

    switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            if (dy !== 1) { dx = 0; dy = -1; }
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            if (dy !== -1) { dx = 0; dy = 1; }
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            if (dx !== 1) { dx = -1; dy = 0; }
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            if (dx !== -1) { dx = 1; dy = 0; }
            break;
    }
}

function handleSwipe(startX, startY, endX, endY) {
    if (!isGameRunning) return;

    const diffX = endX - startX;
    const diffY = endY - startY;

    if (Math.abs(diffX) > Math.abs(diffY)) {
        // Horizontal swipe
        if (diffX > 0 && dx !== -1) {
            dx = 1; dy = 0;
        } else if (diffX < 0 && dx !== 1) {
            dx = -1; dy = 0;
        }
    } else {
        // Vertical swipe
        if (diffY > 0 && dy !== -1) {
            dx = 0; dy = 1;
        } else if (diffY < 0 && dy !== 1) {
            dx = 0; dy = -1;
        }
    }
}

// Initial draw to show empty board
draw();
