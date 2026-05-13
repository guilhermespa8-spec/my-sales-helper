import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Download, RefreshCw, CheckCircle2, Settings as SettingsIcon } from "lucide-react";

const APP_VERSION = "0.1.1";

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
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
          <SettingsIcon className="w-7 h-7 text-blue-600" />
          Configurações
        </h1>
        <p className="text-slate-500 mt-1">Preferências e atualizações do sistema</p>
      </div>

      <Card className="border border-slate-200 shadow-none bg-transparent">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Atualizações do Sistema</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Versão atual: <span className="font-mono font-bold text-slate-700">v{APP_VERSION}</span>
              </p>
            </div>
            <Button
              onClick={checkForUpdates}
              disabled={status === "checking" || status === "downloading"}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${status === "checking" ? "animate-spin" : ""}`} />
              {status === "checking" ? "Verificando..." : "Verificar Atualizações"}
            </Button>
          </div>

          {status === "uptodate" && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">Você já está na versão mais recente.</span>
            </div>
          )}

          {status === "available" && newVersion && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
              <div>
                <p className="font-bold text-blue-900">Nova versão disponível: v{newVersion}</p>
                <p className="text-sm text-blue-700">Clique em baixar para atualizar agora.</p>
              </div>
              <Button onClick={downloadAndInstall} className="bg-green-600 hover:bg-green-700 text-white font-bold">
                <Download className="w-4 h-4 mr-2" />
                Baixar e Instalar
              </Button>
            </div>
          )}

          {status === "downloading" && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <p className="font-bold text-slate-900">Baixando atualização... {progress}%</p>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {status === "installed" && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="font-bold text-green-900">Atualização instalada com sucesso!</p>
              <p className="text-sm text-green-700">Feche e reabra o programa para aplicar as mudanças.</p>
            </div>
          )}

          {status === "error" && errorMsg && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="font-bold text-red-900">Erro</p>
              <p className="text-sm text-red-700 font-mono break-all">{errorMsg}</p>
            </div>
          )}

          {!isTauri && (
            <p className="text-xs text-slate-400 italic">
              A verificação de atualizações só funciona no aplicativo desktop instalado.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
