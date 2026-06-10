# API 교체/수정 및 발급 가이드

작성일: 2026-06-10

이 문서는 현재 코드에서 확인된 외부 API/토큰 사용처, 지금 수정하거나 교체해야 할 항목, 그리고 키 발급 방법을 정리한 문서입니다. 실제 `.env` 값은 확인하거나 노출하지 않았고, 변수명과 사용처만 기준으로 정리했습니다.

## 결론 요약

| 우선순위 | 대상 | 지금 필요한 작업 | 관련 변수 |
| --- | --- | --- | --- |
| P0 | Google Gemini API | 새 Auth key 또는 제한된 키로 교체하고, 브라우저 직접 호출을 서버 프록시로 이동 | `GEMINI_API_KEY`, `VITE_GEMINI_API_KEY`, `VITE_GEMINI_MODEL` |
| P0 | Vercel KV/Upstash Redis | 브라우저용 `VITE_KV_*` 토큰 사용을 중단하고 `/api/visitor` 같은 서버 API로 통합 | `KV_REST_API_URL`, `KV_REST_API_TOKEN` |
| P1 | Vercel Blob | 오디오 업로드용 Blob Store와 서버 전용 read/write 토큰 확인 | `BLOB_READ_WRITE_TOKEN` |
| P1 | Pollinations Image API | 현재 무인증 URL 호출을 API key 방식으로 수정하거나 다른 이미지 생성 API로 교체 | `POLLINATIONS_API_KEY` |
| P1 | Supabase | 클라이언트 키/서버 키 분리와 Edge Function secrets 확인 | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| P1 | Supabase Edge AI Gateway | `LOVABLE_API_KEY`, `UNSPLASH_ACCESS_KEY`가 실제 배포 환경에 있는지 확인 | `LOVABLE_API_KEY`, `UNSPLASH_ACCESS_KEY` |
| P1 | 내부 API 라우팅 | Vite 프로젝트에서 `app/api/*`와 누락된 `/api/export/*` 호출 정리 | 해당 없음 |
| P2 | 내부 프록시 Secret | `VITE_PROXY_SECRET`만 보내고 서버 검증이 없으므로 서버 검증 로직 추가 또는 제거 | `PROXY_SECRET`, `VITE_PROXY_SECRET` |

## 재점검 추가 결과 및 해결 상태

2026-06-10에 다시 점검한 결과, 키 발급 문제 외에 실제 런타임에서 실패할 수 있는 API 라우팅/의존성 문제가 추가로 확인되었고 아래처럼 반영했습니다.

1. `api/visitor.js`는 더 이상 `@vercel/kv`를 import하지 않습니다.
   - 확인 명령: `npm ls @vercel/kv --depth=0` 결과 `(empty)`
   - 확인 명령: `node -e "import('@vercel/kv')..."` 결과 `ERR_MODULE_NOT_FOUND`
   - 해결: `server/visitor-store.js`에서 Upstash Redis REST 호환 API를 직접 호출하도록 분리했고, `api/visitor.js`와 `server.js`가 이 공통 로직을 사용합니다.
2. `src/components/ai/WorkAIPresentationApp.tsx`의 `/api/banana-nl/generate` 호출은 이제 `api/banana-nl/generate.js`와 `server.js` 로컬 라우트가 처리합니다.
   - 현재 프로젝트는 `vercel.json`에서 `"framework": "vite"`이고 `package.json`에 `next`가 없습니다.
   - 해결: 기존 `app/api/banana-nl/generate/route.ts`는 제거했고, 새 Vercel Function은 `{ prompt }`와 `{ documentText }`를 모두 받도록 정합화했습니다.
3. `src/components/pdf/WorkAIPdfEditor.tsx`의 `/api/export/${type}` 호출은 이제 `api/export/[type].js`, `server.js` 로컬 라우트가 처리합니다.
   - 해결: `server/export-renderer.js`에서 PDF/PPTX 버퍼를 생성하고, 프론트 다운로드 확장자도 `ppt` 요청 시 `.pptx`로 저장되도록 수정했습니다.
