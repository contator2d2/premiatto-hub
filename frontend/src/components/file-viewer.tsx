import { useEffect, useState } from 'react';
import { Document as PdfDocument, Page as PdfPage, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

type Props = {
  fileUrl: string;
  fileType?: string | null;
  mimeType?: string | null;
  allowDownload?: boolean;
  blockPrint?: boolean;
  watermark?: string;
  onDownload?: () => void;
};

export function FileViewer({ fileUrl, fileType, mimeType, allowDownload, blockPrint, watermark, onDownload }: Props) {
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1.2);

  useEffect(() => {
    if (!blockPrint) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [blockPrint]);

  const isPdf = mimeType?.includes('pdf') || fileType?.toLowerCase() === 'pdf';
  const isImage = mimeType?.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes((fileType || '').toLowerCase());

  if (isImage) {
    return (
      <div className="relative flex items-center justify-center bg-muted/40 rounded-xl overflow-hidden min-h-[60vh]">
        {watermark && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-10 text-4xl font-bold rotate-[-25deg] select-none">
            {watermark}
          </div>
        )}
        <img src={fileUrl} alt="" className="max-h-[80vh] max-w-full object-contain" />
      </div>
    );
  }

  if (!isPdf) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center bg-muted/30">
        <p className="text-sm text-muted-foreground mb-4">
          Pré-visualização não disponível para este formato.
        </p>
        {allowDownload && (
          <button
            onClick={onDownload}
            className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm inline-flex items-center gap-2"
          >
            <Download className="h-4 w-4" /> Baixar arquivo
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="h-11 border-b border-border bg-muted/40 px-3 flex items-center gap-2 text-xs">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="p-1.5 rounded hover:bg-muted disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="tabular-nums">
          {page} / {numPages || '—'}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(numPages || p, p + 1))}
          disabled={page >= numPages}
          className="p-1.5 rounded hover:bg-muted disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <div className="w-px h-4 bg-border mx-1" />
        <button onClick={() => setScale((s) => Math.max(0.5, s - 0.15))} className="p-1.5 rounded hover:bg-muted">
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="tabular-nums">{Math.round(scale * 100)}%</span>
        <button onClick={() => setScale((s) => Math.min(3, s + 0.15))} className="p-1.5 rounded hover:bg-muted">
          <ZoomIn className="h-4 w-4" />
        </button>
        <div className="flex-1" />
        {allowDownload && (
          <button onClick={onDownload} className="p-1.5 rounded hover:bg-muted inline-flex items-center gap-1.5">
            <Download className="h-4 w-4" /> Baixar
          </button>
        )}
      </div>
      <div className="relative bg-muted/40 max-h-[75vh] overflow-auto p-4 flex justify-center">
        {watermark && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-10 text-5xl font-bold rotate-[-25deg] select-none z-10">
            {watermark}
          </div>
        )}
        <PdfDocument
          file={fileUrl}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          loading={<div className="text-sm text-muted-foreground p-10">Carregando PDF…</div>}
          error={<div className="text-sm text-destructive p-10">Não foi possível abrir este PDF.</div>}
        >
          <PdfPage pageNumber={page} scale={scale} renderTextLayer renderAnnotationLayer />
        </PdfDocument>
      </div>
    </div>
  );
}
