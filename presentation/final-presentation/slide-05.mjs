import { bg, body, chip, footer, panel, rule, text, theme, title, topbar, label } from "./slide-helpers.mjs";

export async function slide05(presentation, ctx) {
  const slide = presentation.slides.add();
  bg(slide, ctx);
  topbar(slide, ctx);

  label(slide, ctx, "Final system", 58, 124, 200);
  title(slide, ctx, "PulseOps architecture and product structure", 58, 150, 720, 60);
  body(slide, ctx, "By the end of the semester, the project had a modular architecture with clear layers for collection, interpretation, action, and communication.", 58, 224, 760, 42, { size: 19 });

  const columns = [
    { x: 58, w: 256, kicker: "Collect", title: "Ingress", color: theme.teal, rows: ["Browser snippet", "API telemetry", "Imported logs", "Demo fallback"] },
    { x: 340, w: 256, kicker: "Protect", title: "Edge + runtime", color: theme.coral, rows: ["Rate limiting", "Bot posture", "WAF-style controls", "Traffic modes"] },
    { x: 622, w: 256, kicker: "Interpret", title: "Core services", color: theme.blue, rows: ["Node / Express APIs", "SQLite persistence", "History + analytics", "Threat scoring"] },
    { x: 904, w: 318, kicker: "Communicate", title: "Operator surfaces", color: theme.violet, rows: ["Command Center", "Analyst + War Room", "Automation Center", "Executive exports"] },
  ];

  columns.forEach((col) => {
    panel(slide, ctx, col.x, 312, col.w, 270, { accent: col.color });
    text(slide, ctx, col.kicker.toUpperCase(), col.x + 20, 338, col.w - 40, 18, { size: 11, color: theme.dim, face: theme.mono });
    text(slide, ctx, col.title, col.x + 20, 370, col.w - 40, 30, { size: 25, color: theme.white, bold: true });
    col.rows.forEach((row, idx) => {
      rule(slide, ctx, col.x + 20, 428 + idx * 34, 14, col.color, 3);
      body(slide, ctx, row, col.x + 42, 417 + idx * 34, col.w - 64, 22, { size: 16 });
    });
  });

  chip(slide, ctx, "React", 58, 622, 86, theme.blue);
  chip(slide, ctx, "Express", 156, 622, 108, theme.teal);
  chip(slide, ctx, "SQLite", 278, 622, 94, theme.amber);
  chip(slide, ctx, "SSE + polling", 386, 622, 142, theme.violet);
  chip(slide, ctx, "AI + automation", 542, 622, 154, theme.coral);

  footer(slide, ctx, 5, "Architecture | layers | modular workspaces");
  return slide;
}
