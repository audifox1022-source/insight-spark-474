import * as pdfjsLib from "pdfjs-dist";
import type { ParsedFileData } from "@/utils/fileParser";

const cleanExtractedText = (text: string): string =>
  text
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const hasMeaningfulText = (text: string): boolean =>
  cleanExtractedText(text).replace(/\s/g, "").length >= 40;

export async function parsePdf(file: File): Promise<ParsedFileData> {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";

    const pageLimit = Math.min(pdf.numPages, 20);

    for (let i = 1; i <= pageLimit; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(" ");
      if (pageText.trim()) {
        fullText += `\n[Page ${i}]\n${pageText}\n`;
      }
    }

    const cleanedText = cleanExtractedText(fullText);
    if (hasMeaningfulText(cleanedText)) {
      return {
        fileName: file.name,
        fileType: "pdf",
        content: cleanedText,
        summary: cleanedText.substring(0, 1000),
      };
    }

    const multimodalParts: any[] = [];
    for (let i = 1; i <= pageLimit; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvas, canvasContext: context!, viewport }).promise;

      const tileHeight = 2500;
      if (canvas.height > tileHeight) {
        const numTiles = Math.ceil(canvas.height / tileHeight);
        for (let t = 0; t < numTiles; t++) {
          const tileCanvas = document.createElement("canvas");
          const tileContext = tileCanvas.getContext("2d");
          const currentTileHeight = Math.min(tileHeight, canvas.height - t * tileHeight);

          tileCanvas.width = canvas.width;
          tileCanvas.height = currentTileHeight;

          tileContext?.drawImage(
            canvas,
            0,
            t * tileHeight,
            canvas.width,
            currentTileHeight,
            0,
            0,
            canvas.width,
            currentTileHeight,
          );

          const base64Tile = tileCanvas.toDataURL("image/jpeg", 0.9).split(",")[1];
          multimodalParts.push({
            inlineData: {
              data: base64Tile,
              mimeType: "image/jpeg",
            },
            metadata: { pageNum: i, part: `${t + 1}/${numTiles}` },
          });
        }
      } else {
        const base64Image = canvas.toDataURL("image/jpeg", 0.9).split(",")[1];
        multimodalParts.push({
          inlineData: {
            data: base64Image,
            mimeType: "image/jpeg",
          },
          metadata: { pageNum: i },
        });
      }
    }

    return {
      fileName: file.name,
      fileType: "pdf",
      content: multimodalParts,
      summary: `Scanned or image-based PDF: ${file.name} (${multimodalParts.length} image parts). Use attached image parts as the source.`,
    };
  } catch (err: any) {
    console.error("PDF parsing error:", err);
    return { fileName: file.name, fileType: "pdf", content: "", summary: "", parseError: err.message };
  }
}
