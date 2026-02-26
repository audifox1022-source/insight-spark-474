/**
 * AI 서비스 — Supabase Edge Function을 통해 Lovable AI Gateway 호출
 */
import { supabase } from '@/integrations/supabase/client';

async function callEdgeFunction(mode: string, body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke('generate-presentation', {
    body: { mode, ...body },
  });

  if (error) {
    // FunctionsHttpError contains the response context
    let message = '서버 통신 오류가 발생했습니다.';
    try {
      // Try to parse error context from the response body
      if ('context' in error && (error as any).context?.body) {
        const reader = (error as any).context.body.getReader?.();
        if (reader) {
          const { value } = await reader.read();
          const text = new TextDecoder().decode(value);
          const parsed = JSON.parse(text);
          if (parsed.error) message = parsed.error;
        }
      } else if (error.message) {
        message = error.message;
      }
    } catch {
      if (error.message) message = error.message;
    }
    throw new Error(message);
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
}

export const aiService = {
  async getOutline(body: any) {
    const { fileData, meetingInfo, settings, template } = body;
    const data = await callEdgeFunction('outline', { fileData, meetingInfo, settings, template });
    return { outline: data.outline };
  },

  async generatePresentation(body: any) {
    const { fileData, settings, approvedOutline, meetingInfo, template } = body;
    const data = await callEdgeFunction('generate', { fileData, meetingInfo, settings, template, approvedOutline });
    return { presentation: data.presentation };
  },

  async regenerateSlide(body: any) {
    const { slideIndex, currentSlide, presentation, fileData, userInstruction } = body;
    const data = await callEdgeFunction('regenerate_slide', {
      slideIndex, currentSlide, presentation, fileData, userInstruction,
    });
    return { slide: data.slide };
  },

  async chatEdit(body: any) {
    const { userMessage, currentSlide, slideIndex, presentation } = body;
    const data = await callEdgeFunction('chat_edit', {
      userMessage, currentSlide, slideIndex, presentation,
    });
    return { result: data };
  },

  async changePersona(body: any) {
    const { currentSlide, persona } = body;
    const data = await callEdgeFunction('change_persona', { currentSlide, persona });
    return { slide: data.slide };
  },

  async review(body: any) {
    const { presentation } = body;
    const data = await callEdgeFunction('review', { presentation });
    return { review: data };
  },

  async reviewAndFix(body: any) {
    const { presentation } = body;
    const data = await callEdgeFunction('review_and_fix', { presentation });
    return { result: data };
  },
};
