import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";
const { default: JSZip } = await import(
  "file:///C:/Users/jason/Documents/Codex/2026-06-04/lets-do-a-smart-contract-on/node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/dist/jszip.min.js"
);

const OUTPUT_DIR = path.join(
  "C:\\Users\\jason\\Documents\\Codex\\2026-06-04\\lets-do-a-smart-contract-on",
  "outputs",
  "missionary_ready_90_day_tracker",
);

const startDate = new Date(2026, 5, 8, 12, 0, 0);
const days = 90;
const ledgerName = "90-Day Ledger";
const dashboardName = "Dashboard & Metrics";

const phases = [
  { name: "Phase 1 - Baseline", start: 1, end: 21, baseKm: 3, longKm: 5 },
  { name: "Phase 2 - Stamina", start: 22, end: 42, baseKm: 5, longKm: 10 },
  { name: "Phase 3 - Load Bearing", start: 43, end: 63, baseKm: 6, longKm: 12 },
  { name: "Phase 4 - Mission Match", start: 64, end: 90, baseKm: 8, longKm: 15, peakKm: 21 },
];

function addDays(date, offset) {
  return new Date(date.getTime() + offset * 24 * 60 * 60 * 1000);
}

function phaseForDay(day) {
  return phases.find((p) => day >= p.start && day <= p.end);
}

function isLongWalkDay(day, phase) {
  const offset = day - phase.start + 1;
  return offset % 7 === 0 || day === 90;
}

function workoutType(day, phase) {
  if (phase.name === "Phase 4 - Mission Match" && day === 90) return "Endurance Peak Walk";
  if (isLongWalkDay(day, phase)) {
    if (phase.name === "Phase 2 - Stamina") return "Weekly Heavy Walk";
    if (phase.name === "Phase 3 - Load Bearing") return "Weekly Backpack Long Walk";
    if (phase.name === "Phase 4 - Mission Match") return "Weekly Mission Long Walk";
    return "Weekly Long Walk";
  }
  if (phase.name === "Phase 3 - Load Bearing") return "Daily Backpack Walk";
  if (phase.name === "Phase 4 - Mission Match") return "Daily Mission Walk";
  return "Daily Walk";
}

function targetKm(day, phase) {
  if (phase.name === "Phase 4 - Mission Match" && day === 90) return phase.peakKm;
  return isLongWalkDay(day, phase) ? phase.longKm : phase.baseKm;
}

function workoutUrlForPhase(phaseName) {
  const baseUrl = "https://github.com/webdev0814/missionary-ready-90-day-fitness-tracker";
  if (phaseName === "Phase 1 - Baseline") return `${baseUrl}#phase-1-baseline`;
  if (phaseName === "Phase 2 - Stamina") return `${baseUrl}#phase-2-stamina`;
  if (phaseName === "Phase 3 - Load Bearing") return `${baseUrl}#phase-3-load-bearing`;
  return `${baseUrl}#phase-4-mission-match`;
}

async function injectWorkoutHyperlinks(xlsxPath) {
  const archive = await JSZip.loadAsync(await fs.readFile(xlsxPath));
  const sheetPath = "xl/worksheets/sheet2.xml";
  const relsPath = "xl/worksheets/_rels/sheet2.xml.rels";
  const sheetXml = await archive.file(sheetPath).async("string");
  const urlByRow = new Map();
  for (let day = 1; day <= days; day += 1) {
    const phase = phaseForDay(day);
    urlByRow.set(day + 1, workoutUrlForPhase(phase.name));
  }

  let hyperlinkIndex = 0;
  let updatedSheetXml = sheetXml.replace(
    /<x:worksheet xmlns:x="http:\/\/schemas\.openxmlformats\.org\/spreadsheetml\/2006\/main">/,
    '<x:worksheet xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
  );

  updatedSheetXml = updatedSheetXml.replace(
    /<x:c r="H(\d+)" s="(\d+)" t="str"><x:v>Open workout<\/x:v><\/x:c>/g,
    (_match, row, style) => {
      const ref = `H${row}`;
      const relId = `rId${++hyperlinkIndex}`;
      const target = urlByRow.get(Number(row));
      return `<x:c r="${ref}" s="${style}" t="str"><x:v>Open workout</x:v></x:c>`;
    },
  );

  const hyperlinkXml = [];
  hyperlinkIndex = 0;
  for (let day = 1; day <= days; day += 1) {
    const row = day + 1;
    const relId = `rId${++hyperlinkIndex}`;
    const target = urlByRow.get(row);
    hyperlinkXml.push(`<x:hyperlink ref="H${row}" r:id="${relId}"/>`);
  }
  updatedSheetXml = updatedSheetXml.replace(
    "</x:worksheet>",
    `<x:hyperlinks>${hyperlinkXml.join("")}</x:hyperlinks></x:worksheet>`,
  );

  const relXml = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
  ];
  hyperlinkIndex = 0;
  for (let day = 1; day <= days; day += 1) {
    const row = day + 1;
    const relId = `rId${++hyperlinkIndex}`;
    const target = urlByRow.get(row);
    relXml.push(
      `<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${target}" TargetMode="External"/>`,
    );
  }
  relXml.push("</Relationships>");

  archive.file(sheetPath, updatedSheetXml);
  archive.file(relsPath, relXml.join(""));
  await fs.writeFile(xlsxPath, await archive.generateAsync({ type: "nodebuffer" }));
}

