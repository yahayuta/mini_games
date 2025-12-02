const gridContainer = document.querySelector('.grid-container');
const tileContainer = document.getElementById('tile-container');
const scoreElement = document.getElementById('score');
const bestScoreElement = document.getElementById('best-score');
const gameOverOverlay = document.getElementById('game-over');
const newGameBtn = document.getElementById('new-game-btn');
const tryAgainBtn = document.getElementById('try-again-btn');

let grid = [];
let score = 0;
let bestScore = localStorage.getItem('2048-best-score') || 0;

// Initialize Game
function initGame() {
    grid = Array(4).fill().map(() => Array(4).fill(0));
    score = 0;
    updateScore(0);
    bestScoreElement.innerText = bestScore;
    gameOverOverlay.classList.add('hidden');
    tileContainer.innerHTML = '';

    addNewTile();
    addNewTile();
    renderGrid();
}

// Add a new tile (2 or 4) to a random empty cell
function addNewTile() {
    const emptyCells = [];
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            if (grid[r][c] === 0) {
                emptyCells.push({ r, c });
            }
        }
    }

    if (emptyCells.length > 0) {
        const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        const value = Math.random() < 0.9 ? 2 : 4;
        grid[randomCell.r][randomCell.c] = {
            value: value,
            id: Math.random().toString(36).substr(2, 9), // Unique ID for animation tracking
            merged: false,
            isNew: true
        };
    }
}

// Render the grid
function renderGrid() {
    tileContainer.innerHTML = '';

    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            const cell = grid[r][c];
            if (cell) {
                const tile = document.createElement('div');
                tile.classList.add('tile');
                tile.classList.add(`tile-${cell.value}`);
                if (cell.value > 2048) tile.classList.add('tile-super');

                tile.innerText = cell.value;

                // Position
                const x = c * 25; // 25% per cell
                const y = r * 25;
                tile.style.left = `calc(${x}% + 7.5px)`; // + half gap
                tile.style.top = `calc(${y}% + 7.5px)`;

                if (cell.isNew) {
                    tile.classList.add('tile-new');
                    cell.isNew = false; // Remove flag after render
                }

                if (cell.merged) {
                    tile.classList.add('tile-merged');
                    cell.merged = false;
                }

                tileContainer.appendChild(tile);
            }
        }
    }
}

// Update Score
function updateScore(points) {
    score += points;
    scoreElement.innerText = score;
    if (score > bestScore) {
        bestScore = score;
        bestScoreElement.innerText = bestScore;
        localStorage.setItem('2048-best-score', bestScore);
    }
}

// Movement Logic
function move(direction) {
    let moved = false;
    const newGrid = JSON.parse(JSON.stringify(grid)); // Deep copy for logic, but we need to preserve IDs for animation ideally. 
    // Actually, for simple DOM rendering, re-creating grid is easier but less smooth. 
    // Let's stick to modifying 'grid' in place or carefully mapping.

    // Reset merge flags
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (grid[r][c]) grid[r][c].merged = false;

    // Vectors
    const vectors = {
        ArrowUp: { r: -1, c: 0 },
        ArrowDown: { r: 1, c: 0 },
        ArrowLeft: { r: 0, c: -1 },
        ArrowRight: { r: 0, c: 1 }
    };
    const vector = vectors[direction];

    // Traverse order
    let traversals = { r: [], c: [] };
    for (let i = 0; i < 4; i++) {
        traversals.r.push(i);
        traversals.c.push(i);
    }

    if (vector.r === 1) traversals.r.reverse(); // Down
    if (vector.c === 1) traversals.c.reverse(); // Right

    traversals.r.forEach(r => {
        traversals.c.forEach(c => {
            const cell = grid[r][c];
            if (cell) {
                const positions = findFarthestPosition(r, c, vector);
                const next = getCell(positions.next);

                if (next && next.value === cell.value && !next.merged) {
                    // Merge
                    const mergedValue = cell.value * 2;
                    grid[positions.next.r][positions.next.c] = {
                        value: mergedValue,
                        id: next.id, // Keep ID of target? Or create new?
                        merged: true,
                        isNew: false
                    };
                    grid[r][c] = 0;
                    updateScore(mergedValue);
                    moved = true;
                } else if (positions.farthest.r !== r || positions.farthest.c !== c) {
                    // Move
                    grid[positions.farthest.r][positions.farthest.c] = cell;
                    grid[r][c] = 0;
                    moved = true;
                }
            }
        });
    });

    if (moved) {
        addNewTile();
        renderGrid();
        if (checkGameOver()) {
            gameOver();
        }
    }
}

function getCell(pos) {
    if (pos.r >= 0 && pos.r < 4 && pos.c >= 0 && pos.c < 4) {
        return grid[pos.r][pos.c];
    }
    return null;
}

function findFarthestPosition(r, c, vector) {
    let previous;
    // Progress in the vector direction until obstacle or bound
    do {
        previous = { r, c };
        r += vector.r;
        c += vector.c;
    } while (r >= 0 && r < 4 && c >= 0 && c < 4 && grid[r][c] === 0);

    return {
        farthest: previous,
        next: { r, c } // Used to check for merge
    };
}

function checkGameOver() {
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            if (grid[r][c] === 0) return false; // Empty cell

            // Check neighbors
            const current = grid[r][c].value;
            if (r < 3 && grid[r + 1][c].value === current) return false;
            if (c < 3 && grid[r][c + 1].value === current) return false;
        }
    }
    return true;
}

function gameOver() {
    gameOverOverlay.classList.remove('hidden');
}

// Input Handling
document.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        move(e.key);
    }
});

// Touch Handling
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}, { passive: false });

document.addEventListener('touchend', (e) => {
    if (!e.target.closest('.game-container')) return; // Only swipe on game

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;

    if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal
        if (Math.abs(dx) > 30) {
            if (dx > 0) move('ArrowRight');
            else move('ArrowLeft');
        }
    } else {
        // Vertical
        if (Math.abs(dy) > 30) {
            if (dy > 0) move('ArrowDown');
            else move('ArrowUp');
        }
    }
});

newGameBtn.addEventListener('click', initGame);
tryAgainBtn.addEventListener('click', initGame);

// Start
initGame();
