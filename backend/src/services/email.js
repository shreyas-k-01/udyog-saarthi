const configured = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
}

export async function sendEmail({ to, subject, text, html }) {
  if (!to) {
    console.log('[email] Skipped: recipient address is missing.');
    return false;
  }
  if (!configured()) {
    console.log(`[email] Not configured. Would send "${subject}" to ${to}`);
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [to],
        subject,
        text,
        html: html || `<p>${escapeHtml(text).replace(/\\n/g, '<br>')}</p>`
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('[email] Resend rejected email:', result.message || response.statusText);
      return false;
    }
    console.log(`[email] Sent "${subject}" to ${to}. ID: ${result.id || 'accepted'}`);
    return true;
  } catch (error) {
    console.error('[email] Could not send email:', error.message);
    return false;
  }
}

export function emailHtml(title, message, details = '') {
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#243047;line-height:1.6">
    <div style="max-width:600px;margin:24px auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
      <h2 style="color:#176b57">${escapeHtml(title)}</h2>
      <p>${escapeHtml(message)}</p>
      ${details ? `<p style="padding:12px;background:#f4f7f6;border-radius:8px">${escapeHtml(details)}</p>` : ''}
      <p>Regards,<br><strong>Udyog Saarthi Team</strong></p>
    </div></body></html>`;
}
