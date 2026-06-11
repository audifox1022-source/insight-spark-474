import { describe, expect, it } from 'vitest';
import {
  buildUploadedContextFromState,
  UploadedDataFileState
} from '../utils/presentationContext';

describe('presentation upload context builder', () => {
  it('includes successful initial upload text as source context for generation', () => {
    const dataFiles: UploadedDataFileState[] = [{
      name: 'uploaded-brief.docx',
      status: 'success',
      fileType: 'docx',
      content: 'Customer churn decreased 18% after the retention campaign.',
      summary: 'Customer churn decreased 18%'
    }];

    const context = buildUploadedContextFromState({
      dataFiles,
      sourceFileData: '',
      dataSummary: ''
    });

    expect(context.text).toContain('[Uploaded file: uploaded-brief.docx (docx)]');
    expect(context.text).toContain('Customer churn decreased 18%');
    expect(context.mediaParts).toEqual([]);
  });

  it('keeps visual upload media attached without leaking base64 into text', () => {
    const inlinePart = {
      inlineData: {
        data: 'base64-image-payload',
        mimeType: 'image/jpeg'
      }
    };
    const dataFiles: UploadedDataFileState[] = [{
      name: 'scanned-report.pdf',
      status: 'success',
      fileType: 'pdf',
      content: [inlinePart],
      summary: 'Scanned report with visual evidence'
    }];

    const context = buildUploadedContextFromState({ dataFiles });

    expect(context.text).toContain('Scanned report with visual evidence');
    expect(context.text).not.toContain('base64-image-payload');
    expect(context.mediaParts).toEqual([{ inlineData: inlinePart.inlineData }]);
  });

  it('skips failed uploads so broken parses do not pollute generation prompts', () => {
    const context = buildUploadedContextFromState({
      dataFiles: [{
        name: 'broken.ppt',
        status: 'error',
        fileType: 'unknown',
        content: '',
        summary: '',
        parseError: 'Unsupported file'
      }]
    });

    expect(context.text).toBe('');
    expect(context.mediaParts).toEqual([]);
  });
});
