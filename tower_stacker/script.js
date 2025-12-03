const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const finalScoreElement = document.getElementById('final-score');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

// Game constants
const BLOCK_HEIGHT = 30;
const INITIAL_BLOCK_WIDTH = 200;
const BLOCK_SPEED_INITIAL = 3;
const SPEED_INCREMENT = 0.1;

// Game state
let score = 0;
let blocks = [];
let currentBlock = null;
let gameRunning = false;
let direction = 1; // 1 for right, -1 for left
let speed = BLOCK_SPEED_INITIAL;
let hue = 0;

// Resize canvas to fit window
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // Redraw if game is not running to keep visuals
    if (!gameRunning && blocks.length > 0) {
        draw();
    }
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class Block {
    constructor(x, y, width, color) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = BLOCK_HEIGHT;
        this.color = color;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Reset shadow for other elements
        ctx.shadowBlur = 0;

        // Add a lighter top border for 3D effect
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(this.x, this.y, this.width, 4);
    }
}

function initGame() {
    score = 0;
    scoreElement.textContent = score;
    blocks = [];
    speed = BLOCK_SPEED_INITIAL;
    hue = 0;

    // Initial base block
    const baseBlock = new Block(
        (canvas.width - INITIAL_BLOCK_WIDTH) / 2,
        canvas.height - 100,
        INITIAL_BLOCK_WIDTH,
        `hsl(${hue}, 100%, 50%)`
    );
    blocks.push(baseBlock);

    spawnNextBlock();

    gameRunning = true;
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');

    animate();
}

function spawnNextBlock() {
    const prevBlock = blocks[blocks.length - 1];
    hue = (hue + 20) % 360;

    currentBlock = {
        x: -prevBlock.width, // Start from left
        y: prevBlock.y - BLOCK_HEIGHT,
        width: prevBlock.width,
        color: `hsl(${hue}, 100%, 50%)`
    };

    // Randomize start direction
    direction = Math.random() > 0.5 ? 1 : -1;
    if (direction === -1) {
        currentBlock.x = canvas.width;
    }
}

function placeBlock() {
    if (!gameRunning) return;

    const prevBlock = blocks[blocks.length - 1];

    // Calculate overlap
    let overlap = currentBlock.width;
    let isMissed = false;

    // Calculate the difference between the current block and the previous block
    const diff = currentBlock.x - prevBlock.x;

    if (Math.abs(diff) >= currentBlock.width) {
        isMissed = true;
    } else {
        // Trim the block
        if (diff > 0) {
            // Block is to the right of the previous one
            overlap -= diff;
            currentBlock.width = overlap;
            // x stays the same
        } else {
            // Block is to the left
            overlap += diff; // diff is negative
            currentBlock.width = overlap;
            currentBlock.x = prevBlock.x;
        }
    }

    if (isMissed || overlap <= 0) {
        gameOver();
    } else {
        // Add the placed block to the stack
        blocks.push(new Block(currentBlock.x, currentBlock.y, currentBlock.width, currentBlock.color));

        // Move camera down if stack gets too high
        if (blocks.length > 10) {
            blocks.forEach(b => b.y += BLOCK_HEIGHT);
            currentBlock.y += BLOCK_HEIGHT; // Technically not needed as it's re-created
        }

        score++;
        scoreElement.textContent = score;
        speed += SPEED_INCREMENT;
        spawnNextBlock();
    }
}

function gameOver() {
    gameRunning = false;
    finalScoreElement.textContent = score;
    gameOverScreen.classList.remove('hidden');
}

function update() {
    if (!gameRunning) return;

    currentBlock.x += speed * direction;

    // Bounce off walls
    if (currentBlock.x + currentBlock.width > canvas.width) {
        direction = -1;
    } else if (currentBlock.x < 0) {
        direction = 1;
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw stack
    blocks.forEach(block => block.draw());

    // Draw current moving block
    if (gameRunning && currentBlock) {
        ctx.fillStyle = currentBlock.color;
        ctx.shadowBlur = 20;
        ctx.shadowColor = currentBlock.color;
        ctx.fillRect(currentBlock.x, currentBlock.y, currentBlock.width, BLOCK_HEIGHT);

        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(currentBlock.x, currentBlock.y, currentBlock.width, 4);
    }
}

function animate() {
    if (!gameRunning) return;
    update();
    draw();
    requestAnimationFrame(animate);
}

// Input handling
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        if (gameRunning) {
            placeBlock();
        } else if (!startScreen.classList.contains('hidden')) {
            initGame();
        } else if (!gameOverScreen.classList.contains('hidden')) {
            initGame();
        }
    }
});

canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault(); // Prevent default touch actions
    if (gameRunning) {
        placeBlock();
    }
});

startBtn.addEventListener('click', initGame);
restartBtn.addEventListener('click', initGame);

// Initial draw (background)
resizeCanvas();
