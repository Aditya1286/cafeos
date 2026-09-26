// Rasterises an on-screen QR SVG into a print-ready PNG: white quiet zone + a label underneath
// (the table number, or "Order here" for the master QR).
export const downloadQrPng = (svg: SVGSVGElement, label: string) => {
  const QR_SIZE = 1024;
  const PADDING = 96;
  const LABEL_HEIGHT = 140;
  const svgData = new XMLSerializer().serializeToString(svg);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = QR_SIZE + PADDING * 2;
    canvas.height = QR_SIZE + PADDING * 2 + LABEL_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, PADDING, PADDING, QR_SIZE, QR_SIZE);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 72px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, canvas.width / 2, QR_SIZE + PADDING + LABEL_HEIGHT - 20);
    const link = document.createElement('a');
    link.download = `qr-${String(label).replace(/[^a-z0-9-_]+/gi, '-')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgData)}`;
};
