'use client';

import { useEffect, useState } from 'react';
import { MonitorCog, ShieldCheck, Wifi, WifiOff } from 'lucide-react';

export function AgentComputerCard({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  const [configured, setConfigured] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/agent/execute', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) setConfigured(Boolean(data.configured));
      })
      .catch(() => {
        if (!cancelled) setConfigured(false);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const unavailable = checking || !configured;
  return (
    <div className="mb-3 rounded-[24px] border border-border/60 bg-background/75 px-4 py-3 shadow-sm backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <MonitorCog className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium">uncgpt computer</p>
            {enabled && configured && <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {checking ? 'Checking secure computer connection…' : configured ? 'Browser, terminal, files, and Git tools' : 'Connect the agent gateway to enable tools'}
          </p>
        </div>
        <button
          type="button"
          aria-label={enabled ? 'Turn off uncgpt computer' : 'Turn on uncgpt computer'}
          aria-pressed={enabled}
          disabled={unavailable}
          onClick={() => onChange(!enabled)}
          className={`relative h-7 w-12 shrink-0 rounded-full p-1 transition-colors ${enabled && configured ? 'bg-emerald-500' : 'bg-muted'} ${unavailable ? 'cursor-not-allowed opacity-50' : ''}`}
        >
          <span className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${enabled && configured ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>
      {enabled && configured && (
        <div className="mt-3 flex items-center gap-2 border-t border-border/50 pt-2 text-[11px] text-muted-foreground">
          <Wifi className="h-3.5 w-3.5 text-emerald-500" />
          <span>Actions require approval before sending, deleting, or deploying.</span>
        </div>
      )}
      {!checking && !configured && (
        <div className="mt-3 flex items-center gap-2 border-t border-border/50 pt-2 text-[11px] text-muted-foreground">
          <WifiOff className="h-3.5 w-3.5" />
          <span>Gateway is not connected on this deployment yet.</span>
        </div>
      )}
    </div>
  );
}
