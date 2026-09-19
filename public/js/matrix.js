document.addEventListener('DOMContentLoaded', () => {
  // Création dynamique du canvas en arrière-plan
  const canvas = document.createElement('canvas');
  canvas.id = 'matrix-canvas';
  document.body.prepend(canvas);

  const ctx = canvas.getContext('2d');

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*';
  const fontSize = 14;
  let columns = Math.floor(canvas.width / fontSize);
  let drops = Array(columns).fill(1);

  function draw() {
    // Fondu noir transparent pour laisser une traînée
    ctx.fillStyle = 'rgba(13, 13, 13, 0.08)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#00ff66';
    ctx.font = `${fontSize}px monospace`;

    for (let i = 0; i < drops.length; i++) {
      const text = characters.charAt(Math.floor(Math.random() * characters.length));
      ctx.fillText(text, i * fontSize, drops[i] * fontSize);

      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i]++;
    }
  }

  setInterval(draw, 33); // ~30 fps
});