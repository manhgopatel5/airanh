"use client";

import { memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

type Props = {
  content: string;
  className?: string;
  theme?: "task" | "plan";
  clamp?: number;
};

const linkClass = {
  task: "text-[#0A84FF] hover:underline font-medium",
  plan: "text-[#30D158] hover:underline font-medium",
};

function MarkdownContent({ content, className, theme = "task", clamp }: Props) {
  const components: Components = {
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass[theme]}
      >
        {children}
      </a>
    ),
    p: ({ children }) => (
      <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
    ),
    ul: ({ children }) => (
      <ul className="mb-2 list-disc pl-5 space-y-1">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="mb-2 list-decimal pl-5 space-y-1">{children}</ol>
    ),
    li: ({ children }) => (
      <li className="leading-relaxed">{children}</li>
    ),
    h1: ({ children }) => (
      <h4 className="text-base font-bold mb-2">{children}</h4>
    ),
    h2: ({ children }) => (
      <h4 className="text-base font-bold mb-2">{children}</h4>
    ),
    h3: ({ children }) => (
      <h5 className="text-sm font-bold mb-1">{children}</h5>
    ),
    code: ({ children }) => (
      <code className="rounded bg-zinc-100 px-1 py-0.5 text-sm font-mono dark:bg-zinc-800">
        {children}
      </code>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-2 border-zinc-300 pl-3 italic text-zinc-600 dark:border-zinc-600 dark:text-zinc-400">
        {children}
      </blockquote>
    ),
  };

  if (!content?.trim()) return null;

  return (
    <div
      className={cn(
        "text-sm text-zinc-900 dark:text-zinc-100 break-words",
        className
      )}
      style={clamp ? { WebkitLineClamp: clamp, display: "-webkit-box", WebkitBoxOrient: "vertical", overflow: "hidden" } : undefined}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default memo(MarkdownContent);
