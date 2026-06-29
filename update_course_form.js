const fs = require('fs');
const file = 'app/components/CourseForm.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add description state
content = content.replace(
  /const \[tagsArray, setTagsArray\] = useState<string\[\]>\(initialValues\?\.tags_array \|\| \[\]\);/,
  `const [tagsArray, setTagsArray] = useState<string[]>(initialValues?.tags_array || []);\n  const [description, setDescription] = useState(initialValues?.description || '');`
);

// Add initialization in useEffect
content = content.replace(
  /setTagsArray\(initialValues\.tags_array \|\| \[\]\);/,
  `setTagsArray(initialValues.tags_array || []);\n      setDescription(initialValues.description || '');`
);

// Add isEmptyHtml function
content = content.replace(
  /const handleSubmit = async \(e: React\.FormEvent<HTMLFormElement>\) => \{/,
  `const isEmptyHtml = (html: string) => {
    if (!html) return true;
    const stripped = html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').trim();
    return stripped === '';
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {`
);

// Update description validation and payload
content = content.replace(
  /const fullDesc = formData\.get\('description'\)\?\.toString\(\)\.trim\(\) \|\| '';/,
  `const fullDesc = description.trim();`
);

content = content.replace(
  /if \(!fullDesc\) \{ showModal\(\{ type: 'alert', title: 'Validation Error', message: 'Course description cannot be empty\.' \}\); return; \}/,
  `if (isEmptyHtml(fullDesc)) { showModal({ type: 'alert', title: 'Validation Error', message: 'Course description cannot be empty.' }); return; }`
);

// Update payload description mapping
content = content.replace(
  /description: formData\.get\('description'\),/,
  `description: fullDesc,`
);

// Reset description state
content = content.replace(
  /setTagsArray\(\[\]\);/,
  `setTagsArray([]);\n         setDescription('');`
);

// Pass value and onChange to LazyRichTextEditor
content = content.replace(
  /<LazyRichTextEditor disabled=\{loading\} initialValue=\{initialValues\?\.description\} \/>/,
  `<LazyRichTextEditor disabled={loading} value={description} onChange={setDescription} />`
);

fs.writeFileSync(file, content);
console.log('Updated CourseForm.tsx');
