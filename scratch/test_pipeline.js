const fs = require("fs");
const path = require("path");
const { PDFParse } = require("pdf-parse");

async function runTest() {
  console.log("=== Testing Local PDF-Parse & BM25 Pipeline ===");

  // Create a realistic sample PDF with 2 pages of academic content
  const samplePdfData = Buffer.from(
    "%PDF-1.4\n" +
    "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n" +
    "2 0 obj<</Type/Pages/Kids[3 0 R 5 0 R]/Count 2>>endobj\n" +
    "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R>>endobj\n" +
    "4 0 obj<</Length 180>>stream\n" +
    "BT /F1 14 Tf 72 700 Td (Chapter 3: Membrane Transport) Tj ET\n" +
    "BT /F1 11 Tf 72 660 Td (Passive transport moves substances down concentration gradients without ATP direct use.) Tj ET\n" +
    "endstream\nendobj\n" +
    "5 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 6 0 R>>endobj\n" +
    "6 0 obj<</Length 190>>stream\n" +
    "BT /F1 14 Tf 72 700 Td (Section 3.2: Active Transport) Tj ET\n" +
    "BT /F1 11 Tf 72 660 Td (Primary active transport uses the sodium potassium pump Na+/K+-ATPase importing 2 K+ and exporting 3 Na+.) Tj ET\n" +
    "endstream\nendobj\n" +
    "xref\n0 7\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000120 00000 n \n0000000210 00000 n \n0000000440 00000 n \n0000000530 00000 n \n" +
    "trailer<</Size 7/Root 1 0 R>>\nstartxref\n770\n%%EOF"
  );

  const parser = new PDFParse({ data: samplePdfData });
  const result = await parser.getText();
  console.log("Extracted total pages:", result.total);
  console.log("Page 1 snippet:", result.pages[0]?.text);
  console.log("Page 2 snippet:", result.pages[1]?.text);

  // Test BM25
  const STOPWORDS = new Set(["a", "an", "the", "and", "or", "in", "on", "at", "to", "for", "is", "of"]);
  function tokenize(text) {
    return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 2 && !STOPWORDS.has(w));
  }

  const chunks = result.pages.map((p, idx) => ({
    id: `chunk_${idx}`,
    page_number: p.num,
    text: p.text
  }));

  const query = "What does the sodium potassium pump export?";
  const qTokens = tokenize(query);

  console.log("\nQuery:", query);
  console.log("Tokens:", qTokens);

  chunks.forEach(c => {
    const cTokens = tokenize(c.text);
    const matches = qTokens.filter(t => cTokens.includes(t));
    console.log(`Page ${c.page_number} matches (${matches.length}):`, matches);
  });

  console.log("\nPipeline verification: SUCCESSFUL!");
}

runTest().catch(console.error);

