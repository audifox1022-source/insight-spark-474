import { useEffect, useRef, useState } from "react";
import { PDFDocument, degrees, rgb } from "pdf-lib";
import pptxgen from "pptxgenjs";
import { parseFile } from "./utils/fileParser";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  BarChart3,
  Check,
  ChevronDown,
  Copy,
  Download,
  FileAudio,
  FileDigit,
  FileText,
  FileUp,
  FolderOpen,
  Globe2,
  GripVertical,
  Headphones,
  LayoutDashboard,
  LayoutTemplate,
  Loader2,
  Mic2,
  MoreHorizontal,
  Palette,
  Pencil,
  Plus,
  RotateCcw,
  RotateCw,
  Search,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
  X,
} from "lucide-react";

type Mode = "home" | "deck" | "translate" | "audio" | "pdf";
type TemplateId = "clean" | "midnight" | "editorial" | "forest" | "coral";
type Slide = {
  id: string;
  kind: "title" | "bullets" | "metrics" | "chart" | "timeline" | "comparison";
  title: string;
  body: string;
  bullets?: string[];
  metrics?: { label: string; value: string; note: string }[];
};
type SavedWork = {
  id: string;
  title: string;
  updatedAt: number;
  slides: Slide[];
  theme?: TemplateId;
};
type PdfTextItem = {
  id: string;
  page: number;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pageWidth: number;
  pageHeight: number;
};
const templates: { id: TemplateId; label: string; description: string }[] = [
  { id: "clean", label: "클린 리포트", description: "밝고 정돈된 업무 보고" },
  { id: "midnight", label: "미드나이트", description: "임원 브리핑·전략 제안" },
  {
    id: "editorial",
    label: "에디토리얼",
    description: "인사이트·리서치 스토리",
  },
  { id: "forest", label: "포레스트", description: "지속가능성·운영 계획" },
  { id: "coral", label: "코랄 포인트", description: "고객·마케팅 발표" },
];
const seedSlides: Slide[] = [
  {
    id: "s1",
    kind: "title",
    title: "2026 고객 경험 개선안",
    body: "고객 데이터에서 발견한 세 가지 성장 기회",
  },
  {
    id: "s2",
    kind: "metrics",
    title: "핵심 신호: 재방문 고객의 전환이 빠릅니다",
    body: "원본 자료에서 확인된 수치만 사용했습니다.",
    metrics: [
      { label: "재방문 전환율", value: "18.4%", note: "원본 p.3" },
      { label: "평균 체류시간", value: "6분 12초", note: "원본 p.4" },
      { label: "응답자 수", value: "1,284명", note: "원본 p.2" },
    ],
  },
  {
    id: "s3",
    kind: "chart",
    title: "개선 우선순위는 명확합니다",
    body: "반복 문의를 줄이면 상담 품질과 처리 속도를 동시에 높일 수 있습니다.",
    bullets: [
      "FAQ 탐색성 개선",
      "결제 전 단계의 불안 요인 해소",
      "재방문 고객 맞춤 안내",
    ],
  },
  {
    id: "s4",
    kind: "timeline",
    title: "90일 실행 계획",
    body: "작게 출시하고 고객 반응으로 다음 단계를 결정합니다.",
    bullets: [
      "0–30일  |  문제 구간 계측 및 FAQ 개편",
      "31–60일 |  재방문 고객 베타 적용",
      "61–90일 |  전환·문의 지표 검증",
    ],
  },
];
const starterWorks: SavedWork[] = [
  {
    id: "w1",
    title: "고객 경험 개선안",
    updatedAt: Date.now() - 1000 * 60 * 18,
    slides: seedSlides,
  },
];
function makeDeck(input: string): Slide[] {
  const clean = input.trim() || "새로운 업무 인사이트";
  const lines = clean
    .split(/\n+/)
    .map((x) => x.trim())
    .filter(Boolean);
  const title = lines[0]?.slice(0, 48) || "새로운 업무 인사이트";
  const points = lines.slice(1, 7).length
    ? lines.slice(1, 7)
    : [
        "핵심 현황과 문제를 먼저 정리합니다.",
        "근거가 있는 수치와 사례를 구분합니다.",
        "다음 의사결정과 실행 항목을 제안합니다.",
      ];
  return [
    {
      id: crypto.randomUUID(),
      kind: "title",
      title,
      body: "자료에서 핵심 메시지를 추려 만든 첫 구성안",
    },
    {
      id: crypto.randomUUID(),
      kind: "bullets",
      title: "핵심 메시지",
      body: "원문에 등장한 내용을 중심으로 정리했습니다.",
      bullets: points.slice(0, 3),
    },
    {
      id: crypto.randomUUID(),
      kind: "metrics",
      title: "근거와 해석을 구분해 보세요",
      body: "수치가 포함된 원문만 지표로 표시합니다.",
      metrics: [
        { label: "원문 근거", value: "확인 필요", note: "출처를 추가하세요" },
        { label: "AI 해석", value: "검토 필요", note: "사용자 확인" },
        { label: "다음 행동", value: "3가지", note: "초안 제안" },
      ],
    },
    {
      id: crypto.randomUUID(),
      kind: "timeline",
      title: "다음 단계",
      body: "사용자 검토 후 슬라이드로 발전시킬 수 있습니다.",
      bullets: [
        "구성안을 확인하고 수정",
        "슬라이드별 메시지 다듬기",
        "PPTX 또는 PDF로 내보내기",
      ],
    },
  ];
}
function formatTime(ts: number) {
  const mins = Math.max(1, Math.round((Date.now() - ts) / 60000));
  return mins < 60 ? `${mins}분 전` : `${Math.round(mins / 60)}시간 전`;
}
function normalizeAiDeck(payload: any, input: string): Slide[] {
  const generated = Array.isArray(payload?.slides) ? payload.slides : [];
  if (!generated.length) return makeDeck(input);
  return generated.slice(0, 12).map((s: any, i: number) => {
    const bullets = Array.isArray(s.bulletPoints)
      ? s.bulletPoints.map(String).slice(0, 5)
      : [];
    const type = String(s.slideType || s.layout || "").toLowerCase();
    const body = String(
      s.coreContent ||
        s.subtitle ||
        "원본 자료에서 확인한 내용을 정리했습니다.",
    );
    const numeric =
      `${body} ${bullets.join(" ")}`.match(
        /\b\d+(?:\.\d+)?\s*[%억만천명건분개월일]?/g,
      ) || [];
    const kind: Slide["kind"] =
      i === 0 || type.includes("title")
        ? "title"
        : type.includes("timeline") ||
            type.includes("process") ||
            type.includes("roadmap")
          ? "timeline"
          : type.includes("chart") ||
              type.includes("trend") ||
              type.includes("data")
            ? "chart"
            : type.includes("compare") || type.includes("detail")
              ? "comparison"
              : numeric.length
                ? "metrics"
                : "bullets";
    return {
      id: String(s.id || crypto.randomUUID()),
      kind,
      title: String(s.title || `슬라이드 ${i + 1}`),
      body,
      bullets: bullets.length ? bullets : undefined,
      metrics:
        kind === "metrics"
          ? numeric.slice(0, 3).map((value: string, j: number) => ({
              label:
                ["원문 수치", "주요 변화", "확인된 지표"][j] || "원문 수치",
              value,
              note: "원본 자료에서 확인",
            }))
          : undefined,
    };
  });
}

