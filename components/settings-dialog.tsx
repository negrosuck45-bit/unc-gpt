"use client";

import React, { useEffect, useState } from 'react';
import { useChatStore, MODELS } from '@/lib/chat-store';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2, Lock, Plug } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"


interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { settings, updateSettings, clearAllChats, getCurrentChat } = useChatStore();

  const currentChat = getCurrentChat();
  const isLocked = !!currentChat && currentChat.messages.length > 0;
  
  const initialModel = isLocked && currentChat.model ? currentChat.model : settings.model;
  const [model, setModel] = useState<string>(initialModel);

  useEffect(() => {
    if (open) {
      const activeModel = isLocked && currentChat.model ? currentChat.model : settings.model;
      setModel(activeModel);
    }
  }, [open, settings.model, isLocked, currentChat?.model]);

  useEffect(() => {
    if (!MODELS.find((m) => m.value === model)) {
      const fallback = MODELS[0]?.value ?? settings.model;
      setModel(fallback);
    }
  }, [model, settings.model]);

  const handleSave = () => {
    if (isLocked) {
      onOpenChange(false);
      return;
    }

    const modelToSave = MODELS.find((m) => m.value === model)
      ? model
      : MODELS[0]?.value ?? settings.model;

    const selectedModelInfo = MODELS.find(m => m.value === modelToSave);

    updateSettings({
      model: modelToSave,
      provider: selectedModelInfo?.provider ?? settings.provider,
    });

    onOpenChange(false);
  };

  const handleClearChats = () => {
    if (confirm('Delete all local chats? Projects and settings will remain.')) {
      clearAllChats();
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>Configure your preferences.</DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Model
                {isLocked && <Lock className="h-3 w-3 opacity-50" />}
              </Label>
              <TooltipProvider>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <div className="w-full">
                      <Select value={model} onValueChange={(v) => setModel(v)} disabled={isLocked}>
                        <SelectTrigger disabled={isLocked} className={isLocked ? "opacity-70" : ""}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MODELS.map((m) => (
                            <SelectItem key={m.value} value={m.value}>
                              <div className="flex items-center gap-2">
                                <span>{m.label}</span>
                                {m.contextWindow && (
                                  <span className="text-[10px] opacity-50 bg-muted px-1 rounded">
                                    {m.contextWindow}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TooltipTrigger>
                  {isLocked && (
                    <TooltipContent side="bottom">
                      <p className="text-xs">Model is locked for this chat. Create a new chat to use another model.</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="space-y-3 border-t pt-4">
              <Label className="text-sm font-semibold">Danger Zone</Label>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleClearChats}
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete All Chats
              </Button>
              <p className="text-xs text-muted-foreground">
                This will delete all local chats. Projects and settings will remain.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {isLocked ? "Close" : "Save Settings"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