const workbook = Workbook.create();
const dashboard = workbook.worksheets.add(dashboardName);
const ledger = workbook.worksheets.add(ledgerName);

ledger.getRange("A1:G1").values = [[
  "Date",
  "Phase",
  "Workout Type",
  "Target km",
  "Walk km",
  "Circuit Y/N",
  "Status",
]];

const ledgerRows = [];
for (let day = 1; day <= days; day += 1) {
  const phase = phaseForDay(day);
  ledgerRows.push([
    addDays(startDate, day - 1).toISOString().slice(0, 10),
    phase.name,
    workoutType(day, phase),
    targetKm(day, phase),
    0,
    "N",
    null,
    "Open workout",
  ]);
}

ledger.getRange(`A2:H${days + 1}`).values = ledgerRows;
ledger.getRange("G2").formulas = [[
  '=IF(AND(E2=0,UPPER(F2)="N"),"PENDING",IF(AND(E2>=D2,UPPER(F2)="Y"),"SUCCESS",IF(OR(E2>=D2,UPPER(F2)="Y"),"PARTIAL SUCCESS","FAILURE")))',
]];
ledger.getRange("G2:G91").fillDown();
ledger.getRange("H1").values = [["Workout Link"]];

ledger.freezePanes.freezeRows(1);
ledger.showGridLines = false;
ledger.getRange("D2:E91").setNumberFormat("0.0");
ledger.getRange("A1:G1").format = {
  fill: "#0F172A",
  font: { bold: true, color: "#FFFFFF" },
  wrapText: true,
  verticalAlignment: "middle",
  horizontalAlignment: "center",
};
ledger.getRange("H1:H1").format = {
  fill: "#0F172A",
  font: { bold: true, color: "#FFFFFF" },
  wrapText: true,
  verticalAlignment: "middle",
  horizontalAlignment: "center",
};
ledger.getRange("A2:H91").format = {
  borders: { preset: "all", style: "thin", color: "#CBD5E1" },
  font: { color: "#0F172A" },
  wrapText: true,
  verticalAlignment: "middle",
};
ledger.getRange("H2:H91").format = {
  borders: { preset: "all", style: "thin", color: "#CBD5E1" },
  fill: "#EEF2FF",
  font: { color: "#1D4ED8", bold: true, underline: true },
  horizontalAlignment: "left",
  verticalAlignment: "middle",
};
ledger.getRange("A2:A91").format.wrapText = false;
ledger.getRange("B2:B91").format.fill = "#F8FAFC";
ledger.getRange("D2:G91").format.horizontalAlignment = "center";
ledger.getRange("E2:F91").format = {
  fill: "#FEF3C7",
  font: { bold: true, color: "#854D0E" },
  borders: { preset: "all", style: "thin", color: "#EAB308" },
  horizontalAlignment: "center",
};
ledger.getRange("G2:G91").format.font = { bold: true };
ledger.getRange("G2:G91").conditionalFormats.add("containsText", {
  text: "SUCCESS",
  format: { fill: "#DCFCE7", font: { color: "#166534", bold: true } },
});
ledger.getRange("G2:G91").conditionalFormats.add("containsText", {
  text: "PARTIAL SUCCESS",
  format: { fill: "#FFEDD5", font: { color: "#9A3412", bold: true } },
});
ledger.getRange("G2:G91").conditionalFormats.add("containsText", {
  text: "FAILURE",
  format: { fill: "#FEE2E2", font: { color: "#991B1B", bold: true } },
});
ledger.getRange("G2:G91").conditionalFormats.add("containsText", {
  text: "PENDING",
  format: { fill: "#FEF9C3", font: { color: "#854D0E", bold: true } },
});