export default function App() {
  const [mode, setMode] = useState<Mode>("home");
  const [works, setWorks] = useState<SavedWork[]>(() => {
    try {
      return (
        JSON.parse(localStorage.getItem("workai-works") || "null") ||
        starterWorks
      );
    } catch {
      return starterWorks;
    }
  });
  const [active, setActive] = useState<SavedWork | null>(null);
  const [savedState, setSavedState] = useState<"saved" | "saving">("saved");
  useEffect(() => {
    localStorage.setItem("workai-works", JSON.stringify(works));
  }, [works]);
  const openDeck = (work?: SavedWork) => {
    const next = work || {
      id: crypto.randomUUID(),
      title: "새 발표자료",
      updatedAt: Date.now(),
      slides: seedSlides,
    };
    setActive(structuredClone(next));
    setMode("deck");
  };
  const persist = (next: SavedWork) => {
    setSavedState("saving");
    setActive(next);
    setWorks((ws) => [next, ...ws.filter((w) => w.id !== next.id)]);
    window.setTimeout(() => setSavedState("saved"), 450);
  };
  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setMode("home")}>
          <span className="brand-mark">
            <Sparkles size={18} />
          </span>
          <span>WorkAI</span>
        </button>
        <nav>
          {(["home", "deck", "translate", "audio", "pdf"] as Mode[]).map(
            (m) => (
              <button
                key={m}
                className={mode === m ? "nav-item active" : "nav-item"}
                onClick={() => (m === "deck" ? openDeck() : setMode(m))}
              >
                {m === "home"
                  ? "내 작업"
                  : m === "deck"
                    ? "발표자료"
                    : m === "translate"
                      ? "업무 번역"
                      : m === "audio"
                        ? "녹음 정리"
                        : "PDF 도구"}
              </button>
            ),
          )}
        </nav>
        <div className="top-actions">
          <span className="privacy">
            <span className="status-dot" /> 로컬 작업공간
          </span>
          <button className="icon-btn" aria-label="검색">
            <Search size={17} />
          </button>
        </div>
      </header>
      <main className="main-area">
        {mode === "home" && (
          <Home
            works={works}
            onNew={() => openDeck()}
            onOpen={(w) => openDeck(w)}
            onMode={setMode}
          />
        )}{" "}
        {mode === "deck" && active && (
          <DeckEditor
            work={active}
            savedState={savedState}
            onBack={() => setMode("home")}
            onSave={persist}
          />
        )}{" "}
        {mode === "translate" && (
          <Translator
            onAddToDeck={(text) => {
              const w = {
                id: crypto.randomUUID(),
                title: "번역에서 시작한 발표자료",
                updatedAt: Date.now(),
                slides: makeDeck(text),
              };
              setWorks((x) => [w, ...x]);
              openDeck(w);
            }}
          />
        )}{" "}
        {mode === "audio" && (
          <AudioWorkspace
            onAddToDeck={(text) => {
              const w = {
                id: crypto.randomUUID(),
                title: "회의 정리에서 시작한 발표자료",
                updatedAt: Date.now(),
                slides: makeDeck(text),
              };
              setWorks((x) => [w, ...x]);
              openDeck(w);
            }}
          />
        )}{" "}
        {mode === "pdf" && <PdfWorkspace />}
      </main>
    </div>
  );
}

function Home({
  works,
  onNew,
  onOpen,
  onMode,
}: {
  works: SavedWork[];
  onNew: () => void;
  onOpen: (w: SavedWork) => void;
  onMode: (m: Mode) => void;
}) {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const [generating, setGenerating] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const start = async () => {
    setGenerating(true);
    let slides: Slide[];
    try {
      const response = await fetch("/api/banana-nl/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentText: text }),
      });
      if (!response.ok) throw new Error("AI unavailable");
      slides = normalizeAiDeck(await response.json(), text);
    } catch {
      slides = makeDeck(text);
    } finally {
      setGenerating(false);
    }
    const work = {
      id: crypto.randomUUID(),
      title: text.trim().split("\n")[0]?.slice(0, 48) || "새 발표자료",
      updatedAt: Date.now(),
      slides,
    };
    onOpen(work);
  };
  const readFile = async (file?: File) => {
    if (!file) return;
    setFileName(file.name);
    setFileError("");
    try {
      const parsed = await parseFile(file);
      if (parsed.parseError && !parsed.content) {
        setFileError(parsed.parseError);
        return;
      }
      const content = Array.isArray(parsed.content)
        ? `${parsed.fileName}\n${parsed.summary}`
        : String(parsed.content || parsed.summary || "");
      setText(content);
      if (parsed.parseError) setFileError(parsed.parseError);
    } catch (error) {
      setFileError(
        error instanceof Error ? error.message : "파일을 읽지 못했습니다.",
      );
    }
  };
  return (
    <div className="home-grid">
      <section className="welcome">
        <div className="eyebrow">WORKAI WORKSPACE</div>
        <h1>
          자료를 이해하고,
          <br />
          <em>설득력 있는 발표</em>로 완성하세요.
        </h1>
        <p className="lead">
          문서나 메모를 넣으면 핵심 메시지와 근거를 정리해, 검토 가능한
          구성안으로 바꿔드립니다.
        </p>
        <div className="start-card">
          <div className="card-head">
            <div>
              <h2>새 발표자료 만들기</h2>
              <p>문서, 표, PDF, 이미지, 업무 파일을 올리고 바로 시작하세요.</p>
            </div>
            <span className="step-chip">
              1 <ArrowRight size={13} /> 2 <ArrowRight size={13} /> 3
            </span>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="주제, 회의 메모, 보고서 요약을 붙여넣으세요…"
          />
          <div className="start-actions">
            <button
              className="btn ghost"
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={16} /> 문서 업로드
            </button>
            <input
              ref={fileRef}
              type="file"
              hidden
              accept=".txt,.md,.csv,.pdf,.docx,.xlsx,.xls,.json,.html,.htm,.rtf,.pptx,.ppt,.xml,.yaml,.yml,.log"
              onChange={(e) => readFile(e.target.files?.[0])}
            />
            <button
              className="btn primary"
              disabled={generating}
              onClick={start}
            >
              {generating ? (
                <>
                  <Loader2 size={16} className="spin" /> AI 구성안 생성 중
                </>
              ) : (
                <>
                  <Sparkles size={16} /> 구성안 만들기 <ArrowRight size={15} />
                </>
              )}
            </button>
          </div>
          {fileName && (
            <div className="source-note">
              <Check size={14} /> {fileName} 파일을 읽었습니다.
            </div>
          )}
          {fileError && <div className="error-message">{fileError}</div>}
          <div className="source-note">
            <Check size={14} /> 지원 형식: PDF · Word · Excel · CSV · PPT/PPTX ·
            이미지 · TXT · Markdown · JSON · HTML · RTF
          </div>
        </div>
      </section>
      <aside className="recent-panel">
        <div className="panel-title">
          <div>
            <div className="eyebrow">RECENT WORK</div>
            <h2>최근 작업</h2>
          </div>
          <FolderOpen size={19} />
        </div>
        {works.slice(0, 4).map((w) => (
          <button className="work-row" key={w.id} onClick={() => onOpen(w)}>
            <span className="work-icon">
              <LayoutDashboard size={16} />
            </span>
            <span className="work-copy">
              <strong>{w.title}</strong>
              <small>
                {w.slides.length}장 · {formatTime(w.updatedAt)}
              </small>
            </span>
            <ArrowRight size={15} />
          </button>
        ))}
        <div className="quick-start">
          <p>다른 작업을 시작할까요?</p>
          <button onClick={() => onMode("translate")}>
            <Globe2 size={16} /> 업무 번역
          </button>
          <button onClick={() => onMode("audio")}>
            <Headphones size={16} /> 녹음 정리
          </button>
          <button onClick={() => onMode("pdf")}>
            <FileDigit size={16} /> PDF 도구
          </button>
        </div>
        <button className="new-link" onClick={onNew}>
          <Plus size={15} /> 빈 발표자료 열기
        </button>
      </aside>
    </div>
  );
}

