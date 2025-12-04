const TETROMINOES = {
    I: { shape: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], color: '#00f3ff' }, // Cyan
    J: { shape: [[1, 0, 0], [1, 1, 1], [0, 0, 0]], color: '#0051ff' }, // Blue
    L: { shape: [[0, 0, 1], [1, 1, 1], [0, 0, 0]], color: '#ffaa00' }, // Orange
    O: { shape: [[1, 1], [1, 1]], color: '#ffff00' }, // Yellow
    S: { shape: [[0, 1, 1], [1, 1, 0], [0, 0, 0]], color: '#0aff0a' }, // Green
    T: { shape: [[0, 1, 0], [1, 1, 1], [0, 0, 0]], color: '#bc13fe' }, // Purple
    Z: { shape: [[1, 1, 0], [0, 1, 1], [0, 0, 0]], color: '#ff0033' }  // Red
};

class Piece {
    constructor(tetromino, game) {
        this.tetromino = tetromino;
        this.shape = tetromino.shape;
        this.color = tetromino.color;
        this.game = game;

        // Start position (center top)
        this.x = Math.floor(this.game.COLS / 2) - Math.floor(this.shape[0].length / 2);
        this.y = -2; // Start slightly above board
    }

    draw(ctx) {
        this.shape.forEach((row, dy) => {
            row.forEach((value, dx) => {
                if (value > 0) {
                    this.game.drawBlock(ctx, this.x + dx, this.y + dy, this.color);
                }
            });
        });
    }

    move(dx, dy) {
        if (!this.collision(dx, dy, this.shape)) {
            this.x += dx;
            this.y += dy;
            return true;
        }
        return false;
    }

    rotate() {
        const newShape = this.shape[0].map((val, index) =>
            this.shape.map(row => row[index]).reverse()
        );

        if (!this.collision(0, 0, newShape)) {
            this.shape = newShape;
        } else {
            // Wall kick (basic implementation)
            if (!this.collision(1, 0, newShape)) {
                this.x += 1;
                this.shape = newShape;
            } else if (!this.collision(-1, 0, newShape)) {
                this.x -= 1;
                this.shape = newShape;
            }
        }
    }

    collision(dx, dy, shape) {
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col] === 0) continue;

                let newX = this.x + col + dx;
                let newY = this.y + row + dy;

                if (newX < 0 || newX >= this.game.COLS || newY >= this.game.ROWS) {
                    return true;
                }

                if (newY >= 0 && this.game.board[newY][newX]) {
                    return true;
                }
            }
        }
        return false;
    }
}

class TetrisGame {
    constructor() {
        this.canvas = document.getElementById('game-board');
        this.ctx = this.canvas.getContext('2d');
        this.holdCanvas = document.getElementById('hold-canvas');
        this.nextCanvas = document.getElementById('next-canvas');

        this.COLS = 10;
        this.ROWS = 20;
        this.BLOCK_SIZE = 25;

        this.board = [];
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.gameOver = false;
        this.isPaused = true;

        this.activePiece = null;
        this.nextPieceType = null;
        this.dropCounter = 0;
        this.dropInterval = 1000;
        this.lastTime = 0;

        this.init();
    }

    init() {
        this.resetBoard();
        this.bindControls();
        this.bindMobileControls();
        this.draw();

        document.getElementById('start-btn').addEventListener('click', () => {
            this.startGame();
        });
    }

