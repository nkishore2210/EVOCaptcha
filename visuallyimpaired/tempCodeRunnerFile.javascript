// Dino Game Logic: Pure JavaScript (No UI)

const game = {
  dino: { position: 0, jumping: false },
  obstacles: [],
  gameSpeed: 1000, // Speed of obstacles (time in ms between each obstacle)
  score: 0,
  gameInterval: null,
  
  // Initialize the game
  startGame: function () {
    console.log("Game Started!");
    this.score = 0;
    this.dino.position = 0;
    this.dino.jumping = false;
    this.obstacles = [];
    
    // Start generating obstacles at intervals
    this.generateObstacles();
    
    // Start the game loop
    this.gameInterval = setInterval(() => this.gameLoop(), this.gameSpeed);
  },

  // Main game loop
  gameLoop: function () {
    // Check for collision
    this.checkCollision();
    
    // Update obstacles position and spawn new ones
    this.moveObstacles();
    
    // Update score
    this.score++;
    
    // Print score and position
    console.log(`Score: ${this.score} | Dino Position: ${this.dino.position}`);
  },
  
  // Generate new obstacles
  generateObstacles: function () {
    setInterval(() => {
      if (!this.dino.jumping) {
        const newObstacle = { position: 10 + Math.floor(Math.random() * 10) }; // Random obstacle
        this.obstacles.push(newObstacle);
        console.log("New obstacle spawned at position:", newObstacle.position);
      }
    }, this.gameSpeed);
  },

  // Move obstacles
  moveObstacles: function () {
    this.obstacles.forEach((obstacle, index) => {
      obstacle.position--;
      
      // If obstacle has passed Dino, remove it
      if (obstacle.position <= 0) {
        this.obstacles.splice(index, 1);
      }
    });
  },
  
  // Jump function
  jump: function () {
    if (!this.dino.jumping) {
      this.dino.jumping = true;
      console.log("Dino is jumping!");
      
      // After a short time, Dino stops jumping
      setTimeout(() => {
        this.dino.jumping = false;
        console.log("Dino landed!");
      }, 500); // Dino stays in the air for 0.5s
    }
  },
  
  // Check for collision with obstacles
  checkCollision: function () {
    if (this.dino.jumping) return; // If Dino is jumping, no collision check
    
    this.obstacles.forEach((obstacle) => {
      if (obstacle.position <= 2) { // Close enough to the Dino to collide
        console.log("Game Over! Dino hit an obstacle.");
        clearInterval(this.gameInterval); // Stop the game loop
      }
    });
  },
};

// Start the game
game.startGame();

// Simulate a "jump" when the player presses a key (for example: spacebar)
document.addEventListener("keydown", (event) => {
  if (event.key === " " || event.key === "ArrowUp") { // Jump on space or up arrow
    game.jump();
  }
});
