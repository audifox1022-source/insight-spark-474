import { describe, expect, it, vi } from 'vitest';
import { parsePdf } from './pdfParser';
import {
  buildAIParts,
  extractInlinePartsFromContent,
  formatParsedFileForPrompt,
  parseFile,
  ParsedFileData
} from './fileParser';

vi.mock('./pdfParser', () => ({
  parsePdf: vi.fn(async (file: File) => ({
    fileName: file.name,
    fileType: 'pdf',
    content: 'parsed pdf',
    summary: 'parsed pdf'
  }))
}));

describe('file parser prompt formatting', () => {
  it('loads the PDF parser module for PDF uploads', async () => {
    const file = new File(['fake pdf'], 'deck.pdf', { type: 'application/pdf' });

    const parsed = await parseFile(file);

    expect(parsePdf).toHaveBeenCalledWith(file);
    expect(parsed).toMatchObject({
      fileName: 'deck.pdf',
      fileType: 'pdf',
      content: 'parsed pdf'
    });
  });

  it('formats extracted text files as readable source context', () => {
    const parsed: ParsedFileData = {
      fileName: 'strategy.docx',
      fileType: 'docx',
      content: 'Market expansion plan\nRevenue target: 25%',
      summary: 'Market expansion plan'
    };

    expect(formatParsedFileForPrompt(parsed)).toContain('Market expansion plan');
    expect(formatParsedFileForPrompt(parsed)).toContain('strategy.docx');
  });

  it('keeps visual inline data out of text context while preserving media parts', () => {
    const content = [{
      inlineData: {
        data: 'base64-image-payload',
        mimeType: 'image/jpeg'
      }
    }];
    const parsed: ParsedFileData = {
      fileName: 'scanned.pdf',
      fileType: 'pdf',
      content,
      summary: 'Scanned PDF with one image part'
    };

    const promptText = formatParsedFileForPrompt(parsed);
    expect(promptText).toContain('Scanned PDF with one image part');
    expect(promptText).not.toContain('base64-image-payload');
    expect(extractInlinePartsFromContent(content)).toEqual([{ inlineData: content[0].inlineData }]);
  });

  it('builds AI parts with formatted text for text files', () => {
    const parts = buildAIParts([{
      fileName: 'notes.txt',
      fileType: 'txt',
      content: 'Use this uploaded note.',
      summary: ''
    }]);

    expect(parts).toEqual([{ text: expect.stringContaining('Use this uploaded note.') }]);
  });
});
