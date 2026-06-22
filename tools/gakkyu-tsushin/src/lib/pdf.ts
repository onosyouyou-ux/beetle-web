// 紙面プレビュー(.paper)を A4縦 PDF に焼いてダウンロードする。
// html2canvas + jsPDF は重いので動的 import（初回押下時にのみ読み込み）。

export async function downloadPaperPdf(el: HTMLElement, filename: string): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const canvas = await html2canvas(el, {
    scale: 2,              // 解像度を上げる
    useCORS: true,
    backgroundColor: '#ffffff',
  });

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  // 紙面はA4比率(1:1.414)なので幅いっぱいに敷く。万一はみ出す場合は高さ基準に縮める。
  let w = pageW;
  let h = (canvas.height / canvas.width) * w;
  if (h > pageH) {
    h = pageH;
    w = (canvas.width / canvas.height) * h;
  }
  const x = (pageW - w) / 2;
  const y = (pageH - h) / 2;

  pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', x, y, w, h);
  pdf.save(filename);
}
