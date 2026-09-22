(function () {
  // Popup shown when a keyword reveals the next photo, keyed by the new stage.
  const ADVANCE_MESSAGES = {
    2: 'Bravo, maintenant ils se sont déplacés...',
    3: 'Encore un petit effort...',
  };

  const photos = document.getElementById('osint-photos');
  const form = document.getElementById('osint-form');
  const input = document.getElementById('osint-input');
  const lightbox = document.getElementById('osint-lightbox');
  const lightboxImg = document.getElementById('osint-lightbox-img');
  const lightboxClose = document.getElementById('osint-lightbox-close');
  if (!photos) return;

  // Opening pushes a history entry so a phone's back button/gesture closes
  // the lightbox instead of leaving the page. Closing any other way (X,
  // click, Escape) pops that entry again so a real back press still only
  // takes one tap to leave the page.
  let lightboxHistoryPushed = false;

  function openLightbox(img) {
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt;
    lightbox.hidden = false;
    history.pushState({ osintLightbox: true }, '');
    lightboxHistoryPushed = true;
  }

  function closeLightbox(options) {
    if (lightbox.hidden) return;
    lightbox.hidden = true;
    lightboxImg.removeAttribute('src');
    const fromPopstate = options && options.fromPopstate;
    if (lightboxHistoryPushed) {
      lightboxHistoryPushed = false;
      if (!fromPopstate) history.back();
    }
  }

  // Delegated so photos revealed later (below) are clickable too.
  photos.addEventListener('click', (e) => {
    const slot = e.target.closest('.osint-slot-open');
    if (slot) openLightbox(slot.querySelector('img'));
  });
  lightbox.addEventListener('click', () => closeLightbox());
  lightboxClose.addEventListener('click', (e) => {
    e.stopPropagation();
    closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !lightbox.hidden) closeLightbox();
  });
  window.addEventListener('popstate', () => {
    if (!lightbox.hidden) closeLightbox({ fromPopstate: true });
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

  // Already solved on page load: the server didn't render the form.
  if (!form) return;

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
          window.showAnswerPopup(ADVANCE_MESSAGES[data.stage] || '');
        } else if (data.result === 'solved') {
          // Same feedback as a correct answer in the main box; nothing left to
          // answer, so the form goes away.
          form.remove();
          window.showAnswerPopup('Bonne réponse !');
          window.refreshLeaderboard();
        } else if (data.result === 'hint') {
          // Close, but not the exact expected word — an encouraging nudge,
          // not a wrong-answer popup (no shake, keeps their input as-is).
          window.showAnswerPopup(data.message, 'hint');
        } else {
          shakeInput();
          // data.error, when present, is a rate-limit message and takes
          // priority over the generic "wrong answer" wording.
          window.showAnswerPopup(data.error || `« ${text.trim()} » n'est pas une solution`, 'error');
        }
      })
      .catch(() => window.showToast('Erreur réseau, réessaye.', true));
  });
})();
