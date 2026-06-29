import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { Superscript } from '@tiptap/extension-superscript';
import { Subscript } from '@tiptap/extension-subscript';
import { TextAlign } from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { FontFamily } from '@tiptap/extension-font-family';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { Image } from '@tiptap/extension-image';
import { Link } from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import DOMPurify from 'isomorphic-dompurify';
import { marked } from 'marked';
import { 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code, 
  Superscript as SuperscriptIcon, Subscript as SubscriptIcon,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Heading1, Heading2, Heading3, Heading4,
  List, ListOrdered, Quote, Minus, Link as LinkIcon, Image as ImageIcon,
  Table as TableIcon,
  ListIndentIncrease, ListIndentDecrease, Eraser
} from 'lucide-react';
import { FontSize, LineHeight, Indent } from './tiptap-extensions';
import AlertModal from './AlertModal';

const uploadImage = async (file: File, onError?: (msg: string) => void): Promise<string | null> => {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!validTypes.includes(file.type)) {
    if(onError) onError('Invalid file type. Only JPG, PNG, WEBP, and GIF are allowed.');
    return null;
  }
  if (file.size > 5 * 1024 * 1024) {
    if(onError) onError('Image size must be less than 5 MB.');
    return null;
  }

  const formData = new FormData();
  formData.append('file', file);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch('/api/upload', { 
      method: 'POST', 
      body: formData,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error('Upload failed');
    const data = await res.json();
    return data.url;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      if(onError) onError('Network timeout: Image upload took too long. Please check your connection and try again.');
    } else {
      console.error('Failed to upload image', error);
      if(onError) onError('Failed to upload image. Please try again.');
    }
    return null;
  }
};

const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
        parseHTML: element => element.getAttribute('style'),
        renderHTML: attributes => {
          if (!attributes.style) return {};
          return { style: attributes.style };
        }
      }
    };
  }
});

