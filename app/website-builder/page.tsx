'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Download,
  Copy,
  Check,
  Loader,
  Zap,
  Eye,
  Code,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'

interface GeneratedWebsite {
  id: string
  prompt: string
  html: string
  css: string
  timestamp: number
}

export default function WebsiteBuilder() {
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [websites, setWebsites] = useState<GeneratedWebsite[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('preview')
  const [copied, setCopied] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const { toast } = useToast()

  const selectedWebsite = websites.find((w) => w.id === selectedId)

  const generateWebsite = async () => {
    if (!prompt.trim()) {
      toast({ title: 'Error', description: 'Please enter a website description', variant: 'destructive' })
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch('/api/website-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })

      if (!response.ok) throw new Error('Failed to generate website')

      const data = await response.json()
      const newWebsite: GeneratedWebsite = {
        id: crypto.randomUUID(),
        prompt,
        html: data.html,
        css: data.css,
        timestamp: Date.now(),
      }

      setWebsites((prev) => [newWebsite, ...prev])
      setSelectedId(newWebsite.id)
      setActiveTab('preview')
      toast({ title: 'Success', description: 'Website generated successfully!' })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Error',
        description: 'Failed to generate website. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadHTML = () => {
    if (!selectedWebsite) return
    const fullHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Generated Website</title>
  <style>
    ${selectedWebsite.css}
  </style>
</head>
<body>
  ${selectedWebsite.html}
</body>
</html>`

    const blob = new Blob([fullHTML], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `website-${selectedWebsite.id}.html`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: 'Success', description: 'Website downloaded!' })
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast({ title: 'Copied', description: 'Code copied to clipboard!' })
  }

  useEffect(() => {
    if (selectedWebsite && iframeRef.current) {
      const fullHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    ${selectedWebsite.css}
  </style>
</head>
<body>
  ${selectedWebsite.html}
</body>
</html>`

      iframeRef.current.srcDoc = fullHTML
    }
  }, [selectedWebsite])

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-black">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white">AI Website Builder</h1>
          </div>
          <p className="text-zinc-400">Generate beautiful websites with AI powered by Groq & Llama</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <Card className="bg-zinc-900/50 border-zinc-800 sticky top-4">
              <CardHeader>
                <CardTitle className="text-white">Describe Your Website</CardTitle>
                <CardDescription>Tell AI what kind of website you want to create</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="e.g., A modern portfolio website for a web designer with dark theme, showcase section, and contact form..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-32 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                  disabled={isGenerating}
                />
                <Button
                  onClick={generateWebsite}
                  disabled={isGenerating || !prompt.trim()}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  {isGenerating ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Generate Website
                    </>
                  )}
                </Button>

                {/* History */}
                {websites.length > 0 && (
                  <div className="mt-6 space-y-2">
                    <h3 className="text-sm font-semibold text-white">Recent Websites</h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {websites.map((website) => (
                        <button
                          key={website.id}
                          onClick={() => {
                            setSelectedId(website.id)
                            setActiveTab('preview')
                          }}
                          className={cn(
                            'w-full text-left p-3 rounded-lg transition-colors text-sm',
                            selectedId === website.id
                              ? 'bg-blue-500/20 border border-blue-500/50 text-blue-300'
                              : 'bg-zinc-800/50 border border-zinc-700/50 text-zinc-300 hover:bg-zinc-800'
                          )}
                        >
                          <div className="truncate font-medium">{website.prompt.substring(0, 40)}...</div>
                          <div className="text-xs text-zinc-500 mt-1">
                            {new Date(website.timestamp).toLocaleDateString()}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Preview & Code Section */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2"
          >
            {selectedWebsite ? (
              <Card className="bg-zinc-900/50 border-zinc-800 h-full flex flex-col">
                <CardHeader className="border-b border-zinc-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-white">Website Preview</CardTitle>
                      <CardDescription className="mt-1">{selectedWebsite.prompt}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyCode(selectedWebsite.html)}
                        className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={downloadHTML}
                        className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                  <TabsList className="bg-zinc-800 border-b border-zinc-700 rounded-none">
                    <TabsTrigger value="preview" className="text-zinc-300 data-[state=active]:text-white">
                      <Eye className="w-4 h-4 mr-2" />
                      Preview
                    </TabsTrigger>
                    <TabsTrigger value="html" className="text-zinc-300 data-[state=active]:text-white">
                      <Code className="w-4 h-4 mr-2" />
                      HTML
                    </TabsTrigger>
                    <TabsTrigger value="css" className="text-zinc-300 data-[state=active]:text-white">
                      <Code className="w-4 h-4 mr-2" />
                      CSS
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="preview" className="flex-1 p-4">
                    <div className="w-full h-full rounded-lg overflow-hidden border border-zinc-700 bg-white">
                      <iframe
                        ref={iframeRef}
                        className="w-full h-full border-none"
                        title="Website Preview"
                        sandbox="allow-same-origin"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="html" className="flex-1 p-4">
                    <div className="relative h-full">
                      <pre className="bg-zinc-800 rounded-lg p-4 text-zinc-300 text-sm overflow-auto h-full font-mono">
                        <code>{selectedWebsite.html}</code>
                      </pre>
                      <Button
                        size="sm"
                        onClick={() => copyCode(selectedWebsite.html)}
                        className="absolute top-2 right-2 bg-zinc-700 hover:bg-zinc-600"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="css" className="flex-1 p-4">
                    <div className="relative h-full">
                      <pre className="bg-zinc-800 rounded-lg p-4 text-zinc-300 text-sm overflow-auto h-full font-mono">
                        <code>{selectedWebsite.css}</code>
                      </pre>
                      <Button
                        size="sm"
                        onClick={() => copyCode(selectedWebsite.css)}
                        className="absolute top-2 right-2 bg-zinc-700 hover:bg-zinc-600"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </Card>
            ) : (
              <Card className="bg-zinc-900/50 border-zinc-800 h-96 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-zinc-600" />
                  </div>
                  <p className="text-zinc-400">Generate a website to see the preview</p>
                </div>
              </Card>
            )}
          </motion.div>
        </div>

        {/* Features Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {[
            { icon: Zap, title: 'Lightning Fast', desc: 'Generate websites in seconds' },
            { icon: Code, title: 'Clean Code', desc: 'Production-ready HTML & CSS' },
            { icon: RefreshCw, title: 'Iterate', desc: 'Regenerate and refine designs' },
          ].map((feature, i) => (
            <Card key={i} className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="pt-6">
                <feature.icon className="w-8 h-8 text-blue-400 mb-3" />
                <h3 className="font-semibold text-white mb-1">{feature.title}</h3>
                <p className="text-sm text-zinc-400">{feature.desc}</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
