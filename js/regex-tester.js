(function () {
  const patternInput = document.getElementById('rt-pattern');
  const flagsInput = document.getElementById('rt-flags');
  const stringInput = document.getElementById('rt-string');
  const statusEl = document.getElementById('rt-status');
  const outputEl = document.getElementById('rt-output');

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function update() {
    const pattern = patternInput.value;
    const flags = flagsInput.value;
    const text = stringInput.value;

    if (!pattern) {
      statusEl.textContent = 'パターンを入力してね';
      statusEl.className = 'rt-status';
      outputEl.innerHTML = text ? escapeHtml(text) : '<span class="rt-placeholder">（文字列を入力してね）</span>';
      return;
    }

    let re;
    try {
      const globalFlags = flags.includes('g') ? flags : flags + 'g';
      re = new RegExp(pattern, globalFlags);
    } catch (e) {
      statusEl.textContent = '正規表現が不正: ' + e.message;
      statusEl.className = 'rt-status rt-status-error';
      outputEl.innerHTML = text ? escapeHtml(text) : '';
      return;
    }

    let match;
    let lastIndex = 0;
    let html = '';
    let count = 0;
    re.lastIndex = 0;
    while ((match = re.exec(text)) !== null) {
      count++;
      html += escapeHtml(text.slice(lastIndex, match.index));
      html += '<mark>' + escapeHtml(match[0] || ' ') + '</mark>';
      lastIndex = match.index + match[0].length;
      if (match[0].length === 0) {
        re.lastIndex++;
      }
      if (count > 5000) break; // 暴走防止
    }
    html += escapeHtml(text.slice(lastIndex));
    outputEl.innerHTML = html || '<span class="rt-placeholder">（文字列を入力してね）</span>';

    if (count > 0) {
      statusEl.textContent = `✓ ${count}件マッチ`;
      statusEl.className = 'rt-status rt-status-ok';
    } else {
      statusEl.textContent = '✕ マッチなし';
      statusEl.className = 'rt-status rt-status-none';
    }
  }

  [patternInput, flagsInput, stringInput].forEach((el) => {
    el.addEventListener('input', update);
  });

  document.querySelectorAll('.rt-use-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      patternInput.value = btn.dataset.pattern || '';
      flagsInput.value = btn.dataset.flags || '';
      stringInput.value = btn.dataset.sample || '';
      update();
      document.getElementById('tester').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  update();
})();
