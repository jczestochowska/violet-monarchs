document.addEventListener('DOMContentLoaded', () => {
  const pwdElement = document.getElementById('cryptic-pwd');
  if (!pwdElement) return;

  const card = document.querySelector('.cryptic-card');
  const CARD_MARGIN_PX = 20; // breathing room around the card

  // The element's own (untransformed) box size is constant — only its
  // position/rotation change later. Measured once so the collision check
  // below never has to read getBoundingClientRect() on an element that has
  // a CSS transition in flight (which would report a stale/mid-animation
  // rect, not where it's actually headed).
  let naturalWidth = pwdElement.offsetWidth;
  let naturalHeight = pwdElement.offsetHeight;
  if (document.fonts && document.fonts.ready) {
    // The custom font may not be loaded yet at DOMContentLoaded, which
    // would under/over-measure the text's real size.
    document.fonts.ready.then(() => {
      naturalWidth = pwdElement.offsetWidth;
      naturalHeight = pwdElement.offsetHeight;
    });
  }

  function rectsOverlap(a, b) {
    return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
  }

  // Predicts the axis-aligned bounding box of the (still unpositioned)
  // element once it's placed at (leftPx, topPx) and rotated by tiltDeg —
  // rotation is around the element's own center (the CSS default), so the
  // center stays fixed and the box just grows to fit the rotated corners.
  function predictedRect(leftPx, topPx, tiltDeg) {
    const rad = (tiltDeg * Math.PI) / 180;
    const rotatedWidth = naturalWidth * Math.abs(Math.cos(rad)) + naturalHeight * Math.abs(Math.sin(rad));
    const rotatedHeight = naturalWidth * Math.abs(Math.sin(rad)) + naturalHeight * Math.abs(Math.cos(rad));
    const centerX = leftPx + naturalWidth / 2;
    const centerY = topPx + naturalHeight / 2;
    return {
      left: centerX - rotatedWidth / 2,
      right: centerX + rotatedWidth / 2,
      top: centerY - rotatedHeight / 2,
      bottom: centerY + rotatedHeight / 2,
    };
  }

  function moveCrypticText() {
    const randomTilt = Math.floor(Math.random() * 60) - 30; // -30deg to +30deg
    const MAX_ATTEMPTS = 30;

    const cardRect = card && card.getBoundingClientRect();
    const paddedCardRect = cardRect && {
      left: cardRect.left - CARD_MARGIN_PX,
      right: cardRect.right + CARD_MARGIN_PX,
      top: cardRect.top - CARD_MARGIN_PX,
      bottom: cardRect.bottom + CARD_MARGIN_PX,
    };

    let chosenX = 10;
    let chosenY = 10;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      // Keep text within visible screen bounds (10% to 80% range)
      const randomX = Math.floor(Math.random() * 70) + 10;
      const randomY = Math.floor(Math.random() * 70) + 10;
      chosenX = randomX;
      chosenY = randomY;

      if (!paddedCardRect) break; // nothing to avoid

      const leftPx = (randomX / 100) * window.innerWidth;
      const topPx = (randomY / 100) * window.innerHeight;

      if (!rectsOverlap(predictedRect(leftPx, topPx, randomTilt), paddedCardRect)) break;
    }

    pwdElement.style.top = `${chosenY}vh`;
    pwdElement.style.left = `${chosenX}vw`;
    pwdElement.style.transform = `rotate(${randomTilt}deg)`;
  }

  // Initial placement
  moveCrypticText();

  // Move every 4 seconds
  setInterval(moveCrypticText, 4000);
});
