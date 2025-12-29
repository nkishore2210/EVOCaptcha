const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;  
canvas.height = 400; 
const character = {
    x: 50,
    y: canvas.height - 100, 
    gravity: 0.8,
    velocityY: 0,
    frame: 0, 
    frameSpeed: 10,
};
const obstacles = [];
const obstacleWidth = 30;
const obstacleHeight = 50;
let score = 0;

const skyBackground = {
    x: 0,
    y: 0,
    width: canvas.width,
    height: canvas.height / 2,
    speed: 0.5 
};

const characterImages = [
    new Image(),
    new Image()
];
characterImages[0].src = 'images/Screenshot_2024-12-12_at_7.43.55_AM-removebg-preview.png'; // First character image (left leg forward)
characterImages[1].src = 'images/Screenshot_2024-12-12_at_7.44.05_AM-removebg-preview.png'; // Second character image (right leg forward)

const obstacleImage = new Image();
obstacleImage.src = 'images/obstacle.png';

const skyImage = new Image();
skyImage.src = 'images/sky-background.png';

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); 

    updateBackground();
    drawBackground();
    updateCharacter();
    drawCharacter();


    updateObstacles();
    drawObstacles();

    detectCollisions();

    ctx.fillStyle = '#000';
    ctx.font = '20px Arial';
    ctx.fillText('Score: ' + score, canvas.width - 100, 30);

    requestAnimationFrame(gameLoop);
}

function updateBackground() {
    skyBackground.x -= skyBackground.speed;  
    if (skyBackground.x <= -canvas.width) {
        skyBackground.x = 0;
    }
}

function drawBackground() {
    ctx.drawImage(skyImage, skyBackground.x, skyBackground.y, skyBackground.width, skyBackground.height);
    ctx.drawImage(skyImage, skyBackground.x + canvas.width, skyBackground.y, skyBackground.width, skyBackground.height);
}

function updateCharacter() {
    if (character.jumping) {
        character.velocityY -= character.gravity;
        character.y -= character.velocityY;
        if (character.y >= canvas.height - 100) {
            character.y = canvas.height - 100;
            character.jumping = false;
        }
    }

    character.frame++;
    if (character.frame >= character.frameSpeed * 2) {
        character.frame = 0; // Reset to first frame
    }
}

function drawCharacter() {
    const imageIndex = Math.floor(character.frame / character.frameSpeed); // Alternate between 0 and 1
    ctx.drawImage(characterImages[imageIndex], character.x, character.y, character.width, character.height);
}

document.addEventListener('keydown', (e) => {
    if (e.key === ' ' && !character.jumping) { // Spacebar to jump
        character.jumping = true;
        character.velocityY = character.jumpHeight;
    }
});

// Obstacle logic
function updateObstacles() {
    if (Math.random() < 0.01) {
        obstacles.push({
            x: canvas.width,
            y: canvas.height - obstacleHeight,
            width: obstacleWidth,
            height: obstacleHeight
        });
    }

    // Move obstacles left
    for (let i = 0; i < obstacles.length; i++) {
        obstacles[i].x -= 5;

        // Remove obstacles that are off-screen
        if (obstacles[i].x + obstacles[i].width < 0) {
            obstacles.splice(i, 1);
            score++;
        }
    }
}

// Draw obstacles
function drawObstacles() {
    for (let i = 0; i < obstacles.length; i++) {
        ctx.drawImage(obstacleImage, obstacles[i].x, obstacles[i].y, obstacles[i].width, obstacles[i].height);
    }
}

// Collision detection
function detectCollisions() {
    for (let i = 0; i < obstacles.length; i++) {
        if (character.x + character.width > obstacles[i].x &&
            character.x < obstacles[i].x + obstacles[i].width &&
            character.y + character.height > obstacles[i].y) {
            // Collision detected, reset game or stop the game
            alert("Game Over! Score: " + score);
            document.location.reload();
        }
    }
}

// Start the game
gameLoop();
