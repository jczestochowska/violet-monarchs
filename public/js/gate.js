(function () {
  const input = document.getElementById('password');
  const toggle = document.getElementById('toggle-password');

  toggle.addEventListener('click', () => {
    const showing = input.type === 'text';
    input.type = showing ? 'password' : 'text';
    toggle.setAttribute('aria-label', showing ? 'Afficher le mot de passe' : 'Masquer le mot de passe');
    toggle.textContent = showing ? '👁' : '🙈';
  });
})();