function DeckEditor({
  work,
  onBack,
  onSave,
  savedState,
}: {
  work: SavedWork;
  onBack: () => void;
  onSave: (w: SavedWork) => void;
  savedState: "saved" | "saving";
}) {
  const [slides, setSlides] = useState(work.slides);
  const [theme, setTheme] = useState<TemplateId>(work.theme || "clean");
  const [selected, setSelected] = useState(0);
  const [history, setHistory] = useState<Slide[][]>([]);
  const [future, setFuture] = useState<Slide[][]>([]);
  const [editing, setEditing] = useState(false);
  const current = slides[selected];
  const update = (patch: Partial<Slide>) => {
    setHistory((h) => [...h.slice(-19), slides]);
    setFuture([]);
    setSlides((ss) =>
      ss.map((s, i) => (i === selected ? { ...s, ...patch } : s)),
    );
  };
  const addSlide = () => {
    const next: Slide = {
      id: crypto.randomUUID(),
      kind: "bullets",
      title: "새 슬라이드",
      body: "핵심 메시지를 한 문장으로 적어보세요.",
      bullets: [
        "근거가 있는 내용을 입력하세요.",
        "청중에게 필요한 시사점을 적으세요.",
      ],
    };
    setHistory((h) => [...h, slides]);
    setSlides([...slides, next]);
    setSelected(slides.length);
  };
  const remove = () => {
    if (slides.length <= 1) return;
    setHistory((h) => [...h, slides]);
    setSlides(slides.filter((_, i) => i !== selected));
    setSelected(Math.max(0, selected - 1));
  };
  const moveSlide = (direction: -1 | 1) => {
    const target = selected + direction;
    if (target < 0 || target >= slides.length) return;
    const next = [...slides];
    [next[selected], next[target]] = [next[target], next[selected]];
    setHistory((h) => [...h.slice(-19), slides]);
    setFuture([]);
    setSlides(next);
    setSelected(target);
  };
  const undo = () => {
    const prev = history.at(-1);
    if (!prev) return;
    setFuture((f) => [...f, slides]);
    setSlides(prev);
    setHistory(history.slice(0, -1));
    setSelected(Math.min(selected, prev.length - 1));
  };
  const redo = () => {
    const next = future.at(-1);
    if (!next) return;
    setHistory((h) => [...h, slides]);
    setSlides(next);
    setFuture(future.slice(0, -1));
  };
  useEffect(() => {
    const t = window.setTimeout(
      () =>
        onSave({
          ...work,
          theme,
          title: slides[0]?.title || work.title,
          slides,
          updatedAt: Date.now(),
        }),
      1000,
    );
    return () => window.clearTimeout(t);
  }, [slides, theme]);
  return (
    <div className="editor-shell">
      <div className="editor-top">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={17} /> 내 작업
        </button>
        <div className="editor-title">
          <Pencil size={15} />
          <input
            value={slides[0]?.title || work.title}
            onChange={(e) =>
              setSlides((ss) =>
                ss.map((s, i) =>
                  i === 0 ? { ...s, title: e.target.value } : s,
                ),
              )
            }
          />
          <span className="save-label">
            {savedState === "saving" ? (
              <>
                <Loader2 size={13} className="spin" /> 저장 중
              </>
            ) : (
              <>
                <Check size={13} /> 저장됨
              </>
            )}
          </span>
        </div>
        <div className="editor-actions">
          <button
            className="icon-btn"
            onClick={undo}
            disabled={!history.length}
          >
            <RotateCcw size={16} />
          </button>
          <button className="icon-btn" onClick={redo} disabled={!future.length}>
            <RotateCw size={16} />
          </button>
          <button className="btn dark" onClick={() => setEditing(!editing)}>
            <Wand2 size={15} /> AI로 수정
          </button>
          <ExportMenu slides={slides} theme={theme} />
        </div>
      </div>
      <div className="editor-body">
        <aside className="filmstrip">
          <div className="filmstrip-head">
            <span>구성안 · {slides.length}장</span>
            <div className="filmstrip-actions">
              <button
                aria-label="슬라이드 위로 이동"
                className="icon-btn small"
                onClick={() => moveSlide(-1)}
                disabled={selected === 0}
              >
                <ArrowUp size={14} />
              </button>
              <button
                aria-label="슬라이드 아래로 이동"
                className="icon-btn small"
                onClick={() => moveSlide(1)}
                disabled={selected === slides.length - 1}
              >
                <ArrowDown size={14} />
              </button>
              <button
                aria-label="슬라이드 추가"
                className="icon-btn small"
                onClick={addSlide}
              >
                <Plus size={15} />
              </button>
            </div>
          </div>
          {slides.map((s, i) => (
            <button
              className={i === selected ? "thumb active" : "thumb"}
              key={s.id}
              onClick={() => setSelected(i)}
            >
              <span className="thumb-num">{i + 1}</span>
              <div className={`mini-slide ${s.kind} theme-${theme}`}>
                <b>{s.title}</b>
                <span>{s.body}</span>
              </div>
            </button>
          ))}
          <button className="add-slide" onClick={addSlide}>
            <Plus size={15} /> 슬라이드 추가
          </button>
        </aside>
        <section className="canvas-zone">
          <div className="canvas-tools">
            <span>슬라이드 {selected + 1}</span>
            <div>
              <button onClick={() => setSelected(Math.max(0, selected - 1))}>
                <ArrowLeft size={15} />
              </button>
              <button
                onClick={() =>
                  setSelected(Math.min(slides.length - 1, selected + 1))
                }
              >
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
          <SlideCanvas
            slide={current}
            theme={theme}
            editing={editing}
            onChange={update}
          />
        </section>
        <aside className="inspector">
          <div className="inspector-head">
            <span>
              <LayoutTemplate size={15} /> 슬라이드 편집
            </span>
            <MoreHorizontal size={16} />
          </div>
          <label>
            <Palette size={13} /> 템플릿
          </label>
          <div className="template-options">
            {templates.map((template) => (
              <button
                key={template.id}
                title={template.description}
                className={
                  theme === template.id
                    ? "template-option selected"
                    : "template-option"
                }
                onClick={() => setTheme(template.id)}
              >
                <span className={`template-swatch ${template.id}`} />
                <span>{template.label}</span>
              </button>
            ))}
          </div>
          <label>표현 방식</label>
          <div className="layout-options">
            {(
              [
                "title",
                "bullets",
                "metrics",
                "chart",
                "timeline",
                "comparison",
              ] as Slide["kind"][]
            ).map((k) => (
              <button
                key={k}
                className={
                  current.kind === k ? "layout-opt selected" : "layout-opt"
                }
                onClick={() => update({ kind: k })}
              >
                {k === "title"
                  ? "표지"
                  : k === "bullets"
                    ? "핵심 내용"
                    : k === "metrics"
                      ? "수치"
                      : k === "chart"
                        ? "차트"
                        : k === "timeline"
                          ? "일정"
                          : "비교"}
              </button>
            ))}
          </div>
          <label>슬라이드 메모</label>
          <textarea
            value={current.body}
            onChange={(e) => update({ body: e.target.value })}
          />
          <button className="delete-slide" onClick={remove}>
            <Trash2 size={15} /> 이 슬라이드 삭제
          </button>
        </aside>
      </div>
    </div>
  );
}

