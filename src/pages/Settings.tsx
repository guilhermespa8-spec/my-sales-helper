import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Download, RefreshCw, CheckCircle2, Settings as SettingsIcon } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Progress } from "@/components/ui/progress";

const APP_VERSION = "0.1.2";

type Status = "idle" | "checking" | "available" | "downloading" | "installed" | "uptodate" | "error";

const Settings = () => {
  const [status, setStatus] = useState<Status>("idle");
  const [newVersion, setNewVersion] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

  const checkForUpdates = async () => {
    if (!isTauri) {
      toast.error("Disponível apenas no aplicativo desktop");
      return;
    }
    setStatus("checking");
    setErrorMsg(null);
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();
      if (update) {
        setNewVersion(update.version);
        setStatus("available");
        toast.success(`Nova versão disponível: ${update.version}`);
      } else {
        setStatus("uptodate");
        toast.success("Você já está na versão mais recente!");
      }
    } catch (e: any) {
      setStatus("error");
      setErrorMsg(e?.message ?? String(e));
      toast.error("Erro ao verificar atualizações");
    }
  };

  const downloadAndInstall = async () => {
    if (!isTauri) return;
    setStatus("downloading");
    setProgress(0);
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();
      if (!update) { setStatus("uptodate"); return; }
      let downloaded = 0;
      let total = 0;
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") {
          total = event.data.contentLength ?? 0;
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength;
          if (total > 0) setProgress(Math.round((downloaded / total) * 100));
        } else if (event.event === "Finished") {
          setProgress(100);
        }
      });
      setStatus("installed");
      toast.success("Atualização instalada! Reinicie o programa para aplicar.");
    } catch (e: any) {
      setStatus("error");
      setErrorMsg(e?.message ?? String(e));
      toast.error("Erro ao instalar atualização");
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Configurações" description="Preferências e atualizações do sistema" />

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-bold text-card-foreground flex items-center gap-2">
                <SettingsIcon className="w-5 h-5 text-primary" />
                Atualizações do Sistema
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Versão atual: <span className="font-mono font-bold text-foreground">v{APP_VERSION}</span>
              </p>
            </div>
            <Button
              onClick={checkForUpdates}
              disabled={status === "checking" || status === "downloading"}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${status === "checking" ? "animate-spin" : ""}`} />
              {status === "checking" ? "Verificando..." : "Verificar atualizações"}
            </Button>
          </div>

          {status === "uptodate" && (
            <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/20 rounded-lg text-success">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">Você já está na versão mais recente.</span>
            </div>
          )}

          {status === "available" && newVersion && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
              <div>
                <p className="font-bold text-card-foreground">Nova versão disponível: v{newVersion}</p>
                <p className="text-sm text-muted-foreground">Clique em baixar para atualizar agora.</p>
              </div>
              <Button onClick={downloadAndInstall}>
                <Download className="w-4 h-4 mr-2" />
                Baixar e instalar
              </Button>
            </div>
          )}

          {status === "downloading" && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Baixando atualização... {progress}%</p>
              <Progress value={progress} />
            </div>
          )}

          {status === "installed" && (
            <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/20 rounded-lg text-success">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">Atualização instalada. Reinicie o programa.</span>
            </div>
          )}

          {status === "error" && errorMsg && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              {errorMsg}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
