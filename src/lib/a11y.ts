export const ariaLabels = {
  slideNavigation: {
    next: '다음 슬라이드로 이동',
    prev: '이전 슬라이드로 이동',
    first: '첫 번째 슬라이드로 이동',
    last: '마지막 슬라이드로 이동',
  },
  editor: {
    canvas: '슬라이드 편집 캔버스',
    selectTool: '선택 도구 (V)',
    moveTool: '이동 도구 (M)',
    handTool: '핸드 도구 (H)',
    textTool: '텍스트 도구 (T)',
    shapeTool: '도형 도구 (R)',
    eraserTool: '지우개 도구 (E)',
    undo: '실행 취소 (Ctrl+Z)',
    redo: '다시 실행 (Ctrl+Shift+Z)',
    save: '저장 (Ctrl+S)',
    delete: '선택 항목 삭제 (Delete)',
    duplicate: '선택 항목 복제 (Ctrl+D)',
  },
  presentation: {
    start: '발표 시작',
    exit: '발표 종료',
    fullscreen: '전체 화면으로 전환 (F)',
    blackScreen: '블랙 스크린 (B)',
    nextSlide: '다음 슬라이드 (→)',
    prevSlide: '이전 슬라이드 (←)',
    firstSlide: '첫 슬라이드 (Home)',
    lastSlide: '마지막 슬라이드 (End)',
  },
  navigation: {
    home: '홈으로 이동',
    back: '뒤로 이동',
    menu: '메뉴 열기',
    close: '닫기',
  },
  forms: {
    submit: '제출',
    cancel: '취소',
    reset: '초기화',
    search: '검색',
  },
  status: {
    loading: '로딩 중',
    saving: '저장 중',
    saved: '저장 완료',
    error: '오류 발생',
    generating: 'AI가 생성 중입니다',
  },
};

export function getAriaLabel(path: string): string {
  const keys = path.split('.');
  let current: any = ariaLabels;
  
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return path;
    }
  }
  
  return typeof current === 'string' ? current : path;
}
