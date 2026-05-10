'use client';

import React, { useState, useEffect } from 'react';
import { useChatStore, MODELS, type ModelInfo } from '@/lib/chat-store';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Settings,
  Brain,
  Smartphone,
  User,
  Lock,
  Trash2,
  Sun,
  Moon,
  X,
  Palette,
  Shield,
  Zap,
  Key,
  MessageSquare,
  Download,
  Upload,
  RefreshCw,
  Sparkles,
  Eye,
  EyeOff,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';

interface SettingsPageProps {
  onClose?: () => void;
}

type SettingsTab = 'general' | 'models' | 'memory' | 'privacy' | 'appearance' | 'advanced';

export function SettingsPage({ onClose }: SettingsPageProps) {
  const { settings, updateSettings, clearAllChats, getCurrentChat, projects, chats } = useChatStore();
  const { theme, setTheme } = useTheme();
  
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [model, setModel] = useState<string>(settings.model);
  const [showApiKey, setShowApiKey] = useState(false);
  const [anthropicKey, setAnthropicKey] = useState(settings.anthropicApiKey || '');
  
  // Advanced settings
  const [streamingEnabled, setStreamingEnabled] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [sendOnEnter, setSendOnEnter] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [messageDensity, setMessageDensity] = useState<'compact' | 'normal' | 'comfortable'>('normal');

  const currentChat = getCurrentChat();
  const isLocked = !!currentChat && currentChat.messages.length > 0;

  // Load saved preferences
  useEffect(() => {
    const prefs = localStorage.getItem('user-preferences');
    if (prefs) {
      const parsed = JSON.parse(prefs);
      setStreamingEnabled(parsed.streaming ?? true);
      setAutoScroll(parsed.autoScroll ?? true);
      setSendOnEnter(parsed.sendOnEnter ?? true);
      setSoundEnabled(parsed.sound ?? false);
      setFontSize(parsed.fontSize ?? 14);
      setMessageDensity(parsed.messageDensity ?? 'normal');
    }
  }, []);

  const handleSave = () => {
    // Save model settings
    const selectedModel = MODELS.find(m => m.value === model);
    updateSettings({
      model,
      provider: selectedModel?.provider ?? settings.provider,
      anthropicApiKey: anthropicKey || undefined,
    });

    // Save preferences
    localStorage.setItem('user-preferences', JSON.stringify({
      streaming: streamingEnabled,
      autoScroll,
      sendOnEnter,
      sound: soundEnabled,
      fontSize,
      messageDensity,
    }));

    onClose?.();
  };

  const handleClearChats = () => {
    if (confirm('Delete all local chats? Projects and settings will remain.')) {
      clearAllChats();
    }
  };

  const handleClearMemory = () => {
    if (confirm('Clear all memory data? This includes neural memory and project memories.')) {
      localStorage.removeItem('neural-memory');
      localStorage.removeItem('memory-entries');
      alert('Memory cleared successfully.');
    }
  };

  const handleExportData = () => {
    const data = {
      chats,
      projects,
      settings,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uncgpt-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'general', label: 'General', icon: <Settings className="h-4 w-4" /> },
    { id: 'models', label: 'Models', icon: <Zap className="h-4 w-4" /> },
    { id: 'memory', label: 'Memory', icon: <Brain className="h-4 w-4" /> },
    { id: 'privacy', label: 'Privacy', icon: <Shield className="h-4 w-4" /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette className="h-4 w-4" /> },
    { id: 'advanced', label: 'Advanced', icon: <Sparkles className="h-4 w-4" /> },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto bg-background rounded-xl border border-border shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
        <h1 className="text-xl font-semibold">Settings</h1>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex h-[600px]">
        {/* Sidebar */}
        <div className="w-48 border-r border-border bg-muted/20 p-2">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === 'general' && (
                <div className="space-y-6">
                  <SectionTitle title="General Settings" description="Basic app preferences" />
                  
                  <SettingRow label="Send on Enter" description="Press Enter to send messages, Shift+Enter for new line">
                    <Switch checked={sendOnEnter} onCheckedChange={setSendOnEnter} />
                  </SettingRow>

                  <SettingRow label="Auto-scroll" description="Automatically scroll to new messages">
                    <Switch checked={autoScroll} onCheckedChange={setAutoScroll} />
                  </SettingRow>

                  <SettingRow label="Sound Effects" description="Play sounds for notifications">
                    <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
                  </SettingRow>

                  <SettingRow label="Streaming Responses" description="Show AI responses as they are generated">
                    <Switch checked={streamingEnabled} onCheckedChange={setStreamingEnabled} />
                  </SettingRow>
                </div>
              )}

              {activeTab === 'models' && (
                <div className="space-y-6">
                  <SectionTitle title="AI Models" description="Configure your preferred AI models" />
                  
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      Default Model
                      {isLocked && <Lock className="h-3 w-3 opacity-50" />}
                    </Label>
                    <Select value={model} onValueChange={setModel} disabled={isLocked}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-80">
                        {MODELS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            <div className="flex items-center gap-2">
                              <ModelIcon family={m.family} />
                              <span>{m.label}</span>
                              <span className="text-xs text-muted-foreground ml-auto">
                                {m.provider}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isLocked && (
                      <p className="text-xs text-muted-foreground">
                        Model is locked for this chat. Create a new chat to change models.
                      </p>
                    )}
                  </div>

                  <div className="space-y-3 pt-4 border-t border-border">
                    <Label className="flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      Anthropic API Key (Optional)
                    </Label>
                    <div className="relative">
                      <Input
                        type={showApiKey ? 'text' : 'password'}
                        value={anthropicKey}
                        onChange={(e) => setAnthropicKey(e.target.value)}
                        placeholder="sk-ant-..."
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Add your own Anthropic API key to use Claude models directly.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'memory' && (
                <div className="space-y-6">
                  <SectionTitle title="Memory System" description="Manage how the AI remembers information" />
                  
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                      <div>
                        <p className="font-medium text-green-200">Neural Memory Active</p>
                        <p className="text-xs text-green-200/70">
                          Your AI uses advanced memory with importance scoring and decay
                        </p>
                      </div>
                    </div>
                  </div>

                  <SettingRow label="Memory Statistics" description="">
                    <div className="text-right text-sm">
                      <p><span className="text-muted-foreground">Projects:</span> {projects.length}</p>
                      <p><span className="text-muted-foreground">Chats:</span> {chats.length}</p>
                    </div>
                  </SettingRow>

                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" className="flex-1" onClick={handleExportData}>
                      <Download className="h-4 w-4 mr-2" />
                      Export Data
                    </Button>
                    <Button variant="destructive" className="flex-1" onClick={handleClearMemory}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear Memory
                    </Button>
                  </div>
                </div>
              )}

              {activeTab === 'privacy' && (
                <div className="space-y-6">
                  <SectionTitle title="Privacy & Data" description="Control your data and privacy settings" />
                  
                  <div className="p-4 rounded-lg bg-muted/50 border border-border">
                    <h4 className="font-medium mb-2">Data Storage</h4>
                    <p className="text-sm text-muted-foreground">
                      All your data is stored locally in your browser. No data is sent to external servers except for AI model requests.
                    </p>
                  </div>

                  <SettingRow label="Chat History" description="Number of messages stored locally">
                    <span className="text-sm font-mono">{chats.reduce((acc, c) => acc + c.messages.length, 0)} messages</span>
                  </SettingRow>

                  <div className="space-y-3 pt-4 border-t border-border">
                    <h4 className="font-medium text-destructive">Danger Zone</h4>
                    <Button variant="destructive" onClick={handleClearChats} className="w-full">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete All Chats
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      This will permanently delete all chat history. Projects and settings will remain.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'appearance' && (
                <div className="space-y-6">
                  <SectionTitle title="Appearance" description="Customize how the app looks" />
                  
                  <div className="space-y-3">
                    <Label>Theme</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['light', 'dark', 'system'] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setTheme(t)}
                          className={cn(
                            'p-4 rounded-lg border-2 transition-colors flex flex-col items-center gap-2',
                            theme === t ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                          )}
                        >
                          {t === 'light' && <Sun className="h-5 w-5" />}
                          {t === 'dark' && <Moon className="h-5 w-5" />}
                          {t === 'system' && <Smartphone className="h-5 w-5" />}
                          <span className="text-sm capitalize">{t}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Font Size: {fontSize}px</Label>
                    <Slider
                      value={[fontSize]}
                      onValueChange={([v]) => setFontSize(v)}
                      min={12}
                      max={20}
                      step={1}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Message Density</Label>
                    <Select value={messageDensity} onValueChange={(v: any) => setMessageDensity(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="compact">Compact</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="comfortable">Comfortable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {activeTab === 'advanced' && (
                <div className="space-y-6">
                  <SectionTitle title="Advanced Settings" description="For power users" />
                  
                  <SettingRow label="Debug Mode" description="Show debug information in console">
                    <Switch />
                  </SettingRow>

                  <SettingRow label="Experimental Features" description="Try new features before they are released">
                    <Switch />
                  </SettingRow>

                  <div className="p-4 rounded-lg bg-muted/50 border border-border">
                    <h4 className="font-medium mb-2">System Information</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Platform: {typeof window !== 'undefined' ? navigator.platform : 'Unknown'}</p>
                      <p>Storage: Local Browser Storage</p>
                      <p>Version: 1.0.0</p>
                    </div>
                  </div>

                  <Button variant="outline" className="w-full" onClick={() => window.location.reload()}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reload Application
                  </Button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      <div className="flex gap-3 px-6 py-4 border-t border-border bg-muted/30">
        <Button variant="outline" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button onClick={handleSave} className="flex-1">
          Save Changes
        </Button>
      </div>
    </div>
  );
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function SettingRow({ 
  label, 
  description, 
  children 
}: { 
  label: string; 
  description: string; 
  children: React.ReactNode 
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="ml-4">{children}</div>
    </div>
  );
}

function ModelIcon({ family }: { family: string }) {
  const getColor = () => {
    switch (family) {
      case 'claude': return 'text-orange-500';
      case 'llama': return 'text-blue-500';
      case 'qwen': return 'text-purple-500';
      case 'deepseek': return 'text-cyan-500';
      case 'gemma': return 'text-green-500';
      case 'kiwi': return 'text-yellow-500';
      default: return 'text-muted-foreground';
    }
  };

  const getLetter = () => {
    switch (family) {
      case 'claude': return 'C';
      case 'llama': return 'L';
      case 'qwen': return 'Q';
      case 'deepseek': return 'D';
      case 'gemma': return 'G';
      case 'kiwi': return 'K';
      case 'glm': return 'Z';
      case 'gpt-oss': return 'O';
      default: return 'A';
    }
  };

  return (
    <span className={cn('font-bold text-sm w-5 text-center', getColor())}>
      {getLetter()}
    </span>
  );
}
