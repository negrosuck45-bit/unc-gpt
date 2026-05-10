"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import {
  ArrowRight,
  Wand2,
  Code,
  Lightbulb,
  FolderOpen,
  Search as SearchIcon,
  Cloud,
  BookText,
  Box,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Project } from "@/lib/chat-store"

interface WelcomeScreenProps {
  onSelectPrompt: (prompt: string) => void
  project?: Project | null
}

const handleConnectorClick = (provider: string) => {
  window.location.href = `/api/mcp/oauth/${provider}/start`
}

const suggestions = [
  {
    icon: Box,
    label: "MCP Connectors",
    questions: [
      "Link GitHub Account",
      "Link Notion Workspace",
      "Link Vercel Projects",
    ],
  },
  {
    icon: Wand2,
    label: "Builder & Creation",
    questions: [
      "Build a modern SaaS landing page in the website builder",
      "Generate a 3D animated character in Imagine mode",
      "Design a database schema for an e-commerce app",
    ],
  },
  {
    icon: Lightbulb,
    label: "Neural Brain",
    questions: [
      "Recall everything you know about my coding style",
      "Summarize the technical debt we discussed last week",
      "What is the most important fact in our current project context?",
    ],
  },
  {
    icon: Cloud,
    label: "Cloud & Data",
    questions: [
      "Connect to my PostgreSQL and run a query for user growth",
      "Move all PDFs from my downloads folder to my project vault",
      "Analyze my Google Drive files and summarize the recent contracts",
    ],
  },
]

export function WelcomeScreen({ onSelectPrompt, project }: WelcomeScreenProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center px-4 py-6 sm:px-6 max-w-4xl mx-auto w-full">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center mb-8"
      >
        <Image
          src="/uncgpt.png"
          alt="uncgpt"
          width={64}
          height={64}
          className="rounded-2xl mx-auto mb-4"
          priority
        />
        <h1 className="text-3xl font-semibold text-foreground mb-2 text-balance">
          {project ? project.name : "How can I help today?"}
        </h1>
        <p className="text-muted-foreground text-base text-balance">
          {project?.description ||
            "Chat, write, generate and edit images, all in one clean workspace."}
        </p>

        {project && (
          <div className="mt-4 inline-flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 border border-border rounded-full px-3 py-1.5">
            <FolderOpen className="h-3.5 w-3.5" />
            <span>Project context is active</span>
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
      >
        {suggestions.map((topic) => (
          <div
            key={topic.label}
            className="bg-muted/30 rounded-xl p-4 border border-border"
          >
            <div className="flex items-center gap-2 mb-3">
              <topic.icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                {topic.label}
              </span>
            </div>
            <div className="space-y-1.5">
              {topic.questions.map((question) => (
                <button
                  key={question}
                  onClick={() => {
                    if (topic.label === "MCP Connectors") {
                      handleConnectorClick(question.split(' ')[1].toLowerCase())
                    } else {
                      onSelectPrompt(question)
                    }
                  }}
                  className={cn(
                    "w-full text-left text-sm text-muted-foreground",
                    "hover:text-foreground transition-colors",
                    "flex items-start gap-2 group py-1",
                  )}
                >
                  <ArrowRight className="w-3 h-3 mt-1 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all shrink-0" />
                  <span className="line-clamp-2 leading-snug">{question}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  )
}

export default WelcomeScreen