function SlideCanvas({
  slide,
  theme,
  editing,
  onChange,
}: {
  slide: Slide;
  theme: TemplateId;
  editing: boolean;
  onChange: (p: Partial<Slide>) => void;
}) {
  return (
    <div className={`slide-canvas theme-${theme} layout-${slide.kind}`}>
      <div className="slide-kicker">WORKAI / DRAFT</div>
      <input
        className="slide-title"
        value={slide.title}
        onChange={(e) => onChange({ title: e.target.value })}
      />
      <textarea
        className="slide-body"
        value={slide.body}
        onChange={(e) => onChange({ body: e.target.value })}
      />
      {slide.kind === "metrics" && (
        <div className="metric-grid">
          {(slide.metrics || []).map((m, i) => (
            <div className="metric" key={i}>
              <small>{m.label}</small>
              <strong>{m.value}</strong>
              <span>{m.note}</span>
            </div>
          ))}
        </div>
      )}
      {slide.kind === "comparison" && (
        <div className="comparison-layout">
          <div>
            <small>현황</small>
            <strong>{slide.bullets?.[0] || "원문 근거를 입력하세요."}</strong>
          </div>
          <div>
            <small>시사점</small>
            <strong>{slide.bullets?.[1] || "해석을 구분해 입력하세요."}</strong>
          </div>
        </div>
      )}
      {slide.kind === "chart" && (
        <div className="chart-area">
          <div className="bars">
            <i style={{ height: "42%" }} />
            <i style={{ height: "68%" }} />
            <i style={{ height: "55%" }} />
            <i style={{ height: "88%" }} />
            <i style={{ height: "74%" }} />
          </div>
          <div className="chart-caption">
            <BarChart3 size={18} /> 비교·추세 표현
          </div>
        </div>
      )}
      {slide.kind === "timeline" && (
        <div className="timeline-layout">
          {(slide.bullets || ["1단계 · 준비", "2단계 · 실행", "3단계 · 검증"])
            .slice(0, 3)
            .map((item, i) => (
              <div key={i}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                <strong>{item}</strong>
              </div>
            ))}
        </div>
      )}
      {slide.bullets &&
        !["comparison", "chart", "timeline"].includes(slide.kind) && (
          <div className="bullet-list">
            {slide.bullets.map((b, i) => (
              <div key={i}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                <input
                  value={b}
                  onChange={(e) =>
                    onChange({
                      bullets: slide.bullets?.map((x, j) =>
                        j === i ? e.target.value : x,
                      ),
                    })
                  }
                />
              </div>
            ))}
          </div>
        )}
      {editing && (
        <div className="ai-popover">
          <Sparkles size={15} />
          <span>선택한 슬라이드만 수정합니다</span>
          <button
            onClick={() => onChange({ title: slide.title + " · 검토 포인트" })}
          >
            메시지 선명하게
          </button>
        </div>
      )}
      <div className="slide-footer">
        <span>근거가 있는 내용과 AI 해석을 구분하세요.</span>
        <span>{slide.id.slice(0, 4)}</span>
      </div>
    </div>
  );
}

