const allCategories = [
  { id: 1, name: 'Artificial Intelligence', parent_name: null },
  { id: 2, name: 'Programming', parent_name: null },
  { id: 3, name: 'Java', parent_name: 'Programming' },
  { id: 4, name: 'Python', parent_name: 'Programming' }
];

const parentCats = allCategories.filter(c => !c.parent_name);
const childCats = allCategories.filter(c => c.parent_name);

let options = [];
parentCats.forEach(p => {
  const children = childCats.filter(c => c.parent_name === p.name);
  if (children.length > 0) {
    console.log(`<optgroup label="${p.name}">`);
    console.log(`  <option value="${p.id}">${p.name} (General)</option>`);
    children.forEach(c => {
      console.log(`  <option value="${c.id}">${c.name}</option>`);
    });
    console.log(`</optgroup>`);
  } else {
    console.log(`<option value="${p.id}">${p.name}</option>`);
  }
});
