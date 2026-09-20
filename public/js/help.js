(function () {
  const button = document.getElementById('help-button');
  const modal = document.getElementById('help-modal');
  const form = document.getElementById('help-form');
  const textarea = document.getElementById('help-message');
  const cancel = document.getElementById('help-cancel');
  const submit = document.getElementById('help-submit');
  const errorBanner = document.getElementById('help-error');

  function openModal() {
    errorBanner.hidden = true;
    modal.hidden = false;
    textarea.focus();
  }

  function closeModal() {
    modal.hidden = true;
    textarea.value = '';
    errorBanner.hidden = true;
  }

  button.addEventListener('click', openModal);
  cancel.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const message = textarea.value.trim();
    if (!message) return;

    submit.disabled = true;
    fetch('/api/help', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    })
      .then((r) => r.json())
      .then((data) => {
        submit.disabled = false;
        if (data.ok) {
          closeModal();
          if (window.showToast) window.showToast('Message envoyé !');
        } else {
          errorBanner.textContent = data.error || 'Erreur, réessaye.';
          errorBanner.hidden = false;
        }
      })
      .catch(() => {
        submit.disabled = false;
        errorBanner.textContent = 'Erreur réseau, réessaye.';
        errorBanner.hidden = false;
      });
  });
})();
