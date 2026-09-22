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

  // Shared with public/js/memory.js.
  window.showToast = showToast;

  // Correct/wrong answer feedback popup, shared with public/js/osint.js — a
  // modal is much harder to miss than the toast at the bottom of the screen.
  const answerPopup = document.getElementById('answer-popup');
  const answerPopupText = document.getElementById('answer-popup-text');
  const answerPopupClose = document.getElementById('answer-popup-close');

  // variant: 'error' (wrong answer, red) | 'hint' (close but not quite,
  // orange) | omitted (correct/informational, default green).
  function showAnswerPopup(message, variant) {
    answerPopupText.textContent = message;
    answerPopup.classList.toggle('popup-error', variant === 'error');
    answerPopup.classList.toggle('popup-hint', variant === 'hint');
    answerPopup.hidden = false;
  }

  answerPopupClose.addEventListener('click', () => {
    answerPopup.hidden = true;
  });
  answerPopup.addEventListener('click', (e) => {
    if (e.target === answerPopup) answerPopup.hidden = true;
  });

  // Shared with public/js/osint.js.
  window.showAnswerPopup = showAnswerPopup;

  const islandePopup = document.getElementById('islande-popup');
  const islandePopupClose = document.getElementById('islande-popup-close');
  if (islandePopupClose) {
    islandePopupClose.addEventListener('click', () => {
      islandePopup.hidden = true;
    });
  }
  if (islandePopup) {
    islandePopup.addEventListener('click', (e) => {
      if (e.target === islandePopup) islandePopup.hidden = true;
    });
  }

  const MEDAL_EMOJI = { gold: '🥇', silver: '🥈', bronze: '🥉' };

  // One emoji per puzzle topic, shown in place of the puzzle id once the
  // viewing guest has solved it themselves (see solvedByCurrentUser below).
  const TOPIC_EMOJI = {
    ENTER: '🚪',
    PAIR: '🃏',
    OSINT: '📍',
    BOOK: '📖',
    BINGO: '⭐',
    MEMORY: '🧠',
    VOLCANO: '🌋',
  };

  function render(data) {
    const table = document.createElement('table');
    table.className = 'leaderboard-table';

    const rowsByUser = new Map(data.rows.map((r) => [r.user, r]));
    const currentUserRow = rowsByUser.get(data.currentUser);

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    headRow.appendChild(document.createElement('th'));
    data.puzzleIds.forEach((pid) => {
      const th = document.createElement('th');
      // Only reveal the topic to a guest once *they* have solved it — not as
      // soon as anyone has, so puzzle names stay hidden from those who
      // haven't found them yet.
      const solvedByCurrentUser = currentUserRow && currentUserRow.solves[pid];
      th.textContent = solvedByCurrentUser ? (TOPIC_EMOJI[pid] || '❓') : '?';
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

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
          check.textContent = medal ? MEDAL_EMOJI[medal] : '';
          const ts = document.createElement('span');
          ts.className = 'timestamp';
          ts.textContent = formatTime(solvedAt);
          td.appendChild(check);
          td.appendChild(ts);
        } else if (rowData.blocks && rowData.blocks[pid]) {
          const blocked = document.createElement('span');
          blocked.className = 'checkbox-blocked';
          blocked.textContent = '✕';
          td.appendChild(blocked);
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
          showAnswerPopup('Bonne réponse !');
          fetchAndRender();
        } else if (data.memoryUnlocked) {
          // Secret keyword, not a puzzle answer: no leaderboard change, and
          // no "correct answer" toast either — a coy popup nudges the guest
          // toward the newly-revealed section instead of confirming a win.
          answerInput.value = '';
          if (islandePopup) islandePopup.hidden = false;
          if (typeof window.unlockMemorySection === 'function') {
            window.unlockMemorySection();
          }
        } else {
          shakeAnswerBox();
          // data.error, when present, is a rate-limit message and takes
          // priority over the generic "wrong answer" wording.
          showAnswerPopup(data.error || `« ${answer.trim()} » n'est pas une solution`, 'error');
        }
      })
      .catch(() => showToast('Erreur réseau, réessaye.', true));
  });

  // Shared with public/js/osint.js.
  window.refreshLeaderboard = fetchAndRender;

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
