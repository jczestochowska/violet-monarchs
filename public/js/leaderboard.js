(function () {
  const POLL_INTERVAL_MS = 5000;
  const container = document.getElementById('leaderboard-container');
  const answerForm = document.getElementById('puzzle-answer-form');
  const answerInput = document.getElementById('puzzle-answer-input');

  function formatTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  function showToast(message, isError) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.toggle('toast-success', !isError);
    toast.hidden = false;
    toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => {
      toast.classList.remove('show');
      toast.hidden = true;
    }, 2500);
  }

  function shakeAnswerBox() {
    answerInput.classList.add('shake', 'flash-error');
    setTimeout(() => answerInput.classList.remove('shake', 'flash-error'), 600);
  }

  const MEDAL_EMOJI = { gold: '🥇', silver: '🥈', bronze: '🥉' };

  function render(data) {
    const table = document.createElement('table');
    table.className = 'leaderboard-table';

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    headRow.appendChild(document.createElement('th'));
    data.puzzleIds.forEach((pid) => {
      const th = document.createElement('th');
      th.textContent = pid;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    const rowsByUser = new Map(data.rows.map((r) => [r.user, r]));

    data.rankedOrder.forEach((user) => {
      const rowData = rowsByUser.get(user);
      const tr = document.createElement('tr');
      if (user === data.currentUser) tr.classList.add('own-row');

      const nameTd = document.createElement('td');
      nameTd.textContent = user;
      nameTd.className = 'guest-name';
      tr.appendChild(nameTd);

      data.puzzleIds.forEach((pid) => {
        const td = document.createElement('td');
        td.className = 'puzzle-cell';
        const solvedAt = rowData.solves[pid];

        if (solvedAt) {
          const medal = data.medalsByPuzzle && data.medalsByPuzzle[pid] && data.medalsByPuzzle[pid][user];
          const check = document.createElement('span');
          check.className = 'check';
          check.textContent = medal ? MEDAL_EMOJI[medal] : '✓';
          const ts = document.createElement('span');
          ts.className = 'timestamp';
          ts.textContent = formatTime(solvedAt);
          td.appendChild(check);
          td.appendChild(ts);
        } else {
          const empty = document.createElement('span');
          empty.className = 'checkbox-empty';
          td.appendChild(empty);
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    container.innerHTML = '';
    container.appendChild(table);
  }

  function fetchAndRender() {
    fetch('/api/leaderboard')
      .then((r) => r.json())
      .then(render)
      .catch(() => {
        /* transient network hiccup, next poll will retry */
      });
  }

  answerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const answer = answerInput.value;
    if (!answer.trim()) return;

    fetch('/api/puzzles/solve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.correct) {
          answerInput.value = '';
          showToast('Bonne réponse !');
          fetchAndRender();
        } else {
          shakeAnswerBox();
          showToast('Mauvaise réponse, réessaye !', true);
        }
      })
      .catch(() => showToast('Erreur réseau, réessaye.', true));
  });

  const initialDataEl = document.getElementById('leaderboard-initial-data');
  if (initialDataEl) {
    try {
      render(JSON.parse(initialDataEl.textContent));
    } catch (e) {
      fetchAndRender();
    }
  } else {
    fetchAndRender();
  }

  setInterval(fetchAndRender, POLL_INTERVAL_MS);
})();
