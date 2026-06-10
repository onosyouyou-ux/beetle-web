'use client';

import { IconMoodSad, IconCircleCheck, IconHelpCircle } from '@tabler/icons-react';
import TicketCard from './TicketCard';
import type { ScanResult, Ticket } from '@/lib/claude';

export default function VerdictCard({ result }: { result: ScanResult & { remaining: number } }) {
  const { verdict, reason, tickets } = result;

  return (
    <div className="mt-5">
      {verdict === 'bug' && (
        <div className="bg-[#fcebeb] border-[0.5px] border-[#f7c1c1] rounded-xl p-4 animate-verdict-pop">
          <div className="text-[20px] font-semibold text-[#a32d2d] mb-[6px] flex items-center gap-2">
            <IconMoodSad size={22} />
            残念... バグです。
          </div>
          <div className="text-[12px] text-[#5f5e5a] leading-relaxed mt-1">{reason}</div>
        </div>
      )}

      {verdict === 'not_bug' && (
        <div className="bg-[#eaf3de] border-[0.5px] border-[#c0dd97] rounded-xl p-4 animate-verdict-pop">
          <div className="text-[20px] font-semibold text-[#3b6d11] mb-[6px] flex items-center gap-2">
            <IconCircleCheck size={22} />
            バグではなさそうです
          </div>
          <div className="text-[12px] text-[#5f5e5a] leading-relaxed mt-1">{reason}</div>
        </div>
      )}

      {verdict === 'unclear' && (
        <div className="bg-[#faeeda] border-[0.5px] border-[#fac775] rounded-xl p-4 animate-verdict-pop">
          <div className="text-[20px] font-semibold text-[#854f0b] mb-[6px] flex items-center gap-2">
            <IconHelpCircle size={22} />
            判断が難しいです
          </div>
          <div className="text-[12px] text-[#5f5e5a] leading-relaxed mt-1">{reason}</div>
        </div>
      )}

      {verdict === 'bug' && tickets && tickets.length > 0 && (
        <>
          {tickets.length > 1 && (
            <div className="text-[11px] text-[#a32d2d] font-semibold mt-4 mb-1">
              {tickets.length}件のバグが検出されました
            </div>
          )}
          {tickets.map((t: Ticket) => <TicketCard key={t.id} ticket={t} />)}
        </>
      )}
    </div>
  );
}