4. `app/api/audio/analyze/route.ts`는 제거하고 `api/audio/analyze.js`로 이동했습니다.
5. `src/lib/gemini.ts`의 미사용 `GEMINI_API_URL` 하드코딩 상수는 제거했습니다.
6. Vercel Hobby 플랜의 Serverless Function 12개 제한에 맞추기 위해 중복 Blob 토큰 함수(`api/blob-token.js`)를 제거하고 export 함수를 동적 라우트 1개로 통합했습니다.
7. 검증 결과:
   - 새 API 파일 import 검증: `visitor route ok`, `audio route ok`, `export route ok`
   - export renderer 최소 버퍼 생성 검증: PDF/PPTX 버퍼 생성 성공
   - `npm run build`: 성공

## 1. Google Gemini API

### 현재 사용처

- `api/gemini-proxy.js`, `server.js`, `api/analyze-speech.js`, `api/analyze-music.js`, `api/identify-audio.js`, `api/generate-ai-image.js`: 서버에서 `GEMINI_API_KEY` 사용
- `src/services/ai/api-client.ts`, `src/services/ai/geminiService.ts`, `src/lib/translation-service.ts`, `src/lib/converter-service.ts`, `src/lib/pinecone-service.ts`: 브라우저 번들에서 `VITE_GEMINI_API_KEY` 사용
- `supabase/functions/gemini-proxy/index.ts`: Supabase Edge Function에서 `GEMINI_API_KEY` 사용

### 지금 수정해야 할 점

1. `VITE_GEMINI_API_KEY`를 프로덕션 브라우저 번들에서 제거해야 합니다.
   - `VITE_` 접두어 변수는 브라우저 코드에 포함될 수 있으므로 Gemini 비용/쿼터를 가진 키에는 부적합합니다.
   - `src/lib/translation-service.ts`, `src/lib/converter-service.ts`, `src/lib/pinecone-service.ts`의 직접 `generativelanguage.googleapis.com` 호출은 `/api/gemini-proxy` 또는 별도 서버 API로 이동하는 것이 안전합니다.
2. `src/services/ai/api-client.ts`의 `streamGeminiAPI()`는 `@ai-sdk/google` provider를 브라우저에서 만들고 있습니다. 스트리밍도 서버 엔드포인트로 옮기거나, 최소한 프로덕션에서는 서버 전용 키만 쓰도록 분리해야 합니다.
3. Google 공식 문서 기준으로 Gemini API는 2026-06-19부터 제한 없는 standard key 요청을 거부하고, 2026-09부터 standard key 자체를 거부할 예정입니다. 오늘 기준으로 2026-06-19까지 9일 남았으므로 새 Auth key 또는 명시적으로 제한된 키로 교체해야 합니다.
4. `api/gemini-proxy.js`의 CORS가 `*`이고 `x-proxy-secret` 검증이 없습니다. 공개 배포라면 `PROXY_SECRET` 서버 검증과 origin 제한을 추가해야 합니다.
5. `server.js`가 Gemini 키 앞 5자리를 로그로 출력합니다. 운영 로그에 credential 일부가 남지 않도록 해당 디버그 로그는 제거해야 합니다.

### 발급/교체 방법

1. Google AI Studio의 API Keys 페이지로 이동합니다: https://aistudio.google.com/app/apikey
2. 사용할 Google Cloud 프로젝트를 선택하거나 import합니다.
3. 새 Gemini API key를 생성합니다. 신규 키는 Google 문서 기준 Auth key가 기본입니다.
4. Vercel 또는 로컬 서버 환경변수에 `GEMINI_API_KEY`로 등록합니다.
5. 기존 `VITE_GEMINI_API_KEY`는 프로덕션에서 제거하고, 코드가 서버 프록시를 통하도록 수정합니다.
6. Vercel에 등록했다면 환경변수 변경 후 반드시 새 배포를 실행합니다.

공식 문서:
- Gemini API key: https://ai.google.dev/gemini-api/docs/api-key
- Google API key 제한: https://docs.cloud.google.com/docs/authentication/api-keys