function ExportMenu({ slides, theme }: { slides: Slide[]; theme: TemplateId }) {
  const [open, setOpen] = useState(false);
  const palettes: Record<
    TemplateId,
    { bg: string; ink: string; muted: string; accent: string }
  > = {
    clean: { bg: "F6F8FA", ink: "102A43", muted: "52606D", accent: "0D9488" },
    midnight: {
      bg: "101827",
      ink: "F8FAFC",
      muted: "CBD5E1",
      accent: "67E8F9",
    },
    editorial: {
      bg: "FBF7F1",
      ink: "2D2A26",
      muted: "6B6259",
      accent: "C46A4A",
    },
    forest: { bg: "F1F7F2", ink: "183B2B", muted: "527463", accent: "2F855A" },
    coral: { bg: "FFF7F5", ink: "3D2020", muted: "7B5A5A", accent: "E76F51" },
  };
  const exportPptx = async () => {
    const ppt = new pptxgen();
    ppt.layout = "LAYOUT_WIDE";
    const palette = palettes[theme];
    slides.forEach((s) => {
      const sl = ppt.addSlide();
      sl.background = { color: palette.bg };
      sl.addShape(pptx.ShapeType.rect, {
        x: 0,
        y: 0,
        w: 0.18,
        h: 7.5,
        line: { color: palette.accent, transparency: 100 },
        fill: { color: palette.accent },
      });
      sl.addText(s.title, {
        x: 0.7,
        y: 0.6,
        w: 11.5,
        h: 0.6,
        fontFace: "Arial",
        fontSize: s.kind === "title" ? 30 : 26,
        bold: true,
        color: palette.ink,
        margin: 0,
      });
      sl.addText(s.body, {
        x: 0.7,
        y: 1.35,
        w: 11,
        h: 0.55,
        fontSize: 14,
        color: palette.muted,
        margin: 0,
      });
      if (s.kind === "chart") {
        [42, 68, 55, 88, 74].forEach((height, i) =>
          sl.addShape(pptx.ShapeType.rect, {
            x: 1 + i * 1.15,
            y: 5.6 - height / 25,
            w: 0.65,
            h: height / 25,
            line: { color: palette.accent, transparency: 100 },
            fill: { color: palette.accent, transparency: i === 3 ? 0 : 25 },
          }),
        );
      }
      if (s.kind === "timeline") {
        sl.addShape(pptx.ShapeType.line, {
          x: 1.2,
          y: 3.7,
          w: 10.4,
          h: 0,
          line: { color: palette.accent, width: 2 },
        });
        (s.bullets || []).slice(0, 3).forEach((b, i) => {
          sl.addShape(pptx.ShapeType.ellipse, {
            x: 1 + i * 4.8,
            y: 3.42,
            w: 0.55,
            h: 0.55,
            line: { color: palette.accent, transparency: 100 },
            fill: { color: palette.accent },
          });
          sl.addText(b, {
            x: 0.8 + i * 4.8,
            y: 4.15,
            w: 3.8,
            h: 0.8,
            fontSize: 15,
            bold: true,
            color: palette.ink,
            margin: 0,
            fit: "shrink",
          });
        });
      }
      if (s.kind === "comparison") {
        (s.bullets || ["현황", "시사점"]).slice(0, 2).forEach((b, i) => {
          sl.addShape(pptx.ShapeType.roundRect, {
            x: 0.9 + i * 6,
            y: 2.4,
            w: 5.1,
            h: 2.2,
            rectRadius: 0.08,
            line: { color: palette.accent, transparency: 70 },
            fill: {
              color: i ? palette.accent : palette.bg,
              transparency: i ? 82 : 0,
            },
          });
          sl.addText(b, {
            x: 1.2 + i * 6,
            y: 3.1,
            w: 4.5,
            h: 0.8,
            fontSize: 19,
            bold: true,
            color: palette.ink,
            margin: 0,
            fit: "shrink",
          });
        });
      }
      (s.bullets || [])
        .filter(() => !["chart", "timeline", "comparison"].includes(s.kind))
        .forEach((b, i) =>
          sl.addText(b, {
            x: 1,
            y: 2 + i * 0.55,
            w: 9.5,
            h: 0.3,
            fontSize: 18,
            bullet: { indent: 14 },
            color: palette.ink,
            margin: 0,
          }),
        );
      (s.metrics || []).forEach((m, i) => {
        sl.addText(m.label, {
          x: 0.8 + i * 3.8,
          y: 2.2,
          w: 3,
          h: 0.25,
          fontSize: 11,
          color: palette.muted,
          margin: 0,
        });
        sl.addText(m.value, {
          x: 0.8 + i * 3.8,
          y: 2.6,
          w: 3,
          h: 0.5,
          fontSize: 25,
          bold: true,
          color: palette.accent,
          margin: 0,
        });
      });
      sl.addText("WORKAI  ·  원본 근거 기반 초안", {
        x: 0.7,
        y: 7,
        w: 5,
        h: 0.2,
        fontSize: 9,
        color: palette.muted,
        margin: 0,
      });
    });
    await ppt.writeFile({ fileName: "workai-presentation.pptx" });
    setOpen(false);
  };
  return (
    <div className="export-wrap">
      <button className="btn primary" onClick={() => setOpen(!open)}>
        <Download size={15} /> 내보내기 <ChevronDown size={14} />
      </button>
      {open && (
        <div className="export-menu">
          <button onClick={exportPptx}>
            <Download size={15} /> PPTX로 내보내기
          </button>
          <button
            onClick={() => {
              window.print();
              setOpen(false);
            }}
          >
            <FileText size={15} /> PDF로 저장 (인쇄)
          </button>
          <small>선택한 템플릿의 색상과 시각 레이아웃을 적용합니다.</small>
        </div>
      )}
    </div>
  );
}

