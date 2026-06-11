import { describe, expect, it } from 'vitest';
import {
  buildGeminiUserContentFromBody,
  prepareBodyForGeminiParts
} from './geminiService';

describe('Gemini presentation request body preparation', () => {
  it('separates media parts from serialized fileData text', () => {
    const body = {
      fileData: [
        {
          inlineData: {
            data: 'base64-image-payload',
            mimeType: 'image/jpeg'
          }
        },
        { text: '[Uploaded source context]\nQuarterly sales grew 25%.' }
      ],
      meetingInfo: { notes: 'Use the uploaded source.' }
    };

    const prepared = prepareBodyForGeminiParts(body);

    expect(prepared.mediaParts).toEqual([{ inlineData: body.fileData[0].inlineData }]);
    expect(prepared.safeBody.fileData).toContain('Quarterly sales grew 25%.');
    expect(JSON.stringify(prepared.safeBody)).not.toContain('base64-image-payload');
  });

  it('builds Gemini user content with media parts followed by a text payload', () => {
    const body = {
      fileData: [
        { fileData: { mimeType: 'application/pdf', fileUri: 'gemini://file/123' } },
        { text: 'Source text from upload.' }
      ],
      settings: { slideCount: 5 }
    };

    const content = buildGeminiUserContentFromBody(body);

    expect(Array.isArray(content)).toBe(true);
    expect(content).toHaveLength(2);
    expect((content as any[])[0]).toEqual({ fileData: body.fileData[0].fileData });
    expect((content as any[])[1].text).toContain('Source text from upload.');
  });
});