## 2. Vercel KV / Upstash Redis

### 현재 사용처

- `api/visitor.js`, `server.js`: 서버 API에서 `server/visitor-store.js`의 Upstash Redis REST 호환 호출 사용
- `src/hooks/useVisitorCount.ts`: `/api/visitor`만 호출

### 지금 수정해야 할 점

1. 브라우저에서 `VITE_KV_REST_API_TOKEN`을 쓰는 구조를 제거해야 합니다.
   - 반영 완료: `src/lib/kv.ts`를 제거하고 `useVisitorCount()`를 서버 API 호출 방식으로 변경했습니다.
2. `useVisitorCount()`는 `src/lib/kv.ts`를 직접 쓰지 말고 `/api/visitor`를 호출하도록 바꾸는 것이 맞습니다.
   - 반영 완료.
3. Vercel 공식 문서 기준 Vercel KV는 신규 제공이 중단되었고, 새 프로젝트는 Marketplace의 Redis integration, 보통 Upstash Redis를 사용해야 합니다.
4. 현재 `@vercel/kv` 패키지가 설치되어 있지 않아 `api/visitor.js`는 그대로 배포하면 import 단계에서 실패할 수 있습니다.
   - 반영 완료: `@vercel/kv` import 제거.

### 발급/설정 방법

1. Vercel Dashboard에서 프로젝트를 엽니다.
2. Storage 또는 Marketplace에서 Redis integration을 추가합니다.
3. Upstash Redis를 연결하면 서버 환경변수 `KV_REST_API_URL`, `KV_REST_API_TOKEN`이 생성됩니다.
4. Vercel Project Settings > Environment Variables에 두 변수가 있는지 확인합니다.
5. 로컬 개발이 필요하면 `vercel env pull`로 로컬 환경변수 파일을 갱신합니다.
6. 클라이언트용 `VITE_KV_REST_API_URL`, `VITE_KV_REST_API_TOKEN`은 사용하지 않습니다.
7. 코드에서는 `api/visitor.js`를 `@upstash/redis` 기반으로 바꾸거나, 선택한 Redis SDK에 맞는 패키지를 `package.json`에 추가합니다.
   - 현재 구현은 추가 SDK 없이 Upstash Redis REST API를 직접 호출합니다.

공식 문서:
- Redis on Vercel: https://vercel.com/docs/redis
- Vercel 환경변수: https://vercel.com/docs/environment-variables

## 3. Vercel Blob

### 현재 사용처

- `api/upload.ts`, `server.js`: `@vercel/blob/client`의 `handleUpload()` 사용
- `src/components/audio/AudioLab.tsx`, `src/components/audio/AudioLabWorkspace.tsx`: 브라우저에서 `upload(..., { handleUploadUrl: "/api/upload" })` 호출

### 지금 수정해야 할 점

1. 배포 환경에 `BLOB_READ_WRITE_TOKEN`이 없으면 오디오 업로드가 실패합니다.
2. `BLOB_READ_WRITE_TOKEN`은 서버 전용입니다. 클라이언트에 넘기면 안 됩니다.
3. 현재 `/api/upload`는 모든 업로드를 허용하는 구조입니다. 실제 서비스에서는 로그인/권한 체크, MIME type, 파일 크기 제한을 서버에서 다시 검증해야 합니다.

### 발급/설정 방법

1. Vercel Dashboard > Project > Storage로 이동합니다.
2. Create Database > Blob을 선택합니다.
3. Blob Store를 만들면 Vercel이 프로젝트에 `BLOB_READ_WRITE_TOKEN`을 자동으로 추가합니다.
4. 로컬 개발은 `vercel env pull`로 토큰을 내려받습니다.
5. `BLOB_READ_WRITE_TOKEN`은 Vercel 서버리스 함수 또는 로컬 서버에서만 사용합니다.

공식 문서:
- Vercel Blob client uploads: https://vercel.com/docs/vercel-blob/client-upload

## 4. Supabase

