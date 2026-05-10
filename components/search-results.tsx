"use client";

import { motion, useSpring, useTransform, animate } from "framer-motion";
import { ExternalLink, Globe, Search } from "lucide-react";
import { useEffect, useState } from "react";

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  favicon?: string;
  thumbnail?: string;
  companyName?: string;
}

interface SearchResultsProps {
  query: string;
  results: SearchResult[];
  isLoading: boolean;
}

function CountingNumber({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const controls = animate(displayValue, value, {
      duration: 1.5,
      onUpdate: (latest) => setDisplayValue(Math.round(latest)),
    });
    return () => controls.stop();
  }, [value]);

  return <span>{displayValue}</span>;
}

export function SearchResults({ query, results, isLoading }: SearchResultsProps) {
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (!isLoading && results.length > 0) {
      const timer = setTimeout(() => setShowResults(true), 500);
      return () => clearTimeout(timer);
    } else {
      setShowResults(false);
    }
  }, [isLoading, results]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-4 max-w-2xl">
        <div className="flex items-center gap-3 text-blue-500 dark:text-blue-400">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Search className="h-4 w-4" />
          </motion.div>
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <span>Searching</span>
            <span className="inline-flex items-center justify-center min-w-[1ch]">
              <CountingNumber value={Math.floor(Math.random() * 10) + 5} />
            </span>
            <span>pages...</span>
          </div>
        </div>
        
        {/* Animated Favicons during search */}
        <div className="flex gap-2 ml-7">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.2, repeat: Infinity, repeatType: "reverse", duration: 1 }}
              className="w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center"
            >
              <Globe className="w-3 h-3 text-muted-foreground" />
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  if (!showResults || results.length === 0) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4 p-4 max-w-2xl"
    >
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        <Globe className="h-3 w-3" />
        Search Results
      </div>

      <div className="grid gap-3">
        {results.slice(0, 3).map((result, index) => (
          <motion.a
            key={index}
            href={result.link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.preventDefault();
              window.open(result.link, '_blank', 'noopener,noreferrer');
            }}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group flex items-start gap-4 p-4 rounded-2xl border border-border bg-card hover:bg-accent/50 hover:border-primary/30 transition-all shadow-sm hover:shadow-md"
          >
            {/* Profile Picture / Icon */}
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden border border-border group-hover:border-primary/20 transition-colors">
              {result.favicon ? (
                <img src={result.favicon} alt="" className="w-6 h-6 object-contain" />
              ) : (
                <Globe className="w-5 h-5 text-muted-foreground" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[11px] font-medium text-muted-foreground truncate">
                  {result.companyName || new URL(result.link).hostname}
                </span>
                <span className="text-[10px] text-muted-foreground/50">•</span>
                <span className="text-[11px] text-muted-foreground truncate max-w-[150px]">
                  {result.link}
                </span>
              </div>
              <h3 className="text-sm font-semibold leading-tight line-clamp-1 group-hover:text-primary transition-colors mb-1">
                {result.title}
              </h3>
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {result.snippet}
              </p>
            </div>

            {/* Thumbnail */}
            {result.thumbnail && (
              <div className="flex-shrink-0 w-20 h-14 rounded-lg bg-muted overflow-hidden border border-border hidden sm:block">
                <img src={result.thumbnail} alt="" className="w-full h-full object-cover" />
              </div>
            )}
          </motion.a>
        ))}
      </div>
    </motion.div>
  );
}