ledger.dataValidations.add({
  range: "F2:F91",
  rule: { type: "list", values: ["Y", "N"] },
});

dashboard.showGridLines = false;
dashboard.freezePanes.freezeRows(3);
dashboard.getRange("A1:H2").merge();
dashboard.getRange("A1").values = [["Missionary Ready 90-Day Fitness Tracker"]];
dashboard.getRange("A3:H3").merge();
dashboard.getRange("A3").values = [[
  "Built to support a disciplined daily walking plan with a 2 lb/week target as a guiding outcome, not a guarantee. Adjust nutrition and recovery with professional guidance as needed.",
]];

dashboard.getRange("A5:B10").values = [
  ["Total Planned Distance (km)", null],
  ["Total Actual Distance (km)", null],
  ["Completion %", null],
  ["Success Days", null],
  ["Partial Success Days", null],
  ["Failure Days", null],
];
dashboard.getRange("B5").formulas = [[`=SUM('${ledgerName}'!$D$2:$D$91)`]];
dashboard.getRange("B6").formulas = [[`=SUM('${ledgerName}'!$E$2:$E$91)`]];
dashboard.getRange("B7").formulas = [[`=IF(B5=0,"",B6/B5)`]];
dashboard.getRange("B8").formulas = [[`=COUNTIF('${ledgerName}'!$G$2:$G$91,"SUCCESS")`]];
dashboard.getRange("B9").formulas = [[`=COUNTIF('${ledgerName}'!$G$2:$G$91,"PARTIAL SUCCESS")`]];
dashboard.getRange("B10").formulas = [[`=COUNTIF('${ledgerName}'!$G$2:$G$91,"FAILURE")`]];

dashboard.getRange("D5:H5").merge();
dashboard.getRange("D5").values = [["Progress Bar"]];
dashboard.getRange("D6:H6").merge();
dashboard.getRange("D6").formulas = [[
  '=IF(B7="","",REPT("#",ROUND(B7*20,0))&REPT(".",20-ROUND(B7*20,0)))',
]];
dashboard.getRange("D7:H7").merge();
dashboard.getRange("D7").formulas = [[
  '=IF(B7="","",TEXT(B7,"0%")&" complete")',
]];
dashboard.getRange("D8:H8").merge();
dashboard.getRange("D8").formulas = [[
  '=IF(B7="","",TEXT(B6,"0.0")&" of "&TEXT(B5,"0.0")&" km logged")',
]];

dashboard.getRange("A13:E18").values = [
  ["Phase", "Planned km", "Actual km", "Failure Count", "Alert"],
  ["Phase 1 - Baseline", null, null, null, null],
  ["Phase 2 - Stamina", null, null, null, null],
  ["Phase 3 - Load Bearing", null, null, null, null],
  ["Phase 4 - Mission Match", null, null, null, null],
  ["Accountability Emails", "jasonsant69@gmail.com", "zengink052@gmail.com", "", ""],
];

for (let i = 0; i < phases.length; i += 1) {
  const row = 14 + i;
  const phaseCell = `A${row}`;
  dashboard.getRange(`B${row}`).formulas = [[`=SUMIF('${ledgerName}'!$B$2:$B$91,${phaseCell},'${ledgerName}'!$D$2:$D$91)`]];
  dashboard.getRange(`C${row}`).formulas = [[`=SUMIF('${ledgerName}'!$B$2:$B$91,${phaseCell},'${ledgerName}'!$E$2:$E$91)`]];
  dashboard.getRange(`D${row}`).formulas = [[`=COUNTIFS('${ledgerName}'!$B$2:$B$91,${phaseCell},'${ledgerName}'!$G$2:$G$91,"FAILURE")`]];
  dashboard.getRange(`E${row}`).formulas = [[`=IF(D${row}>3,"ALERT: SEND EMAIL","OK")`]];
}

