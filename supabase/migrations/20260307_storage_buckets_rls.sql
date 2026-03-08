-- ============================================================
-- Supabase Storage 버킷 생성 및 RLS 정책 마이그레이션
-- 버킷: user-uploads | ai-generated | exports
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. 버킷 생성
-- ────────────────────────────────────────────────────────────

-- user-uploads: 사용자가 직접 업로드하는 이미지
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-uploads',
  'user-uploads',
  false,                          -- 비공개 버킷 (RLS로 접근 제어)
  10485760,                       -- 최대 파일 크기: 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- ai-generated: AI가 생성한 이미지 (서버만 업로드)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ai-generated',
  'ai-generated',
  false,
  20971520,                       -- 최대 파일 크기: 20MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- exports: 최종 PPT/PDF 내보내기 파일 (서버만 업로드)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'exports',
  'exports',
  false,
  104857600,                      -- 최대 파일 크기: 100MB
  ARRAY[
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/pdf',
    'application/zip'
  ]
)
ON CONFLICT (id) DO NOTHING;


-- ────────────────────────────────────────────────────────────
-- 2. RLS 정책: user-uploads 버킷
--    - 로그인한 사용자 본인만 업로드(INSERT) 가능
--    - 로그인한 사용자 본인만 조회(SELECT) 가능
--    - 본인의 파일만 삭제(DELETE) 가능
-- ────────────────────────────────────────────────────────────

-- SELECT (조회): 본인 폴더만
CREATE POLICY "user-uploads: 본인 조회만 허용"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'user-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- INSERT (업로드): 본인 폴더에만 업로드
CREATE POLICY "user-uploads: 본인 업로드만 허용"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'user-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- UPDATE (수정): 본인 파일만
CREATE POLICY "user-uploads: 본인 수정만 허용"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'user-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'user-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- DELETE (삭제): 본인 파일만
CREATE POLICY "user-uploads: 본인 삭제만 허용"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'user-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );


-- ────────────────────────────────────────────────────────────
-- 3. RLS 정책: ai-generated 버킷
--    - INSERT: Service Role만 (서버 전용)
--    - SELECT: 로그인한 사용자면 누구나 조회 가능
-- ────────────────────────────────────────────────────────────

-- SELECT (조회): 인증된 사용자 전체 허용
CREATE POLICY "ai-generated: 인증 사용자 조회 허용"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'ai-generated');

-- INSERT: service_role만 허용 (anon, authenticated 모두 차단)
-- service_role은 RLS를 우회하므로 별도 정책 불필요.
-- 아래는 명시적으로 authenticated의 INSERT를 차단하는 정책:
CREATE POLICY "ai-generated: 서버(service_role)만 업로드"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (false);  -- authenticated 유저의 INSERT 완전 차단

-- DELETE: service_role만 허용
CREATE POLICY "ai-generated: 서버(service_role)만 삭제"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (false);


-- ────────────────────────────────────────────────────────────
-- 4. RLS 정책: exports 버킷
--    - INSERT/DELETE: Service Role만 (서버 전용)
--    - SELECT: 로그인한 사용자 본인 파일만 조회
-- ────────────────────────────────────────────────────────────

-- SELECT: 본인 폴더의 파일만 조회
CREATE POLICY "exports: 인증 사용자 본인 파일 조회"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'exports'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- INSERT: authenticated 차단 (service_role만 업로드)
CREATE POLICY "exports: 서버(service_role)만 업로드"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- DELETE: authenticated 차단
CREATE POLICY "exports: 서버(service_role)만 삭제"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (false);
