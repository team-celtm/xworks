import re

with open('app/components/RichTextEditor.tsx', 'r') as f:
    content = f.read()

toolbar_start = "return ("
toolbar_end = "});"
start_idx = content.find(toolbar_start, content.find("const Toolbar"))
end_idx = content.find(toolbar_end, start_idx)

toolbar_code = content[start_idx:end_idx]

def replace_title(match):
    full = match.group(0)
    title = match.group(1)
    if 'aria-label=' in full:
        return full
    return f'{full} aria-label="{title}"'

# Match `title="Something"` safely
# To avoid replacing inside already replaced ones, we check if aria-label is there
# Wait, the regex `title="[^"]+"` will just match `title="X"`.
# Let's match `<button ... title="X" ...>` or just replace `title="X"` directly.
new_toolbar = []
for line in toolbar_code.split('\n'):
    if 'title=' in line and 'aria-label=' not in line:
        line = re.sub(r'title="([^"]+)"', r'title="\1" aria-label="\1"', line)
    new_toolbar.append(line)

toolbar_code = '\n'.join(new_toolbar)

new_content = content[:start_idx] + toolbar_code + content[end_idx:]

with open('app/components/RichTextEditor.tsx', 'w') as f:
    f.write(new_content)

