import { createFileRoute } from "@tanstack/react-router";
import { Star } from "lucide-react";

export const Route = createFileRoute("/_authenticated/favorites")({
  head: () => ({
    meta: [
      { title: "Favoritos — Premiatto Connect" },
      { name: "description", content: "Documentos favoritados." },
      { property: "og:title", content: "Favoritos — Premiatto Connect" },
      { property: "og:description", content: "Seus documentos favoritos." },
    ],
  }),
  component: () => (
    <div className="max-w-7xl mx-auto p-6 lg:p-10">
      <h1 className="text-2xl font-semibold tracking-tight">Favoritos</h1>
      <p className="text-sm text-muted-foreground mt-1">Seus documentos marcados como favoritos.</p>
      <div className="mt-8 rounded-xl border border-dashed border-border p-16 text-center">
        <Star className="h-8 w-8 mx-auto text-muted-foreground" />
        <p className="text-sm mt-3 text-muted-foreground">Nenhum favorito ainda</p>
      </div>
    </div>
  ),
});
