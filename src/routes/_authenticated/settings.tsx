import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Configurações — Premiatto Connect" },
      { name: "description", content: "Configurações da plataforma." },
      { property: "og:title", content: "Configurações — Premiatto Connect" },
      { property: "og:description", content: "Ajustes da conta e organização." },
    ],
  }),
  component: () => (
    <div className="max-w-7xl mx-auto p-6 lg:p-10">
      <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
      <p className="text-sm text-muted-foreground mt-1">Preferências da conta e organização.</p>
      <div className="mt-8 rounded-xl border border-dashed border-border p-16 text-center">
        <Settings className="h-8 w-8 mx-auto text-muted-foreground" />
        <p className="text-sm mt-3 text-muted-foreground">Configurações avançadas em breve</p>
      </div>
    </div>
  ),
});
