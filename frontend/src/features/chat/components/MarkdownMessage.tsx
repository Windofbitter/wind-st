import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import type { ReactNode } from "react";

interface MarkdownMessageProps {
  content: string;
}

export function MarkdownMessage({ content }: MarkdownMessageProps) {
  const components: Components = {
    a: (props) => (
      <a
        {...props}
        target="_blank"
        rel="noreferrer noopener"
      />
    ),
    code: ({
      inline,
      children,
      ...props
    }: {
      inline?: boolean;
      children?: ReactNode;
    }) =>
      inline ? (
        <code {...props}>{children}</code>
      ) : (
        <pre>
          <code {...props}>{children}</code>
        </pre>
      ),
  };

  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
