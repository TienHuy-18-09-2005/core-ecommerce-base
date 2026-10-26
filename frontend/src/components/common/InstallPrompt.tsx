import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setEvt(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!evt) return null;

  const install = async () => {
    await evt.prompt();
    await evt.userChoice;
    setEvt(null);
  };

  return (
    <div
      role="dialog"
      aria-label="Cài đặt ứng dụng"
      className="animate-fade-in fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-lg"
    >
      <p className="flex-1 text-sm text-slate-700">Cài ứng dụng Cửa hàng lên thiết bị để mở nhanh hơn.</p>
      <button type="button" onClick={() => setEvt(null)} className="text-sm text-slate-500 hover:text-slate-700">
        Để sau
      </button>
      <button
        type="button"
        onClick={() => void install()}
        className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
      >
        Cài đặt
      </button>
    </div>
  );
}
