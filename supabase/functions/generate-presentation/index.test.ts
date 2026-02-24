import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

async function getTestToken(): Promise<string> {
  const email = `test-chart-${Date.now()}@example.com`;
  const password = "testpassword123!";

  const signupRes = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ email, password }),
  });
  const signupData = await signupRes.json();
  console.log("Signup status:", signupRes.status);
  console.log("Signup has token:", !!signupData.access_token);
  if (signupData.access_token) return signupData.access_token;

  const loginRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ email, password }),
  });
  const loginData = await loginRes.json();
  console.log("Login status:", loginRes.status);
  return loginData.access_token;
}

const SAMPLE_FILE_DATA = [
  {
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
  },
];

const MEETING_INFO = {
  week: "2025년 연간 매출 실적 보고",
  department: "경영기획팀",
  reporter: "김대리",
  notes: "경영진 보고용, 차트 중심으로",
};

Deno.test("outline mode: should include chart slides with insightful descriptions", async () => {
  const token = await getTestToken();
  assert(token, "Failed to get auth token");

  const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-presentation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      mode: "outline",
      fileData: SAMPLE_FILE_DATA,
      meetingInfo: MEETING_INFO,
      settings: { difficulty: "executive", volume: "standard" },
      template: "analysis",
    }),
  });

  const body = await res.json();
  console.log("Response status:", res.status);
  if (res.status !== 200) {
    console.log("Error body:", JSON.stringify(body));
  }
  assertEquals(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(body)}`);

  const outline = body.outline;
  assert(outline, "Response should contain outline");
  assert(outline.title, "Outline should have a title");
  assert(Array.isArray(outline.outline), "Outline should have outline array");
  assert(outline.outline.length >= 3, `Should have >=3 slides, got ${outline.outline.length}`);

  // Check chart slides exist
  const chartSlides = outline.outline.filter((s: any) => s.type === "chart");
  assert(chartSlides.length >= 1, `Should have >=1 chart slide, got ${chartSlides.length}`);

  for (const cs of chartSlides) {
    assert(cs.description, `Chart slide "${cs.title}" should have a description`);
    assert(cs.description.length > 10, `Chart description should be meaningful: "${cs.description}"`);
    console.log(`✅ Chart slide: "${cs.title}" → ${cs.description}`);
  }

  // Storytelling structure
  const first = outline.outline[0];
  const last = outline.outline[outline.outline.length - 1];
  assert(first.type === "title" || first.type === "data", `First slide type: ${first.type}`);
  assert(last.type === "summary" || last.type === "action", `Last slide type: ${last.type}`);

  console.log(`\n📊 "${outline.title}" — ${outline.outline.length} slides`);
  console.log(`   Flow: ${outline.outline.map((s: any) => s.type).join(" → ")}`);
});
