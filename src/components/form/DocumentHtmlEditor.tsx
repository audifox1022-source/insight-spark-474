import React, { useEffect, useRef, useState } from 'react';
import { DocumentEditorToolbar } from './DocumentEditorToolbar';

interface DocumentHtmlEditorProps {
  initialHtml: string;
  onChange: (html: string) => void;
}

export const DocumentHtmlEditor: React.FC<DocumentHtmlEditorProps> = ({
  initialHtml,
  onChange,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isEditMode, setIsEditMode] = useState(true);

  // Initialize iframe content
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    // We only set the initial HTML once to avoid overwriting user edits.
    // However, if the initialHtml changes drastically (e.g. new generation), we should re-render it.
    // For this basic setup, we just write it on mount and when initialHtml fundamentally changes.
    doc.open();
    // Add some base styling to the iframe body so it looks good when editing
    const styledHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <script src="https://cdn.tailwindcss.com"></script>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
          <style>
            body { 
              min-height: 100vh;
              font-family: 'Pretendard', sans-serif;
              padding: 12px; /* Reduced from 20px */
              margin: 0;
              cursor: ${isEditMode ? 'text' : 'default'} !important;
            }
            body:focus { outline: none; }
          </style>
        </head>
        <body contenteditable="${isEditMode}">
          ${extractBodyContent(initialHtml)}
        </body>
      </html>
    `;
    doc.write(styledHtml);
    doc.close();

    // Setup input listener to capture changes
    const handleChange = () => {
      if (doc.body) {
         // reconstruct full HTML since we stripped head/body for editing
        const resultHtml = `<!DOCTYPE html><html><head><script src="https://cdn.tailwindcss.com"></script><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"></head><body>${doc.body.innerHTML}</body></html>`;
        onChange(resultHtml);
      }
    };

    doc.addEventListener('input', handleChange);
    
    return () => {
      doc.removeEventListener('input', handleChange);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialHtml]); // Only re-run if the prop completely changes from outside

  // Toggle Edit Mode by modifying contentEditable directly
  useEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    if (doc?.body) {
      doc.body.contentEditable = isEditMode ? 'true' : 'false';
      doc.body.style.cursor = isEditMode ? 'text' : 'default';
    }
  }, [isEditMode]);

  const handleCommand = (command: string, value?: string) => {
    const doc = iframeRef.current?.contentDocument;
    if (doc && isEditMode) {
      doc.execCommand(command, false, value);
      iframeRef.current?.contentWindow?.focus();
      // manually trigger change since execCommand might not fire 'input' in all browsers
      if (doc.body) {
        const resultHtml = `<!DOCTYPE html><html><head><script src="https://cdn.tailwindcss.com"></script><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"></head><body>${doc.body.innerHTML}</body></html>`;
        onChange(resultHtml);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      <DocumentEditorToolbar
        isEditMode={isEditMode}
        onToggleMode={setIsEditMode}
        onCommand={handleCommand}
      />
      <div className="flex-1 overflow-auto bg-muted/10 p-0 flex justify-center custom-scrollbar">
        {/* Paper Container */}
        <div className="w-full h-full bg-white shadow-sm border border-border/40">
           <iframe
             ref={iframeRef}
             className="w-full h-full"
             title="Document Editor"
             sandbox="allow-same-origin allow-scripts" 
           />
        </div>
      </div>
    </div>
  );
};

// Helper to extract body content to inject into our editable iframe
function extractBodyContent(html: string) {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch && bodyMatch[1]) {
    return bodyMatch[1];
  }
  return html;
}
