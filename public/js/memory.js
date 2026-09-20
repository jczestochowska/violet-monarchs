(function () {
  const GRID_COLS = 15;
  const GRID_ROWS = 17;

  const section = document.getElementById('memory-section');
  const grid = document.getElementById('memory-grid');
  const form = document.getElementById('memory-entry-form');
  const input = document.getElementById('memory-entry-input');
  const label = document.getElementById('memory-entry-label');

  function buildGrid() {
    if (!grid || grid.childElementCount > 0) return;
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const cell = document.createElement('div');
        cell.className = 'memory-cell';
        cell.dataset.row = row;
        cell.dataset.col = col;
        grid.appendChild(cell);
      }
    }
  }

  function applyCells(cells) {
    if (!grid || !cells) return;
    cells.forEach(({ row, col, letter }) => {
      const cell = grid.children[row * GRID_COLS + col];
      if (cell) {
        cell.textContent = letter;
        cell.classList.add('revealed');
      }
    });
  }

  function shakeInput() {
    input.classList.add('shake', 'flash-error');
    setTimeout(() => input.classList.remove('shake', 'flash-error'), 600);
  }

  function glitchLabel() {
    if (!label) return;
    label.classList.add('glitch-move', 'memory-label-error');
    clearTimeout(glitchLabel._t);
    glitchLabel._t = setTimeout(() => {
      label.classList.remove('glitch-move', 'memory-label-error');
    }, 2000);
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = input.value;
      if (!text.trim()) return;

      fetch('/api/memory/entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
        .then((r) => r.json())
        .then((data) => {
          input.value = '';
          if (data.found) {
            // No toast here — the newly-revealed letters are the feedback.
            applyCells(data.cells);
          } else {
            shakeInput();
            glitchLabel();
          }
        })
        .catch(() => {
          if (window.showToast) window.showToast('Erreur réseau, réessaye.', true);
        });
    });
  }

  window.unlockMemorySection = function unlockMemorySection() {
    if (section) section.hidden = false;
    buildGrid();
    applyCells(window.MEMORY_REVEALED_CELLS);
  };

  if (section && !section.hidden) {
    buildGrid();
    applyCells(window.MEMORY_REVEALED_CELLS);
  }
})();
