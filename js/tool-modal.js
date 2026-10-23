/* ============================================================
   tool-modal.js — テスト検証用ツールのクイズで、問題と結果を出す窓
   JSTQB練習問題（js/jstqb.js）の窓と同じ作り（#200）。見た目は reference.css の .tool-modal
   使い方：
     var win = ToolModal({ label: 'QA用語クイズ', onRequestClose: fn });
     win.open('題名') → win.body に描く → win.close()
     win.confirm('メッセージ', 'やめる', 'つづける', fn) … ページの中の確認ポップアップ
   「✕ とじる」と Esc は onRequestClose を呼ぶだけ。確認を挟むかどうかは呼び出し側が決める
   ============================================================ */
(function () {
  'use strict';

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function button(cls, text, fn) {
    var b = el('button', cls, text);
    b.type = 'button';
    b.addEventListener('click', fn);
    return b;
  }

  window.ToolModal = function (opts) {
    function requestClose() { opts.onRequestClose(); }

    var modal = el('dialog', 'tool-modal');
    modal.setAttribute('aria-label', opts.label);
    var bar = el('div', 'tool-modal-bar');
    var title = el('span', 'tool-modal-title');
    bar.appendChild(title);
    bar.appendChild(button('tool-modal-close', '✕ とじる', requestClose));
    var body = el('div', 'tool-modal-body');
    modal.appendChild(bar);
    modal.appendChild(body);
    document.body.appendChild(modal);

    // Esc でいきなり閉じず、とじるボタンと同じ道を通す
    modal.addEventListener('cancel', function (e) { e.preventDefault(); requestClose(); });

    // 確認は窓の中に出す小さなポップアップ。ブラウザ標準の confirm は画面の上端に出て、
    // 解いている窓から目が離れてしまうため
    var ask = el('dialog', 'tool-ask');
    var askMsg = el('p', 'tool-ask-msg');
    var askRow = el('div', 'tool-ask-row');
    var askDone = null;
    var askNo = button('tool-ask-no', '', function () { askDone = null; ask.close(); });
    var askYes = button('tool-ask-yes', '', function () {
      var fn = askDone; askDone = null;
      ask.close();
      if (fn) fn();
    });
    askRow.appendChild(askNo);
    askRow.appendChild(askYes);
    ask.appendChild(askMsg);
    ask.appendChild(askRow);
    document.body.appendChild(ask);

    return {
      body: body,
      open: function (text) {
        title.textContent = text;
        body.scrollTop = 0;
        if (!modal.open) {
          modal.showModal();
          document.documentElement.classList.add('tool-locked');
        }
      },
      close: function () {
        if (modal.open) modal.close();
        document.documentElement.classList.remove('tool-locked');
      },
      confirm: function (msg, yesLabel, noLabel, fn) {
        askMsg.textContent = msg;
        askYes.textContent = yesLabel;
        askNo.textContent = noLabel;
        askDone = fn;
        ask.showModal();
        askNo.focus();   // うっかり Enter で破棄しないよう、残るほうを選んでおく
      }
    };
  };
})();
