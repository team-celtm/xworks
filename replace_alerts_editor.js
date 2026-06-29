const fs = require('fs');
const file = 'app/components/RichTextEditor.tsx';
let content = fs.readFileSync(file, 'utf8');

// Update uploadImage signature to accept onError
content = content.replace('const uploadImage = async (file: File): Promise<string | null> => {', 'const uploadImage = async (file: File, onError?: (msg: string) => void): Promise<string | null> => {');
content = content.replace(/alert\('Invalid file type\. Only JPG, PNG, WEBP, and GIF are allowed\.'\);/, "if(onError) onError('Invalid file type. Only JPG, PNG, WEBP, and GIF are allowed.');");
content = content.replace(/alert\('Image size must be less than 5 MB\.'\);/, "if(onError) onError('Image size must be less than 5 MB.');");
content = content.replace(/alert\('Network timeout: Image upload took too long\. Please check your connection and try again\.'\);/, "if(onError) onError('Network timeout: Image upload took too long. Please check your connection and try again.');");
content = content.replace(/alert\('Failed to upload image\. Please try again\.'\);/, "if(onError) onError('Failed to upload image. Please try again.');");

// Update Toolbar to take onError
content = content.replace('const Toolbar = React.memo(({ editor, disabled }: { editor: any; disabled?: boolean }) => {', 'const Toolbar = React.memo(({ editor, disabled, onError }: { editor: any; disabled?: boolean; onError?: (msg: string) => void }) => {');
content = content.replace('const url = await uploadImage(file);', 'const url = await uploadImage(file, onError);');

// Import AlertModal
content = content.replace("import { FontSize, LineHeight, Indent } from './tiptap-extensions';", "import { FontSize, LineHeight, Indent } from './tiptap-extensions';\nimport AlertModal from './AlertModal';");

// Add AlertModal state to RichTextEditor
content = content.replace('export default function RichTextEditor({ initialValue = \'\', onChange, disabled = false }: RichTextEditorProps) {', 
  `export default function RichTextEditor({ initialValue = '', onChange, disabled = false }: RichTextEditorProps) {\n  const [alertInfo, setAlertInfo] = useState({ isOpen: false, title: '', message: '' });\n  const closeAlert = useCallback(() => setAlertInfo(prev => ({ ...prev, isOpen: false })), []);`);

// Update Toolbar usage
content = content.replace('<Toolbar editor={editor} disabled={disabled} />', '<Toolbar editor={editor} disabled={disabled} onError={(msg) => setAlertInfo({ isOpen: true, title: "Upload Error", message: msg })} />');

// Render AlertModal inside RichTextEditor return
content = content.replace('      <EditorContent editor={editor} />\n    </div>\n  );\n}', 
  `      <EditorContent editor={editor} />\n      <AlertModal isOpen={alertInfo.isOpen} onClose={closeAlert} title={alertInfo.title} message={alertInfo.message} />\n    </div>\n  );\n}`);

fs.writeFileSync(file, content);
console.log('Updated RichTextEditor');
