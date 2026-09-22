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

  const usedNamesCount = document.getElementById('bingo-used-names-count');
  const usedNamesList = document.getElementById('bingo-used-names-list');

  let activeCellButton = null;

  // Seeded from cells already solved server-side, so a guest can't reuse the
  // same person across two cells even before their first submit this session.
  const usedNames = new Set();
  document.querySelectorAll('.bingo-cell[data-submitted-name]').forEach((btn) => {
    const name = btn.dataset.submittedName;
    if (name) usedNames.add(name);
  });

  function labelFor(name) {
    const guest = ALL_GUESTS.find((g) => g.name === name);
    return guest ? guest.label : name;
  }

  // Keeps the "already used" list under the poem in sync with usedNames —
  // called once a submission is confirmed correct.
  function addUsedNameChip(name) {
    const empty = usedNamesList.querySelector('.bingo-used-names-empty');
    if (empty) empty.remove();
    const chip = document.createElement('span');
    chip.className = 'bingo-used-name-chip';
    chip.textContent = labelFor(name);
    usedNamesList.appendChild(chip);
    usedNamesCount.textContent = String(usedNames.size);
  }

  function populateNameOptions() {
    nameSelect.innerHTML = '<option value="" disabled selected>Choisis un nom</option>';
    // The option value stays the guest's identity name (what the server
    // stores and checks); the visible label is their full name. Names
    // already used elsewhere in the grid stay in the list — struck through
    // and disabled — instead of disappearing, so guests can see who's taken.
    ALL_GUESTS.filter((g) => g.name !== CURRENT_USER)
      .sort((a, b) => a.label.localeCompare(b.label, 'fr'))
      .forEach((g) => {
        const option = document.createElement('option');
        option.value = g.name;
        option.textContent = g.label;
        if (usedNames.has(g.name)) {
          option.disabled = true;
          option.className = 'bingo-name-used';
        }
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

  // Re-clicking an already-solved cell is a read-only recap: what the task
  // was and who was picked for it, shown in the shared answer popup.
  function showSolvedCellPopup(button) {
    const description = button.dataset.description;
    const label = labelFor(button.dataset.submittedName);
    window.showAnswerPopup(`« ${description} » : tu as choisi ${label} pour cette case`);
  }

  document.querySelectorAll('.bingo-cell').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.solved === 'true') {
        showSolvedCellPopup(btn);
        return;
      }
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
          addUsedNameChip(selectedName);
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
