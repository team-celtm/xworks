const fs = require('fs');
const file = 'app/admin/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/alert\(`Failed to \$\{action\} instructor`\);/g, "showToast(`Failed to ${action} instructor`, 'error');");
content = content.replace(/alert\(`Failed to \$\{action\} instructor due to network\/server error`\);/g, "showToast(`Failed to ${action} instructor due to network/server error`, 'error');");

content = content.replace(/alert\(`Failed to \$\{action === 'approve' \? 'publish' : 'reject'\} course`\);/g, "showToast(`Failed to ${action === 'approve' ? 'publish' : 'reject'} course`, 'error');");
content = content.replace(/alert\('Failed to update course publishing status due to network\/server error'\);/g, "showToast('Failed to update course publishing status due to network/server error', 'error');");

content = content.replace(/alert\(data\.error \|\| "Failed to create promo"\);/g, 'showToast(data.error || "Failed to create promo", "error");');
content = content.replace(/alert\("Failed to create promo due to network\/server error"\);/g, 'showToast("Failed to create promo due to network/server error", "error");');

content = content.replace(/alert\('Please enter a Razorpay Order ID'\);/g, "showToast('Please enter a Razorpay Order ID', 'error');");
content = content.replace(/alert\(data\.message \|\| data\.error \|\| 'Done!'\);/g, 'showToast(data.message || data.error || "Done!", data.success ? "success" : "error");');
content = content.replace(/alert\('Failed to process refund due to network\/server error'\);/g, "showToast('Failed to process refund due to network/server error', 'error');");

content = content.replace(/alert\('Failed to revoke certificate due to network\/server error'\);/g, "showToast('Failed to revoke certificate due to network/server error', 'error');");

fs.writeFileSync(file, content);
console.log('Done');
