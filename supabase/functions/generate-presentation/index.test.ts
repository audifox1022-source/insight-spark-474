import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

async function getTestToken(): Promise<string> {
  const email = `test-e2e-${Date.now()}@example.com`;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY },
    body: JSON.stringify({ email, password: "testpassword123!" }),
  });
  const data = await res.json();
  assert(data.access_token, "Signup should return access_token");
  return data.access_token;
}

// Simulate multiple files: Excel + PDF + text (as buildAIPayload would produce)
const MULTI_FILE_PAYLOAD = {
  "매출데이터.xlsx": {
    type: "excel",
    data: {
      "월별매출": {
        rowCount: 6,
        columns: ["월", "매출액(억원)", "영업이익(억원)"],
        stats: {
          "매출액(억원)": { min: 42, max: 78, avg: 60, count: 6 },
          "영업이익(억원)": { min: 5, max: 18, avg: 11.5, count: 6 },
        },
        sampleRows: [
          { "월": "1월", "매출액(억원)": 42, "영업이익(억원)": 5 },
          { "월": "3월", "매출액(억원)": 48, "영업이익(억원)": 7 },
          { "월": "6월", "매출액(억원)": 58, "영업이익(억원)": 10 },
          { "월": "9월", "매출액(억원)": 65, "영업이익(억원)": 14 },
          { "월": "11월", "매출액(억원)": 75, "영업이익(억원)": 17 },
          { "월": "12월", "매출액(억원)": 78, "영업이익(억원)": 18 },
        ],
      },
      "부서별실적": {
        rowCount: 4,
        columns: ["부서", "매출(억원)", "목표달성률(%)"],
        stats: {
          "매출(억원)": { min: 80, max: 250, avg: 162.5, count: 4 },
          "목표달성률(%)": { min: 85, max: 120, avg: 101.25, count: 4 },
        },
        sampleRows: [
          { "부서": "영업1팀", "매출(억원)": 250, "목표달성률(%)": 120 },
          { "부서": "영업2팀", "매출(억원)": 180, "목표달성률(%)": 95 },
          { "부서": "온라인사업부", "매출(억원)": 120, "목표달성률(%)": 105 },
          { "부서": "해외사업부", "매출(억원)": 80, "목표달성률(%)": 85 },
        ],
      },
    },
  },
  "경영회의_메모.txt": {
    type: "text",
    content: "2025년 하반기 주요 이슈: 1) 해외사업부 실적 부진 원인 분석 필요 2) 온라인 채널 성장세 주목 3) 영업1팀 우수 사례 공유 예정",
  },
  "시장분석.pdf": {
    type: "pdf",
    content: "국내 시장 전망: 2026년 시장 규모 15% 성장 예상. 경쟁사 대비 당사 시장점유율 23%로 2위 유지. 디지털 전환 가속화에 따른 온라인 채널 중요성 증가.",
  },
};

Deno.test("generate mode with multiple files: all data sources reflected in presentation", async () => {
  const token = await getTestToken();

  const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-presentation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      mode: "generate",
      fileData: MULTI_FILE_PAYLOAD,
      meetingInfo: {
        week: "2025년 하반기 경영실적 종합 보고",
        department: "경영기획팀",
        reporter: "박과장",
        notes: "경영진 보고용. 부서별 실적과 월별 추이를 모두 포함해주세요.",
      },
      settings: { difficulty: "executive", volume: "standard" },
      template: "report",
    }),
  });

  const body = await res.json();
  assertEquals(res.status, 200, `Expected 200: ${JSON.stringify(body).slice(0, 300)}`);

  const p = body.presentation;
  assert(p?.slides?.length >= 5, `Standard volume should have >=5 slides, got ${p?.slides?.length}`);

  console.log(`\n📊 "${p.title}" — ${p.slides.length} slides`);
  console.log(`   Flow: ${p.slides.map((s: any) => s.type).join(" → ")}\n`);

  // === 1. Chart validation ===
  const chartSlides = p.slides.filter((s: any) => s.type === "chart");
  assert(chartSlides.length >= 2, `Multiple data sources → should have >=2 charts, got ${chartSlides.length}`);

  for (const slide of chartSlides) {
    const cd = slide.chartData;
    assert(cd, `Chart slide "${slide.title}" must have chartData`);
    assert(["bar", "line", "area", "pie"].includes(cd.chartType), `Invalid type: ${cd.chartType}`);
    assert(cd.title && cd.title.length > 5, `Insightful title needed: "${cd.title}"`);
    assert(Array.isArray(cd.data) && cd.data.length >= 2, `Need >=2 data points`);

    // Validate data point structure
    for (const dp of cd.data) {
      assert(dp.name, "Data point name required");
      assert(typeof dp.value === "number", `value must be number`);
    }

    if (cd.chartType !== "pie") {
      assert(cd.xAxisLabel, `xAxisLabel missing for ${cd.chartType}`);
      assert(cd.yAxisLabel, `yAxisLabel missing for ${cd.chartType}`);
    }

    console.log(`📈 "${slide.title}"`);
    console.log(`   type=${cd.chartType} title="${cd.title}"`);
    console.log(`   data=${cd.data.length} points | x="${cd.xAxisLabel}" y="${cd.yAxisLabel}"`);
    console.log(`   insight: "${slide.content?.[0]}"\n`);
  }

  // === 2. Multi-file coverage: check that presentation references data from all sources ===
  const allContent = p.slides.flatMap((s: any) => [
    s.title || "",
    ...(s.content || []),
    s.notes || "",
    s.chartData?.title || "",
  ]).join(" ").toLowerCase();

  // Excel 시트1: 월별 매출 data
  const hasMonthlyData = allContent.includes("월") || allContent.includes("매출");
  assert(hasMonthlyData, "Presentation should reference monthly sales data from Excel sheet 1");

  // Excel 시트2: 부서별 실적
  const hasDeptData = allContent.includes("부서") || allContent.includes("영업") || allContent.includes("팀");
  assert(hasDeptData, "Presentation should reference department data from Excel sheet 2");

  // Text memo: 하반기 이슈
  const hasMemoInsight = allContent.includes("해외") || allContent.includes("온라인") || allContent.includes("하반기");
  assert(hasMemoInsight, "Presentation should reflect insights from the text memo");

  // PDF: 시장 분석
  const hasMarketData = allContent.includes("시장") || allContent.includes("경쟁") || allContent.includes("성장");
  assert(hasMarketData, "Presentation should incorporate market analysis from PDF");

  console.log("✅ Multi-file coverage verified:");
  console.log(`   월별 매출 (Excel): ${hasMonthlyData}`);
  console.log(`   부서별 실적 (Excel): ${hasDeptData}`);
  console.log(`   경영회의 메모 (TXT): ${hasMemoInsight}`);
  console.log(`   시장분석 (PDF): ${hasMarketData}`);

  // === 3. Storytelling structure ===
  const first = p.slides[0];
  const last = p.slides[p.slides.length - 1];
  assert(first.type === "title", `First slide should be title, got: ${first.type}`);
  assert(
    last.type === "summary" || last.type === "action",
    `Last slide should be summary/action, got: ${last.type}`
  );
  console.log(`\n✅ Storytelling: ${first.type} → ... → ${last.type}`);
  console.log("✅ All E2E validations passed!");
});
