import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

async function getTestToken(): Promise<string> {
  const email = `test-gen-${Date.now()}@example.com`;
  const password = "testpassword123!";
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  assert(data.access_token, "Signup should return access_token");
  return data.access_token;
}

const SAMPLE_FILE_DATA = [{
  type: "excel",
  data: {
    "매출현황": {
      rowCount: 12,
      columns: ["월", "매출액(억원)", "영업이익(억원)", "고객수(명)"],
      stats: {
        "매출액(억원)": { min: 42, max: 78, avg: 58.5, count: 12 },
        "영업이익(억원)": { min: 5, max: 18, avg: 10.2, count: 12 },
        "고객수(명)": { min: 1200, max: 3500, avg: 2100, count: 12 },
      },
      sampleRows: [
        { "월": "1월", "매출액(억원)": 42, "영업이익(억원)": 5, "고객수(명)": 1200 },
        { "월": "3월", "매출액(억원)": 48, "영업이익(억원)": 7, "고객수(명)": 1500 },
        { "월": "6월", "매출액(억원)": 58, "영업이익(억원)": 10, "고객수(명)": 2100 },
        { "월": "9월", "매출액(억원)": 65, "영업이익(억원)": 14, "고객수(명)": 2800 },
        { "월": "12월", "매출액(억원)": 78, "영업이익(억원)": 18, "고객수(명)": 3500 },
      ],
    },
  },
}];

Deno.test("generate mode: charts have insightful titles, axis labels, and valid data points", async () => {
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
      fileData: SAMPLE_FILE_DATA,
      meetingInfo: {
        week: "2025년 연간 매출 실적 보고",
        department: "경영기획팀",
        reporter: "김대리",
        notes: "경영진 보고용, 차트 중심으로",
      },
      settings: { difficulty: "executive", volume: "brief" },
      template: "analysis",
    }),
  });

  const body = await res.json();
  assertEquals(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);

  const p = body.presentation;
  assert(p?.slides?.length >= 3, `Should have >=3 slides, got ${p?.slides?.length}`);

  const chartSlides = p.slides.filter((s: any) => s.type === "chart");
  assert(chartSlides.length >= 1, `Should have >=1 chart slide, got ${chartSlides.length}`);

  console.log(`\n📊 "${p.title}" — ${p.slides.length} slides, ${chartSlides.length} chart(s)`);
  console.log(`   Flow: ${p.slides.map((s: any) => s.type).join(" → ")}\n`);

  for (const slide of chartSlides) {
    const cd = slide.chartData;
    assert(cd, `Chart slide "${slide.title}" must have chartData`);

    // 1. Chart type validation
    assert(["bar", "line", "area", "pie"].includes(cd.chartType), `Invalid chartType: ${cd.chartType}`);
    console.log(`📈 Slide: "${slide.title}"`);
    console.log(`   chartType: ${cd.chartType}`);

    // 2. Insightful title (not just a generic label)
    assert(cd.title, "chartData.title is required");
    assert(cd.title.length > 5, `Title too short: "${cd.title}"`);
    console.log(`   chartTitle: "${cd.title}"`);

    // 3. Axis labels with units
    if (cd.chartType !== "pie") {
      assert(cd.xAxisLabel, `xAxisLabel missing for ${cd.chartType} chart`);
      assert(cd.yAxisLabel, `yAxisLabel missing for ${cd.chartType} chart`);
      console.log(`   xAxis: "${cd.xAxisLabel}" | yAxis: "${cd.yAxisLabel}"`);
    }

    // 4. Data points validation
    assert(Array.isArray(cd.data) && cd.data.length >= 2, `Need >=2 data points, got ${cd.data?.length}`);
    for (const dp of cd.data) {
      assert(dp.name, "Each data point must have a name");
      assert(typeof dp.value === "number", `value must be number, got ${typeof dp.value}`);
    }
    console.log(`   dataPoints: ${cd.data.length} items → [${cd.data.slice(0, 3).map((d: any) => `${d.name}:${d.value}`).join(", ")}${cd.data.length > 3 ? ", ..." : ""}]`);

    // 5. Legend logic
    const hasSeries2 = cd.data.some((d: any) => d.value2 !== undefined);
    if (hasSeries2) {
      assert(cd.showLegend === true, "showLegend should be true when value2 exists");
      assert(cd.series1Label, "series1Label required when value2 exists");
      assert(cd.series2Label, "series2Label required when value2 exists");
      console.log(`   series: "${cd.series1Label}" vs "${cd.series2Label}"`);
    }

    // 6. Content should contain insight
    assert(Array.isArray(slide.content) && slide.content.length >= 1, "Chart slide needs content with insights");
    console.log(`   insight: "${slide.content[0]}"\n`);
  }

  console.log("✅ All chart validations passed!");
});
