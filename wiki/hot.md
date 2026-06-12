# Work AI - Hot Cache (Recent Context)

## Current Status
- **Date**: 2026-06-12
- **Focus**: Phase 2 UI 컴포넌트 구현 완료
- **Milestone**: Platform v2.3.0 Released.

## Recent Context Summary
- **리서치 문서**: 12_research 폴더에 9개 한글 리서치 문서 추가 완료
- **UX 개선**: 키보드 단축키(useKeyboardShortcuts), 자동저장(useAutoSave) 훅 구현
- **접근성**: a11y.ts로 ARIA 레이블 시스템 구축
- **보안**: security.ts, validations.ts로 입력 검증 및 XSS 방지 강화
- **기능**: 배치 재생성(batch-regeneration), 버전관리(version-management), 차트 추천(chart-recommendation) 구현
- **테스트**: 147개 테스트 전부 통과 (36개 파일)
- **컴포넌트**: GlobalErrorBoundary, ProgressiveLoading, SkeletonLoaders 추가

## 핵심 신규 파일
- `src/hooks/useKeyboardShortcuts.ts`: 키보드 단축키 시스템
- `src/hooks/useAutoSave.ts`: 자동저장 시스템
- `src/lib/validations.ts`: Zod 기반 입력 검증
- `src/lib/batch-regeneration.ts`: 배치 슬라이드 재생성
- `src/lib/version-management.ts`: 버전 관리 시스템
- `src/lib/chart-recommendation.ts`: AI 차트 추천
- `src/lib/security.ts`: 보안 유틸리티

## Antigravity Action Guide
1. Always check `wiki/hot.md` at the start of a session to understand the current build status.
2. In case of UI changes, ensure they respect the `dark` class injected at the root level.
3. Run `npm test` before committing to ensure 147 tests pass.

---
*Hot Cache maintained by Antigravity*
