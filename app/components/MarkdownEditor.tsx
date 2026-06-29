import React from 'react';

export default function MarkdownEditor({ disabled }: { disabled?: boolean }) {
  return (
    <textarea 
      name="description" 
      required 
      className="prompt-input" 
      style={{ 
        width: '100%', 
        minHeight: '200px', 
        resize: 'vertical',
        lineHeight: '1.6',
        fontFamily: 'monospace'
      }} 
      placeholder="Use Markdown to format your course description...&#10;&#10;## Features&#10;- Bullet points&#10;- **Bold text**"
      disabled={disabled}
    />
  );
}
