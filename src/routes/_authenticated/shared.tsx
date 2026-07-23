import { createFileRoute } from "@tanstack/react-router";
import { Share2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/shared")({
  head: () => ({
    meta: [
      { title: "Compartilhados — Premiatto Connect" },
      { name: "description", content: "Documentos compartilhados com você." },
      { property: "og:title", content: "Compartilhados — Premiatto Connect" },
      { property: "og:description", content: "Acervo compartilhado." },
    ],
  }),
  component: () => (
    <div className="max-w-7xl mx-auto p-6 lg:p-10">
      <h1 className="text-2xl font-semibold tracking-tight">Compartilhados</h1>
      <p className="text-sm text-muted-foreground mt-1">Documentos que outras pessoas compartilharam com você.</p>
      <div className="mt-8 rounded-xl border border-dashed border-border p-16 text-center">
        <Share2 className="h-8 w-8 mx-auto text-muted-foreground" />
        <p className="text-sm mt-3 text-muted-foreground">Nenhum documento compartilhado ainda</p>
      </div>
    </div>
  ),
});
