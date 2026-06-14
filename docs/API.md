# WorkAI API 문서

## 개요
WorkAI 백엔드 API는 Express.js 기반으로 Gemini AI 프록시, 오디오 분석, 파일 업로드 등의 기능을 제공합니다.

## 인증
모든 API 엔드포인트는 Supabase JWT 토큰이 필요합니다.
```
Authorization: Bearer <supabase_jwt_token>
```

## 엔드포인트

### 1. 헬스 체크
```
GET /api/health
```
**응답:**
```json
{
  "status": "ok",
  "ready": true,
  "message": "Work AI Backend Server is running",
  "runtime": {
    "supabaseUrlConfigured": true,
    "geminiApiKeyConfigured": true,
    "blobTokenConfigured": true
  }
}
```

### 2. 방문자 통계
```
GET /api/visitor
POST /api/visitor
```
**POST 요청 본문:**
```json
{
  "type": "visit"
}
```

### 3. Gemini 프록시
```
POST /api/gemini-proxy
```
**요청 본문:**
```json
{
  "model": "gemini-2.5-flash",
  "contents": [
    {
      "role": "user",
      "parts": [
        { "text": "프롬프트" }
      ]
    }
  ],
  "system_instruction": "시스템 지침",
  "generationConfig": {},
  "tools": [],
  "blobUrl": "https://blob.example/file.mp3",
  "mimeType": "audio/mp4"
}
```
**응답:** Gemini API 응답 원본

### 4. 오디오 유형 식별
```
POST /api/identify-audio
Content-Type: multipart/form-data
```
**파라미터:**
- `file`: 오디오 파일 (audio/*)

**응답:**
```json
{
  "type": "Speech" | "Music" | "Unknown"
}
```

### 5. 음성 분석
```
POST /api/analyze-speech
Content-Type: multipart/form-data
```
**파라미터:**
- `file`: 오디오 파일 (audio/*)

**응답:** JSON 스키마의 음성 분석 리포트

### 6. 실시간 통역
```
POST /api/translate-audio
Content-Type: multipart/form-data
```
**파라미터:**
- `file`: 오디오 파일 (audio/*)
- `targetLanguage`: 도착 언어 (기본: Korean)

**응답:** JSON 스키마의 통역 결과

### 7. BANANA NL 생성
```
POST /api/banana-nl/generate
```
**요청 본문:**
```json
{
  "documentText": "문서 내용",
  "prompt": "프롬프트"
}
```

### 8. 내보내기
```
POST /api/export/:type
```
**파라미터:**
- `type`: 내보내기 유형 (pdf, pptx, docx)

**요청 본문:** Presentation JSON 데이터

**응답:** 바이너리 파일

### 9. 파일 업로드 (Vercel Blob)
```
POST /api/upload
```
**요청 본문:** Vercel Blob 핸드셰이크 페이로드

## 에러 코드

| 코드 | 설명 |
|------|------|
| 400 | 잘못된 요청 |
| 401 | 인증 실패 |
| 403 | 권한 없음 |
| 404 | 리소스 없음 |
| 500 | 서버 내부 오류 |
| 503 | Gemini API 사용 불가 (재시도 가능) |

## Gemini API 에러 처리
- **503 Service Unavailable**: 자동으로 다음 모델로 fallback
- **API_KEY_INVALID**: 사용자에게 API 키 교체 안내
- **타임아웃**: 120초 타임아웃 적용
