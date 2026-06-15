import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const callGeminiAPIMock = vi.hoisted(() => vi.fn());
const streamGeminiAPIMock = vi.hoisted(() => vi.fn());
const getApiAuthHeadersMock = vi.hoisted(() => vi.fn());

vi.mock('@/services/ai/api-client', () => ({
  callGeminiAPI: callGeminiAPIMock,
  streamGeminiAPI: streamGeminiAPIMock,
}));

vi.mock('@/lib/api-auth', () => ({
  getApiAuthHeaders: getApiAuthHeadersMock,
}));

describe('AI feature flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getApiAuthHeadersMock.mockResolvedValue({ Authorization: 'Bearer access-token' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('parses the translator JSON response into translated text and analysis panels', async () => {
    streamGeminiAPIMock.mockImplementation(async (_system, _prompt, onChunk) => {
      const payload = JSON.stringify({
        translation: 'Translated output',
        sourceLanguage: 'Korean',
        detectedDomain: 'Business',
        contextAnalysis: [
          {
            koreanTerm: '매출',
            suggestedTranslation: 'revenue',
            alternatives: 'sales',
          },
        ],
        terminologyAnalysis: [
          {
            koreanTerm: '영업이익',
            englishTerm: 'operating profit',
            description: 'Profit from operations',
          },
        ],
        styleAnalysis: {
          formality: 'formal',
          tone: 'professional',
          consistencyScore: 92,
          feedback: 'Consistent',
        },
      });
      onChunk?.(payload.slice(0, 20));
      return `\`\`\`json\n${payload}\n\`\`\``;
    });
    const { analyzeAndTranslate } = await import('@/lib/translation-service');

    const result = await analyzeAndTranslate('원문', 'English');

    expect(result.translation).toBe('Translated output');
    expect(result.sourceLanguage).toBe('Korean');
    expect(result.contextAnalysis).toHaveLength(1);
    expect(streamGeminiAPIMock).toHaveBeenCalledWith(
      expect.stringContaining('world-class professional translation assistant'),
      expect.stringContaining('Text to analyze'),
      undefined
    );
  });

  it('keeps presentation slides usable when the AI parser returns a slide array', async () => {
    callGeminiAPIMock.mockResolvedValue(
      JSON.stringify({
        presentation: {
          title: 'Quarterly Report',
          slides: [
            {
              id: 'slide-1',
              title: 'Overview',
              layout: 'cover',
              content: [{ heading: 'Result', description: 'Growth' }],
            },
          ],
        },
      })
    );
    const { aiService } = await import('@/lib/ai-service');

    const result = await aiService.generatePresentation({
      fileData: 'quarterly report',
      meetingInfo: {},
      settings: { slideCount: 1 },
    });

    expect(Array.isArray(result)).toBe(true);
    expect(result[0].title).toBe('Overview');
    expect(result[0].content).toEqual([{ heading: 'Result', description: 'Growth' }]);
  }, 10000);

  it('normalizes alternate PPT content fields before slides reach the editor', async () => {
    callGeminiAPIMock.mockResolvedValue(
      JSON.stringify({
        slides: [
          {
            title: 'Strategy Brief',
            subhead: 'Executive summary',
          },
          {
            title: 'Execution Priorities',
            layout: 'split-right',
            bullets: [
              'Revenue: Expand enterprise pipeline',
              { title: 'Efficiency', body: 'Reduce manual reporting effort' },
            ],
          },
        ],
      })
    );
    const { geminiService } = await import('@/services/ai/geminiService');

    const result = await geminiService.generatePresentation({
      fileData: 'strategy notes',
      meetingInfo: {},
      settings: { difficulty: 'medium', slideCount: 2 },
    });

    expect(result[0].layout).toBe('cover');
    expect(result[0].subtitle).toBe('Executive summary');
    expect(result[1].layout).toBe('split');
    expect(result[1].content).toEqual([
      { heading: 'Revenue', description: 'Expand enterprise pipeline' },
      { heading: 'Efficiency', description: 'Reduce manual reporting effort' },
    ]);
  });

  it('sends Audio Lab blob URLs through the authenticated Gemini proxy and parses the report JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    type: 'Speech',
                    summary: 'Meeting summary',
                    details: { actionItems: ['Follow up'] },
                  }),
                },
              ],
            },
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { geminiAudioService } = await import('@/services/ai/geminiAudioService');

    const result = await geminiAudioService.analyzeAudioDeep(
      'https://blob.example/audio.mp3',
      'audio/mpeg'
    );

    expect(result.type).toBe('Speech');
    expect(result.data.summary).toBe('Meeting summary');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/gemini-proxy',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
        }),
      })
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.blobUrl).toBe('https://blob.example/audio.mp3');
    expect(body.mimeType).toBe('audio/mpeg');
  });
});