### 현재 사용처

- `src/integrations/supabase/client.ts`, `src/App.tsx`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- `supabase/functions/generate-presentation/index.ts`: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `supabase/functions/gemini-proxy/index.ts`: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `ALLOWED_ORIGIN`

### 지금 수정해야 할 점

1. 클라이언트에는 publishable/anon 키만 사용해야 합니다.
2. `SUPABASE_SERVICE_ROLE_KEY` 또는 새 secret key는 Edge Function 같은 서버 환경에만 둬야 합니다.
3. 새 Supabase 프로젝트라면 공식 문서의 새 API key 체계에 맞춰 publishable key/secret key 사용을 검토해야 합니다. 현재 코드는 legacy 변수명(`anon`, `service_role`)에 맞춰져 있으므로 새 키 체계로 완전히 전환하려면 변수명과 Edge Function 로직을 정리해야 합니다.

### 발급/설정 방법

1. Supabase Dashboard에서 해당 프로젝트를 엽니다.
2. Project Settings > API Keys 또는 Connect dialog에서 키를 확인합니다.
3. 클라이언트용 키를 `VITE_SUPABASE_ANON_KEY`에 넣습니다. 새 key 체계라면 publishable key를 사용합니다.
4. 서버/Edge Function용 키를 `SUPABASE_SERVICE_ROLE_KEY` 또는 새 secret key 형태로 Supabase Edge Function secrets에 등록합니다.
5. Edge Function secrets는 Supabase Dashboard 또는 CLI로 설정합니다.

예시 CLI:

```sh
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
supabase secrets set GEMINI_API_KEY=...
supabase secrets set UNSPLASH_ACCESS_KEY=...
```

공식 문서:
- Supabase API keys: https://supabase.com/docs/guides/getting-started/api-keys
- Supabase Edge Function secrets: https://supabase.com/docs/guides/functions/secrets

## 5. Lovable AI Gateway

### 현재 사용처

- `supabase/functions/generate-presentation/index.ts`
  - `https://ai.gateway.lovable.dev/v1/chat/completions`
  - `https://ai.lovable.dev/api/chat`
  - `LOVABLE_API_KEY`

### 지금 수정해야 할 점

1. 이 저장소를 Lovable 내부 프로젝트로 운영한다면 `LOVABLE_API_KEY`가 Supabase Edge Function secret에 등록되어 있는지 확인해야 합니다.
2. 자체 배포/이관 프로젝트라면 `LOVABLE_API_KEY`를 일반 사용자가 직접 발급받는 공개 API key처럼 취급하기 어렵습니다. 이 경우 Lovable Gateway 의존을 제거하고 `GEMINI_API_KEY` 기반 서버 호출로 바꾸는 것이 명확합니다.
3. Lovable 공식 문서는 built-in AI connector가 provider key 설정을 대신 처리한다고 설명합니다. 따라서 현재 코드처럼 직접 `LOVABLE_API_KEY`를 요구하는 Edge Function은 배포 환경과 Lovable 프로젝트 설정이 맞지 않으면 실패할 수 있습니다.

### 발급/설정 방법

1. Lovable 프로젝트 내부에서 AI 기능을 쓰는 경우 프로젝트의 integrations/secrets 설정을 확인합니다.
2. Supabase Edge Function에서 직접 호출하는 구조라면 `LOVABLE_API_KEY`를 Supabase secrets에 등록합니다.
3. 외부 배포에서 키를 확보할 수 없다면 `callAI()`와 `handleGenerateImage()`를 Gemini API 직접 호출로 교체합니다.

공식 문서:
- Lovable AI features: https://docs.lovable.dev/integrations/ai

## 6. Unsplash API

### 현재 사용처

- `supabase/functions/generate-presentation/index.ts`
  - `handleSearchImages()`
  - `UNSPLASH_ACCESS_KEY`
  - `https://api.unsplash.com/search/photos`

### 지금 수정해야 할 점