    bindMobileControls() {
        const addTouchListener = (id, action) => {
            const btn = document.getElementById(id);
            if (!btn) return;

            btn.addEventListener('touchstart', (e) => {
                e.preventDefault(); // Prevent scrolling/zooming
                if (!this.isPaused && !this.gameOver) action();
            }, { passive: false });

            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                if (!this.isPaused && !this.gameOver) action();
            });
        };

        addTouchListener('left-btn', () => this.activePiece.move(-1, 0));
        addTouchListener('right-btn', () => this.activePiece.move(1, 0));
        addTouchListener('down-btn', () => this.activePiece.move(0, 1));
        addTouchListener('rotate-btn', () => this.activePiece.rotate());
        addTouchListener('drop-btn', () => {
            while (this.activePiece.move(0, 1));
            this.lockPiece();
        });
    }

    resetBoard() {
        this.board = Array.from({ length: this.ROWS }, () => Array(this.COLS).fill(0));
    }

    bindControls() {
        document.addEventListener('keydown', (e) => {
            if (this.gameOver || this.isPaused) {
                if (e.key === 'p') this.togglePause();
                return;
            }

            switch (e.key) {
                case 'ArrowLeft':
                    this.activePiece.move(-1, 0);
                    break;
                case 'ArrowRight':
                    this.activePiece.move(1, 0);
                    break;
                case 'ArrowDown':
                    this.activePiece.move(0, 1);
                    break;
                case 'ArrowUp':
                    this.activePiece.rotate();
                    break;
                case ' ': // Hard drop
                    while (this.activePiece.move(0, 1));
                    this.lockPiece();
                    break;
                case 'p':
                    this.togglePause();
                    break;
            }
        });
    }

    startGame() {
        this.isPaused = false;
        this.gameOver = false;
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.updateStats();
        this.resetBoard();
        this.spawnPiece();

        document.getElementById('game-overlay').style.display = 'none';

        this.lastTime = 0;
        this.gameLoop();
    }

    spawnPiece() {
        const types = 'IJLOSTZ';
        if (!this.nextPieceType) {
            this.nextPieceType = types[Math.floor(Math.random() * types.length)];
        }

        const type = this.nextPieceType;
        this.activePiece = new Piece(TETROMINOES[type], this);

        this.nextPieceType = types[Math.floor(Math.random() * types.length)];
        this.drawNextPiece();

        // Check for immediate collision (Game Over)
        if (this.activePiece.collision(0, 0, this.activePiece.shape)) {
            this.gameOver = true;
            document.getElementById('overlay-title').textContent = 'GAME OVER';
            document.getElementById('start-btn').textContent = 'TRY AGAIN';
            document.getElementById('game-overlay').style.display = 'flex';
        }
    }

    lockPiece() {
        this.activePiece.shape.forEach((row, dy) => {
            row.forEach((value, dx) => {
                if (value > 0) {
                    let y = this.activePiece.y + dy;
                    let x = this.activePiece.x + dx;
                    if (y >= 0) {
                        this.board[y][x] = this.activePiece.color;
                    }
                }
            });
        });

        this.clearLines();
        this.spawnPiece();
    }

    clearLines() {
        let linesCleared = 0;

        for (let y = this.ROWS - 1; y >= 0; y--) {
            if (this.board[y].every(cell => cell !== 0)) {
                this.board.splice(y, 1);
                this.board.unshift(Array(this.COLS).fill(0));
                linesCleared++;
                y++; // Check same row index again
            }
        }

        if (linesCleared > 0) {
            this.lines += linesCleared;
            this.score += linesCleared * 100 * this.level; // Basic scoring
            this.level = Math.floor(this.lines / 10) + 1;
            this.dropInterval = Math.max(100, 1000 - (this.level - 1) * 100);
            this.updateStats();
        }
    }

    updateStats() {
        // Update both desktop and mobile score displays if they exist
        const scoreEl = document.getElementById('score');
        const scoreStatEl = document.getElementById('score-stat');
        if (scoreEl) scoreEl.textContent = this.score;
        if (scoreStatEl) scoreStatEl.textContent = this.score;

        document.getElementById('level').textContent = this.level;
        document.getElementById('lines').textContent = this.lines;
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        const overlay = document.getElementById('game-overlay');
        const title = document.getElementById('overlay-title');
        const btn = document.getElementById('start-btn');

        if (this.isPaused) {
            overlay.style.display = 'flex';
            title.textContent = 'PAUSED';
            btn.textContent = 'RESUME';
        } else {
            overlay.style.display = 'none';
            this.lastTime = performance.now(); // Reset time to prevent jump
            this.gameLoop();
        }
    }

    gameLoop(time = 0) {
        if (this.isPaused || this.gameOver) return;

        const deltaTime = time - this.lastTime;
        this.lastTime = time;

        this.dropCounter += deltaTime;
        if (this.dropCounter > this.dropInterval) {
            if (!this.activePiece.move(0, 1)) {
                this.lockPiece();
            }
            this.dropCounter = 0;
        }

        this.draw();
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    draw() {
        // Clear canvas
        this.ctx.fillStyle = 'rgba(10, 10, 18, 0.9)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawGrid();

        // Draw board
        this.board.forEach((row, y) => {
            row.forEach((color, x) => {
                if (color) {
                    this.drawBlock(this.ctx, x, y, color);
                }
            });
        });

        // Draw active piece
        if (this.activePiece) {
            this.activePiece.draw(this.ctx);
        }
    }

    drawBlock(ctx, x, y, color) {
        ctx.fillStyle = color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = color;
        ctx.fillRect(x * this.BLOCK_SIZE, y * this.BLOCK_SIZE, this.BLOCK_SIZE, this.BLOCK_SIZE);

        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x * this.BLOCK_SIZE, y * this.BLOCK_SIZE, this.BLOCK_SIZE, this.BLOCK_SIZE);

        // Inner shine
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(x * this.BLOCK_SIZE + 2, y * this.BLOCK_SIZE + 2, this.BLOCK_SIZE - 4, this.BLOCK_SIZE - 4);
    }

    drawGrid() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        this.ctx.lineWidth = 1;

        for (let x = 0; x <= this.COLS; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * this.BLOCK_SIZE, 0);
            this.ctx.lineTo(x * this.BLOCK_SIZE, this.canvas.height);
            this.ctx.stroke();
        }

        for (let y = 0; y <= this.ROWS; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * this.BLOCK_SIZE);
            this.ctx.lineTo(this.canvas.width, y * this.BLOCK_SIZE);
            this.ctx.stroke();
        }
    }

    drawNextPiece() {
        const ctx = this.nextCanvas.getContext('2d');
        ctx.clearRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);

        if (!this.nextPieceType) return;

        const type = TETROMINOES[this.nextPieceType];
        const shape = type.shape;
        const color = type.color;
        const blockSize = 20;

        const offsetX = (this.nextCanvas.width - shape[0].length * blockSize) / 2;
        const offsetY = (this.nextCanvas.height - shape.length * blockSize) / 2;

        shape.forEach((row, dy) => {
            row.forEach((value, dx) => {
                if (value > 0) {
                    ctx.fillStyle = color;
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = color;
                    ctx.fillRect(offsetX + dx * blockSize, offsetY + dy * blockSize, blockSize, blockSize);
                    ctx.shadowBlur = 0;
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                    ctx.strokeRect(offsetX + dx * blockSize, offsetY + dy * blockSize, blockSize, blockSize);
                }
            });
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const game = new TetrisGame();
});
