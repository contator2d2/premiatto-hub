import { 
  FileText, 
  FileSpreadsheet, 
  FileJson, 
  FileCode, 
  FileImage, 
  FileVideo, 
  FileAudio, 
  Archive, 
  File,
  FileType
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type FileIconProps = {
  name?: string;
  className?: string;
  ext?: string;
};

export function FileIcon({ name, className, ext: propExt }: FileIconProps) {
  const ext = (propExt || name?.split('.').pop() || '').toLowerCase();

  const getIcon = () => {
    switch (ext) {
      case 'pdf':
        return FileType;
      case 'doc':
      case 'docx':
        return FileText;
      case 'xls':
      case 'xlsx':
      case 'csv':
        return FileSpreadsheet;
      case 'ppt':
      case 'pptx':
        return FileText; // Poderia ser FilePresentation se disponível, mas lucide-react varia
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'webp':
      case 'svg':
      case 'gif':
        return FileImage;
      case 'mp4':
      case 'mov':
      case 'avi':
      case 'mkv':
        return FileVideo;
      case 'mp3':
      case 'wav':
      case 'ogg':
        return FileAudio;
      case 'zip':
      case 'rar':
      case '7z':
      case 'tar':
      case 'gz':
        return Archive;
      case 'js':
      case 'ts':
      case 'tsx':
      case 'html':
      case 'css':
        return FileCode;
      case 'json':
        return FileJson;
      default:
        return File;
    }
  };

  const Icon = getIcon();

  const getColors = () => {
    switch (ext) {
      case 'pdf': return 'text-rose-600 bg-rose-50';
      case 'doc':
      case 'docx': return 'text-blue-600 bg-blue-50';
      case 'xls':
      case 'xlsx':
      case 'csv': return 'text-emerald-600 bg-emerald-50';
      case 'ppt':
      case 'pptx': return 'text-orange-600 bg-orange-50';
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'webp':
      case 'svg':
      case 'gif': return 'text-violet-600 bg-violet-50';
      case 'zip':
      case 'rar': return 'text-amber-600 bg-amber-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  return (
    <div className={cn(
      "flex items-center justify-center shrink-0 rounded-lg",
      getColors(),
      className || "h-10 w-10"
    )}>
      <Icon className="h-1/2 w-1/2" />
    </div>
  );
}
