import {
  extractInlinePartsFromContent,
  formatParsedFileForPrompt,
  ParsedFileData
} from './fileParser';

export interface UploadedDataFileState {
  name: string;
  status: 'loading' | 'success' | 'error';
  content?: string | any[];
  fileType?: ParsedFileData['fileType'];
  summary?: string;
  parseError?: string;
}

export function buildUploadedContextFromState({
  sourceFileData = '',
  dataSummary = '',
  dataFiles = []
}: {
  sourceFileData?: string;
  dataSummary?: string;
  dataFiles?: UploadedDataFileState[];
}) {
  const textSections: string[] = [];
  const mediaParts: any[] = [];

  if (sourceFileData && sourceFileData.trim()) {
    textSections.push(`[Direct source text]\n${sourceFileData.trim()}`);
  }

  if (dataSummary && dataSummary.trim()) {
    textSections.push(`[AI data analysis summary]\n${dataSummary.trim()}`);
  }

  dataFiles.forEach((file) => {
    if (file.status !== 'success') return;
    const content = file.content ?? '';
    textSections.push(formatParsedFileForPrompt({
      fileName: file.name,
      fileType: file.fileType || 'unknown',
      content,
      summary: file.summary || '',
      parseError: file.parseError
    }));
    mediaParts.push(...extractInlinePartsFromContent(content));
  });

  return {
    text: textSections.filter((section) => section.trim()).join('\n\n'),
    mediaParts
  };
}
