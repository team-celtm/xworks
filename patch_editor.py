import re

with open('app/components/RichTextEditor.tsx', 'r') as f:
    content = f.read()

# 1. Add lucide icons
lucide_import_old = "import { \n  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code, \n  Superscript as SuperscriptIcon, Subscript as SubscriptIcon,\n  AlignLeft, AlignCenter, AlignRight, AlignJustify,\n  Heading1, Heading2, Heading3, Heading4,\n  List, ListOrdered, Quote, Minus, Link as LinkIcon, Image as ImageIcon,\n  Table as TableIcon\n} from 'lucide-react';"
lucide_import_new = "import { \n  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code, \n  Superscript as SuperscriptIcon, Subscript as SubscriptIcon,\n  AlignLeft, AlignCenter, AlignRight, AlignJustify,\n  Heading1, Heading2, Heading3, Heading4,\n  List, ListOrdered, Quote, Minus, Link as LinkIcon, Image as ImageIcon,\n  Table as TableIcon,\n  ListIndentIncrease, ListIndentDecrease, Eraser\n} from 'lucide-react';\nimport { FontSize, LineHeight, Indent } from './tiptap-extensions';"
content = content.replace(lucide_import_old, lucide_import_new)

# 2. Replace Toolbar
toolbar_start = "const Toolbar = React.memo(({ editor, disabled }: { editor: any; disabled?: boolean }) => {"
toolbar_end = "});"

