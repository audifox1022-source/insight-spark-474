// ============================================================
// lib/supabaseStorage.ts — Supabase Storage 유틸리티
// 기능:
//   - user-uploads 버킷 이미지 업로드
//   - Image Transformation (WebP 변환 + 리사이징) URL 생성
//   - ai-generated / exports 파일 서명 URL 생성
// ============================================================

import { supabase } from '@/integrations/supabase/client'

// ── 버킷 이름 상수
export const BUCKETS = {
  USER_UPLOADS:  'user-uploads',
  AI_GENERATED:  'ai-generated',
  EXPORTS:       'exports',
} as const

export type BucketName = typeof BUCKETS[keyof typeof BUCKETS]

// ── 업로드 결과 타입
export interface UploadResult {
  path: string          // 저장된 경로 (예: {uid}/abc123.png)
  fullPath: string      // 버킷 포함 전체 경로
  originalUrl: string   // 원본 공개 URL
  webpUrl: string       // WebP 변환 + 800px 리사이징 URL
}

// ── 에러 타입
export class StorageError extends Error {
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message)
    this.name = 'StorageError'
  }
}


// ────────────────────────────────────────────────────────────
// 1. user-uploads 버킷 이미지 업로드
//    - 경로: {userId}/{timestamp}_{fileName}
//    - 중복 방지를 위해 timestamp 접두사 사용
// ────────────────────────────────────────────────────────────
export async function uploadUserImage(
  file: File,
  options?: {
    folder?: string   // 하위 폴더 (기본값: 없음)
    upsert?: boolean  // 동일 경로 덮어쓰기 여부 (기본값: false)
  }
): Promise<UploadResult> {
  // 현재 로그인된 사용자 확인
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new StorageError('로그인이 필요합니다.', 'UNAUTHENTICATED')
  }

  // 파일 경로 생성: {uid}/{folder?}/{timestamp}_{sanitizedFileName}
  const timestamp   = Date.now()
  const safeName    = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
  const subFolder   = options?.folder ? `${options.folder}/` : ''
  const storagePath = `${user.id}/${subFolder}${timestamp}_${safeName}`

  // 업로드 실행
  const { data, error } = await supabase.storage
    .from(BUCKETS.USER_UPLOADS)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: options?.upsert ?? false,
      contentType: file.type,
    })

  if (error) {
    throw new StorageError(`업로드 실패: ${error.message}`, error.name)
  }

  const fullPath = data.fullPath

  // 원본 Signed URL 생성 (1시간 유효)
  const { data: signedData, error: signedError } = await supabase.storage
    .from(BUCKETS.USER_UPLOADS)
    .createSignedUrl(storagePath, 3600)

  if (signedError || !signedData) {
    throw new StorageError(`Signed URL 생성 실패: ${signedError?.message}`)
  }

  const originalUrl = signedData.signedUrl

  // WebP 변환 + 리사이징 URL 생성
  const webpUrl = getOptimizedImageUrl(storagePath, { width: 800, format: 'webp' })

  return { path: storagePath, fullPath, originalUrl, webpUrl }
}


// ────────────────────────────────────────────────────────────
// 2. Image Transformation URL 생성
//    - Supabase Pro 이상 플랜에서 지원
//    - format: webp / jpeg / png / origin
//    - quality: 1~100 (기본 80)
//    - resize mode: cover | contain | fill
// ────────────────────────────────────────────────────────────
export interface ImageTransformOptions {
  width?:   number               // 너비 (px)
  height?:  number               // 높이 (px)
  format?:  'webp' | 'jpeg' | 'png' | 'origin'
  quality?: number               // 1~100
  resize?:  'cover' | 'contain' | 'fill'
}

export function getOptimizedImageUrl(
  storagePath: string,
  options: ImageTransformOptions = {},
  bucket: BucketName = BUCKETS.USER_UPLOADS
): string {
  const {
    width   = 800,
    height,
    format  = 'webp',
    quality = 80,
    resize  = 'cover',
  } = options

  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(storagePath, {
      transform: {
        width,
        ...(height ? { height } : {}),
        format,
        quality,
        resize,
      },
    })

  return data.publicUrl
}


// ────────────────────────────────────────────────────────────
// 3. 여러 해상도 소스셋 생성 (반응형 이미지용)
//    - 200w, 400w, 800w, 1200w 4종 자동 생성
// ────────────────────────────────────────────────────────────
export function getResponsiveSrcSet(
  storagePath: string,
  bucket: BucketName = BUCKETS.USER_UPLOADS
): string {
  const widths = [200, 400, 800, 1200]
  return widths
    .map(w => `${getOptimizedImageUrl(storagePath, { width: w, format: 'webp' }, bucket)} ${w}w`)
    .join(', ')
}


// ────────────────────────────────────────────────────────────
// 4. Signed URL 생성 (비공개 버킷 조회용)
//    - expiresIn: 유효 시간(초), 기본 1시간
// ────────────────────────────────────────────────────────────
export async function createSignedUrl(
  storagePath: string,
  bucket: BucketName = BUCKETS.USER_UPLOADS,
  expiresIn = 3600
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, expiresIn)

  if (error || !data) {
    throw new StorageError(`Signed URL 생성 실패: ${error?.message}`, error?.name)
  }
  return data.signedUrl
}


// ────────────────────────────────────────────────────────────
// 5. 파일 삭제 (user-uploads 본인 파일만)
// ────────────────────────────────────────────────────────────
export async function deleteUserFile(storagePath: string): Promise<void> {
  const { error } = await supabase.storage
    .from(BUCKETS.USER_UPLOADS)
    .remove([storagePath])

  if (error) {
    throw new StorageError(`파일 삭제 실패: ${error.message}`, error.name)
  }
}


// ────────────────────────────────────────────────────────────
// 6. 사용자 업로드 파일 목록 조회
// ────────────────────────────────────────────────────────────
export async function listUserFiles(folder?: string) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new StorageError('로그인이 필요합니다.', 'UNAUTHENTICATED')
  }

  const path = folder ? `${user.id}/${folder}` : user.id

  const { data, error } = await supabase.storage
    .from(BUCKETS.USER_UPLOADS)
    .list(path, {
      limit: 100,
      sortBy: { column: 'created_at', order: 'desc' },
    })

  if (error) {
    throw new StorageError(`파일 목록 조회 실패: ${error.message}`, error.name)
  }

  return (data ?? []).map(file => ({
    name:      file.name,
    path:      `${path}/${file.name}`,
    size:      file.metadata?.size as number | undefined,
    mimeType:  file.metadata?.mimetype as string | undefined,
    createdAt: file.created_at,
    webpUrl:   getOptimizedImageUrl(`${path}/${file.name}`, { width: 400 }),
  }))
}


// ────────────────────────────────────────────────────────────
// 7. exports 버킷 — 서명 URL 다운로드 (사용자 본인 파일)
// ────────────────────────────────────────────────────────────
export async function getExportDownloadUrl(
  storagePath: string,
  expiresIn = 300   // 5분
): Promise<string> {
  return createSignedUrl(storagePath, BUCKETS.EXPORTS, expiresIn)
}
