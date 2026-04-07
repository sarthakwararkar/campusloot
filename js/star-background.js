/**
 * star-background.js
 * High-performance canvas star field with mouse-reactive parallax.
 */

(function initStarBackground() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.zIndex = '-1';
  canvas.style.pointerEvents = 'none';
  canvas.style.background = '#000'; // Fallback / Base background
  document.body.prepend(canvas);

  let width, height;
  let stars = [];
  const starCount = 150;
  let mouseX = 0;
  let mouseY = 0;
  let targetMouseX = 0;
  let targetMouseY = 0;

  class Star {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.size = Math.random() * 1.5 + 0.5;
      this.opacity = Math.random() * 0.5 + 0.3;
      this.speedX = (Math.random() - 0.5) * 0.05;
      this.speedY = (Math.random() - 0.5) * 0.05;
      this.depth = Math.random() * 5 + 1; // Parallax depth
    }

    update() {
      // Gentle drift
      this.x += this.speedX;
      this.y += this.speedY;

      // Mouse parallax
      const moveX = (mouseX - width / 2) * (this.depth / 500);
      const moveY = (mouseY - height / 2) * (this.depth / 500);
      
      this.renderX = this.x + moveX;
      this.renderY = this.y + moveY;

      // Screen wrap
      if (this.renderX < 0) this.x = width;
      if (this.renderX > width) this.x = 0;
      if (this.renderY < 0) this.y = height;
      if (this.renderY > height) this.y = 0;
    }

    draw() {
      ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
      ctx.beginPath();
      ctx.arc(this.renderX, this.renderY, this.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    stars = [];
    for (let i = 0; i < starCount; i++) {
      stars.push(new Star());
    }
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);
    
    // Smooth mouse movement
    mouseX += (targetMouseX - mouseX) * 0.05;
    mouseY += (targetMouseY - mouseY) * 0.05;

    stars.forEach(star => {
      star.update();
      star.draw();
    });
    
    requestAnimationFrame(animate);
  }

  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', (e) => {
    targetMouseX = e.clientX;
    targetMouseY = e.clientY;
  });

  resize();
  animate();
})();
