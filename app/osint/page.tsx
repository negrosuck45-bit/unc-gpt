"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MessageContent } from "@/components/message-content"
import { ArrowLeft, Search, Loader2 } from "lucide-react"
import { useChatStore } from "@/lib/chat-store"

type Kind = "email" | "username" | "domain" | "ip" | "phone" | "general"

const KIND_OPTIONS: { value: Kind; label: string; placeholder: string }[] = [
  { value: "email", label: "Email", placeholder: "name@example.com" },
  { value: "username", label: "Username", placeholder: "johndoe" },
  { value: "domain", label: "Domain", placeholder: "example.com" },
  { value: "ip", label: "IP address", placeholder: "8.8.8.8" },
  { value: "phone", label: "Phone", placeholder: "+1 555 555 5555" },
  { value: "general", label: "Free-form", placeholder: "Describe the target" },
]

function buildPrompt(kind: Kind, value: string) {
  const target = value.trim()
  const header = `You are an OSINT research assistant. Produce a structured, ethical lookup report for the following target, using only publicly available information sources. Do not fabricate details; if something is unknown, say so explicitly.`

  const sections: Record<Kind, string> = {
    email: `## Target
Email: ${target}

## Report sections
1. Format validation and provider analysis
2. Likely breach exposure (mention HaveIBeenPwned-style lookups, no actual data)
3. Associated platforms where this email could be searched (Gravatar, LinkedIn, GitHub, etc.)
4. Red flags or patterns to investigate further
5. Next steps`,
    username: `## Target
Username: ${target}

## Report sections
1. Platforms where this username commonly appears (GitHub, Reddit, Twitter/X, etc.)
2. Naming conventions and likely real-name inferences
3. Search operators to use on Google / DuckDuckGo
4. Tools a researcher might use (e.g. Sherlock-style username hunters)
5. Next steps`,
    domain: `## Target
Domain: ${target}

## Report sections
1. WHOIS style recon questions to answer (registrar, creation date, nameservers)
2. DNS records to inspect (A, MX, TXT, NS, SPF, DMARC)
3. Subdomain discovery approaches
4. Historical archive sources (Wayback, crt.sh)
5. Next steps`,
    ip: `## Target
IP: ${target}

## Report sections
1. Address class, likely provider type (residential, datacenter, mobile, Tor)
2. Geolocation lookup hints
3. Reverse DNS & ASN investigation
4. Port scan considerations (ethical, legal)
5. Next steps`,
    phone: `## Target
Phone: ${target}

## Report sections
1. Country / region / carrier indicators from the number
2. Line type (mobile, VoIP, landline) guidance
3. Search approach across social networks and breach sites
4. Red flags for spam / spoofing
5. Next steps`,
    general: `## Target
${target}

## Report sections
1. Identify the likely type of entity
2. Suggested sources to investigate
3. Questions to answer
4. Red flags
5. Next steps`,
  }

  return `${header}\n\n${sections[kind]}\n\nKeep it factual and only suggest sources that are publicly available. Never produce private data.`
}

export default function OsintPage() {
  const { settings } = useChatStore()
  const [kind, setKind] = useState<Kind>("email")
  const [value, setValue] = useState("")
  const [result, setResult] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentOption = KIND_OPTIONS.find((o) => o.value === kind)!

  const handleSearch = async () => {
    if (!value.trim()) return
    setLoading(true)
    setResult("")
    setError(null)

    try {
      const payload: any = {
        messages: [
          { role: "user", content: buildPrompt(kind, value) },
        ],
        provider: settings.provider,
        model: settings.model,
      }
      if (settings.provider === "anthropic" && settings.anthropicApiKey) {
        payload.anthropicApiKey = settings.anthropicApiKey
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok || !res.body) {
        const err = await res.text()
        setError(err || `Error ${res.status}`)
        return
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ""
      while (true) {
        const { done, value: chunk } = await reader.read()
        if (done) break
        const text = decoder.decode(chunk, { stream: true })
        for (const line of text.split("\n")) {
          if (!line.startsWith("data: ")) continue
          const data = line.slice(6).trim()
          if (!data || data === "[DONE]") continue
          try {
            const parsed = JSON.parse(data)
            if (parsed.content) {
              full += parsed.content
              setResult(full)
            }
          } catch {}
        }
      }
    } catch (err: any) {
      setError(err?.message ?? "Request failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link
            href="/"
            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Link>
          <h1 className="text-lg font-semibold">OSINT research</h1>
          <span className="ml-auto text-xs text-muted-foreground">
            Public sources only. No illegal lookups.
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <section className="space-y-4 rounded-xl border border-border bg-muted/20 p-5">
          <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="kind">Type</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as Kind)}>
                <SelectTrigger id="kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KIND_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="target">Target</Label>
              <Input
                id="target"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={currentOption.placeholder}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !loading) handleSearch()
                }}
              />
            </div>
          </div>

          <Button
            onClick={handleSearch}
            disabled={!value.trim() || loading}
            className="gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Run research
          </Button>
        </section>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {result && (
          <section className="rounded-xl border border-border bg-card p-5">
            <MessageContent content={result} />
          </section>
        )}

        {!result && !error && !loading && (
          <div className="text-sm text-muted-foreground rounded-xl border border-dashed border-border p-6 text-center">
            Enter a target above to generate a structured, ethical research
            report using public sources.
          </div>
        )}
      </main>
    </div>
  )
}
