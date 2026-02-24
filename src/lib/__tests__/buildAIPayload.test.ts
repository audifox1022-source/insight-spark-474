import { describe, it, expect } from "vitest";
import { buildAIPayload } from "@/lib/file-parser";
import type { ParsedFileData } from "@/lib/file-parser";
import type { ParsedExcelData } from "@/lib/excel-parser";

describe("buildAIPayload", () => {
  it("includes ALL uploaded files in the payload", () => {
    const files: ParsedFileData[] = [
      {
        fileName: "매출데이터.xlsx",
        fileType: "excel",
        summary: "시트 1개, 총 12행",
        excelData: {
          sheetNames: ["매출현황"],
          sheets: {
            "매출현황": [
              { "월": "1월", "매출액": 42 },
              { "월": "2월", "매출액": 45 },
            ],
          },
          summary: "시트 1개, 총 2행",
        } as ParsedExcelData,
      },
      {
        fileName: "보고서.pdf",
        fileType: "pdf",
        textContent: "2025년 연간 실적 보고서. 매출이 전년 대비 30% 증가했습니다.",
        summary: "PDF 문서",
      },
      {
        fileName: "메모.txt",
        fileType: "text",
        textContent: "추가 분석 필요: 하반기 급성장 원인 파악",
        summary: "텍스트 파일",
      },
      {
        fileName: "차트이미지.png",
        fileType: "image",
        imageDataUrl: "data:image/png;base64,abc123...",
        summary: "이미지 파일",
      },
    ];

    const payload = buildAIPayload(files);

    // All 4 files should be present in payload
    expect(Object.keys(payload)).toHaveLength(4);
    expect(payload["매출데이터.xlsx"]).toBeDefined();
    expect(payload["보고서.pdf"]).toBeDefined();
    expect(payload["메모.txt"]).toBeDefined();
    expect(payload["차트이미지.png"]).toBeDefined();

    // Excel file should have summarized data
    const excel = payload["매출데이터.xlsx"] as any;
    expect(excel.type).toBe("excel");
    expect(excel.data).toBeDefined();
    expect(excel.data["매출현황"]).toBeDefined();
    expect(excel.data["매출현황"].rowCount).toBe(2);
    expect(excel.data["매출현황"].columns).toContain("월");
    expect(excel.data["매출현황"].columns).toContain("매출액");

    // PDF should have text content
    const pdf = payload["보고서.pdf"] as any;
    expect(pdf.type).toBe("pdf");
    expect(pdf.content).toContain("매출이 전년 대비 30% 증가");

    // Text file should have content
    const text = payload["메모.txt"] as any;
    expect(text.type).toBe("text");
    expect(text.content).toContain("하반기 급성장");

    // Image should have note (not raw data URL)
    const img = payload["차트이미지.png"] as any;
    expect(img.type).toBe("image");
    expect(img.note).toBeDefined();
    expect(img).not.toHaveProperty("imageDataUrl"); // Should NOT send raw data
  });

  it("handles empty file list", () => {
    const payload = buildAIPayload([]);
    expect(Object.keys(payload)).toHaveLength(0);
  });

  it("skips unknown file types gracefully", () => {
    const files: ParsedFileData[] = [
      {
        fileName: "unknown.xyz",
        fileType: "unknown",
        summary: "알 수 없는 형식",
      },
      {
        fileName: "valid.txt",
        fileType: "text",
        textContent: "Valid content",
        summary: "텍스트",
      },
    ];

    const payload = buildAIPayload(files);
    // Unknown files with no textContent/excelData/image are skipped
    expect(payload["unknown.xyz"]).toBeUndefined();
    expect(payload["valid.txt"]).toBeDefined();
  });

  it("handles multiple excel files with different sheets", () => {
    const files: ParsedFileData[] = [
      {
        fileName: "매출.xlsx",
        fileType: "excel",
        summary: "시트 1개",
        excelData: {
          sheetNames: ["매출"],
          sheets: { "매출": [{ "항목": "A", "금액": 100 }] },
          summary: "시트 1개, 총 1행",
        } as ParsedExcelData,
      },
      {
        fileName: "비용.xlsx",
        fileType: "excel",
        summary: "시트 2개",
        excelData: {
          sheetNames: ["인건비", "운영비"],
          sheets: {
            "인건비": [{ "부서": "개발", "금액": 500 }],
            "운영비": [{ "항목": "임대료", "금액": 200 }],
          },
          summary: "시트 2개, 총 2행",
        } as ParsedExcelData,
      },
    ];

    const payload = buildAIPayload(files);
    expect(Object.keys(payload)).toHaveLength(2);

    const sales = payload["매출.xlsx"] as any;
    expect(sales.data["매출"].columns).toContain("금액");

    const cost = payload["비용.xlsx"] as any;
    expect(Object.keys(cost.data)).toHaveLength(2);
    expect(cost.data["인건비"]).toBeDefined();
    expect(cost.data["운영비"]).toBeDefined();
  });
});
