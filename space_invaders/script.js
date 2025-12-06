const canvas = document.getElementById('game-board');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const gameOverModal = document.getElementById('game-over-modal');
const finalScoreElement = document.getElementById('final-score');
const finalWaveElement = document.getElementById('final-wave');
const restartBtn = document.getElementById('restart-btn');

const startScreenModal = document.getElementById('start-screen-modal');
const startBtn = document.getElementById('start-btn');

// Virtual resolution
const V_WIDTH = 800;
const V_HEIGHT = 600;

// Game Configuration
const CONFIG = {
    player: {
        width: 40,
        height: 20,
        speed: 8,
        color: 'var(--player-color)'
    },
    enemy: {
        width: 30,
        height: 20,
        rows: 5,
        cols: 10,
        spacing: 20,
        speed: 1,
        speedIncrease: 0.3,
        shootChance: 0.001,
        points: 10
    },
    bullet: {
        width: 4,
        height: 15,
        speed: 10,
        color: 'var(--player-color)'
    },
    enemyBullet: {
        width: 4,
        height: 15,
        speed: 5,
        color: 'var(--enemy-color)'
    }
};

// Game State
let score = 0;
let highScore = 0;
let lives = 3;
let wave = 1;
let player;
let enemies = [];
let bullets = [];
let enemyBullets = [];
let particles = [];
let keys = {};
let isGameRunning = false;
let lastShootTime = 0;
let shootCooldown = 300; // ms

// Touch controls
let touchStartX = 0;
let touchStartY = 0;

// Initialize
window.addEventListener('load', init);
window.addEventListener('resize', resizeCanvas);

function init() {
    highScore = parseInt(localStorage.getItem('invadersHighScore')) || 0;
    updateScoreboard();

    // Event listeners
    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', startGame);
    
    // Keyboard controls
    window.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        if (e.code === 'Space' && isGameRunning) {
            e.preventDefault();
            shoot();
        }
    });

    window.addEventListener('keyup', (e) => {
        keys[e.code] = false;
    });

    // Touch controls
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

    resizeCanvas();
    // Initial draw (of empty board)
    draw();
}

function resizeCanvas() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    draw();
}

function startGame() {
    isGameRunning = true;
    score = 0;
    lives = 3;
    wave = 1;

    initPlayer();
    initEnemies();
    bullets = [];
    enemyBullets = [];
    particles = [];

    startScreenModal.classList.add('hidden');
    gameOverModal.classList.add('hidden');

    updateScoreboard();
    gameLoop();
}

function initPlayer() {
    player = {
        x: V_WIDTH / 2 - CONFIG.player.width / 2,
        y: V_HEIGHT - CONFIG.player.height - 30,
        width: CONFIG.player.width,
        height: CONFIG.player.height,
        speed: CONFIG.player.speed
    };
}

function initEnemies() {
    enemies = [];
    const startX = 60;
    const startY = 60;
    const enemySpeed = CONFIG.enemy.speed + (wave - 1) * CONFIG.enemy.speedIncrease;

    for (let row = 0; row < CONFIG.enemy.rows; row++) {
        for (let col = 0; col < CONFIG.enemy.cols; col++) {
            enemies.push({
                x: startX + col * (CONFIG.enemy.width + CONFIG.enemy.spacing),
                y: startY + row * (CONFIG.enemy.height + CONFIG.enemy.spacing),
                width: CONFIG.enemy.width,
                height: CONFIG.enemy.height,
                speed: enemySpeed,
                direction: 1
            });
        }
    }
}

function gameLoop() {
    if (!isGameRunning) return;

    update();
    draw();

    requestAnimationFrame(gameLoop);
}

function update() {
    // Update player
    if (keys['ArrowLeft']) {
        player.x -= player.speed;
    }
    if (keys['ArrowRight']) {
        player.x += player.speed;
    }

    // Keep player in bounds
    player.x = Math.max(0, Math.min(V_WIDTH - player.width, player.x));

    // Update enemies
    let moveDown = false;
    let changeDirection = false;

    enemies.forEach(enemy => {
        enemy.x += enemy.speed * enemy.direction;
        if (enemy.x <= 0 || enemy.x + enemy.width >= V_WIDTH) {
            changeDirection = true;
        }
        if (Math.random() < CONFIG.enemy.shootChance) {
            enemyShoot(enemy);
        }
    });

    if (changeDirection) {
        moveDown = true;
        enemies.forEach(enemy => enemy.direction *= -1);
    }

    if (moveDown) {
        enemies.forEach(enemy => enemy.y += 20);
    }

    if (enemies.some(enemy => enemy.y + enemy.height >= player.y)) {
        gameOver();
        return;
    }

    // Update bullets
    bullets = bullets.filter(b => (b.y -= CONFIG.bullet.speed) > 0);
    enemyBullets = enemyBullets.filter(b => (b.y += CONFIG.enemyBullet.speed) < V_HEIGHT);

    // Update particles
    particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 1;
        p.alpha = p.life / 30;
        return p.life > 0;
    });

    // Collisions
    handleCollisions();

    // Check for next wave
    if (enemies.length === 0) {
        nextWave();
    }
}

