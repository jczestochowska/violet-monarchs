(function () {
  const input = document.getElementById('password');
  const toggle = document.getElementById('toggle-password');

  toggle.addEventListener('click', () => {
    const showing = input.type === 'text';
    input.type = showing ? 'password' : 'text';
    toggle.setAttribute('aria-label', showing ? 'Afficher le mot de passe' : 'Masquer le mot de passe');
    toggle.textContent = showing ? '👁' : '🙈';
  });

  const popup = document.getElementById('common-password-popup');
  const popupClose = document.getElementById('common-password-popup-close');
  if (popup && popupClose) {
    popupClose.addEventListener('click', () => {
      popup.hidden = true;
      input.focus();
    });
  }
})();
