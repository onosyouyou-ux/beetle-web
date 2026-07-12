'use client';

import { useEffect, useState } from 'react';

/** 本体サイトの .scroll-top-float と同じ見た目・挙動の「上に戻る」ボタン */
export default function ScrollTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 300);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <button
      type="button"
      className={`scroll-top-float${visible ? ' visible' : ''}`}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="ページ上部へ戻る"
    >
      ↑
    </button>
  );
}
