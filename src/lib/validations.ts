import { z } from 'zod';

export const MeetingInfoSchema = z.object({
  title: z.string().min(1, '제목은 필수입니다').max(200, '제목은 200자 이내로 입력해 주세요'),
  objective: z.string().max(500, '목표는 500자 이내로 입력해 주세요').optional().default(''),
  audience: z.string().max(200, '청중은 200자 이내로 입력해 주세요').optional().default(''),
  tone: z.string().max(100, '어조는 100자 이내로 입력해 주세요').optional().default(''),
  week: z.string().max(50, '기간은 50자 이내로 입력해 주세요').optional().default(''),
  reporter: z.string().max(100, '보고자는 100자 이내로 입력해 주세요').optional().default(''),
  department: z.string().max(100, '부서는 100자 이내로 입력해 주세요').optional().default(''),
  notes: z.string().max(5000, '참고사항은 5000자 이내로 입력해 주세요').optional().default(''),
});

export const PresentationSettingsSchema = z.object({
  difficulty: z.enum(['easy', 'medium', 'hard', 'executive', 'composer'], {
    errorMap: () => ({ message: '유효하지 않은 난이도입니다' }),
  }),
  volume: z.enum(['brief', 'standard', 'detailed', 'comprehensive'], {
    errorMap: () => ({ message: '유효하지 않은 분량입니다' }),
  }),
  slideCount: z.number().min(1, '슬라이드는 1장 이상이어야 합니다').max(50, '슬라이드는 50장 이하여야 합니다'),
  generationStyle: z.enum(['standard', 'kimura', 'gptpark'], {
    errorMap: () => ({ message: '유효하지 않은 생성 스타일입니다' }),
  }),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, '유효하지 않은 색상 코드입니다').optional(),
  gradientStart: z.string().regex(/^#[0-9A-Fa-f]{6}$/, '유효하지 않은 색상 코드입니다').optional(),
  gradientEnd: z.string().regex(/^#[0-9A-Fa-f]{6}$/, '유효하지 않은 색상 코드입니다').optional(),
  brandColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, '유효하지 않은 색상 코드입니다'),
});

export const SlideContentSchema = z.object({
  heading: z.string().min(1, '헤드라인은 필수입니다'),
  description: z.string().optional().default(''),
});

export const SlideSchema = z.object({
  title: z.string().min(1, '슬라이드 제목은 필수입니다'),
  layout: z.string().optional().default('default'),
  content: z.array(SlideContentSchema).optional().default([]),
  strategicGoal: z.string().optional(),
  speakerNotes: z.string().optional(),
});

export type MeetingInfoInput = z.infer<typeof MeetingInfoSchema>;
export type PresentationSettingsInput = z.infer<typeof PresentationSettingsSchema>;
export type SlideInput = z.infer<typeof SlideSchema>;

export function validateMeetingInfo(data: unknown): MeetingInfoInput {
  return MeetingInfoSchema.parse(data);
}

export function validatePresentationSettings(data: unknown): PresentationSettingsInput {
  return PresentationSettingsSchema.parse(data);
}

export function validateSlide(data: unknown): SlideInput {
  return SlideSchema.parse(data);
}

export function validateSafe<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error.errors.map(e => e.message).join(', ') };
}
