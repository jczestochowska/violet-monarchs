(function () {
  const GRID_SIZE = window.GRID_SIZE || 5;
  const CURRENT_USER = window.CURRENT_USER;
  const ALL_GUESTS = window.ALL_GUESTS || [];

  const modal = document.getElementById('bingo-modal');
  const modalTask = document.getElementById('bingo-modal-task');
  const modalForm = document.getElementById('bingo-modal-form');
  const modalError = document.getElementById('bingo-modal-error');
  const modalClose = document.getElementById('bingo-modal-close');
  const nameSelect = document.getElementById('bingo-person-name');
  const photoInput = document.getElementById('bingo-person-photo');
  const submitBtn = document.getElementById('bingo-modal-submit');

  const popup = document.getElementById('bingo-popup');
  const popupClose = document.getElementById('bingo-popup-close');

  let activeCellButton = null;

  // Seeded from cells already solved server-side, so a guest can't reuse the
  // same person across two cells even before their first submit this session.
  const usedNames = new Set();
  document.querySelectorAll('.bingo-cell[data-submitted-name]').forEach((btn) => {
    const name = btn.dataset.submittedName;
    if (name) usedNames.add(name);
  });

  function populateNameOptions() {
    nameSelect.innerHTML = '<option value="" disabled selected>Choisis un nom</option>';
    ALL_GUESTS.filter((g) => g !== CURRENT_USER && !usedNames.has(g))
      .sort((a, b) => a.localeCompare(b, 'fr'))
      .forEach((g) => {
        const option = document.createElement('option');
        option.value = g;
        option.textContent = g;
        nameSelect.appendChild(option);
      });
  }

  function openModalFor(button) {
    activeCellButton = button;
    modalTask.textContent = button.dataset.description;
    modalError.hidden = true;
    populateNameOptions();
    photoInput.value = '';
    modal.hidden = false;
  }

  function closeModal() {
    modal.hidden = true;
    modalError.hidden = true;
    activeCellButton = null;
  }

  document.querySelectorAll('.bingo-cell').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.solved === 'true') return;
      openModalFor(btn);
    });
  });

  modalClose.addEventListener('click', closeModal);
  nameSelect.addEventListener('change', () => {
    modalError.hidden = true;
  });

  // Clicking the dark backdrop (not the box itself) also dismisses it, same
  // as pressing Escape — both close without requiring a name/photo.
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });

  function cellIdsForLine(line) {
    const ids = [];
    if (line.type === 'row') {
      for (let col = 0; col < GRID_SIZE; col++) ids.push(`r${line.index}c${col}`);
    } else {
      for (let row = 0; row < GRID_SIZE; row++) ids.push(`r${row}c${line.index}`);
    }
    return ids;
  }

  function markCellSolved(button, letter, submittedName) {
    button.dataset.solved = 'true';
    button.dataset.submittedName = submittedName;
    button.classList.add('solved');
    button.innerHTML = `<span class="bingo-letter">${letter}</span>`;
  }

  function highlightCompletedLines(lineCompleted, showPrizePopup) {
    if (!lineCompleted || lineCompleted.length === 0) return;
    lineCompleted.forEach((line) => {
      cellIdsForLine(line).forEach((id) => {
        const cell = document.querySelector(`.bingo-cell[data-cell-id="${id}"]`);
        if (cell) cell.classList.add('line-complete');
      });
    });
    if (showPrizePopup) popup.hidden = false;
  }

  popupClose.addEventListener('click', () => {
    popup.hidden = true;
  });

  modalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!activeCellButton) return;

    const cellId = activeCellButton.dataset.cellId;
    const selectedName = nameSelect.value;
    const formData = new FormData();
    formData.append('personName', selectedName);
    formData.append('selfie', photoInput.files[0]);

    submitBtn.disabled = true;
    fetch(`/api/bingo/${encodeURIComponent(cellId)}/solve`, {
      method: 'POST',
      body: formData,
    })
      .then((r) => r.json())
      .then((data) => {
        submitBtn.disabled = false;
        if (data.correct) {
          usedNames.add(selectedName);
          markCellSolved(activeCellButton, data.letter, selectedName);
          closeModal();
          highlightCompletedLines(data.lineCompleted, data.showPrizePopup);
        } else {
          modalError.textContent =
            data.error || "Ce nom ne correspond pas à cette case, réessaye avec quelqu'un d'autre.";
          modalError.hidden = false;
        }
      })
      .catch(() => {
        submitBtn.disabled = false;
        modalError.textContent = 'Erreur réseau, réessaye.';
        modalError.hidden = false;
      });
  });
})();
