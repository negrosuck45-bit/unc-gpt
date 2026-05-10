"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { ChatSidebar } from "@/components/chat-sidebar"
import { ChatInterface } from "@/components/chat-interface"
import VoiceChat from "@/components/voice-chat"
import Imagine from "@/components/imagine"

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)")
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    setIsMobile(mq.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])
  return isMobile
}

/**
 * Mobile swipe gesture handler:
 * - Swipe RIGHT from the LEFT edge (within EDGE_ZONE) to OPEN the sidebar
 * - Swipe LEFT anywhere to CLOSE it
 * Vertical-tolerance check prevents conflicts with normal page scrolling.
 */
function useSidebarSwipe({
  isMobile,
  isOpen,
  onOpen,
  onClose,
}: {
  isMobile: boolean
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
}) {
  const startX = useRef<number | null>(null)
  const startY = useRef<number | null>(null)
  const startedFromEdge = useRef(false)

  useEffect(() => {
    if (!isMobile) return

    const EDGE_ZONE = 24
    const THRESHOLD = 60
    const VERTICAL_TOLERANCE = 40

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0]
      if (!t) return
      startX.current = t.clientX
      startY.current = t.clientY
      startedFromEdge.current = t.clientX <= EDGE_ZONE
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (startX.current === null || startY.current === null) return
      const t = e.changedTouches[0]
      if (!t) return

      const dx = t.clientX - startX.current
      const dy = Math.abs(t.clientY - startY.current)

      if (dy > VERTICAL_TOLERANCE && dy > Math.abs(dx)) {
        startX.current = null
        startY.current = null
        return
      }

      if (!isOpen && startedFromEdge.current && dx > THRESHOLD) {
        onOpen()
      } else if (isOpen && dx < -THRESHOLD) {
        onClose()
      }

      startX.current = null
      startY.current = null
      startedFromEdge.current = false
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true })
    window.addEventListener("touchend", onTouchEnd, { passive: true })
    return () => {
      window.removeEventListener("touchstart", onTouchStart)
      window.removeEventListener("touchend", onTouchEnd)
    }
  }, [isMobile, isOpen, onOpen, onClose])
}

export default function Home() {
  const isMobile = useIsMobile()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [currentMode, setCurrentMode] = useState<"text" | "voice" | "imagine">("text")

  // Set correct initial sidebar state once we know the screen size
  useEffect(() => {
    setIsSidebarOpen(!isMobile)
  }, [isMobile])

  // Single TOGGLE handler — used by every header trigger button.
  // Same handler works on mobile and desktop because the icon flips inside the header.
  const toggleSidebar = useCallback(() => setIsSidebarOpen((v) => !v), [])
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), [])

  // Swipe gestures (mobile only)
  useSidebarSwipe({
    isMobile,
    isOpen: isSidebarOpen,
    onOpen: () => setIsSidebarOpen(true),
    onClose: closeSidebar,
  })

  // Lock body scroll when the mobile drawer is open
  useEffect(() => {
    if (!isMobile) return
    const original = document.body.style.overflow
    document.body.style.overflow = isSidebarOpen ? "hidden" : original || ""
    return () => {
      document.body.style.overflow = original
    }
  }, [isMobile, isSidebarOpen])

  // Escape closes drawer on mobile
  useEffect(() => {
    if (!isMobile || !isSidebarOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsSidebarOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [isMobile, isSidebarOpen])

  const renderMainContent = () => {
    switch (currentMode) {
      case "voice":
        return (
          <VoiceChat
            onOpenSidebar={toggleSidebar}
            isSidebarOpen={isSidebarOpen}
          />
        )
      case "imagine":
        return (
          <Imagine
            onOpenSidebar={toggleSidebar}
            isSidebarOpen={isSidebarOpen}
          />
        )
      default:
        return (
          <ChatInterface
            onSwitchToImagine={() => setCurrentMode("imagine")}
            onOpenSidebar={toggleSidebar}
            isSidebarOpen={isSidebarOpen}
          />
        )
    }
  }

  return (
    <div
      className="flex overflow-hidden bg-background text-foreground"
      style={{ height: "100dvh", minHeight: "-webkit-fill-available" }}
    >
      {/* Mobile overlay backdrop — tap to close sidebar */}
      {isMobile && isSidebarOpen && (
        <div
          className="mobile-sidebar-overlay"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — fixed drawer on mobile, static on desktop.
          NOTE: The sidebar trigger button now lives INSIDE each main view's header
          (chat-header / imagine / voice-chat), so it never overlaps content and
          is always visible on both mobile and desktop. The icon flips between
          PanelLeft and PanelLeftClose based on isSidebarOpen. */}
      <div className={isMobile ? "mobile-sidebar-drawer" : ""}>
        <ChatSidebar
          isOpen={isSidebarOpen}
          onToggle={toggleSidebar}
          onChatSelect={(_id, type) => {
            setCurrentMode(type)
            if (isMobile) setIsSidebarOpen(false)
          }}
          onModeChange={(mode) => {
            setCurrentMode(mode)
            if (isMobile) setIsSidebarOpen(false)
          }}
          isMobile={isMobile}
        />
      </div>

      {/* Main content area */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {renderMainContent()}
      </main>
    </div>
  )
}
