import React from "react";

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const parseMarkdown = (text: string) => {
    if (!text) return "";

    // Escape raw HTML for safety first
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Code blocks: ```code```
    html = html.replace(
      /```([\s\S]*?)```/g,
      '<pre class="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs my-4 overflow-x-auto whitespace-pre">$1</pre>'
    );

    // Inline code: `code`
    html = html.replace(
      /`([^`]+)`/g,
      '<code class="bg-slate-100 text-indigo-600 px-1.5 py-0.5 rounded font-mono text-xs">$1</code>'
    );

    // Headers: # Header 1, ## Header 2, ### Header 3
    html = html.replace(
      /^### (.*$)/gim,
      '<h4 class="text-sm font-bold text-slate-900 mt-4 mb-2">$1</h4>'
    );
    html = html.replace(
      /^## (.*$)/gim,
      '<h3 class="text-base font-black text-slate-900 mt-5 mb-2.5">$1</h3>'
    );
    html = html.replace(
      /^# (.*$)/gim,
      '<h2 class="text-xl font-black text-slate-900 mt-6 mb-3 border-b border-slate-100 pb-2">$1</h2>'
    );

    // Bold: **text**
    html = html.replace(
      /\*\*([^*]+)\*\*/g,
      '<strong class="font-bold text-slate-950">$1</strong>'
    );

    // Italic: *text*
    html = html.replace(/\*([^*]+)\*/g, '<em class="italic text-slate-800">$1</em>');

    // Split into lines to parse bullet lists line-by-line
    const lines = html.split("\n");
    let inList = false;
    const parsedLines = lines.map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("- ")) {
        const itemText = trimmed.substring(2);
        let prefix = "";
        if (!inList) {
          inList = true;
          prefix = '<ul class="list-disc pl-5 my-3 space-y-1.5 text-slate-700">';
        }
        return `${prefix}<li class="text-xs leading-relaxed">${itemText}</li>`;
      } else {
        let suffix = "";
        if (inList) {
          inList = false;
          suffix = "</ul>";
        }

        // Only wrap in paragraph if it's not a tag
        if (
          trimmed &&
          !trimmed.startsWith("<h") &&
          !trimmed.startsWith("<pre") &&
          !trimmed.startsWith("<ul") &&
          !trimmed.startsWith("</pre>") &&
          !trimmed.startsWith("<li")
        ) {
          return `${suffix}<p class="text-xs text-slate-600 leading-relaxed my-3 text-justify">${trimmed}</p>`;
        }
        return `${suffix}${line}`;
      }
    });

    if (inList) {
      parsedLines.push("</ul>");
    }

    return parsedLines.join("\n");
  };

  return (
    <div
      className="prose prose-slate max-w-none font-sans select-text selection:bg-indigo-100 selection:text-indigo-900"
      dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
    />
  );
}
export default MarkdownRenderer;
