/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { coy } from "react-syntax-highlighter/dist/esm/styles/prism";
import { CopyToClipboard } from "react-copy-to-clipboard";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { InlineMath, BlockMath } from 'react-katex';

const CopyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
);

const renderLatexDocument = (latexString: string) => {
  // Try to extract individual math expressions and render them
  const mathRegex = /\\\[(.*?)\\\]/gs;
  const equationRegex = /\\begin\{equation\}(.*?)\\end\{equation\}/gs;
  
  let processedContent = latexString;
  const mathExpressions: string[] = [];
  
  // Extract display math
  processedContent = processedContent.replace(mathRegex, (match, expr) => {
    mathExpressions.push(expr.trim());
    return `__MATH_${mathExpressions.length - 1}__`;
  });
  
  // Extract equation environments
  processedContent = processedContent.replace(equationRegex, (match, expr) => {
    mathExpressions.push(expr.trim());
    return `__MATH_${mathExpressions.length - 1}__`;
  });
  
  return (
    <div style={{ 
      padding: "1em", 
      backgroundColor: "#f8f9fa", 
      border: "1px solid #e9ecef",
      borderRadius: "4px",
    }}>
      {/* REMOVED the <pre> element and replaced with a div */}
      <div style={{ 
        whiteSpace: "pre-wrap", 
        fontFamily: "monospace", 
        fontSize: "0.9em",
        overflow: "visible" // Explicitly set overflow to visible
      }}>
        {processedContent.split(/(__MATH_\d+__)/g).map((part, index) => {
          const mathMatch = part.match(/__MATH_(\d+)__/);
          if (mathMatch) {
            const mathIndex = parseInt(mathMatch[1]);
            try {
              return (
                <div key={index} style={{ 
                  margin: "1em 0", 
                  textAlign: "center",
                  overflow: "visible" // Explicitly set overflow to visible
                }}>
                  <BlockMath math={mathExpressions[mathIndex]} />
                </div>
              );
            } catch (error) {
              return <span key={index} style={{ color: 'red' }}>[Math Error: {mathExpressions[mathIndex]}]</span>;
            }
          }
          return part;
        })}
      </div>
    </div>
  );
};

const MarkdownRenderer = ({ content }: { content: string }) => {
  // Function to clean LaTeX string for KaTeX compatibility
  const cleanLatex = (latexString: string) => {
    // Replace % comments not followed by a newline with %\n
    // This regex looks for a '%' character that is NOT followed by a newline character (\n)
    // and is NOT at the very end of the string.
    // The negative lookahead (?!\n|$) ensures we don't add a newline if one already exists
    // or if it's the end of the string.
    return latexString.replace(/%(?!\n|$)/g, '%\\n');
  };

  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath, remarkGfm]}
      rehypePlugins={[rehypeRaw, rehypeKatex]}
      components={{
        code({ inline, className, children, ...props }) {
          const [copied, setCopied] = useState(false);
          const match = /language-(\w+)/.exec(className || "");
          let codeString = String(children).replace(/\n$/, "");

          const handleCopy = () => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          };

          if (inline) {
            return <code className={className} {...props}>{children}</code>;
          }
          
          // Handle LaTeX code blocks by rendering them as mathematical expressions
          if (className === 'language-latex' || className === 'language-tex') {
            return (
              <div style={{ position: "relative", margin: "1em 0" }}>
                <CopyToClipboard text={codeString} onCopy={handleCopy}>
                  <button className="copy-button">
                    {copied ? "Copied!" : <CopyIcon />}
                  </button>
                </CopyToClipboard>
                {renderLatexDocument(codeString)}
              </div>
            );
          }

          return match ? (
            <div style={{ position: "relative" }}>
              <CopyToClipboard text={codeString} onCopy={handleCopy}>
                <button className="copy-button">
                  {copied ? "Copied!" : <CopyIcon />}
                </button>
              </CopyToClipboard>
              <SyntaxHighlighter
                style={coy}
                language={match[1]}
                PreTag="div"
                customStyle={{
                  backgroundColor: '#f8f9fa',
                  padding: '1em',
                  border: '1px solid #e9ecef',
                  borderRadius: '4px',
                }}
                {...props}
              >
                {codeString}
              </SyntaxHighlighter>
            </div>
          ) : (
            <code className={className} {...props}>
              {children}
            </code>
          );
        },
        // Handle inline math expressions
        inlineMath: ({ value }) => <InlineMath math={cleanLatex(value)} />,
        // Handle block math expressions
        math: ({ value }) => (
          <div style={{ margin: "1em 0", textAlign: "center" }}>
            <BlockMath math={cleanLatex(value)} />
          </div>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

export default MarkdownRenderer;