dashboard.getRange("A20:E24").values = [
  ["Weekly Loss Target", "2 lb/week", "", "", ""],
  ["Operational Note", "This sheet supports the target by scaling walking volume. Actual fat loss still depends heavily on nutrition, sleep, and recovery.", "", "", ""],
  ["Alert Rule", "If any 3-week phase exceeds 3 FAILURE days, flag the accountability emails above.", "", "", ""],
  ["Daily Rule", "Walking happens every day. One day each week is a long walk.", "", "", ""],
  ["Workout Rule", "Total success requires both target distance and circuit completion; partial success is one of the two completed.", "", "", ""],
];

dashboard.getRange("A1:H24").format = { font: { color: "#0F172A" } };
dashboard.getRange("A1:H2").format = {
  fill: "#0F766E",
  font: { bold: true, color: "#FFFFFF", size: 16 },
  horizontalAlignment: "center",
  verticalAlignment: "middle",
};
dashboard.getRange("A3:H3").format = {
  fill: "#ECFEFF",
  font: { color: "#134E4A", italic: true },
  wrapText: true,
};
dashboard.getRange("A5:B10").format = {
  fill: "#F8FAFC",
  borders: { preset: "all", style: "thin", color: "#CBD5E1" },
};
dashboard.getRange("A5:A10").format = {
  fill: "#E2E8F0",
  font: { bold: true },
};
dashboard.getRange("B5:B6").format.numberFormat = "0.0";
dashboard.getRange("B7").format.numberFormat = "0%";
dashboard.getRange("B8:B10").format.numberFormat = "0";
dashboard.getRange("B5:B10").format = { font: { bold: true } };
dashboard.getRange("D5:H8").format = {
  fill: "#0F172A",
  font: { color: "#FFFFFF", bold: true, size: 13 },
  borders: { preset: "all", style: "thin", color: "#0F172A" },
};
dashboard.getRange("D6:H6").format = {
  fill: "#DCFCE7",
  font: { color: "#166534", bold: true, size: 14 },
  horizontalAlignment: "center",
  verticalAlignment: "middle",
};
dashboard.getRange("D7:H7").format = {
  fill: "#ECFDF5",
  font: { color: "#065F46", bold: true },
  horizontalAlignment: "center",
};
dashboard.getRange("D8:H8").format = {
  fill: "#ECFEFF",
  font: { color: "#155E75", bold: true },
  horizontalAlignment: "center",
};
dashboard.getRange("A13:E18").format = {
  borders: { preset: "all", style: "thin", color: "#CBD5E1" },
};
dashboard.getRange("A13:E13").format = {
  fill: "#1D4ED8",
  font: { bold: true, color: "#FFFFFF" },
};
dashboard.getRange("A14:A17").format = {
  font: { bold: true },
  fill: "#EFF6FF",
};
dashboard.getRange("B14:E17").format = { fill: "#F8FAFC" };
dashboard.getRange("A18:E18").format = {
  fill: "#F1F5F9",
  font: { italic: true },
};
dashboard.getRange("A20:B24").format = {
  borders: { preset: "all", style: "thin", color: "#CBD5E1" },
};
dashboard.getRange("A20:A24").format = {
  fill: "#E0F2FE",
  font: { bold: true },
};
dashboard.getRange("B20:B24").format = {
  fill: "#F8FAFC",
  wrapText: true,
};
dashboard.getRange("A1:H24").format.wrapText = true;
dashboard.getRange("A1:H24").format.verticalAlignment = "middle";
dashboard.getRange("A20:B24").format.horizontalAlignment = "left";

dashboard.getRange("A1:A24").format.columnWidthPx = 220;
dashboard.getRange("B1:B24").format.columnWidthPx = 190;
dashboard.getRange("C1:C24").format.columnWidthPx = 160;
dashboard.getRange("D1:D24").format.columnWidthPx = 160;
dashboard.getRange("E1:E24").format.columnWidthPx = 180;
dashboard.getRange("F1:H24").format.columnWidthPx = 130;
dashboard.getRange("A5:B10").format.rowHeightPx = 28;
dashboard.getRange("D5:H5").format.rowHeightPx = 30;
dashboard.getRange("D6:H6").format.rowHeightPx = 36;
dashboard.getRange("D7:H7").format.rowHeightPx = 28;
dashboard.getRange("D8:H8").format.rowHeightPx = 28;

