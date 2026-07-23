import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';
import { useBranding } from '@/contexts/branding-context';
import { api } from '@/lib/api';

export default function BrandingAdmin() {
  const { branding, save, refresh } = useBranding();
  const [form, setForm] = useState({
    appName: '',
    primaryColor: '#0B3D91',
    accentColor: '#1E88E5',
    tagline: '',
    logoUrl: '',
    logoDarkUrl: '',
    faviconUrl: '',
  });
  const [saving, setSaving] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);
  const faviconRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (branding) {
      setForm({
        appName: branding.appName,
        primaryColor: branding.primaryColor,
        accentColor: branding.accentColor,
        tagline: branding.tagline || '',
        logoUrl: branding.logoUrl || '',
        logoDarkUrl: branding.logoDarkUrl || '',
        faviconUrl: branding.faviconUrl || '',
      });
    }
  }, [branding]);

  async function uploadAsset(file: File, field: 'logoUrl' | 'logoDarkUrl' | 'faviconUrl') {
    const fd = new FormData();
    fd.append('file', file);
    const { data } = await api.post('/branding/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    setForm((f) => ({ ...f, [field]: data.url }));
    toast.success('Upload concluído');
  }

  async function onSave() {
    setSaving(true);
    try {
      await save(form);
      await refresh();
      toast.success('Marca atualizada');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Falha ao salvar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-10 space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight font-display">Marca</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure cores, logos e nome da plataforma.</p>
      </header>

      <section className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nome do app</label>
            <input value={form.appName} onChange={(e) => setForm({ ...form, appName: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Tagline</label>
            <input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Cor primária</label>
            <div className="flex items-center gap-3">
              <input type="color" value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} className="h-10 w-16 rounded-lg border border-input bg-background" />
              <input value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} className="flex-1 h-10 px-3 rounded-lg border border-input bg-background text-sm font-mono" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Cor de destaque</label>
            <div className="flex items-center gap-3">
              <input type="color" value={form.accentColor} onChange={(e) => setForm({ ...form, accentColor: e.target.value })} className="h-10 w-16 rounded-lg border border-input bg-background" />
              <input value={form.accentColor} onChange={(e) => setForm({ ...form, accentColor: e.target.value })} className="flex-1 h-10 px-3 rounded-lg border border-input bg-background text-sm font-mono" />
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 pt-2">
          <AssetUpload label="Logo" url={form.logoUrl} onPick={() => logoRef.current?.click()} />
          <AssetUpload label="Logo escuro" url={form.logoDarkUrl} onPick={() => (document.getElementById('logo-dark-input') as HTMLInputElement)?.click()} />
          <AssetUpload label="Favicon" url={form.faviconUrl} onPick={() => faviconRef.current?.click()} />

          <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAsset(f, 'logoUrl'); e.target.value=''; }} />
          <input id="logo-dark-input" type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAsset(f, 'logoDarkUrl'); e.target.value=''; }} />
          <input ref={faviconRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAsset(f, 'faviconUrl'); e.target.value=''; }} />
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div
            className="rounded-lg px-4 py-3 text-primary-foreground text-sm font-medium"
            style={{ background: `linear-gradient(135deg, ${form.primaryColor}, ${form.accentColor})` }}
          >
            Prévia — {form.appName || 'Premiatto Connect'}
          </div>
          <button onClick={onSave} disabled={saving} className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
            {saving ? 'Salvando…' : 'Salvar alterações'}
          </button>
        </div>
      </section>
    </div>
  );
}

function AssetUpload({ label, url, onPick }: { label: string; url: string; onPick: () => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <button type="button" onClick={onPick} className="w-full h-24 rounded-lg border-2 border-dashed border-border hover:border-primary flex items-center justify-center overflow-hidden bg-background">
        {url ? <img src={url} alt="" className="max-h-full max-w-full object-contain" /> : <div className="flex items-center gap-2 text-sm text-muted-foreground"><Upload className="h-4 w-4" /> Enviar</div>}
      </button>
    </div>
  );
}
