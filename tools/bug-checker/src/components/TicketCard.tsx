'use client';

import { useState } from 'react';
import { IconTicket, IconAlertTriangle, IconTag, IconUser, IconCopy, IconCheck } from '@tabler/icons-react';
import type { Ticket } from '@/lib/claude';

export default function TicketCard({ ticket }: { ticket: Ticket }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const text = [
      `【${ticket.id}】${ticket.title}`,
      `深刻度: ${ticket.severity} / カテゴリ: ${ticket.category}`,
      '',
      '■ 概要', ticket.description,
      '',
      '■ 再現手順', ...ticket.steps.map((s, i) => `${i + 1}. ${s}`),
      '',
      '■ 期待する動作', ticket.expected,
      '',
      '■ 実際の動作', ticket.actual,
      '',
      '■ 環境', ticket.env,
    ].join('\n');

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div style={{ animation: 'slideDown 0.4s ease 0.2s both' }}>
      <div className="text-[10px] font-mono text-[#b4b2a9] tracking-[0.08em] uppercase mt-[14px] mb-[6px] flex items-center gap-1">
        <IconTicket size={11} />
        自動生成された起票内容
      </div>

      <div className="bg-white border-[0.5px] border-[#e0dfd8] rounded-xl overflow-hidden">
        <div className="px-[14px] py-[10px] border-b border-[#e0dfd8] flex gap-2 items-start">
          <div className="text-[10px] font-mono text-[#b4b2a9] pt-[2px] whitespace-nowrap">{ticket.id}</div>
          <div className="text-[13px] font-semibold leading-snug text-ink">{ticket.title}</div>
        </div>

        <div className="px-[14px] py-[7px] flex gap-3 bg-[#fafaf8] border-b border-[#e0dfd8] flex-wrap">
          <div className="text-[11px] text-muted flex items-center gap-1">
            <IconAlertTriangle size={12} />
            <span className="text-[10px] px-[7px] py-[1px] rounded-full bg-[#fcebeb] text-[#a32d2d] font-semibold">{ticket.severity}</span>
          </div>
          <div className="text-[11px] text-muted flex items-center gap-1">
            <IconTag size={12} />
            {ticket.category}
          </div>
          <div className="text-[11px] text-muted flex items-center gap-1">
            <IconUser size={12} />
            未割り当て
          </div>
        </div>

        <div className="px-[14px] py-[10px] flex flex-col gap-2">
          {[
            { key: '概要', val: ticket.description },
            {
              key: '再現手順', val: (
                <ol className="m-0 pl-[1.1em] text-[12px] leading-[1.7] text-ink list-decimal">
                  {ticket.steps.map((s, i) => <li key={i}>{s}</li>)}
                </ol>
              )
            },
            { key: '期待する動作', val: ticket.expected },
            { key: '実際の動作', val: ticket.actual },
            { key: '環境', val: ticket.env },
          ].map(({ key, val }) => (
            <div key={key} className="flex gap-[10px]">
              <div className="text-[10px] font-mono text-[#b4b2a9] min-w-[72px] pt-[2px] flex-shrink-0">{key}</div>
              <div className="text-[12px] text-ink leading-relaxed">{val}</div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleCopy}
        className="mt-2 w-full py-2 bg-transparent border-[0.5px] border-[#c8c7c0] rounded-lg text-[11px] font-mono text-muted cursor-pointer flex items-center justify-center gap-[5px] transition-colors hover:bg-[#fafaf8] hover:text-ink"
      >
        {copied ? <><IconCheck size={13} /> コピーしました！</> : <><IconCopy size={13} /> 起票内容をコピー</>}
      </button>
    </div>
  );
}
