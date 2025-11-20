import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownMessageProps {
  content: string;
}

export function MarkdownMessage({ content }: MarkdownMessageProps) {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        linkTarget="_blank"
        components={{
          a: ({ node, ...props }) => (
            <a {...props} rel="noreferrer noopener" />
          ),
          code: ({ inline, ...props }) =>
            inline ? (
              <code {...props} />
            ) : (
              <pre>
                <code {...props} />
              </pre>
            ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