1. 이미지 검색 기능을 사용할 경우 `UNSPLASH_ACCESS_KEY`를 Supabase Edge Function secret에 등록해야 합니다.
2. 데모 모드는 공식 문서 기준 시간당 50 요청 제한이 있으므로 프로덕션 서비스라면 Production 신청이 필요합니다.
3. Unsplash API 가이드라인에 맞춰 사진가/Unsplash attribution 처리도 확인해야 합니다.

### 발급/설정 방법

1. Unsplash developer 계정을 만듭니다.
2. Apps 페이지에서 New Application을 생성합니다.
3. Access Key를 복사해 Supabase secret `UNSPLASH_ACCESS_KEY`로 등록합니다.
4. 프로덕션 트래픽이 필요하면 Apply for Production을 진행합니다.

공식 문서:
- Unsplash API documentation: https://unsplash.com/documentation

## 7. Pollinations Image API

### 현재 사용처

- `api/generate-ai-image.js`
  - Gemini로 이미지 프롬프트를 만든 뒤 `https://image.pollinations.ai/prompt/...` URL을 반환
  - 현재 코드에는 Pollinations API key 전달이 없습니다.

### 지금 수정해야 할 점

1. Pollinations 공식 문서 기준 generation 요청에는 API key가 필요합니다. 현재 무인증 URL 방식은 실패할 수 있습니다.
2. 계속 Pollinations를 쓸 경우 서버 환경변수 `POLLINATIONS_API_KEY`를 추가하고, 공식 인증 방식에 맞게 요청을 수정해야 합니다.
3. 또는 이미 `LOVABLE_API_KEY`/Gemini 기반 이미지 생성 경로가 있으므로 Pollinations fallback을 제거하고 한 공급자로 통합하는 것도 방법입니다.

### 발급/설정 방법

1. Pollinations key 발급 페이지로 이동합니다: https://enter.pollinations.ai
2. API key를 발급받습니다.
3. Vercel 서버 환경변수로 `POLLINATIONS_API_KEY`를 등록합니다.
4. `api/generate-ai-image.js`에서 Pollinations 요청에 해당 key를 포함하도록 수정합니다.

공식 문서:
- Pollinations docs: https://gen.pollinations.ai/docs

## 8. 내부 프록시 Secret

### 현재 사용처

- `src/services/ai/api-client.ts`: `VITE_PROXY_SECRET`가 있으면 `x-proxy-secret` 헤더로 전송
- `api/gemini-proxy.js`, `server.js`: 현재 확인한 코드 기준 이 헤더를 검증하지 않음

### 지금 수정해야 할 점

1. `VITE_PROXY_SECRET`는 브라우저에 노출되는 값이라 진짜 secret으로 볼 수 없습니다.
2. 프록시 보호가 목적이라면 서버 환경변수 `PROXY_SECRET`를 만들고, 서버에서 `x-proxy-secret` 또는 세션/JWT를 검증해야 합니다.
3. 인증 없는 공개 API라면 `VITE_PROXY_SECRET`는 제거하고, CORS origin 제한, rate limit, Supabase auth 같은 실제 보호 장치를 적용해야 합니다.

### 생성 방법

로컬에서 임의 문자열을 생성해 서버 환경변수로 등록합니다.

```sh
openssl rand -hex 32
```

권장 변수:

```env
PROXY_SECRET=...
```

브라우저에 `VITE_PROXY_SECRET`로 배포하는 방식은 보안 효과가 제한적입니다.

## 9. 내부 API 라우팅/엔드포인트

### 현재 확인된 호출/구현 불일치

| 호출 위치 | 호출 URL | 현재 구현 상태 | 조치 |
| --- | --- | --- | --- |
| `src/components/ai/WorkAIPresentationApp.tsx` | `/api/banana-nl/generate` | `api/banana-nl/generate.js` 및 `server.js` 라우트 구현 완료 | 완료 |
| `src/components/pdf/WorkAIPdfEditor.tsx` | `/api/export/${type}` | `api/export/[type].js` 및 `server.js` 라우트 구현 완료 | 완료 |
| 기존 `app/api/audio/analyze/route.ts` | `/api/audio/analyze` | `api/audio/analyze.js`로 이동 완료 | 완료 |