toolbar_new = """const Toolbar = React.memo(({ editor, disabled }: { editor: any; disabled?: boolean }) => {
  if (!editor) return null;

  const addImage = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg, image/png, image/webp, image/gif';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        const url = await uploadImage(file);
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
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '8px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', borderTopLeftRadius: '12px', borderTopRightRadius: '12px', pointerEvents: disabled ? 'none' : 'auto', opacity: disabled ? 0.5 : 1, position: 'sticky', top: 0, zIndex: 10 }}>
      <select style={selectStyle} value={currentFontFamily} onChange={setFontFamily} title="Font Family">
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

      <select style={selectStyle} value={currentFontSize} onChange={setFontSize} title="Font Size">
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
      
      <select style={selectStyle} value={currentHeading} onChange={setHeading} title="Text Style">
        <option value="0">Normal Text</option>
        <option value="1">Heading 1</option>
        <option value="2">Heading 2</option>
        <option value="3">Heading 3</option>
        <option value="4">Heading 4</option>
        <option value="5">Heading 5</option>
        <option value="6">Heading 6</option>
      </select>

      <div style={{ width: '1px', background: 'var(--border)', margin: '0 4px' }} />

      <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} style={btnStyle(editor.isActive('bold'))} title="Bold (Ctrl+B)"><Bold size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} style={btnStyle(editor.isActive('italic'))} title="Italic (Ctrl+I)"><Italic size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} style={btnStyle(editor.isActive('underline'))} title="Underline (Ctrl+U)"><UnderlineIcon size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} style={btnStyle(editor.isActive('strike'))} title="Strikethrough"><Strikethrough size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleCode().run()} style={btnStyle(editor.isActive('code'))} title="Inline Code"><Code size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleSuperscript().run()} style={btnStyle(editor.isActive('superscript'))} title="Superscript"><SuperscriptIcon size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleSubscript().run()} style={btnStyle(editor.isActive('subscript'))} title="Subscript"><SubscriptIcon size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} style={btnStyle(false)} title="Clear Formatting"><Eraser size={16} /></button>
      
      <div style={{ width: '1px', background: 'var(--border)', margin: '0 4px' }} />

      <select style={selectStyle} value={currentLineHeight} onChange={setLineHeight} title="Line Height">
        <option value="">Line Spacing</option>
        <option value="1">1.0</option>
        <option value="1.15">1.15</option>
        <option value="1.5">1.5</option>
        <option value="2">2.0</option>
        <option value="2.5">2.5</option>
      </select>

      <button type="button" onClick={() => editor.commands.outdent()} style={btnStyle(false)} title="Decrease Indent"><ListIndentDecrease size={16} /></button>
      <button type="button" onClick={() => editor.commands.indent()} style={btnStyle(false)} title="Increase Indent"><ListIndentIncrease size={16} /></button>

      <div style={{ width: '1px', background: 'var(--border)', margin: '0 4px' }} />

      <button type="button" onClick={() => editor.chain().focus().setTextAlign('left').run()} style={btnStyle(editor.isActive({ textAlign: 'left' }))} title="Align Left"><AlignLeft size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().setTextAlign('center').run()} style={btnStyle(editor.isActive({ textAlign: 'center' }))} title="Align Center"><AlignCenter size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().setTextAlign('right').run()} style={btnStyle(editor.isActive({ textAlign: 'right' }))} title="Align Right"><AlignRight size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().setTextAlign('justify').run()} style={btnStyle(editor.isActive({ textAlign: 'justify' }))} title="Justify"><AlignJustify size={16} /></button>

      <div style={{ width: '1px', background: 'var(--border)', margin: '0 4px' }} />

      <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} style={btnStyle(editor.isActive('bulletList'))} title="Bullet List"><List size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} style={btnStyle(editor.isActive('orderedList'))} title="Numbered List"><ListOrdered size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} style={btnStyle(editor.isActive('blockquote'))} title="Quote"><Quote size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()} style={btnStyle(false)} title="Divider"><Minus size={16} /></button>

      <div style={{ width: '1px', background: 'var(--border)', margin: '0 4px' }} />

      <button type="button" onClick={addLink} style={btnStyle(editor.isActive('link'))} title="Add Link (Ctrl+K)"><LinkIcon size={16} /></button>
      <button type="button" onClick={addImage} style={btnStyle(false)} title="Add Image"><ImageIcon size={16} /></button>
      <button type="button" onClick={insertTable} style={btnStyle(editor.isActive('table'))} title="Insert Table"><TableIcon size={16} /></button>

      <div style={{ width: '1px', background: 'var(--border)', margin: '0 4px' }} />
      
      <input 
        type="color" 
        onInput={e => editor.chain().focus().setColor((e.target as HTMLInputElement).value).run()} 
        value={editor.getAttributes('textStyle').color || '#000000'}
        style={{ width: '24px', height: '24px', padding: 0, border: 'none', cursor: 'pointer', borderRadius: '4px' }}
        title="Text Color"
        aria-label="Text Color"
      />
      <input 
        type="color" 
        onInput={e => editor.chain().focus().toggleHighlight({ color: (e.target as HTMLInputElement).value }).run()} 
        value={editor.getAttributes('highlight').color || '#ffffff'}
        style={{ width: '24px', height: '24px', padding: 0, border: 'none', cursor: 'pointer', borderRadius: '4px' }}
        title="Highlight Color"
        aria-label="Highlight Color"
      />
    </div>
  );
});"""

content = re.sub(re.escape(toolbar_start) + ".*?" + re.escape(toolbar_end), toolbar_new, content, flags=re.DOTALL)

# 3. Add extensions to useEditor
extensions_old = """    extensions: [
      StarterKit,
      Underline,
      Superscript,
      Subscript,
      TextAlign.configure({ types: ['heading', 'paragraph', 'image'] }),
      TextStyle,
      FontFamily,
      Color,
      Highlight.configure({ multicolor: true }),
      CustomImage.configure({ inline: true, allowBase64: true }),
      Link.configure({ openOnClick: false }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],"""

extensions_new = """    extensions: [
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
    ],"""

content = content.replace(extensions_old, extensions_new)

# 4. Add relative positioning to wrapper for sticky toolbar to work
wrapper_old = '<div className="tiptap-editor-wrapper" style={{ border: \'1px solid var(--border-md)\', borderRadius: \'12px\', background: \'var(--surface)\' }}>'
wrapper_new = '<div className="tiptap-editor-wrapper" style={{ border: \'1px solid var(--border-md)\', borderRadius: \'12px\', background: \'var(--surface)\', position: \'relative\' }}>'
content = content.replace(wrapper_old, wrapper_new)

with open('app/components/RichTextEditor.tsx', 'w') as f:
    f.write(content)

