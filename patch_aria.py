import re

with open('app/components/RichTextEditor.tsx', 'r') as f:
    content = f.read()

# Isolate the Toolbar return statement
toolbar_start = "return ("
toolbar_end = "});"
start_idx = content.find(toolbar_start, content.find("const Toolbar"))
end_idx = content.find(toolbar_end, start_idx)

toolbar_code = content[start_idx:end_idx]

# Replace title="X" with title="X" aria-label="X" where it doesn't already have aria-label
def add_aria_label(match):
    full_match = match.group(0)
    if 'aria-label' in full_match:
        return full_match
    title = match.group(1)
    return f'title="{title}" aria-label="{title}"'

# We apply this to <button> and <select> tags
def process_tag(match):
    tag_content = match.group(0)
    # find title attribute
    tag_content = re.sub(r'title="([^"]+)"', add_aria_label, tag_content)
    return tag_content

toolbar_code = re.sub(r'<button[^>]+>', process_tag, toolbar_code)
toolbar_code = re.sub(r'<select[^>]+>', process_tag, toolbar_code)

# Add max-height and overflow to the sticky wrapper
toolbar_code = toolbar_code.replace(
    "position: 'sticky', top: 0, zIndex: 10",
    "position: 'sticky', top: 0, zIndex: 10, maxHeight: '40vh', overflowY: 'auto'"
)

new_content = content[:start_idx] + toolbar_code + content[end_idx:]

with open('app/components/RichTextEditor.tsx', 'w') as f:
    f.write(new_content)
