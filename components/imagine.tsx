"use client";

import { useState, useRef, useCallback } from "react";
import {
  Plus,
  ImageIcon,
  Film,
  ArrowUp,
  Loader2,
  Download,
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Sparkles,
  Wand2,
  Palette,
  Box,
  Sun,
  Contrast,
  Layers,
  PanelLeft,
  PanelLeftClose,
  Send,
  Paperclip,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

const INTERNAL_API_URL = "/api/imagine";

const FEATURED_TEMPLATES = [
  {
    id: "funky-dance",
    name: "Funky Dance",
    prompt: "A funky dancing animal character, dynamic pose, vibrant colors",
    image: "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=300&h=400&fit=crop",
  },
  {
    id: "chibi",
    name: "Chibi",
    prompt: "Cute chibi anime character, big eyes, kawaii style",
    image: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&h=400&fit=crop",
  },
  {
    id: "spaghetti-western",
    name: "Spaghetti Western",
    prompt: "Cinematic western scene, desert landscape, cowboy aesthetic",
    image: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=300&h=400&fit=crop",
  },
  {
    id: "3d-animation",
    name: "3D Animation",
    prompt: "3D animated character, Pixar style, soft lighting",
    image: "https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=300&h=400&fit=crop",
  },
  {
    id: "add-girlfriend",
    name: "Add Girlfriend",
    prompt: "Romantic couple portrait, warm lighting, cozy atmosphere",
    image: "https://images.unsplash.com/photo-1516195851888-6f1a981a862e?w=300&h=400&fit=crop",
  },
  {
    id: "comic-book",
    name: "Comic Book",
    prompt: "Comic book style illustration, bold lines, vibrant colors, halftone dots",
    image: "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=300&h=400&fit=crop",
  },
  {
    id: "cyber-gamer",
    name: "Cyber Gamer",
    prompt: "Cyberpunk gamer setup, neon lights, futuristic technology",
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&h=400&fit=crop",
  },
  {
    id: "oil-painting",
    name: "Oil Painting",
    prompt: "Classical oil painting style, rich textures, dramatic lighting",
    image: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=300&h=400&fit=crop",
  },
];

const EDIT_STYLES = [
  { id: "3d", name: "Make 3D", prompt: "Transform into photorealistic 3D render, volumetric lighting, ray tracing", icon: Box },
  { id: "realistic", name: "Make Realistic", prompt: "Transform into hyperrealistic photograph, natural lighting, detailed textures", icon: Sun },
  { id: "anime", name: "Anime Style", prompt: "Transform into anime art style, vibrant colors, clean lines", icon: Palette },
  { id: "oil-paint", name: "Oil Painting", prompt: "Transform into classical oil painting, rich textures, dramatic brushstrokes", icon: Contrast },
  { id: "pixel-art", name: "Pixel Art", prompt: "Transform into retro pixel art style, 8-bit aesthetic", icon: Layers },
  { id: "enhance", name: "Enhance", prompt: "Enhance image quality, increase detail, improve colors", icon: Wand2 },
];

const DISCOVER_ITEMS = [
  { id: "1", url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&h=600&fit=crop", prompt: "Fantasy wizard fishing under moonlight" },
  { id: "2", url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop", prompt: "Portrait with dramatic lighting" },
  { id: "3", url: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=300&fit=crop", prompt: "Golden Gate Bridge at sunset" },
  { id: "4", url: "https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=400&h=400&fit=crop", prompt: "Cute panda closeup portrait" },
  { id: "5", url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=500&fit=crop", prompt: "Ethereal portrait with light effects" },
  { id: "6", url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop", prompt: "Majestic mountain landscape" },
  { id: "7", url: "https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=400&h=400&fit=crop", prompt: "Happy dog portrait" },
  { id: "8", url: "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=400&h=500&fit=crop", prompt: "Serene lake reflection" },
];

const ASPECT_RATIOS = [
  { id: "1:1", label: "1:1" },
  { id: "2:3", label: "2:3" },
  { id: "3:2", label: "3:2" },
  { id: "16:9", label: "16:9" },
  { id: "9:16", label: "9:16" },
];

interface GeneratedItem {
  id: string;
  type: "image" | "video";
  prompt: string;
  url: string;
  model?: string;
  timestamp: Date;
}

interface ImagineProps {
  onOpenSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export default function Imagine({ onOpenSidebar, isSidebarOpen }: ImagineProps = {}) {
  const [mode, setMode] = useState<"image" | "video">("image");
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedItems, setGeneratedItems] = useState<GeneratedItem[]>([]);
  const [aspectRatio, setAspectRatio] = useState("2:3");
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<GeneratedItem | null>(null);
  const [editingItem, setEditingItem] = useState<GeneratedItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const templatesRef = useRef<HTMLDivElement>(null);

  const scrollTemplates = (direction: "left" | "right") => {
    if (templatesRef.current) {
      templatesRef.current.scrollBy({
        left: direction === "left" ? -300 : 300,
        behavior: "smooth",
      });
    }
  };

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    setIsGenerating(true);

    try {
      const payload: any = {
        task: mode,
        prompt: prompt.trim(),
        aspectRatio,
      };

      if (referenceImage) {
        payload.image = referenceImage;
      }

      const response = await fetch(INTERNAL_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMsg = `Generation failed (${response.status})`;
        try {
          const errData = await response.json();
          if (errData?.error) errorMsg = errData.error;
        } catch {
          errorMsg = await response.text().catch(() => errorMsg);
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();

      const newItem: GeneratedItem = {
        id: crypto.randomUUID(),
        type: mode,
        prompt: prompt.trim(),
        url: data.url,
        model: data.model,
        timestamp: new Date(),
      };

      setGeneratedItems((prev) => [newItem, ...prev]);
      toast.success(`${mode === "image" ? "Image" : "Video"} generated!`);
      setPrompt("");
      setReferenceImage(null);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to generate";
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, mode, referenceImage, aspectRatio]);

  const handleEditImage = useCallback(async (item: GeneratedItem, editStyle: (typeof EDIT_STYLES)[0]) => {
    setIsGenerating(true);
    const editPrompt = `${editStyle.prompt}: ${item.prompt}`;

    try {
      const payload: any = {
        task: "image",
        prompt: editPrompt,
        image: item.url,
      };

      const response = await fetch(INTERNAL_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMsg = `Edit failed (${response.status})`;
        try {
          const errData = await response.json();
          if (errData?.error) errorMsg = errData.error;
        } catch {
          errorMsg = await response.text().catch(() => errorMsg);
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();

      const newItem: GeneratedItem = {
        id: crypto.randomUUID(),
        type: "image",
        prompt: `${editStyle.name}: ${item.prompt}`,
        url: data.url,
        model: data.model,
        timestamp: new Date(),
      };

      setGeneratedItems((prev) => [newItem, ...prev]);
      toast.success(`${editStyle.name} applied!`);
      setEditingItem(null);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Edit failed";
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      setReferenceImage(ev.target?.result as string);
      toast.success("Reference image uploaded!");
    };
    reader.readAsDataURL(file);
  };

  const handleDownload = (item: GeneratedItem) => {
    const a = document.createElement("a");
    a.href = item.url;
    a.download = `generated-${item.type}-${Date.now()}.${item.type === "video" ? "mp4" : "png"}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden w-full">
      {/* Header */}
      <header className="flex items-center gap-2 border-b border-border bg-background/80 backdrop-blur-sm px-3 py-2.5 min-h-[48px] flex-shrink-0">
        {onOpenSidebar && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenSidebar}
            className="h-8 w-8 shrink-0 hover:bg-accent/50 md:hidden"
            title={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
            aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            {isSidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeft className="h-5 w-5" />}
          </Button>
        )}
        <div className="flex items-center gap-2 px-2">
          <Sparkles className="h-4 w-4 text-purple-500" />
          <span className="text-sm font-medium">Imagine Mode</span>
        </div>
      </header>

      {/* Main Content Area - Full Width */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden w-full">
        <div className="w-full px-4 sm:px-6 py-6 space-y-8">
          {/* Hero Section */}
          <div className="text-center space-y-2 py-4">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Create anything you imagine</h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Generate high-quality images and videos from simple text descriptions.
            </p>
          </div>

          {/* Featured Templates */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-purple-500" />
                Featured Templates
              </h2>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => scrollTemplates("left")}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => scrollTemplates("right")}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div 
              ref={templatesRef}
              className="flex gap-4 overflow-x-auto pb-4 no-scrollbar px-2"
            >
              {FEATURED_TEMPLATES.map((t) => (
                <div 
                  key={t.id}
                  className="flex-shrink-0 w-40 sm:w-48 group cursor-pointer"
                  onClick={() => {
                    setPrompt(t.prompt);
                    toast.info(`Template "${t.name}" selected`);
                  }}
                >
                  <div className="relative aspect-[3/4] rounded-xl overflow-hidden border border-border group-hover:border-primary/50 transition-colors">
                    <img src={t.image} alt={t.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                      <span className="text-white text-xs font-medium">{t.name}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Generated Gallery */}
          {generatedItems.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold px-2">Your Creations</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 px-2">
                {generatedItems.map((item) => (
                  <div 
                    key={item.id}
                    className="relative aspect-[3/4] rounded-xl overflow-hidden border border-border group cursor-pointer"
                    onClick={() => setSelectedItem(item)}
                  >
                    {item.type === "video" ? (
                      <div className="w-full h-full relative">
                        <video src={item.url} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <Play className="h-8 w-8 text-white fill-white" />
                        </div>
                      </div>
                    ) : (
                      <img src={item.url} alt={item.prompt} className="w-full h-full object-cover" />
                    )}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="secondary" 
                        size="icon" 
                        className="h-8 w-8 rounded-full shadow-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(item);
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Discover Gallery */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold px-2">Discover</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 px-2">
              {DISCOVER_ITEMS.map((item) => (
                <div 
                  key={item.id}
                  className="relative aspect-[3/4] rounded-xl overflow-hidden border border-border group cursor-pointer"
                  onClick={() => {
                    setPrompt(item.prompt);
                    toast.info("Prompt copied from gallery");
                  }}
                >
                  <img src={item.url} alt={item.prompt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          </div>

          {/* Padding at bottom */}
          <div className="h-20" />
        </div>
      </div>

      {/* Input Area - Fixed at Bottom */}
      <div className="p-4 border-t border-border bg-background/80 backdrop-blur-sm flex-shrink-0 w-full">
        <div className="w-full max-w-4xl mx-auto space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-muted rounded-lg p-1">
              <Button 
                variant={mode === "image" ? "secondary" : "ghost"} 
                size="sm" 
                className="h-8 gap-1.5"
                onClick={() => setMode("image")}
              >
                <ImageIcon className="h-3.5 w-3.5" />
                Image
              </Button>
              <Button 
                variant={mode === "video" ? "secondary" : "ghost"} 
                size="sm" 
                className="h-8 gap-1.5"
                onClick={() => setMode("video")}
              >
                <Film className="h-3.5 w-3.5" />
                Video
              </Button>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5">
                  Ratio: {aspectRatio}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {ASPECT_RATIOS.map((r) => (
                  <DropdownMenuItem key={r.id} onClick={() => setAspectRatio(r.id)}>
                    {r.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {referenceImage && (
              <div className="relative h-8 px-2 flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-lg text-xs font-medium">
                <ImageIcon className="h-3 w-3" />
                Ref Image
                <button onClick={() => setReferenceImage(null)} className="hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          {/* Main Input */}
          <div className="relative flex items-end gap-2 bg-muted/50 rounded-2xl p-2 border border-border focus-within:border-primary/50 transition-colors">
            <div className="flex items-center gap-1 pb-1 pl-1">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileUpload}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
            </div>

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
              placeholder={mode === "image" ? "Describe the image you want to create..." : "Describe the video you want to create..."}
              className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-2 text-sm max-h-32 min-h-[40px]"
              rows={1}
            />

            <div className="pb-1 pr-1">
              <Button
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
              >
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Preview Overlay */}
      {selectedItem && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col">
          <div className="flex items-center justify-between p-4">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setSelectedItem(null)}>
              <X className="h-6 w-6" />
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" className="gap-2" onClick={() => handleDownload(selectedItem)}>
                <Download className="h-4 w-4" />
                Download
              </Button>
              {selectedItem.type === "image" && (
                <Button variant="default" size="sm" className="gap-2" onClick={() => setEditingItem(selectedItem)}>
                  <Wand2 className="h-4 w-4" />
                  Edit
                </Button>
              )}
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            {selectedItem.type === "video" ? (
              <video src={selectedItem.url} controls autoPlay loop className="max-w-full max-h-full rounded-lg shadow-2xl" />
            ) : (
              <img src={selectedItem.url} alt={selectedItem.prompt} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
            )}
          </div>
          <div className="p-6 bg-gradient-to-t from-black/80 to-transparent">
            <p className="text-white text-sm text-center max-w-2xl mx-auto">{selectedItem.prompt}</p>
          </div>
        </div>
      )}

      {/* Edit Style Overlay */}
      {editingItem && (
        <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold">Choose Edit Style</h3>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingItem(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              {EDIT_STYLES.map((style) => (
                <Button
                  key={style.id}
                  variant="outline"
                  className="h-auto py-4 flex flex-col gap-2 items-center justify-center hover:border-primary/50 hover:bg-primary/5 transition-all"
                  onClick={() => handleEditImage(editingItem, style)}
                  disabled={isGenerating}
                >
                  <style.icon className="h-6 w-6 text-purple-500" />
                  <span className="text-xs font-medium">{style.name}</span>
                </Button>
              ))}
            </div>
            {isGenerating && (
              <div className="p-4 bg-muted/50 flex items-center justify-center gap-3">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-xs font-medium">Applying transformation...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