function Translator({ onAddToDeck }: { onAddToDeck: (t: string) => void }) {
  const [source, setSource] = useState(
    "The renewal rate increased after we simplified the onboarding flow.",
  );
  const [result, setResult] = useState("");
  const [literal, setLiteral] = useState("");
  const [terms, setTerms] = useState<{ term: string; explanation: string }[]>(
    [],
  );
  const [ambiguity, setAmbiguity] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const translate = async () => {
    if (!source.trim()) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source }),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "번역에 실패했습니다.");
      setResult(String(payload.translation || ""));
      setLiteral(String(payload.literal || ""));
      setTerms(Array.isArray(payload.terms) ? payload.terms : []);
      setAmbiguity(String(payload.ambiguity || ""));
    } catch (e) {
      setError(e instanceof Error ? e.message : "번역에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <ToolPage
      icon={<Globe2 />}
      eyebrow="WORK TRANSLATION"
      title="업무 문장을 정확히 이해하고 쓰세요."
      description="직역, 자연스러운 업무 표현, 낯선 용어의 맥락을 한 화면에서 비교합니다."
    >
      <div className="translation-grid">
        <div className="tool-card">
          <div className="tool-card-head">
            <span>원문 · English</span>
            <button
              className="text-btn"
              onClick={() => {
                setSource("");
                setResult("");
                setLiteral("");
                setTerms([]);
              }}
            >
              <X size={14} /> 지우기
            </button>
          </div>
          <textarea
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />
          <div className="term-note">
            {terms.length ? (
              terms.map((term) => (
                <span key={term.term}>
                  <strong>{term.term}</strong> {term.explanation}
                </span>
              ))
            ) : (
              <span>
                번역 후 전문 용어와 업계 표현의 문맥 설명이 표시됩니다.
              </span>
            )}
          </div>
          {error && <p className="error-message">{error}</p>}
          <button
            className="btn primary full"
            disabled={loading || !source.trim()}
            onClick={translate}
          >
            {loading ? (
              <>
                <Loader2 size={15} className="spin" /> 번역 중
              </>
            ) : (
              <>
                <Sparkles size={15} /> 업무 문맥으로 번역
              </>
            )}
          </button>
        </div>
        <div className="tool-card result-card">
          <div className="tool-card-head">
            <span>번역문 · 한국어</span>
            <button
              className="text-btn"
              disabled={!result}
              onClick={() => {
                navigator.clipboard?.writeText(result);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1200);
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}{" "}
              {copied ? "복사됨" : "복사"}
            </button>
          </div>
          <textarea
            value={result}
            placeholder="번역 결과가 여기에 표시됩니다."
            onChange={(e) => setResult(e.target.value)}
          />
          <div className="translation-options">
            <span>직역</span>
            <p>{literal || "—"}</p>
            {ambiguity && (
              <>
                <span>문맥 확인</span>
                <p>{ambiguity}</p>
              </>
            )}
          </div>
          <button
            className="btn outline full"
            disabled={!result}
            onClick={() => onAddToDeck(result)}
          >
            <Plus size={15} /> 발표자료 원본에 추가
          </button>
        </div>
      </div>
    </ToolPage>
  );
}

function AudioWorkspace({ onAddToDeck }: { onAddToDeck: (t: string) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    transcript: string;
    summary: any;
  } | null>(null);
  const transcribe = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const audioData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("파일을 읽을 수 없습니다."));
        reader.readAsDataURL(file);
      });
      const response = await fetch("/api/audio/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioData, fileName: file.name }),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "전사에 실패했습니다.");
      setResult(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "전사에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };
  const summary = result?.summary || {};
  const deckText = `회의 요약\n${summary.discussion || "핵심 논의 확인 필요"}\n${summary.decisions || "결정 사항 확인 필요"}\n${summary.actionItems || "후속 할 일 확인 필요"}`;
  return (
    <ToolPage
      icon={<Headphones />}
      eyebrow="MEETING NOTES"
      title="통화와 회의의 다음 행동을 놓치지 마세요."
      description="녹음에서 확인되는 내용만 전사하고, 결정·미해결·후속 할 일을 분리합니다."
    >
      <div className="audio-layout">
        <div className="upload-card">
          <FileAudio size={28} />
          <h3>{file ? file.name : "녹음파일 업로드"}</h3>
          <p>MP3, WAV, M4A · 현재 배포 버전은 3MB 이하 파일을 지원합니다.</p>
          <input
            id="audio"
            type="file"
            accept="audio/*"
            hidden
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setResult(null);
              setError("");
            }}
          />
          <label htmlFor="audio" className="btn outline">
            <Upload size={15} /> 파일 선택
          </label>
          {file && (
            <button
              className="btn primary"
              disabled={loading}
              onClick={transcribe}
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="spin" /> 전사 중
                </>
              ) : (
                <>
                  <Mic2 size={15} /> 전사 시작
                </>
              )}
            </button>
          )}
          {error && <p className="error-message">{error}</p>}
          <div className="honest-note">
            <Check size={14} /> Groq Whisper로 전사하고, 전사문을 바탕으로 회의
            요약을 생성합니다.
          </div>
        </div>
        <div className="notes-card">
          <div className="notes-tabs">
            <span className="active">정리 결과</span>
            <span>전사문</span>
          </div>
          {result ? (
            <>
              <div className="summary-block">
                <label>핵심 논의</label>
                <p>{summary.discussion || "확인되지 않음"}</p>
                <label>결정 사항</label>
                <p>{summary.decisions || "확인되지 않음"}</p>
                <label>미해결 · 후속 할 일</label>
                <p>
                  {summary.openItems || summary.actionItems || "확인되지 않음"}
                </p>
              </div>
              <pre>{result.transcript}</pre>
              <button
                className="btn outline"
                onClick={() => onAddToDeck(deckText)}
              >
                <Plus size={15} /> 발표자료로 연결
              </button>
            </>
          ) : (
            <div className="empty-state">
              <FileAudio size={24} />
              <p>녹음파일을 선택하고 전사를 시작하세요.</p>
            </div>
          )}
        </div>
      </div>
    </ToolPage>
  );
}