dashboard.getRange("F5:H11").format = {
  fill: "#FFFDF5",
  borders: { preset: "all", style: "thin", color: "#CBD5E1" },
  wrapText: true,
  verticalAlignment: "middle",
};
dashboard.getRange("F5:H5").merge();
dashboard.getRange("F5").values = [["Today's Mission"]];
dashboard.getRange("F6:G6").merge();
dashboard.getRange("F6").values = [["Today"]];
dashboard.getRange("H6").formulas = [["=TEXT(MAX(TODAY(),DATE(2026,6,8)),\"yyyy-mm-dd\")"]];
dashboard.getRange("F7:G7").merge();
dashboard.getRange("F7").values = [["Phase"]];
dashboard.getRange("H7").formulas = [[
  '=IFERROR(INDEX(\'90-Day Ledger\'!$B$2:$B$91,MATCH(H6,\'90-Day Ledger\'!$A$2:$A$91,0)),"Not in program")',
]];
dashboard.getRange("F8:G8").merge();
dashboard.getRange("F8").values = [["Workout"]];
dashboard.getRange("H8").formulas = [[
  '=IFERROR(INDEX(\'90-Day Ledger\'!$C$2:$C$91,MATCH(H6,\'90-Day Ledger\'!$A$2:$A$91,0)),"")',
]];
dashboard.getRange("F9:G9").merge();
dashboard.getRange("F9").values = [["Target km"]];
dashboard.getRange("H9").formulas = [[
  '=IFERROR(INDEX(\'90-Day Ledger\'!$D$2:$D$91,MATCH(H6,\'90-Day Ledger\'!$A$2:$A$91,0)),"")',
]];
dashboard.getRange("F10:G10").merge();
dashboard.getRange("F10").values = [["Circuit"]];
dashboard.getRange("H10").formulas = [[
  '=IFERROR(INDEX(\'90-Day Ledger\'!$F$2:$F$91,MATCH(H6,\'90-Day Ledger\'!$A$2:$A$91,0)),"")',
]];
dashboard.getRange("F11:G11").merge();
dashboard.getRange("F11").values = [["Status"]];
dashboard.getRange("H11").formulas = [[
  '=IFERROR(INDEX(\'90-Day Ledger\'!$G$2:$G$91,MATCH(H6,\'90-Day Ledger\'!$A$2:$A$91,0)),"")',
]];
dashboard.getRange("F5:F11").format = {
  fill: "#FEF3C7",
  font: { bold: true, color: "#854D0E" },
};
dashboard.getRange("H6:H11").format = {
  fill: "#FFFFFF",
  font: { color: "#334155", bold: true },
  horizontalAlignment: "left",
};
dashboard.getRange("H6:H11").format.numberFormat = "@";
dashboard.getRange("H9").format.numberFormat = "0.0";
dashboard.getRange("H6:H11").format.wrapText = true;
dashboard.getRange("H6:H11").format.verticalAlignment = "middle";
dashboard.getRange("F5:H5").format = {
  fill: "#0F172A",
  font: { color: "#FFFFFF", bold: true },
  horizontalAlignment: "center",
};

dashboard.getRange("F13:H13").merge();
dashboard.getRange("F13").values = [["Missionary Workout Program"]];
dashboard.getRange("F14:F14").values = [["1"]];
dashboard.getRange("G14:H14").merge();
dashboard.getRange("G14").values = [["Warm up - 3 min"]];
dashboard.getRange("F15:F15").values = [["2"]];
dashboard.getRange("G15:H15").merge();
dashboard.getRange("G15").values = [["Bodyweight circuit - 12 min"]];
dashboard.getRange("F16:F16").values = [["3"]];
dashboard.getRange("G16:H16").merge();
dashboard.getRange("G16").values = [["Cool down - 2 min"]];
dashboard.getRange("F17:H17").merge();
dashboard.getRange("F17").values = [[
  "Rounds: 2 in Phases 1-2. 3 in Phases 3-4. Keep the morning workout under 30 minutes.",
]];
dashboard.getRange("F13:H17").format = {
  borders: { preset: "all", style: "thin", color: "#CBD5E1" },
  wrapText: true,
  verticalAlignment: "middle",
};
dashboard.getRange("F13:H13").format = {
  fill: "#0F172A",
  font: { color: "#FFFFFF", bold: true },
  horizontalAlignment: "center",
};
dashboard.getRange("F14:F16").format = {
  fill: "#FEF3C7",
  font: { color: "#854D0E", bold: true },
  horizontalAlignment: "center",
  verticalAlignment: "middle",
};
dashboard.getRange("G14:H16").format = {
  fill: "#F8FAFC",
  font: { color: "#334155" },
  horizontalAlignment: "left",
};
dashboard.getRange("F17:H17").format = {
  fill: "#FFFDF5",
  font: { color: "#334155", italic: true },
  horizontalAlignment: "left",
};
dashboard.getRange("F14:H14").format.rowHeightPx = 28;
dashboard.getRange("F15:H15").format.rowHeightPx = 28;
dashboard.getRange("F16:H16").format.rowHeightPx = 28;
dashboard.getRange("F17:H17").format.rowHeightPx = 34;