const Toolbar = React.memo(({ editor, disabled, onError }: { editor: any; disabled?: boolean; onError?: (msg: string) => void }) => {
  if (!editor) return null;

  const addImage = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg, image/png, image/webp, image/gif';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        const url = await uploadImage(file, onError);
        if (url) {
          editor.chain().focus().setImage({ src: url }).run();
        }
      }
    };
    input.click();
  };

  const addLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const btnStyle = (isActive: boolean) => ({
    padding: '6px',
    background: isActive ? 'var(--surface-3)' : 'transparent',
    border: 'none',
    borderRadius: '4px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    color: isActive ? 'var(--blue)' : 'var(--text-2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  });

  const selectStyle = {
    padding: '4px 8px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    color: 'var(--text-1)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '14px',
    outline: 'none'
  };

  const currentFontFamily = editor.getAttributes('textStyle').fontFamily || '';
  const currentFontSize = editor.getAttributes('textStyle').fontSize || '';
  const currentLineHeight = editor.getAttributes('paragraph').lineHeight || editor.getAttributes('heading').lineHeight || '';

  const setFontFamily = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value) editor.chain().focus().setFontFamily(value).run();
    else editor.chain().focus().unsetFontFamily().run();
  };

  const setFontSize = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value) editor.chain().focus().setFontSize(value).run();
    else editor.chain().focus().unsetFontSize().run();
  };

  const setHeading = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const level = parseInt(e.target.value, 10);
    if (level === 0) editor.chain().focus().setParagraph().run();
    else editor.chain().focus().toggleHeading({ level: level as any }).run();
  };
  
  let currentHeading = '0';
  if (editor.isActive('heading', { level: 1 })) currentHeading = '1';
  else if (editor.isActive('heading', { level: 2 })) currentHeading = '2';
  else if (editor.isActive('heading', { level: 3 })) currentHeading = '3';
  else if (editor.isActive('heading', { level: 4 })) currentHeading = '4';
  else if (editor.isActive('heading', { level: 5 })) currentHeading = '5';
  else if (editor.isActive('heading', { level: 6 })) currentHeading = '6';

  const setLineHeight = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value) editor.chain().focus().setLineHeight(value).run();
    else editor.chain().focus().unsetLineHeight().run();
  };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '8px', alignItems: 'center', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', borderTopLeftRadius: '12px', borderTopRightRadius: '12px', pointerEvents: disabled ? 'none' : 'auto', opacity: disabled ? 0.5 : 1, position: 'sticky', top: 0, zIndex: 10, maxHeight: '40vh', overflowY: 'auto' }}>
      <select style={selectStyle} value={currentFontFamily} onChange={setFontFamily} title="Font Family" aria-label="Font Family">
        <option value="">Default Font</option>
        <option value="Inter">Inter</option>
        <option value="Poppins">Poppins</option>
        <option value="Roboto">Roboto</option>
        <option value="Open Sans">Open Sans</option>
        <option value="Lato">Lato</option>
        <option value="Montserrat">Montserrat</option>
        <option value="Arial">Arial</option>
        <option value="Times New Roman">Times New Roman</option>
        <option value="Georgia">Georgia</option>
        <option value="Courier New">Courier New</option>
        <option value="Verdana">Verdana</option>
      </select>

      <select style={selectStyle} value={currentFontSize} onChange={setFontSize} title="Font Size" aria-label="Font Size">
        <option value="">Size</option>
        <option value="10px">10px</option>
        <option value="12px">12px</option>
        <option value="14px">14px</option>
        <option value="16px">16px</option>
        <option value="18px">18px</option>
        <option value="20px">20px</option>
        <option value="24px">24px</option>
        <option value="28px">28px</option>
        <option value="32px">32px</option>
        <option value="36px">36px</option>
        <option value="48px">48px</option>
        <option value="64px">64px</option>
      </select>
      
      <select style={selectStyle} value={currentHeading} onChange={setHeading} title="Text Style" aria-label="Text Style">
        <option value="0">Normal Text</option>
        <option value="1">Heading 1</option>
        <option value="2">Heading 2</option>
        <option value="3">Heading 3</option>
        <option value="4">Heading 4</option>
        <option value="5">Heading 5</option>
        <option value="6">Heading 6</option>
      </select>

      <div style={{ width: '1px', background: 'var(--border)', margin: '0 4px' }} />

      <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} style={btnStyle(editor.isActive('bold'))} title="Bold (Ctrl+B)" aria-label="Bold (Ctrl+B)"><Bold size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} style={btnStyle(editor.isActive('italic'))} title="Italic (Ctrl+I)" aria-label="Italic (Ctrl+I)"><Italic size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} style={btnStyle(editor.isActive('underline'))} title="Underline (Ctrl+U)" aria-label="Underline (Ctrl+U)"><UnderlineIcon size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} style={btnStyle(editor.isActive('strike'))} title="Strikethrough" aria-label="Strikethrough"><Strikethrough size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleCode().run()} style={btnStyle(editor.isActive('code'))} title="Inline Code" aria-label="Inline Code"><Code size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleSuperscript().run()} style={btnStyle(editor.isActive('superscript'))} title="Superscript" aria-label="Superscript"><SuperscriptIcon size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleSubscript().run()} style={btnStyle(editor.isActive('subscript'))} title="Subscript" aria-label="Subscript"><SubscriptIcon size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} style={btnStyle(false)} title="Clear Formatting" aria-label="Clear Formatting"><Eraser size={16} /></button>
      
      <div style={{ width: '1px', background: 'var(--border)', margin: '0 4px' }} />

      <select style={selectStyle} value={currentLineHeight} onChange={setLineHeight} title="Line Height" aria-label="Line Height">
        <option value="">Line Spacing</option>
        <option value="1">1.0</option>
        <option value="1.15">1.15</option>
        <option value="1.5">1.5</option>
        <option value="2">2.0</option>
        <option value="2.5">2.5</option>
      </select>

      <button type="button" onClick={() => editor.commands.outdent()} style={btnStyle(false)} title="Decrease Indent" aria-label="Decrease Indent"><ListIndentDecrease size={16} /></button>
      <button type="button" onClick={() => editor.commands.indent()} style={btnStyle(false)} title="Increase Indent" aria-label="Increase Indent"><ListIndentIncrease size={16} /></button>

      <div style={{ width: '1px', background: 'var(--border)', margin: '0 4px' }} />

      <button type="button" onClick={() => editor.chain().focus().setTextAlign('left').run()} style={btnStyle(editor.isActive({ textAlign: 'left' }))} title="Align Left" aria-label="Align Left"><AlignLeft size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().setTextAlign('center').run()} style={btnStyle(editor.isActive({ textAlign: 'center' }))} title="Align Center" aria-label="Align Center"><AlignCenter size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().setTextAlign('right').run()} style={btnStyle(editor.isActive({ textAlign: 'right' }))} title="Align Right" aria-label="Align Right"><AlignRight size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().setTextAlign('justify').run()} style={btnStyle(editor.isActive({ textAlign: 'justify' }))} title="Justify" aria-label="Justify"><AlignJustify size={16} /></button>

      <div style={{ width: '1px', background: 'var(--border)', margin: '0 4px' }} />

      <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} style={btnStyle(editor.isActive('bulletList'))} title="Bullet List" aria-label="Bullet List"><List size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} style={btnStyle(editor.isActive('orderedList'))} title="Numbered List" aria-label="Numbered List"><ListOrdered size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} style={btnStyle(editor.isActive('blockquote'))} title="Quote" aria-label="Quote"><Quote size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()} style={btnStyle(false)} title="Divider" aria-label="Divider"><Minus size={16} /></button>

      <div style={{ width: '1px', background: 'var(--border)', margin: '0 4px' }} />

      <button type="button" onClick={addLink} style={btnStyle(editor.isActive('link'))} title="Add Link (Ctrl+K)" aria-label="Add Link (Ctrl+K)"><LinkIcon size={16} /></button>
      <button type="button" onClick={addImage} style={btnStyle(false)} title="Add Image" aria-label="Add Image"><ImageIcon size={16} /></button>
      <button type="button" onClick={insertTable} style={btnStyle(editor.isActive('table'))} title="Insert Table" aria-label="Insert Table"><TableIcon size={16} /></button>

      <div style={{ width: '1px', background: 'var(--border)', margin: '0 4px' }} />
      
      <input 
        type="color" 
        onInput={e => editor.chain().focus().setColor((e.target as HTMLInputElement).value).run()} 
        value={editor.getAttributes('textStyle').color || '#000000'}
        style={{ width: '24px', height: '24px', padding: 0, border: 'none', cursor: 'pointer', borderRadius: '4px' }}
        title="Text Color" aria-label="Text Color"
        aria-label="Text Color"
      />
      <input 
        type="color" 
        onInput={e => editor.chain().focus().toggleHighlight({ color: (e.target as HTMLInputElement).value }).run()} 
        value={editor.getAttributes('highlight').color || '#ffffff'}
        style={{ width: '24px', height: '24px', padding: 0, border: 'none', cursor: 'pointer', borderRadius: '4px' }}
        title="Highlight Color" aria-label="Highlight Color"
        aria-label="Highlight Color"
      />
    </div>
  );
});



class EditorErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('RichTextEditor caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--surface-2)', color: 'var(--red)' }}>
          <p><strong>Error:</strong> The editor encountered a problem and could not be loaded.</p>
          <p style={{ fontSize: '12px', color: 'var(--text-2)' }}>Please refresh the page to try again. Your other form data is safe.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function RichTextEditor({ value = '', onChange, disabled = false }: { value?: string, onChange?: (html: string) => void, disabled?: boolean }) {
  const [initialHtml, setInitialHtml] = useState('');
  
  useEffect(() => {
    const processInitialValue = async () => {
      let content = value;
      if (value && !value.startsWith('<') && !value.startsWith('{')) {
        try {
          content = await marked.parse(value, { async: true });
        } catch (e) {
          console.error("Failed to parse markdown", e);
        }
      }
      
      const sanitized = DOMPurify.sanitize(content, { USE_PROFILES: { html: true } });
      setInitialHtml(sanitized);
    };
    processInitialValue();
  }, []); // Only process on mount to avoid cursor jumping

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Superscript,
      Subscript,
      TextAlign.configure({ types: ['heading', 'paragraph', 'image'] }),
      TextStyle,
      FontFamily,
      FontSize,
      LineHeight,
      Indent,
      Color,
      Highlight.configure({ multicolor: true }),
      CustomImage.configure({ inline: true, allowBase64: true }),
      Link.configure({ openOnClick: false }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: initialHtml,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(DOMPurify.sanitize(editor.getHTML(), { USE_PROFILES: { html: true } }));
      }
    },
    editorProps: {
      attributes: {
        class: 'tiptap-prose focus:outline-none',
      },
      handleDrop: function(view, event, slice, moved) {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            uploadImage(file).then(url => {
              if (url) {
                const { schema } = view.state;
                const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
                const node = schema.nodes.image.create({ src: url });
                const transaction = view.state.tr.insert(coordinates?.pos || 0, node);
                view.dispatch(transaction);
              }
            });
            return true;
          }
        }
        return false;
      },
      handlePaste: function(view, event, slice) {
        if (event.clipboardData && event.clipboardData.files && event.clipboardData.files[0]) {
          const file = event.clipboardData.files[0];
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            uploadImage(file).then(url => {
              if (url) {
                const { schema } = view.state;
                const node = schema.nodes.image.create({ src: url });
                const transaction = view.state.tr.replaceSelectionWith(node);
                view.dispatch(transaction);
              }
            });
            return true;
          }
        }
        return false;
      }
    },
  }, [initialHtml !== '' ? initialHtml : 'INITIAL_RENDER_HACK']); 
  
  useEffect(() => {
    if (editor && value === '' && !editor.isEmpty) {
      editor.commands.clearContent(true);
    }
  }, [value, editor]);

  return (
    <EditorErrorBoundary>
      <div className="tiptap-editor-wrapper" style={{ border: '1px solid var(--border-md)', borderRadius: '12px', background: 'var(--surface)', position: 'relative' }}>
        <Toolbar editor={editor} disabled={disabled} onError={(msg) => setAlertInfo({ isOpen: true, title: "Upload Error", message: msg })} />
        <div style={{ padding: '16px', minHeight: '300px', cursor: disabled ? 'not-allowed' : 'text' }} onClick={() => !disabled && editor?.commands.focus()}>
          <EditorContent editor={editor} disabled={disabled} />
        </div>
      </div>
    </EditorErrorBoundary>
  );
}
