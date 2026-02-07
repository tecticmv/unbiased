import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface MarkdownProps {
  children: string | null | undefined;
  className?: string;
}

export function Markdown({ children, className }: MarkdownProps) {
  // Handle null/undefined/empty content
  if (!children) {
    return null;
  }

  return (
    <span className={cn("prose-sm", className)}>
      <ReactMarkdown
        components={{
          // Style paragraphs to not add extra margins when inline
          p: ({ children }) => <span>{children}</span>,
          // Style strong/bold text
          strong: ({ children }) => (
            <strong className="font-semibold">{children}</strong>
          ),
          // Style emphasis/italic text
          em: ({ children }) => <em className="italic">{children}</em>,
          // Style inline code
          code: ({ children }) => (
            <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
              {children}
            </code>
          ),
          // Style links
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-primary underline underline-offset-2 hover:text-primary/80"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          // Style unordered lists
          ul: ({ children }) => (
            <ul className="my-1.5 ml-4 list-disc space-y-1">{children}</ul>
          ),
          // Style ordered lists
          ol: ({ children }) => (
            <ol className="my-1.5 ml-4 list-decimal space-y-1">{children}</ol>
          ),
          // Style list items
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        }}
      >
        {children}
      </ReactMarkdown>
    </span>
  );
}

interface MarkdownBlockProps {
  children: string | null | undefined;
  className?: string;
}

// For block-level markdown content that should preserve paragraph structure
export function MarkdownBlock({ children, className }: MarkdownBlockProps) {
  // Handle null/undefined/empty content
  if (!children) {
    return null;
  }

  return (
    <div className={cn("prose-sm", className)}>
      <ReactMarkdown
        components={{
          // Style paragraphs with proper spacing
          p: ({ children }) => (
            <p className="mb-3 last:mb-0 leading-[1.7]">{children}</p>
          ),
          // Style strong/bold text
          strong: ({ children }) => (
            <strong className="font-semibold">{children}</strong>
          ),
          // Style emphasis/italic text
          em: ({ children }) => <em className="italic">{children}</em>,
          // Style inline code
          code: ({ children }) => (
            <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
              {children}
            </code>
          ),
          // Style links
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-primary underline underline-offset-2 hover:text-primary/80"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          // Style unordered lists
          ul: ({ children }) => (
            <ul className="my-2 ml-4 list-disc space-y-1">{children}</ul>
          ),
          // Style ordered lists
          ol: ({ children }) => (
            <ol className="my-2 ml-4 list-decimal space-y-1">{children}</ol>
          ),
          // Style list items
          li: ({ children }) => <li className="leading-[1.7]">{children}</li>,
          // Style headings
          h1: ({ children }) => (
            <h1 className="mb-2 text-lg font-bold">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2 text-base font-bold">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-1.5 text-sm font-semibold">{children}</h3>
          ),
          // Style blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-muted-foreground/30 pl-3 italic text-muted-foreground">
              {children}
            </blockquote>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