공식 문서:
- Vercel Functions: https://vercel.com/docs/functions
- Vercel Functions API Reference: https://vercel.com/docs/functions/functions-api-reference
- Vite on Vercel: https://vercel.com/docs/frameworks/frontend/vite

## 권장 환경변수 배치

### 브라우저에 있어도 되는 변수

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_GEMINI_MODEL=gemini-2.5-flash
```

주의: `VITE_SUPABASE_ANON_KEY`는 RLS가 올바르게 설정되어 있다는 전제에서만 공개 가능합니다.

### Vercel 서버 환경변수

```env
GEMINI_API_KEY=...
BLOB_READ_WRITE_TOKEN=...
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
POLLINATIONS_API_KEY=...
PROXY_SECRET=...
PORT=3001
```

### Supabase Edge Function secrets

```env
GEMINI_API_KEY=...
LOVABLE_API_KEY=...
UNSPLASH_ACCESS_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ALLOWED_ORIGIN=https://your-domain.example
```

## 코드 수정 체크리스트

- [x] `src/lib/kv.ts`의 브라우저 Redis 직접 호출 제거
- [x] `src/hooks/useVisitorCount.ts`를 `/api/visitor` 서버 API 호출 방식으로 변경
- [ ] `src/lib/translation-service.ts`의 Gemini 직접 호출을 서버 프록시로 변경
- [ ] `src/lib/converter-service.ts`의 Gemini 직접 호출을 서버 프록시로 변경
- [ ] `src/lib/pinecone-service.ts`의 Gemini embedding 직접 호출을 서버 프록시로 변경
- [x] `src/lib/gemini.ts`의 미사용 `GEMINI_API_URL` 상수 제거 또는 실제 사용 흐름 정리
- [ ] `src/services/ai/api-client.ts`의 `streamGeminiAPI()`를 서버 스트리밍 API로 이동
- [ ] `api/gemini-proxy.js`와 `server.js`에 인증/Origin/rate limit 검증 추가
- [ ] `server.js`의 Gemini API key prefix 디버그 로그 제거
- [ ] `src/services/ai/api-client.ts`의 프로덕션 프록시 URL 하드코딩(`https://twmakeppt.vercel.app`)을 상대 경로 또는 환경변수로 변경
- [ ] `api/generate-ai-image.js`의 Pollinations 호출에 인증 추가 또는 공급자 통합
- [x] `api/visitor.js`의 `@vercel/kv` import를 설치된 Redis SDK로 교체하거나 의존성 추가
- [x] `/api/banana-nl/generate`를 Vite/Vercel Function 구조에 맞게 `api/` 아래로 이동
- [x] `/api/banana-nl/generate` 요청 바디를 프론트/서버 간 동일하게 통일
- [x] `/api/export/${type}` 라우트 구현 또는 호출 제거
- [x] 미사용 `app/api/audio/analyze/route.ts` 정리
- [ ] Vercel/Supabase 환경변수 변경 후 재배포

## 확인한 주요 파일

- `src/services/ai/api-client.ts`
- `src/services/ai/geminiService.ts`
- `src/services/ai/geminiAudioService.ts`
- `src/lib/gemini.ts`
- `src/lib/translation-service.ts`
- `src/lib/converter-service.ts`
- `src/lib/pinecone-service.ts`
- `src/hooks/useVisitorCount.ts`
- `api/gemini-proxy.js`
- `api/upload.ts`
- `api/visitor.js`
- `api/banana-nl/generate.js`
- `api/audio/analyze.js`
- `api/export/[type].js`
- `src/components/ai/WorkAIPresentationApp.tsx`
- `src/components/pdf/WorkAIPdfEditor.tsx`
- `package.json`
- `server.js`
- `server/banana-nl.js`
- `server/export-renderer.js`
- `server/visitor-store.js`
- `supabase/functions/generate-presentation/index.ts`
- `supabase/functions/gemini-proxy/index.ts`