function handleCollisions() {
    // Bullets vs Enemies
    bullets.forEach((bullet, bIndex) => {
        enemies.forEach((enemy, eIndex) => {
            if (checkCollision(bullet, enemy)) {
                bullets.splice(bIndex, 1);
                enemies.splice(eIndex, 1);
                score += CONFIG.enemy.points;
                updateScoreboard();
                createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, getCssVariable('--enemy-color'));
            }
        });
    });

    // Enemy Bullets vs Player
    enemyBullets.forEach((bullet, bIndex) => {
        if (checkCollision(bullet, player)) {
            enemyBullets.splice(bIndex, 1);
            lives--;
            createExplosion(player.x + player.width / 2, player.y + player.height / 2, getCssVariable('--player-color'));
            if (lives <= 0) {
                gameOver();
            }
        }
    });
}

function draw() {
    const scaleX = canvas.width / V_WIDTH;
    const scaleY = canvas.height / V_HEIGHT;

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.scale(scaleX, scaleY);

    if (isGameRunning) {
        drawPlayer();
        enemies.forEach(drawEnemy);
        bullets.forEach(drawBullet);
        enemyBullets.forEach(drawEnemyBullet);
        particles.forEach(drawParticle);
    }

    ctx.restore();
}

function drawPlayer() {
    ctx.fillStyle = getCssVariable('--player-color');
    ctx.shadowBlur = 15;
    ctx.shadowColor = getCssVariable('--player-color');
    ctx.fillRect(player.x, player.y, player.width, player.height);
    ctx.shadowBlur = 0;
}

function drawEnemy(enemy) {
    ctx.fillStyle = getCssVariable('--enemy-color');
    ctx.shadowBlur = 15;
    ctx.shadowColor = getCssVariable('--enemy-color');
    ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
    ctx.shadowBlur = 0;
}

function drawBullet(bullet) {
    ctx.fillStyle = getCssVariable('--bullet-color');
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
}

function drawEnemyBullet(bullet) {
    ctx.fillStyle = getCssVariable('--enemy-bullet-color');
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
}

function drawParticle(p) {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
    ctx.restore();
}

function shoot() {
    const now = Date.now();
    if (now - lastShootTime < shootCooldown) return;
    bullets.push({ x: player.x + player.width / 2 - CONFIG.bullet.width / 2, y: player.y, width: CONFIG.bullet.width, height: CONFIG.bullet.height });
    lastShootTime = now;
}

function enemyShoot(enemy) {
    enemyBullets.push({ x: enemy.x + enemy.width / 2 - CONFIG.enemyBullet.width / 2, y: enemy.y + enemy.height, width: CONFIG.enemyBullet.width, height: CONFIG.enemyBullet.height });
}

function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width && rect1.x + rect1.width > rect2.x && rect1.y < rect2.y + rect2.height && rect1.y + rect1.height > rect2.y;
}

function createExplosion(x, y, color) {
    for (let i = 0; i < 15; i++) {
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            size: Math.random() * 3 + 1,
            color,
            life: 30,
            alpha: 1
        });
    }
}

function nextWave() {
    wave++;
    initEnemies();
    bullets = [];
}

function gameOver() {
    isGameRunning = false;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('invadersHighScore', highScore);
    }
    updateScoreboard();
    finalScoreElement.textContent = score;
    finalWaveElement.textContent = wave;
    gameOverModal.classList.remove('hidden');
}

function updateScoreboard() {
    scoreElement.textContent = score;
    highScoreElement.textContent = highScore;
}


// Touch Controls
function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
}

function handleTouchMove(e) {
    e.preventDefault();
    if (!isGameRunning) return;
    const touch = e.touches[0];
    const diffX = touch.clientX - touchStartX;
    const scaleX = canvas.width / V_WIDTH;
    player.x += diffX / scaleX;
    touchStartX = touch.clientX;
}

function handleTouchEnd(e) {
    e.preventDefault();
    // Consider a tap if start and end positions are close and duration is short
    const touch = e.changedTouches[0];
    const diffX = Math.abs(touch.clientX - touchStartX);
    const diffY = Math.abs(touch.clientY - touchStartY);

    if (diffX < 10 && diffY < 10) {
        shoot();
    }
}

function getCssVariable(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}
