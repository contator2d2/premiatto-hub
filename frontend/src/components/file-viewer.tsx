import { useEffect, useRef, useState } from 'react';
import { Document as PdfDocument, Page as PdfPage, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, AlertCircle, Loader2 } from 'lucide-react';
import { renderAsync } from 'docx-preview';
import * as XLSX from 'xlsx';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const docxRef = useRef<HTMLDivElement>(null);
  const excelRef = useRef<HTMLDivElement>(null);

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

  const ext = (fileType || fileUrl.split('.').pop() || '').toLowerCase();
  const isPdf = mimeType?.includes('pdf') || ext === 'pdf';
  const isImage = mimeType?.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext);
  const isDocx = ext === 'docx';
  const isExcel = ['xlsx', 'xls', 'csv'].includes(ext);

  useEffect(() => {
    if (isDocx && docxRef.current) {
      renderDocx();
    } else if (isExcel && excelRef.current) {
      renderExcel();
    }
  }, [fileUrl, isDocx, isExcel]);

  async function renderDocx() {
    if (!docxRef.current) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      docxRef.current.innerHTML = '';
      await renderAsync(blob, docxRef.current, undefined, {
        className: 'docx-preview-container',
        inWrapper: true,
        ignoreHeight: false,
        ignoreWidth: false,
      });
    } catch (err) {
      console.error('Docx preview error:', err);
      setError('Não foi possível carregar a prévia do documento Word.');
    } finally {
      setLoading(false);
    }
  }

  async function renderExcel() {
    if (!excelRef.current) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(fileUrl);
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const html = XLSX.utils.sheet_to_html(worksheet, {
        editable: false,
        header: '',
        footer: '',
      });
      excelRef.current.innerHTML = html;
      
      // Basic styling for the table
      const table = excelRef.current.querySelector('table');
      if (table) {
        table.className = 'min-w-full border-collapse text-xs';
        table.querySelectorAll('td').forEach(td => {
          td.className = 'border border-border p-1 whitespace-nowrap';
        });
      }
    } catch (err) {
      console.error('Excel preview error:', err);
      setError('Não foi possível carregar a prévia da planilha.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 bg-muted/20 rounded-xl border border-border min-h-[50vh]">
        <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
        <p className="text-sm text-muted-foreground font-medium">Processando pré-visualização...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-rose-50 rounded-xl border border-rose-100 text-center min-h-[50vh]">
        <AlertCircle className="h-10 w-10 text-rose-500 mb-4" />
        <h3 className="font-semibold text-rose-900 mb-1">Ops! Algo deu errado</h3>
        <p className="text-sm text-rose-700/80 mb-6 max-w-xs">{error}</p>
        {allowDownload && (
          <button
            onClick={onDownload}
            className="h-9 px-4 rounded-lg bg-rose-600 text-white text-sm font-medium inline-flex items-center gap-2 hover:bg-rose-700 transition-colors"
          >
            <Download className="h-4 w-4" /> Baixar arquivo original
          </button>
        )}
      </div>
    );
  }

  if (isImage) {
    return (
      <div className="relative flex items-center justify-center bg-muted/40 rounded-xl overflow-hidden min-h-[60vh] border border-border">
        {watermark && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-10 text-4xl font-bold rotate-[-25deg] select-none z-10">
            {watermark}
          </div>
        )}
        <img src={fileUrl} alt="" className="max-h-[80vh] max-w-full object-contain relative z-0" />
      </div>
    );
  }

  if (isDocx) {
    return (
      <div className="rounded-xl border border-border bg-white overflow-hidden flex flex-col min-h-[60vh]">
        <div className="h-10 border-b border-border bg-muted/30 px-4 flex items-center justify-between text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          <span>Prévia Word (Somente leitura)</span>
          {allowDownload && (
             <button onClick={onDownload} className="hover:text-primary inline-flex items-center gap-1">
               <Download className="h-3.5 w-3.5" /> Baixar
             </button>
          )}
        </div>
        <div className="flex-1 overflow-auto bg-slate-50 p-4 sm:p-8 flex justify-center">
          <div 
            ref={docxRef} 
            className="bg-white shadow-lg max-w-[850px] w-full min-h-full docx-container" 
          />
        </div>
      </div>
    );
  }

  if (isExcel) {
    return (
      <div className="rounded-xl border border-border bg-white overflow-hidden flex flex-col min-h-[60vh]">
         <div className="h-10 border-b border-border bg-muted/30 px-4 flex items-center justify-between text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          <span>Prévia Planilha (Somente leitura)</span>
          {allowDownload && (
             <button onClick={onDownload} className="hover:text-primary inline-flex items-center gap-1">
               <Download className="h-3.5 w-3.5" /> Baixar
             </button>
          )}
        </div>
        <div className="flex-1 overflow-auto p-4 flex justify-center bg-slate-50">
          <div 
            ref={excelRef} 
            className="bg-white shadow-sm w-full h-fit border border-border excel-container overflow-x-auto" 
          />
        </div>
      </div>
    );
  }

  if (!isPdf) {
    return (
      <div className="rounded-xl border border-dashed border-border p-16 text-center bg-muted/30 flex flex-col items-center min-h-[40vh] justify-center">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <AlertCircle className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-foreground mb-1">Sem pré-visualização</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs">
          O formato <strong>.{ext}</strong> não pode ser visualizado diretamente no navegador.
        </p>
        {allowDownload && (
          <button
            onClick={onDownload}
            className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-2 shadow-sm hover:opacity-90 transition-opacity"
          >
            <Download className="h-4 w-4" /> Baixar arquivo original
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col shadow-sm">
      <div className="h-11 border-b border-border bg-muted/40 px-3 flex items-center gap-2 text-xs">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="p-1.5 rounded hover:bg-muted disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="tabular-nums font-medium">
          Página {page} de {numPages || '—'}
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
        <span className="tabular-nums font-medium">{Math.round(scale * 100)}%</span>
        <button onClick={() => setScale((s) => Math.min(3, s + 0.15))} className="p-1.5 rounded hover:bg-muted">
          <ZoomIn className="h-4 w-4" />
        </button>
        <div className="flex-1" />
        {allowDownload && (
          <button onClick={onDownload} className="h-8 px-3 rounded bg-primary/10 text-primary hover:bg-primary/20 text-[11px] font-semibold flex items-center gap-1.5 transition-colors">
            <Download className="h-3.5 w-3.5" /> Baixar Original
          </button>
        )}
      </div>
      <div className="relative bg-slate-100 max-h-[75vh] overflow-auto p-4 sm:p-8 flex justify-center">
        {watermark && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-10 text-5xl font-bold rotate-[-25deg] select-none z-10">
            {watermark}
          </div>
        )}
        <div className="bg-white shadow-xl">
          <PdfDocument
            file={fileUrl}
            onLoadSuccess={({ numPages }: { numPages: number }) => setNumPages(numPages)}
            loading={<div className="text-sm text-muted-foreground p-20 flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /> Carregando PDF…</div>}
            error={<div className="text-sm text-destructive p-20">Não foi possível abrir este PDF.</div>}
          >
            <PdfPage pageNumber={page} scale={scale} renderTextLayer renderAnnotationLayer />
          </PdfDocument>
        </div>
      </div>
    </div>
  );
}
