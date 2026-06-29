const fs = require('fs');
const file = 'app/components/RichTextEditor.tsx';
let content = fs.readFileSync(file, 'utf8');

// Change props
content = content.replace(
  `export default function RichTextEditor({ initialValue = '', disabled = false }: { initialValue?: string, disabled?: boolean }) {`,
  `export default function RichTextEditor({ value = '', onChange, disabled = false }: { value?: string, onChange?: (html: string) => void, disabled?: boolean }) {`
);

// Replace state and refs
content = content.replace(
  /const \[initialHtml, setInitialHtml\] = useState\(''\);\s*const inputRef = useRef<HTMLInputElement>\(null\);\s*const debounceTimeout = useRef<NodeJS\.Timeout \| null>\(null\);/,
  `const [initialHtml, setInitialHtml] = useState('');`
);

// Replace useEffect for initialization
content = content.replace(
  /useEffect\(\(\) => \{\s*const processInitialValue.*?debounceTimeout\.current\);\s*};\s*\}, \[initialValue\]\);/s,
  `useEffect(() => {
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
  }, []); // Only process on mount to avoid cursor jumping`
);

// Remove debounceTimeout from useEditor onUpdate
content = content.replace(
  /onUpdate: \(\{ editor \}\) => \{\s*if \(debounceTimeout\.current\).*?\}, 300\);\s*\},/s,
  `onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(DOMPurify.sanitize(editor.getHTML(), { USE_PROFILES: { html: true } }));
      }
    },`
);

// Remove hidden input from return
content = content.replace(
  /<input type="hidden" name="description" ref=\{inputRef\} defaultValue=\{initialHtml\} \/>\s*/s,
  ``
);

// Add useEffect for reset right before return
content = content.replace(
  /return \(\s*<EditorErrorBoundary>/s,
  `useEffect(() => {
    if (editor && value === '' && !editor.isEmpty) {
      editor.commands.clearContent(true);
    }
  }, [value, editor]);

  return (
    <EditorErrorBoundary>`
);

fs.writeFileSync(file, content);
console.log('Updated RichTextEditor.tsx');
