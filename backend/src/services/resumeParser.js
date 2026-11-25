import { PDFParse } from 'pdf-parse';
export async function extractResumeText(buffer) {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    const text = String(result.text || '').replace(/\0/g, ' ').trim();
    if (text.length < 80) throw new Error('Unable to extract readable text. Scanned PDFs are not supported yet.');
    return text.slice(0, 25000);
  } finally { await parser.destroy(); }
}