function PdfWorkspace() {
  const [pdf, setPdf] = useState<Uint8Array | null>(null);
  const [name, setName] = useState("");
  const [pages, setPages] = useState<number[]>([]);
  const [rotations, setRotations] = useState<Record<number, number>>({});
  const [previews, setPreviews] = useState<Record<number, string>>({});
  const [textItems, setTextItems] = useState<PdfTextItem[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [replacementDraft, setReplacementDraft] = useState("");
  const [textEdits, setTextEdits] = useState<Record<string, string>>({});
  const [selectedPage, setSelectedPage] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [textDraft, setTextDraft] = useState("");
  const [overlays, setOverlays] = useState<Record<number, string>>({});
  const [message, setMessage] = useState("");
  const load = async (file?: File) => {
    if (!file) return;
    setMessage("PDF를 읽는 중입니다…");
    setPreviews({});
    setTextItems([]);
    setTextEdits({});
    setSelectedTextId(null);
    setOverlays({});
    setSelectedPage(0);
    try {
      if (
        file.type !== "application/pdf" &&
        !file.name.toLowerCase().endsWith(".pdf")
      )
        throw new Error("PDF 파일만 선택할 수 있습니다.");
      const bytes = new Uint8Array(await file.arrayBuffer());
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: false });
      const pageIndexes = Array.from(
        { length: doc.getPageCount() },
        (_, i) => i,
      );
      setPdf(bytes);
      setName(file.name);
      setPages(pageIndexes);
      setRotations({});
      setZoom(1);
      setMessage(
        `${doc.getPageCount()}페이지를 불러왔습니다. 아래에서 실제 페이지 미리보기를 확인하세요.`,
      );
      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const rendered = await pdfjs.getDocument({
          data: bytes.slice(),
          disableWorker: true,
        }).promise;
        const nextPreviews: Record<number, string> = {};
        const nextTextItems: PdfTextItem[] = [];
        for (const index of pageIndexes.slice(0, 30)) {
          const page = await rendered.getPage(index + 1);
          const viewport = page.getViewport({ scale: 0.8 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const context = canvas.getContext("2d");
          if (context) {
            await page.render({ canvasContext: context, viewport }).promise;
            nextPreviews[index] = canvas.toDataURL("image/jpeg", 0.8);
          }
          const textContent = await page.getTextContent();
          textContent.items.forEach((raw: any, itemIndex: number) => {
            const value = String(raw.str || "").trim();
            if (!value || !raw.transform) return;
            const height = Math.max(
              8,
              Math.abs(Number(raw.transform[3] || 12)),
            );
            const x = Number(raw.transform[4] || 0);
            const baseline = Number(raw.transform[5] || 0);
            nextTextItems.push({
              id: `${index}-${itemIndex}`,
              page: index,
              text: value,
              x,
              y: Math.max(0, page.view[3] - baseline - height),
              width: Math.max(
                8,
                Number(raw.width || value.length * height * 0.45),
              ),
              height,
              pageWidth: page.view[2],
              pageHeight: page.view[3],
            });
          });
        }
        setPreviews(nextPreviews);
        setTextItems(nextTextItems);
      } catch (previewError) {
        const previewDetail =
          previewError instanceof Error
            ? previewError.message
            : String(previewError);
        setMessage(
          `${doc.getPageCount()}페이지를 불러왔습니다. 미리보기를 만들지 못했습니다 (${previewDetail}). 편집과 저장은 가능합니다.`,
        );
        console.warn("PDF preview unavailable", previewError);
      }
    } catch (error) {
      setPdf(null);
      setPages([]);
      const detail = error instanceof Error ? error.message : "알 수 없는 오류";
      setMessage(`PDF를 열 수 없습니다: ${detail}`);
    }
  };
  const save = async () => {
    if (!pdf) return;
    try {
      const source = await PDFDocument.load(pdf);
      const out = await PDFDocument.create();
      const copied = await out.copyPages(source, pages);
      copied.forEach((p, i) => {
        p.setRotation(degrees(rotations[pages[i]] || 0));
        out.addPage(p);
      });
      for (const item of textItems) {
        const replacement = textEdits[item.id];
        if (replacement === undefined) continue;
        const pagePosition = pages.indexOf(item.page);
        if (pagePosition < 0) continue;
        const target = copied[pagePosition];
        target.drawRectangle({
          x: item.x - 2,
          y: target.getHeight() - item.y - item.height - 2,
          width: item.width + 4,
          height: item.height + 4,
          color: rgb(1, 1, 1),
          opacity: 1,
        });
        if (!replacement.trim()) continue;
        const canvas = document.createElement("canvas");
        canvas.width = 1200;
        canvas.height = 180;
        const context = canvas.getContext("2d");
        if (!context) continue;
        context.font = `${Math.max(18, Math.round(item.height * 3.2))}px Pretendard, Arial, sans-serif`;
        context.fillStyle = "#102a43";
        context.fillText(
          replacement.slice(0, 120),
          8,
          Math.max(45, Math.round(item.height * 2.5)),
        );
        const image = await out.embedPng(canvas.toDataURL("image/png"));
        target.drawImage(image, {
          x: item.x,
          y: target.getHeight() - item.y - item.height,
          width: item.width,
          height: item.height,
        });
      }
      for (let i = 0; i < copied.length; i += 1) {
        const overlay = overlays[pages[i]]?.trim();
        if (!overlay) continue;
        const canvas = document.createElement("canvas");
        canvas.width = 1200;
        canvas.height = 160;
        const context = canvas.getContext("2d");
        if (!context) continue;
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.font = "44px Pretendard, Arial, sans-serif";
        context.fillStyle = "#102a43";
        context.fillText(overlay.slice(0, 80), 24, 88);
        const image = await out.embedPng(canvas.toDataURL("image/png"));
        const pageWidth = copied[i].getWidth();
        copied[i].drawImage(image, {
          x: 36,
          y: copied[i].getHeight() - 82,
          width: Math.min(pageWidth - 72, 260),
          height: 35,
        });
      }
      const bytes = await out.save();
      const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `edited-${name || "document.pdf"}`;
      a.click();
      setMessage(
        `편집한 PDF를 저장했습니다. ${pages.length}페이지가 포함되었습니다.`,
      );
    } catch (error) {
      setMessage(
        `PDF 저장에 실패했습니다: ${error instanceof Error ? error.message : "알 수 없는 오류"}`,
      );
    }
  };
  return (
    <ToolPage
      icon={<FileDigit />}
      eyebrow="PDF TOOLS"
      title="일상적인 PDF 작업을 한 곳에서 처리하세요."
      description="텍스트 기반 PDF의 문장을 선택해 교체·삭제하고, 새 텍스트를 추가할 수 있습니다. 스캔 문서와 복잡한 배경은 별도 제약이 있습니다."
    >
      <div className="pdf-layout">
        <div className="pdf-upload">
          <FileUp size={26} />
          <h3>{name || "PDF 열기"}</h3>
          <p>페이지를 삭제하거나 순서를 바꾼 뒤 새 파일로 저장합니다.</p>
          <input
            id="pdf"
            type="file"
            accept="application/pdf,.pdf"
            hidden
            onChange={(e) => load(e.target.files?.[0])}
          />
          <label htmlFor="pdf" className="btn outline">
            <Upload size={15} /> PDF 선택
          </label>
          {pdf && (
            <button className="btn primary" onClick={save}>
              <Download size={15} /> PDF 저장
            </button>
          )}
          <div className="honest-note">
            <Check size={14} /> 흰색 덮기는 민감정보의 안전한 삭제가 아닙니다.
            스캔 PDF의 문자 인식과 복잡한 글꼴·배경의 완전한 동일 재현은 지원
            범위가 제한됩니다.
          </div>
        </div>
        <div className="page-list">
          <div className="tool-card-head">
            <span>페이지 {pages.length ? `· ${pages.length}개` : ""}</span>
            <span className="muted">미리보기와 위·아래 버튼으로 편집</span>
          </div>
          {pages.length > 0 && (
            <div className="pdf-viewer">
              <div className="pdf-viewer-toolbar">
                <button
                  className="icon-btn small"
                  disabled={pages.indexOf(selectedPage) <= 0}
                  onClick={() =>
                    setSelectedPage(
                      pages[Math.max(0, pages.indexOf(selectedPage) - 1)],
                    )
                  }
                >
                  <ArrowLeft size={14} />
                </button>
                <strong>
                  {pages.indexOf(selectedPage) + 1} / {pages.length}
                </strong>
                <button
                  className="icon-btn small"
                  disabled={pages.indexOf(selectedPage) === pages.length - 1}
                  onClick={() =>
                    setSelectedPage(
                      pages[
                        Math.min(
                          pages.length - 1,
                          pages.indexOf(selectedPage) + 1,
                        )
                      ],
                    )
                  }
                >
                  <ArrowRight size={14} />
                </button>
                <button
                  className="zoom-btn"
                  onClick={() =>
                    setZoom((value) =>
                      Math.max(0.7, Number((value - 0.1).toFixed(1))),
                    )
                  }
                >
                  −
                </button>
                <span>{Math.round(zoom * 100)}%</span>
                <button
                  className="zoom-btn"
                  onClick={() =>
                    setZoom((value) =>
                      Math.min(1.6, Number((value + 0.1).toFixed(1))),
                    )
                  }
                >
                  +
                </button>
              </div>
              <div className="pdf-page-stage">
                {previews[selectedPage] ? (
                  <div
                    className="pdf-page-frame"
                    style={{ transform: `scale(${zoom})` }}
                  >
                    <img
                      src={previews[selectedPage]}
                      alt="선택한 PDF 페이지 전체 미리보기"
                    />
                    {textItems
                      .filter((item) => item.page === selectedPage)
                      .map((item) => (
                        <button
                          key={item.id}
                          className={
                            item.id === selectedTextId
                              ? "pdf-text-hit selected"
                              : "pdf-text-hit"
                          }
                          style={{
                            left: `${(item.x / item.pageWidth) * 100}%`,
                            top: `${(item.y / item.pageHeight) * 100}%`,
                            width: `${(item.width / item.pageWidth) * 100}%`,
                            height: `${(item.height / item.pageHeight) * 100}%`,
                          }}
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedTextId(item.id);
                            setReplacementDraft(
                              textEdits[item.id] ?? item.text,
                            );
                          }}
                          title="클릭하여 텍스트 선택"
                        >
                          {textEdits[item.id] !== undefined
                            ? textEdits[item.id]
                            : item.text}
                        </button>
                      ))}
                    {overlays[selectedPage] && (
                      <span className="pdf-overlay-preview">
                        {overlays[selectedPage]}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="empty-state">
                    <Loader2 size={22} className="spin" />
                    <p>페이지 미리보기를 준비하는 중입니다.</p>
                  </div>
                )}
              </div>
              <div className="pdf-overlay-tools">
                <label>PDF 안의 텍스트 편집</label>
                {selectedTextId ? (
                  <>
                    <div>
                      <input
                        value={replacementDraft}
                        onChange={(event) =>
                          setReplacementDraft(event.target.value)
                        }
                        placeholder="선택한 텍스트를 수정하세요"
                      />
                      <button
                        className="btn outline"
                        onClick={() => {
                          setTextEdits((current) => ({
                            ...current,
                            [selectedTextId]: replacementDraft,
                          }));
                          setSelectedTextId(null);
                          setReplacementDraft("");
                        }}
                      >
                        수정 적용
                      </button>
                      <button
                        className="btn ghost"
                        onClick={() => {
                          setTextEdits((current) => ({
                            ...current,
                            [selectedTextId]: "",
                          }));
                          setSelectedTextId(null);
                          setReplacementDraft("");
                        }}
                      >
                        텍스트 삭제
                      </button>
                    </div>
                    <small>
                      원본 텍스트 영역을 흰색으로 덮고 수정 내용을 삽입합니다.
                      배경색과 글꼴이 복잡한 PDF에서는 모양이 달라질 수
                      있습니다.
                    </small>
                  </>
                ) : (
                  <small>
                    페이지 위의 텍스트를 클릭하면 선택·수정·삭제할 수 있습니다.
                  </small>
                )}
                <label>페이지 위에 새 텍스트 추가</label>
                <div>
                  <input
                    value={textDraft}
                    onChange={(e) => setTextDraft(e.target.value)}
                    placeholder="추가할 텍스트를 입력하세요"
                  />
                  <button
                    className="btn outline"
                    disabled={!textDraft.trim()}
                    onClick={() => {
                      setOverlays((current) => ({
                        ...current,
                        [selectedPage]: textDraft.trim(),
                      }));
                      setTextDraft("");
                    }}
                  >
                    추가
                  </button>
                </div>
                <small>
                  추가한 텍스트는 페이지 상단에 표시되며 저장 시 PDF에
                  반영됩니다.
                </small>
              </div>
            </div>
          )}
          {pages.length ? (
            pages.map((p, i) => (
              <div
                className={
                  p === selectedPage ? "page-row selected" : "page-row"
                }
                key={p}
                onClick={() => setSelectedPage(p)}
              >
                <GripVertical size={16} />
                {previews[p] ? (
                  <img
                    className="page-preview-image"
                    src={previews[p]}
                    alt={`${i + 1}페이지 미리보기`}
                  />
                ) : (
                  <span className="page-preview">{i + 1}</span>
                )}
                <span>원본 페이지 {p + 1}</span>
                <button
                  aria-label={`${i + 1}페이지 회전`}
                  onClick={() =>
                    setRotations((r) => ({
                      ...r,
                      [p]: ((r[p] || 0) + 90) % 360,
                    }))
                  }
                >
                  <RotateCw size={14} />
                </button>
                <button
                  aria-label={`${i + 1}페이지 위로 이동`}
                  onClick={() =>
                    setPages((x) => {
                      const y = [...x];
                      if (i > 0) [y[i - 1], y[i]] = [y[i], y[i - 1]];
                      return y;
                    })
                  }
                >
                  <ArrowLeft size={14} />
                </button>
                <button
                  aria-label={`${i + 1}페이지 아래로 이동`}
                  onClick={() =>
                    setPages((x) => {
                      const y = [...x];
                      if (i < y.length - 1) [y[i + 1], y[i]] = [y[i], y[i + 1]];
                      return y;
                    })
                  }
                >
                  <ArrowRight size={14} />
                </button>
                <button
                  aria-label={`${i + 1}페이지 삭제`}
                  className="danger-icon"
                  onClick={() => setPages((x) => x.filter((_, j) => j !== i))}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <FileText size={24} />
              <p>PDF를 선택하면 페이지 목록과 미리보기가 나타납니다.</p>
            </div>
          )}
          <p className="result-message">{message}</p>
        </div>
      </div>
    </ToolPage>
  );
}

function ToolPage({
  icon,
  eyebrow,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="tool-page">
      <div className="tool-intro">
        <span className="tool-icon">{icon}</span>
        <div>
          <div className="eyebrow">{eyebrow}</div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
