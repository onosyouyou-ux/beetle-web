'use client';

import { IconSearch } from '@tabler/icons-react';

interface Props {
  disabled: boolean;
  onClick: () => void;
}

export default function ScanButton({ disabled, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full max-w-[340px] mx-auto py-3 bg-ink text-white border-none rounded-lg text-[14px] font-mono font-bold tracking-[0.04em] cursor-pointer transition-all duration-150 flex items-center justify-center gap-2
        hover:not-disabled:opacity-85 active:not-disabled:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <IconSearch size={16} />
      バグスキャン実行
    </button>
  );
}
