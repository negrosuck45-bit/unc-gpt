'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Copy, ChevronDown, ChevronRight, Download } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CodeBlockProps {
  code: string
  language?: string
}

// Token types for syntax highlighting
type TokenType = 'keyword' | 'string' | 'comment' | 'number' | 'function' | 'operator' | 'punctuation' | 'variable' | 'plain'

interface Token {
  type: TokenType
  content: string
}

const tokenColors: Record<TokenType, string> = {
  keyword: 'text-pink-400',
  string: 'text-green-400',
  comment: 'text-gray-500 italic',
  number: 'text-orange-400',
  function: 'text-blue-400',
  operator: 'text-cyan-400',
  punctuation: 'text-gray-400',
  variable: 'text-purple-400',
  plain: 'text-gray-200',
}

const keywords = new Set([
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do',
  'switch', 'case', 'break', 'continue', 'default', 'try', 'catch', 'finally',
  'throw', 'new', 'delete', 'typeof', 'instanceof', 'void', 'this', 'super',
  'class', 'extends', 'static', 'get', 'set', 'async', 'await', 'yield',
  'import', 'export', 'from', 'as', 'default', 'null', 'undefined', 'true', 'false',
  'in', 'of', 'with', 'debugger', 'interface', 'type', 'enum', 'implements',
  'package', 'private', 'protected', 'public', 'abstract', 'final',
  'def', 'elif', 'except', 'lambda', 'pass', 'raise', 'with', 'assert', 'global',
  'nonlocal', 'and', 'or', 'not', 'is', 'None', 'True', 'False', 'print',
])

// Map language names to file extensions
const languageExtensions: Record<string, string> = {
  javascript: 'js',
  js: 'js',
  typescript: 'ts',
  ts: 'ts',
  tsx: 'tsx',
  jsx: 'jsx',
  python: 'py',
  py: 'py',
  rust: 'rs',
  go: 'go',
  java: 'java',
  kotlin: 'kt',
  swift: 'swift',
  cpp: 'cpp',
  'c++': 'cpp',
  c: 'c',
  cs: 'cs',
  csharp: 'cs',
  php: 'php',
  ruby: 'rb',
  rb: 'rb',
  shell: 'sh',
  bash: 'sh',
  sh: 'sh',
  zsh: 'sh',
  powershell: 'ps1',
  ps1: 'ps1',
  html: 'html',
  css: 'css',
  scss: 'scss',
  sass: 'sass',
  json: 'json',
  yaml: 'yaml',
  yml: 'yml',
  toml: 'toml',
  xml: 'xml',
  sql: 'sql',
  graphql: 'graphql',
  gql: 'graphql',
  markdown: 'md',
  md: 'md',
  dockerfile: 'Dockerfile',
  docker: 'Dockerfile',
  r: 'r',
  matlab: 'm',
  lua: 'lua',
  perl: 'pl',
  scala: 'scala',
  haskell: 'hs',
  elixir: 'ex',
  erlang: 'erl',
  dart: 'dart',
  vue: 'vue',
  svelte: 'svelte',
}

function getExtension(language: string): string {
  const ext = languageExtensions[language.toLowerCase()]
  return ext || 'txt'
}

