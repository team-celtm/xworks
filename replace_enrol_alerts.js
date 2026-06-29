const fs = require('fs');
const file = 'app/components/EnrolModal.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add AlertModal import
content = content.replace("import React, { useState, useEffect, useCallback, useRef } from 'react';", "import React, { useState, useEffect, useCallback, useRef } from 'react';\nimport AlertModal from './AlertModal';");

// Add alertModalState to EnrolModal
content = content.replace("  const [enrolStep, setEnrolStep] = useState(1);", "  const [enrolStep, setEnrolStep] = useState(1);\n  const [alertInfo, setAlertInfo] = useState({ isOpen: false, title: '', message: '' });\n  const closeAlert = () => setAlertInfo(prev => ({ ...prev, isOpen: false }));");

// Replace alert() with setAlertInfo()
content = content.replace('alert("Please login first");', 'setAlertInfo({ isOpen: true, title: "Login Required", message: "Please login first to enrol in this course." });');
content = content.replace('alert("Instructors and Admins cannot enrol in courses.");', 'setAlertInfo({ isOpen: true, title: "Action Not Allowed", message: "Instructors and Admins cannot enrol in courses." });');

// Inject AlertModal inside the modal overlay
content = content.replace('{enrolStep === 1 && renderStep1()}', '<AlertModal isOpen={alertInfo.isOpen} onClose={closeAlert} title={alertInfo.title} message={alertInfo.message} />\n            {enrolStep === 1 && renderStep1()}');

fs.writeFileSync(file, content);
console.log('Updated EnrolModal');