dashboard.getRange("A13:E18").format = {
  borders: { preset: "all", style: "thin", color: "#CBD5E1" },
  fill: "#FFFFFF",
};
dashboard.getRange("A13:E13").format = {
  fill: "#1D4ED8",
  font: { bold: true, color: "#FFFFFF" },
};
dashboard.getRange("A14:A17").format = {
  font: { bold: true },
  fill: "#EFF6FF",
};
dashboard.getRange("B14:E17").format = { fill: "#FFFFFF" };
dashboard.getRange("A18:E18").format = {
  fill: "#F8FAFC",
  font: { italic: true },
};
ledger.getRange("A1:A91").format.columnWidthPx = 115;
ledger.getRange("B1:B91").format.columnWidthPx = 160;
ledger.getRange("C1:C91").format.columnWidthPx = 170;
ledger.getRange("D1:D91").format.columnWidthPx = 100;
ledger.getRange("E1:E91").format.columnWidthPx = 95;
ledger.getRange("F1:F91").format.columnWidthPx = 115;
ledger.getRange("G1:G91").format.columnWidthPx = 125;
ledger.getRange("H1:H91").format.columnWidthPx = 115;
ledger.getRange("A1:G1").format.rowHeightPx = 36;
ledger.getRange("H1:H1").format.rowHeightPx = 36;

// Workout reference cards by phase so the ledger links have a clear destination.
dashboard.getRange("J5:L5").merge();
dashboard.getRange("J5").values = [["Workout Reference"]];
dashboard.getRange("J6:K6").merge();
dashboard.getRange("J6").values = [["Phase 1"]];
dashboard.getRange("L6").values = [["3 km daily. Weekly long walk: 5 km. 2 rounds."]];
dashboard.getRange("J7:K7").merge();
dashboard.getRange("J7").values = [["Phase 2"]];
dashboard.getRange("L7").values = [["5 km daily. Weekly heavy walk: 10 km. 2 rounds."]];
dashboard.getRange("J8:K8").merge();
dashboard.getRange("J8").values = [["Phase 3"]];
dashboard.getRange("L8").values = [["6 km daily with 5 kg pack. Weekly long walk: 12 km. 3 rounds."]];
dashboard.getRange("J9:K9").merge();
dashboard.getRange("J9").values = [["Phase 4"]];
dashboard.getRange("L9").values = [["8 km daily. Weekly long walk: 15 km. Peak: 21 km on Day 90. 3 rounds."]];
dashboard.getRange("J5:L9").format = {
  borders: { preset: "all", style: "thin", color: "#CBD5E1" },
  wrapText: true,
  verticalAlignment: "middle",
};
dashboard.getRange("J5:L5").format = {
  fill: "#0F172A",
  font: { color: "#FFFFFF", bold: true },
  horizontalAlignment: "center",
};
dashboard.getRange("J6:K9").format = {
  fill: "#FEF3C7",
  font: { color: "#854D0E", bold: true },
};
dashboard.getRange("L6:L9").format = {
  fill: "#F8FAFC",
  font: { color: "#334155" },
  wrapText: true,
};
dashboard.getRange("J6:L9").format.rowHeightPx = 40;

