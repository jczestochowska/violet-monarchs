document.addEventListener('DOMContentLoaded', () => {
  const pwdElement = document.getElementById('cryptic-pwd');
  if (!pwdElement) return;

  function moveCrypticText() {
    // Keep text within visible screen bounds (10% to 80% range)
    const randomX = Math.floor(Math.random() * 70) + 10;
    const randomY = Math.floor(Math.random() * 70) + 10;
    
    // Random angle between -30deg and +30deg
    const randomTilt = Math.floor(Math.random() * 60) - 30;

    pwdElement.style.top = `${randomY}vh`;
    pwdElement.style.left = `${randomX}vw`;
    pwdElement.style.transform = `rotate(${randomTilt}deg)`;
  }

  // Initial placement
  moveCrypticText();

  // Move every 4 seconds
  setInterval(moveCrypticText, 4000);
});