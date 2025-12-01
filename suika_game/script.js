const { Engine, Render, Runner, World, Bodies, Body, Events, Composite } = Matter;

// Game Constants
const FRUITS = [
    { label: 'cherry', radius: 15, color: '#F54242', score: 2 },
    { label: 'strawberry', radius: 23, color: '#F5428D', score: 4 },
    { label: 'grape', radius: 30, color: '#A442F5', score: 6 },
    { label: 'dekopon', radius: 37, color: '#F5A442', score: 8 },
    { label: 'orange', radius: 45, color: '#F58D42', score: 10 },
    { label: 'apple', radius: 55, color: '#FF3333', score: 12 },
    { label: 'pear', radius: 65, color: '#D4F542', score: 14 },
    { label: 'peach', radius: 75, color: '#F542C5', score: 16 },
    { label: 'pineapple', radius: 85, color: '#F5E942', score: 18 },
    { label: 'melon', radius: 100, color: '#42F56C', score: 20 },
    { label: 'watermelon', radius: 120, color: '#2E8B57', score: 22 },
];

const WALL_THICKNESS = 20;
const GAME_WIDTH = 400;
const GAME_HEIGHT = 600;
const DEADLINE_Y = 100; // Fruits above this line trigger game over

// Game State
let currentFruit = null;
let nextFruitType = null;
let score = 0;
let isGameOver = false;
let disableAction = false;
let intervalId = null;

// Setup Matter JS
const engine = Engine.create();
const world = engine.world;

// Create Renderer
const render = Render.create({
    element: document.getElementById('game-container'),
    engine: engine,
    options: {
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        wireframes: false,
        background: 'transparent',
        pixelRatio: window.devicePixelRatio
    }
});

// Create Walls
const ground = Bodies.rectangle(GAME_WIDTH / 2, GAME_HEIGHT + WALL_THICKNESS / 2 - 10, GAME_WIDTH, WALL_THICKNESS, { 
    isStatic: true,
    render: { fillStyle: '#transparent' }
});
const leftWall = Bodies.rectangle(0 - WALL_THICKNESS / 2, GAME_HEIGHT / 2, WALL_THICKNESS, GAME_HEIGHT * 2, { 
    isStatic: true,
    render: { fillStyle: '#transparent' }
});
const rightWall = Bodies.rectangle(GAME_WIDTH + WALL_THICKNESS / 2, GAME_HEIGHT / 2, WALL_THICKNESS, GAME_HEIGHT * 2, { 
    isStatic: true,
    render: { fillStyle: '#transparent' }
});

World.add(world, [ground, leftWall, rightWall]);

// Input Handling
const gameContainer = document.getElementById('game-container');

gameContainer.addEventListener('mousemove', (e) => {
    if (disableAction || isGameOver || !currentFruit) return;
    const x = clampX(e.offsetX, currentFruit.circleRadius);
    Body.setPosition(currentFruit, { x: x, y: currentFruit.position.y });
});

gameContainer.addEventListener('click', (e) => {
    if (disableAction || isGameOver || !currentFruit) return;
    dropFruit();
});

// Touch support
gameContainer.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (disableAction || isGameOver || !currentFruit) return;
    const rect = gameContainer.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    const x = clampX(touchX, currentFruit.circleRadius);
    Body.setPosition(currentFruit, { x: x, y: currentFruit.position.y });
}, { passive: false });

gameContainer.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (disableAction || isGameOver || !currentFruit) return;
    dropFruit();
});

function clampX(x, radius) {
    return Math.max(radius + 10, Math.min(GAME_WIDTH - radius - 10, x));
}

function createFruit(x, y, typeIndex, isStatic = false) {
    const fruitDef = FRUITS[typeIndex];
    const fruit = Bodies.circle(x, y, fruitDef.radius, {
        isStatic: isStatic,
        restitution: 0.2,
        render: { fillStyle: fruitDef.color },
        label: fruitDef.label
    });
    fruit.typeIndex = typeIndex;
    return fruit;
}

function spawnNewFruit() {
    if (isGameOver) return;
    
    // Pick random fruit (0 to 4)
    const typeIndex = nextFruitType !== null ? nextFruitType : Math.floor(Math.random() * 5);
    nextFruitType = Math.floor(Math.random() * 5); // Prepare next
    updateNextFruitDisplay();

    const fruitDef = FRUITS[typeIndex];
    currentFruit = createFruit(GAME_WIDTH / 2, 50, typeIndex, true);
    World.add(world, currentFruit);
    disableAction = false;
}

function dropFruit() {
    disableAction = true;
    Body.setStatic(currentFruit, false);
    currentFruit = null;
    
    setTimeout(() => {
        spawnNewFruit();
    }, 1000);
}