function tokenize(code: string): Token[][] {
  const lines = code.split('\n')
  
  return lines.map(line => {
    const tokens: Token[] = []
    let remaining = line
    
    while (remaining.length > 0) {
      // Comments
      if (remaining.startsWith('//') || remaining.startsWith('#')) {
        tokens.push({ type: 'comment', content: remaining })
        break
      }
      
      // Multi-line comment start
      if (remaining.startsWith('/*')) {
        const endIndex = remaining.indexOf('*/', 2)
        if (endIndex !== -1) {
          tokens.push({ type: 'comment', content: remaining.slice(0, endIndex + 2) })
          remaining = remaining.slice(endIndex + 2)
          continue
        }
      }
      
      // Strings (double quotes)
      const doubleQuoteMatch = remaining.match(/^"(?:[^"\\]|\\.)*"/)
      if (doubleQuoteMatch) {
        tokens.push({ type: 'string', content: doubleQuoteMatch[0] })
        remaining = remaining.slice(doubleQuoteMatch[0].length)
        continue
      }
      
      // Strings (single quotes)
      const singleQuoteMatch = remaining.match(/^'(?:[^'\\]|\\.)*'/)
      if (singleQuoteMatch) {
        tokens.push({ type: 'string', content: singleQuoteMatch[0] })
        remaining = remaining.slice(singleQuoteMatch[0].length)
        continue
      }
      
      // Template literals
      const templateMatch = remaining.match(/^`(?:[^`\\]|\\.)*`/)
      if (templateMatch) {
        tokens.push({ type: 'string', content: templateMatch[0] })
        remaining = remaining.slice(templateMatch[0].length)
        continue
      }
      
      // Numbers
      const numberMatch = remaining.match(/^-?\d+\.?\d*(?:e[+-]?\d+)?/i)
      if (numberMatch) {
        tokens.push({ type: 'number', content: numberMatch[0] })
        remaining = remaining.slice(numberMatch[0].length)
        continue
      }
      
      // Function calls
      const funcMatch = remaining.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/)
      if (funcMatch) {
        tokens.push({ type: 'function', content: funcMatch[1] })
        remaining = remaining.slice(funcMatch[1].length)
        continue
      }
      
      // Keywords and identifiers
      const wordMatch = remaining.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*/)
      if (wordMatch) {
        const word = wordMatch[0]
        if (keywords.has(word)) {
          tokens.push({ type: 'keyword', content: word })
        } else {
          tokens.push({ type: 'plain', content: word })
        }
        remaining = remaining.slice(word.length)
        continue
      }
      
      // Operators
      const operatorMatch = remaining.match(/^(?:===|!==|==|!=|<=|>=|&&|\|\||=>|\+\+|--|[+\-*/%=<>!&|^~?:])/)
      if (operatorMatch) {
        tokens.push({ type: 'operator', content: operatorMatch[0] })
        remaining = remaining.slice(operatorMatch[0].length)
        continue
      }
      
      // Punctuation
      const punctMatch = remaining.match(/^[{}[\]();,.]/)
      if (punctMatch) {
        tokens.push({ type: 'punctuation', content: punctMatch[0] })
        remaining = remaining.slice(1)
        continue
      }
      
      // Whitespace and other characters
      tokens.push({ type: 'plain', content: remaining[0] })
      remaining = remaining.slice(1)
    }
    
    return tokens
  })
}

export function CodeBlock({ code, language = 'text' }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadFile = () => {
    const ext = getExtension(language)
    const filename = `code.${ext}`
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setDownloaded(true)
    setTimeout(() => setDownloaded(false), 2000)
  }

  const lines = code.split('\n')
  const lineCount = lines.length
  const tokenizedLines = useMemo(() => tokenize(code), [code])

  return (
    <div className="my-3 rounded-xl overflow-hidden bg-[#0a0a0a] border border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#141414] border-b border-border">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 hover:bg-accent rounded transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {language}
          </span>
          <span className="text-xs text-muted-foreground/60">
            {lineCount} {lineCount === 1 ? 'line' : 'lines'}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {/* Download button */}
          <button
            onClick={downloadFile}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200',
              downloaded
                ? 'bg-blue-500/20 text-blue-400'
                : 'hover:bg-accent text-muted-foreground hover:text-foreground'
            )}
          >
            <AnimatePresence mode="wait">
              {downloaded ? (
                <motion.div
                  key="downloaded"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Saved</span>
                </motion.div>
              ) : (
                <motion.div
                  key="download"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </motion.div>
              )}
            </AnimatePresence>
          </button>

          {/* Copy button */}
          <button
            onClick={copyToClipboard}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200',
              copied
                ? 'bg-green-500/20 text-green-400'
                : 'hover:bg-accent text-muted-foreground hover:text-foreground'
            )}
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.div
                  key="check"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied</span>
                </motion.div>
              ) : (
                <motion.div
                  key="copy"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>

      {/* Code Content */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="overflow-x-auto">
              <pre className="p-4 text-[13px] leading-6 font-mono">
                {tokenizedLines.map((lineTokens, lineIndex) => (
                  <div key={lineIndex} className="flex">
                    <span className="select-none text-gray-600 pr-4 text-right min-w-[2.5rem]">
                      {lineIndex + 1}
                    </span>
                    <code>
                      {lineTokens.length === 0 ? (
                        <span>&nbsp;</span>
                      ) : (
                        lineTokens.map((token, tokenIndex) => (
                          <span key={tokenIndex} className={tokenColors[token.type]}>
                            {token.content}
                          </span>
                        ))
                      )}
                    </code>
                  </div>
                ))}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed State */}
      {collapsed && (
        <div className="px-4 py-3 text-xs text-muted-foreground">
          Code collapsed. Click the arrow to expand.
        </div>
      )}
    </div>
  )
}
