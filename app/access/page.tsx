"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Lock, Unlock, Save } from "lucide-react"

const STORAGE_KEY = "uncgpt-access-hash"
const SESSION_KEY = "uncgpt-access-unlocked"

async function sha256(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest("SHA-256", buf)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export default function AccessPage() {
  const [mode, setMode] = useState<"locked" | "setup" | "unlocked">("locked")
  const [hasPassword, setHasPassword] = useState(false)
  const [input, setInput] = useState("")
  const [confirmInput, setConfirmInput] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = localStorage.getItem(STORAGE_KEY)
    const unlocked = sessionStorage.getItem(SESSION_KEY) === "1"
    setHasPassword(!!stored)
    if (!stored) setMode("setup")
    else if (unlocked) setMode("unlocked")
  }, [])

  const handleUnlock = async () => {
    setError(null)
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      setMode("setup")
      return
    }
    const hash = await sha256(input)
    if (hash === stored) {
      sessionStorage.setItem(SESSION_KEY, "1")
      setMode("unlocked")
      setInput("")
    } else {
      setError("Incorrect password.")
    }
  }

  const handleSetPassword = async () => {
    setError(null)
    if (input.length < 4) {
      setError("Use at least 4 characters.")
      return
    }
    if (input !== confirmInput) {
      setError("Passwords do not match.")
      return
    }
    const hash = await sha256(input)
    localStorage.setItem(STORAGE_KEY, hash)
    sessionStorage.setItem(SESSION_KEY, "1")
    setHasPassword(true)
    setMode("unlocked")
    setInput("")
    setConfirmInput("")
  }

  const handleLock = () => {
    sessionStorage.removeItem(SESSION_KEY)
    setMode("locked")
  }

  const handleReset = () => {
    if (
      confirm(
        "Reset the access password? You will be prompted to set a new one next time you visit this page.",
      )
    ) {
      localStorage.removeItem(STORAGE_KEY)
      sessionStorage.removeItem(SESSION_KEY)
      setHasPassword(false)
      setMode("setup")
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link
            href="/"
            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Link>
          <h1 className="text-lg font-semibold">Access</h1>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 space-y-5">
          {mode === "setup" && (
            <>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <h2 className="font-semibold">Set an access password</h2>
                </div>
                <p className="text-xs text-muted-foreground">
                  Hashed with SHA-256 and stored only in this browser. No server ever
                  sees it.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-pw">New password</Label>
                <Input
                  id="new-pw"
                  type="password"
                  autoFocus
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-pw">Confirm</Label>
                <Input
                  id="confirm-pw"
                  type="password"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleSetPassword()
                  }}
                />
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <Button onClick={handleSetPassword} className="w-full gap-2">
                <Save className="h-4 w-4" />
                Save password
              </Button>
            </>
          )}

          {mode === "locked" && (
            <>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <h2 className="font-semibold">Locked</h2>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter your access password to continue.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pw">Password</Label>
                <Input
                  id="pw"
                  type="password"
                  autoFocus
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleUnlock()
                  }}
                />
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <Button onClick={handleUnlock} className="w-full gap-2">
                <Unlock className="h-4 w-4" />
                Unlock
              </Button>
              <button
                onClick={handleReset}
                className="w-full text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
              >
                Forgot password — reset
              </button>
            </>
          )}

          {mode === "unlocked" && (
            <>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Unlock className="h-4 w-4 text-muted-foreground" />
                  <h2 className="font-semibold">Unlocked</h2>
                </div>
                <p className="text-xs text-muted-foreground">
                  You have access for this session.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Button asChild>
                  <Link href="/">Continue to app</Link>
                </Button>
                <Button variant="ghost" onClick={handleLock} className="gap-2">
                  <Lock className="h-4 w-4" />
                  Lock again
                </Button>
                {hasPassword && (
                  <button
                    onClick={handleReset}
                    className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                  >
                    Reset password
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
