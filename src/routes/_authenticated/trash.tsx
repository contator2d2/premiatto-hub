import { createFileRoute } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/trash")({
  head: () => ({
    meta: [
      { title: "Lixeira — Premiatto Connect" },
      { name: "description", content: "Documentos excluídos." },
      { property: "og:title", content: "Lixeira — Premiatto Connect" },
      { property: "og:description", content: "Itens excluídos recentemente." },
    ],
  }),
  component: () => (
    <div className="max-w-7xl mx-auto p-6 lg:p-10">
      <h1 className="text-2xl font-semibold tracking-tight">Lixeira</h1>
      <p className="text-sm text-muted-foreground mt-1">Documentos excluídos permanecem 30 dias.</p>
      <div className="mt-8 rounded-xl border border-dashed border-border p-16 text-center">
        <Trash2 className="h-8 w-8 mx-auto text-muted-foreground" />
        <p className="text-sm mt-3 text-muted-foreground">Lixeira vazia</p>
      </div>
    </div>
  ),
});
