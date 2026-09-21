(function () {
  // Popup shown when a keyword reveals the next photo, keyed by the new stage.
  const ADVANCE_MESSAGES = {
    2: 'Bravo, maintenant ils se sont déplacés...',
    3: 'Encore un petit effort...',
  };

  const photos = document.getElementById('osint-photos');
  const form = document.getElementById('osint-form');
  const input = document.getElementById('osint-input');
  const popup = document.getElementById('osint-popup');
  const popupText = document.getElementById('osint-popup-text');
  const popupClose = document.getElementById('osint-popup-close');
  const lightbox = document.getElementById('osint-lightbox');
  const lightboxImg = document.getElementById('osint-lightbox-img');
  if (!photos || !form) return;

  function openLightbox(img) {
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt;
    lightbox.hidden = false;
  }

  function closeLightbox() {
    lightbox.hidden = true;
    lightboxImg.removeAttribute('src');
  }

  // Delegated so photos revealed later (below) are clickable too.
  photos.addEventListener('click', (e) => {
    const slot = e.target.closest('.osint-slot-open');
    if (slot) openLightbox(slot.querySelector('img'));
  });
  lightbox.addEventListener('click', closeLightbox);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !lightbox.hidden) closeLightbox();
  });

  popupClose.addEventListener('click', () => {
    popup.hidden = true;
  });
  popup.addEventListener('click', (e) => {
    if (e.target === popup) popup.hidden = true;
  });

  function revealPhoto(n) {
    const slot = photos.querySelector(`.osint-slot-locked[data-photo="${n}"]`);
    if (!slot) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'osint-slot osint-slot-open osint-slot-reveal';
    button.dataset.photo = String(n);
    button.setAttribute('aria-label', `Agrandir la photo ${n}`);
    const img = document.createElement('img');
    img.src = `/osint/photo/${n}`;
    img.alt = `Photo ${n}`;
    button.appendChild(img);
    slot.replaceWith(button);
  }

  function shakeInput() {
    input.classList.add('shake', 'flash-error');
    setTimeout(() => input.classList.remove('shake', 'flash-error'), 600);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value;
    if (!text.trim()) return;

    fetch('/api/osint/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.result === 'advanced') {
          input.value = '';
          revealPhoto(data.stage);
          popupText.textContent = ADVANCE_MESSAGES[data.stage] || '';
          popup.hidden = false;
        } else if (data.result === 'solved') {
          // Same feedback as a correct answer in the main box.
          input.value = '';
          window.showToast('Bonne réponse !');
          window.refreshLeaderboard();
        } else {
          shakeInput();
          window.showToast('Mauvaise réponse, réessaye !', true);
        }
      })
      .catch(() => window.showToast('Erreur réseau, réessaye.', true));
  });
})();
