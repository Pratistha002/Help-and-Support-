import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const faqPath = path.join(root, "data", "support-faqs.json");
const outPath = path.join(root, "docs", "Saarthi-Workforce-FAQs.pdf");

const CONSUMER_TYPES = [
  { id: "EMPLOYEE", label: "Employee", description: "Role prep, skill tests & InterviewX" },
  { id: "MANAGER", label: "Manager", description: "Team monitoring, invites & recommendations" },
  { id: "HR", label: "HR", description: "Company-wide workforce view & engagement" },
  { id: "ADMIN", label: "Admin", description: "Platform, org settings & help desk" },
];

const BRAND = {
  primary: "#1e40af",
  accent: "#3b82f6",
  text: "#0f172a",
  muted: "#64748b",
  border: "#e2e8f0",
};

function groupByCategory(items) {
  const map = new Map();
  for (const item of items) {
    if (!map.has(item.category)) map.set(item.category, []);
    map.get(item.category).push(item);
  }
  return map;
}

function ensureSpace(doc, needed = 80) {
  if (doc.y + needed > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
    return true;
  }
  return false;
}

function drawFooter(doc, pageNum) {
  const bottom = doc.page.height - 36;
  doc
    .fontSize(8)
    .fillColor(BRAND.muted)
    .text("Saarthi Workforce — Help & Support", doc.page.margins.left, bottom, {
      width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
      align: "left",
      lineBreak: false,
    });
  doc.text(`Page ${pageNum}`, doc.page.margins.left, bottom, {
    width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
    align: "right",
    lineBreak: false,
  });
}

function generate() {
  const faqs = JSON.parse(fs.readFileSync(faqPath, "utf8"));
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 56, bottom: 56, left: 56, right: 56 },
    info: {
      Title: "Saarthi Workforce FAQs",
      Author: "SaarthiX Help & Support",
      Subject: "Frequently Asked Questions by user type",
    },
  });

  const stream = fs.createWriteStream(outPath);
  doc.pipe(stream);

  let pageNum = 1;

  // Cover
  doc.rect(0, 0, doc.page.width, 180).fill(BRAND.primary);
  doc.fillColor("#ffffff").fontSize(28).font("Helvetica-Bold");
  doc.text("Saarthi Workforce", 56, 64);
  doc.fontSize(20).text("Help & Support FAQs", 56, 100);
  doc.font("Helvetica").fontSize(11);
  doc.text("Complete guide for every user type", 56, 132);

  doc.fillColor(BRAND.text).fontSize(11);
  doc.y = 210;
  doc.text("This document lists frequently asked questions for:", { lineGap: 4 });
  doc.moveDown(0.5);
  for (const role of CONSUMER_TYPES) {
    const count = faqs.filter((f) => f.consumerType === role.id).length;
    doc.fillColor(BRAND.accent).text(`• ${role.label}`, { continued: true });
    doc.fillColor(BRAND.muted).text(` — ${role.description} (${count} articles)`);
  }
  doc.moveDown(1);
  doc.fillColor(BRAND.muted).fontSize(9);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}`);
  doc.text("Support: saarthix.help@gmail.com | +1 878 732 2485");

  // Table of contents
  doc.addPage();
  pageNum++;
  doc.fillColor(BRAND.primary).fontSize(18).font("Helvetica-Bold").text("Contents", { underline: false });
  doc.moveDown(0.8);
  doc.font("Helvetica").fontSize(11).fillColor(BRAND.text);
  CONSUMER_TYPES.forEach((role, i) => {
    doc.text(`${i + 1}. ${role.label} FAQs`, { lineGap: 6 });
  });

  for (const role of CONSUMER_TYPES) {
    const roleFaqs = faqs.filter((f) => f.consumerType === role.id);
    const byCategory = groupByCategory(roleFaqs);

    doc.addPage();
    pageNum++;
    doc.fillColor(BRAND.primary).fontSize(22).font("Helvetica-Bold").text(`${role.label} FAQs`);
    doc.moveDown(0.3);
    doc.font("Helvetica").fontSize(11).fillColor(BRAND.muted).text(role.description);
    doc.moveDown(1);

    let qNum = 1;
    for (const [category, items] of byCategory) {
      ensureSpace(doc, 60);
      doc.fillColor(BRAND.accent).fontSize(13).font("Helvetica-Bold").text(category);
      doc.moveDown(0.4);

      for (const item of items) {
        ensureSpace(doc, 100);
        doc.fillColor(BRAND.text).fontSize(11).font("Helvetica-Bold");
        doc.text(`Q${qNum}. ${item.question}`, { lineGap: 3 });
        doc.moveDown(0.25);
        doc.font("Helvetica").fillColor(BRAND.text).fontSize(10.5);
        doc.text(item.answer, { lineGap: 4, align: "left" });
        doc.moveDown(0.8);
        qNum++;
      }
      doc.moveDown(0.3);
    }
  }

  // Support channels page
  doc.addPage();
  pageNum++;
  doc.fillColor(BRAND.primary).fontSize(18).font("Helvetica-Bold").text("Getting more help");
  doc.moveDown(0.8);
  const channels = [
    ["Live chat", "Connect with a support agent in real time from the Help & Support page."],
    ["AI assistant", "Ask questions and get instant answers based on these FAQs."],
    ["Email", "saarthix.help@gmail.com — response typically within 24 hours."],
    ["Phone", "+1 878 732 2485 — request a callback from Help & Support."],
    ["Create ticket", "Submit a detailed request and track progress under Track ticket."],
  ];
  doc.font("Helvetica").fontSize(11).fillColor(BRAND.text);
  for (const [title, desc] of channels) {
    ensureSpace(doc, 50);
    doc.font("Helvetica-Bold").text(title, { continued: true });
    doc.font("Helvetica").text(` — ${desc}`, { lineGap: 5 });
    doc.moveDown(0.4);
  }

  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    if (i > 0) drawFooter(doc, i);
  }

  doc.end();

  stream.on("finish", () => {
    console.log(`PDF written to: ${outPath}`);
    const stats = fs.statSync(outPath);
    console.log(`Size: ${(stats.size / 1024).toFixed(1)} KB`);
  });
}

generate();