// Helper table for charts.
dashboard.getRange("J12:L25").values = [
  ["Week", "Planned Cumulative", "Actual Cumulative"],
  ["Week 1", null, null],
  ["Week 2", null, null],
  ["Week 3", null, null],
  ["Week 4", null, null],
  ["Week 5", null, null],
  ["Week 6", null, null],
  ["Week 7", null, null],
  ["Week 8", null, null],
  ["Week 9", null, null],
  ["Week 10", null, null],
  ["Week 11", null, null],
  ["Week 12", null, null],
  ["Week 13", null, null],
];
for (let w = 1; w <= 13; w += 1) {
  const row = 13 + w;
  const endDay = Math.min(days, w * 7);
  dashboard.getRange(`K${row}`).formulas = [[`=SUM('${ledgerName}'!$D$2:$D$${endDay + 1})`]];
  dashboard.getRange(`L${row}`).formulas = [[`=SUM('${ledgerName}'!$E$2:$E$${endDay + 1})`]];
}
dashboard.getRange("J12:L25").format = {
  borders: { preset: "all", style: "thin", color: "#CBD5E1" },
};
dashboard.getRange("J12:L12").format = {
  fill: "#1D4ED8",
  font: { bold: true, color: "#FFFFFF" },
};
dashboard.getRange("J13:J25").format = {
  fill: "#EFF6FF",
  font: { bold: true },
};
dashboard.getRange("K13:L25").format = {
  fill: "#F8FAFC",
};

dashboard.charts.deleteAll();
const progressChart = dashboard.charts.add("line", dashboard.getRange("J12:L25"));
progressChart.title = "Weekly Cumulative Distance";
progressChart.hasLegend = true;
progressChart.setPosition("J27", "Q43");
progressChart.xAxis = { axisType: "textAxis" };
progressChart.yAxis = { numberFormatCode: "0" };

dashboard.getRange("J60:K64").values = [
  ["Status", "Count"],
  ["SUCCESS", null],
  ["PARTIAL SUCCESS", null],
  ["FAILURE", null],
  ["PENDING", null],
];
dashboard.getRange("K61").formulas = [[`=COUNTIF('${ledgerName}'!$G$2:$G$91,"SUCCESS")`]];
dashboard.getRange("K62").formulas = [[`=COUNTIF('${ledgerName}'!$G$2:$G$91,"PARTIAL SUCCESS")`]];
dashboard.getRange("K63").formulas = [[`=COUNTIF('${ledgerName}'!$G$2:$G$91,"FAILURE")`]];
dashboard.getRange("K64").formulas = [[`=COUNTIF('${ledgerName}'!$G$2:$G$91,"PENDING")`]];
dashboard.getRange("J60:K64").format = {
  borders: { preset: "all", style: "thin", color: "#CBD5E1" },
};
dashboard.getRange("J60:K60").format = {
  fill: "#1D4ED8",
  font: { bold: true, color: "#FFFFFF" },
};
dashboard.getRange("J61:J64").format = {
  fill: "#EFF6FF",
  font: { bold: true },
};
dashboard.getRange("K61:K64").format = {
  fill: "#F8FAFC",
};
const statusChart2 = dashboard.charts.add("doughnut", dashboard.getRange("J60:K64"));
statusChart2.title = "Status Breakdown";
statusChart2.hasLegend = true;
statusChart2.setPosition("O44", "T58");

await fs.mkdir(OUTPUT_DIR, { recursive: true });
const xlsx = await SpreadsheetFile.exportXlsx(workbook);
const xlsxPath = path.join(OUTPUT_DIR, "missionary_ready_90_day_tracker.xlsx");
await xlsx.save(xlsxPath);
await injectWorkoutHyperlinks(xlsxPath);

const dashboardPreview = await workbook.render({
  sheetName: dashboardName,
  autoCrop: "all",
  scale: 1.4,
  format: "png",
});
await fs.writeFile(
  path.join(OUTPUT_DIR, "dashboard-preview.png"),
  new Uint8Array(await dashboardPreview.arrayBuffer()),
);

const ledgerPreview = await workbook.render({
  sheetName: ledgerName,
  range: "A1:H20",
  autoCrop: "all",
  scale: 1.1,
  format: "png",
});
await fs.writeFile(
  path.join(OUTPUT_DIR, "ledger-preview.png"),
  new Uint8Array(await ledgerPreview.arrayBuffer()),
);

const inspectDashboard = await workbook.inspect({
  kind: "table",
  range: `${dashboardName}!A5:H24`,
  include: "values,formulas",
  tableMaxRows: 24,
  tableMaxCols: 8,
});
console.log(inspectDashboard.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 200 },
  summary: "formula error scan",
});
console.log(errors.ndjson);
