'use client';

import { IconCheck } from '@tabler/icons-react';

interface Props {
  phase: number; // 0=hidden 1=step1 active 2=step2 active 3=step3 active 4=all done
}

type StepStatus = 'idle' | 'active' | 'done';

function stepStatus(stepNum: number, phase: number): StepStatus {
  if (phase === 0) return 'idle';
  if (phase > stepNum) return 'done';
  if (phase === stepNum) return 'active';
  return 'idle';
}

function StepIcon({ status }: { status: StepStatus }) {
  if (status === 'done') {
    return (
      <div className="w-5 h-5 rounded-full border border-[#639922] bg-[#eaf3de] text-[#3b6d11] flex items-center justify-center flex-shrink-0 transition-all duration-300">
        <IconCheck size={11} />
      </div>
    );
  }
  if (status === 'active') {
    return (
      <div className="w-5 h-5 rounded-full border border-ink bg-ink flex items-center justify-center flex-shrink-0">
        <div className="w-[14px] h-[14px] border-2 border-[#c8c7c0] border-t-white rounded-full animate-spin-ring" />
      </div>
    );
  }
  return (
    <div className="w-5 h-5 rounded-full border border-[#c8c7c0] flex items-center justify-center flex-shrink-0 text-[11px] text-[#b4b2a9]" />
  );
}

const STEPS = [
  { num: 1, label: '画像を解析中...' },
  { num: 2, label: 'UIパターンを確認中...' },
  { num: 3, label: 'バグ判定中...' },
];

export default function ScanningArea({ phase }: Props) {
  if (phase === 0) return null;

  return (
    <div className="mt-5">
      <div className="p-4 bg-[#fafaf8] rounded-xl border-[0.5px] border-[#e0dfd8]">
        <div className="flex flex-col gap-[10px]">
          {STEPS.map(({ num, label }) => {
            const status = stepStatus(num, phase);
            return (
              <div
                key={num}
                className={`flex items-center gap-[10px] text-[13px] transition-colors duration-300
                  ${status === 'active' ? 'text-ink' : status === 'done' ? 'text-[#3b6d11]' : 'text-[#b4b2a9]'}`}
              >
                <StepIcon status={status} />
                <span>{label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
