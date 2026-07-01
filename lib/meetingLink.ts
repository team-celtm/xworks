/**
 * Unified meeting link validation utility.
 * Enforces rules for Start Session and Update Session Link modals.
 */
export function validateMeetingLink(url: string | null | undefined): { isValid: boolean; error?: string; sanitizedUrl?: string } {
  if (!url || typeof url !== 'string') {
    return { isValid: false, error: 'Meeting link is required.' };
  }
  const trimmed = url.trim();
  if (trimmed === '') {
    return { isValid: false, error: 'Meeting link is required.' };
  }

  const lowerUrl = trimmed.toLowerCase();

  // HTTPS enforcement
  if (lowerUrl.startsWith('http://')) {
    return { isValid: false, error: 'Meeting links must use HTTPS.' };
  }

  const blockedPrefixes = ['javascript:', 'data:', 'blob:', 'ftp:', 'file:', 'about:', 'chrome:'];
  for (const prefix of blockedPrefixes) {
    if (lowerUrl.startsWith(prefix)) {
      return { isValid: false, error: 'Please enter a valid meeting URL.' };
    }
  }

  if (!lowerUrl.startsWith('https://')) {
    return { isValid: false, error: 'Meeting links must use HTTPS.' };
  }

  // Length guard
  if (trimmed.length > 2048) {
    return { isValid: false, error: 'Please enter a valid meeting URL.' };
  }

  // Security and injection checks (XSS / HTML injection / Open Redirects)
  const maliciousRegex = /[<>'"`();]/;
  if (maliciousRegex.test(trimmed) || maliciousRegex.test(decodeURIComponent(trimmed))) {
    return { isValid: false, error: 'Please enter a valid meeting URL.' };
  }

  const scriptKeywords = ['javascript:', '<script', 'onerror', 'onload', 'onclick', 'alert('];
  for (const keyword of scriptKeywords) {
    if (lowerUrl.includes(keyword)) {
      return { isValid: false, error: 'Please enter a valid meeting URL.' };
    }
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') {
      return { isValid: false, error: 'Meeting links must use HTTPS.' };
    }
    if (!parsed.hostname || parsed.hostname.trim() === '' || !parsed.hostname.includes('.')) {
      return { isValid: false, error: 'Please enter a valid meeting URL.' };
    }
    // Hostname length check
    if (parsed.hostname.replace(/[^a-zA-Z0-9]/g, '').length < 3) {
      return { isValid: false, error: 'Please enter a valid meeting URL.' };
    }

    return { isValid: true, sanitizedUrl: trimmed };
  } catch {
    return { isValid: false, error: 'Please enter a valid meeting URL.' };
  }
}
