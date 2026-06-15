import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Renders chat message content as Markdown, with styled tables, code blocks,
 * lists, links, and headings matching the app's design tokens.
 */
const ChatMarkdown = ({ content }) => {
  return (
    <div className="text-sm leading-relaxed space-y-2 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ node, ...props }) => <p className="text-gray-700 dark:text-gray-200" {...props} />,
          strong: ({ node, ...props }) => <strong className="font-semibold text-gray-900 dark:text-gray-50" {...props} />,
          a: ({ node, ...props }) => (
            <a className="text-brand-600 dark:text-brand-300 underline hover:text-brand-700" target="_blank" rel="noreferrer" {...props} />
          ),
          h1: ({ node, ...props }) => <h1 className="text-base font-display font-semibold text-gray-900 dark:text-gray-50 mt-3" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-sm font-display font-semibold text-gray-900 dark:text-gray-50 mt-3" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mt-2" {...props} />,
          ul: ({ node, ...props }) => <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-200" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal pl-5 space-y-1 text-gray-700 dark:text-gray-200" {...props} />,
          li: ({ node, ...props }) => <li {...props} />,
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-2 border-brand-300 dark:border-brand-700 pl-3 italic text-gray-500 dark:text-gray-400" {...props} />
          ),
          code: ({ node, inline, className, children, ...props }) => {
            if (inline) {
              return (
                <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-surface-darkBorder text-brand-600 dark:text-brand-300 font-mono text-[0.8em]" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <pre className="bg-gray-900 dark:bg-black/40 text-gray-100 rounded-xl p-3 overflow-x-auto text-xs font-mono">
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            );
          },
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => <thead className="bg-gray-50 dark:bg-surface-darkBorder" {...props} />,
          th: ({ node, ...props }) => (
            <th className="px-2 py-1.5 text-left font-semibold text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-surface-darkBorder" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="px-2 py-1.5 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-surface-darkBorder" {...props} />
          ),
          hr: ({ node, ...props }) => <hr className="border-gray-200 dark:border-surface-darkBorder my-2" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default ChatMarkdown;