function updateNextFruitDisplay() {
    const container = document.getElementById('next-fruit-display');
    container.innerHTML = '';
    const fruitDef = FRUITS[nextFruitType];
    const preview = document.createElement('div');
    preview.style.width = `${fruitDef.radius * 1.5}px`; // Scale down slightly for UI
    preview.style.height = `${fruitDef.radius * 1.5}px`;
    preview.style.backgroundColor = fruitDef.color;
    preview.style.borderRadius = '50%';
    container.appendChild(preview);
}

function updateScore(points) {
    score += points;
    document.getElementById('score').innerText = score;
}

// Collision Handling (Merging)
Events.on(engine, 'collisionStart', (event) => {
    const pairs = event.pairs;

    for (let i = 0; i < pairs.length; i++) {
        const bodyA = pairs[i].bodyA;
        const bodyB = pairs[i].bodyB;

        if (bodyA.typeIndex !== undefined && bodyB.typeIndex !== undefined) {
            if (bodyA.typeIndex === bodyB.typeIndex) {
                // Merge logic
                const typeIndex = bodyA.typeIndex;
                
                // If max level, just remove (or keep? Suika usually stops at Watermelon)
                // Standard Suika: Two watermelons disappear
                if (typeIndex === FRUITS.length - 1) {
                    World.remove(world, [bodyA, bodyB]);
                    updateScore(FRUITS[typeIndex].score * 2);
                    return;
                }

                const newTypeIndex = typeIndex + 1;
                const midX = (bodyA.position.x + bodyB.position.x) / 2;
                const midY = (bodyA.position.y + bodyB.position.y) / 2;

                World.remove(world, [bodyA, bodyB]);
                updateScore(FRUITS[typeIndex].score); // Score for merging

                const newFruit = createFruit(midX, midY, newTypeIndex, false);
                World.add(world, newFruit);
            }
        }
    }
});

// Game Over Logic
Events.on(engine, 'afterUpdate', () => {
    if (isGameOver) return;

    // Check if any fruit is above the deadline and is not the current aiming fruit
    const bodies = Composite.allBodies(world);
    for (const body of bodies) {
        if (!body.isStatic && body.position.y < DEADLINE_Y && body.velocity.y > -0.1 && body.velocity.y < 0.1) {
            // Check if it's settled above line. 
            // To be more forgiving, we can use a timer or check if it stays there.
            // For simplicity: if a dynamic body is above Y=100, game over.
            // But we need to ignore the just-dropped fruit.
            // Usually there's a delay or a specific "cloud" area.
            // Let's just check if it's stable.
            
            // Simple check: if it's too high
            // We need to make sure it's not the one just spawned (which is static)
            // And not the one falling (velocity check might be flaky)
            // Let's rely on a "settled" check or just strict line.
        }
    }
});

// Better Game Over Check:
// Use a sensor line or just check periodically
setInterval(() => {
    if (isGameOver) return;
    const bodies = Composite.allBodies(world);
    let crossing = false;
    for (const body of bodies) {
        if (!body.isStatic && body.position.y < DEADLINE_Y) {
            // Give it a grace period? 
            // For now, strict check but only if it's not moving much (settled)
            if (Math.abs(body.velocity.y) < 0.2 && Math.abs(body.velocity.x) < 0.2) {
                crossing = true;
            }
        }
    }
    
    if (crossing) {
        // Double check after a short delay to ensure it wasn't a bounce
        setTimeout(() => {
             const bodiesAgain = Composite.allBodies(world);
             for (const body of bodiesAgain) {
                 if (!body.isStatic && body.position.y < DEADLINE_Y && Math.abs(body.velocity.y) < 0.2) {
                     endGame();
                     return;
                 }
             }
        }, 1000);
    }
}, 1000);

function endGame() {
    isGameOver = true;
    document.getElementById('final-score').innerText = score;
    document.getElementById('game-over-screen').classList.remove('hidden');
    Runner.stop(runner);
}

document.getElementById('restart-btn').addEventListener('click', () => {
    // Reset Game
    World.clear(world);
    World.add(world, [ground, leftWall, rightWall]);
    score = 0;
    updateScore(0);
    isGameOver = false;
    document.getElementById('game-over-screen').classList.add('hidden');
    Runner.start(runner, engine);
    spawnNewFruit();
});

// Custom Rendering for Deadline
Events.on(render, 'afterRender', () => {
    const ctx = render.context;
    ctx.beginPath();
    ctx.moveTo(0, DEADLINE_Y);
    ctx.lineTo(GAME_WIDTH, DEADLINE_Y);
    ctx.strokeStyle = 'rgba(255, 69, 0, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
});

// Start Game
const runner = Runner.create();
Runner.run(runner, engine);
Render.run(render);
spawnNewFruit();
