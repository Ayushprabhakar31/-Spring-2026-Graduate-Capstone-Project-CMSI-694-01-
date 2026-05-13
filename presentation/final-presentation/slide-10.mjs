import { bg, body, chip, footer, panel, text, theme, title, topbar, label, numberPill } from "./slide-helpers.mjs";

export async function slide10(presentation, ctx) {
  const slide = presentation.slides.add();
  bg(slide, ctx);
  topbar(slide, ctx);

  label(slide, ctx, "Presentation plan", 58, 124, 220);
  title(slide, ctx, "Recommended live demo sequence", 58, 150, 700, 60);
  body(slide, ctx, "The demo works best when it starts with posture, then proves the original traffic/security story, then shows response and automation.", 58, 224, 780, 42, { size: 19 });

  const steps = [
    { y: 312, n: 1, c: theme.teal, h: "Command Center", b: "Open with live posture, AI summary, and what the platform thinks is happening now." },
    { y: 386, n: 2, c: theme.blue, h: "Website Guard", b: "Show sites, telemetry capture, suspicious traffic, and rate-limit visibility to reconnect to the original project scope." },
    { y: 460, n: 3, c: theme.amber, h: "Security Analyst / War Room", b: "Turn evidence into diagnosis, next actions, and operator narrative." },
    { y: 534, n: 4, c: theme.violet, h: "Automation Center", b: "Show rule-based trigger logic and why the system is more than a passive dashboard." },
    { y: 608, n: 5, c: theme.coral, h: "Executive Suite / Export Center", b: "Close by proving the platform can communicate value, not just collect data." },
  ];

  panel(slide, ctx, 58, 296, 770, 382, { accent: theme.blue });
  steps.forEach((step) => {
    numberPill(slide, ctx, step.n, 84, step.y, step.c);
    text(slide, ctx, step.h, 138, step.y - 1, 280, 24, { size: 23, color: theme.white, bold: true });
    body(slide, ctx, step.b, 414, step.y - 3, 378, 28, { size: 15 });
  });

  panel(slide, ctx, 860, 296, 362, 382, { accent: theme.teal });
  text(slide, ctx, "Presenter cues", 886, 324, 150, 18, { size: 11, color: theme.dim, face: theme.mono });
  text(slide, ctx, "Keep repeating the same arc:", 886, 358, 250, 22, { size: 22, color: theme.white, bold: true });
  text(slide, ctx, "rate limiting -> observability -> response -> platform", 886, 394, 270, 50, { size: 26, color: theme.teal, bold: true, face: theme.mono });
  body(slide, ctx, "That phrase makes the project journey easy to remember and keeps the demo tied to the report.", 886, 460, 274, 52, { size: 16 });
  chip(slide, ctx, "Technical judges", 886, 544, 138, theme.blue);
  chip(slide, ctx, "Business framing", 1036, 544, 144, theme.amber);
  body(slide, ctx, "If anything live goes wrong, switch to screenshots or a prerecorded fallback immediately.", 886, 592, 260, 48, { size: 16, color: theme.white });

  footer(slide, ctx, 10, "Demo sequence | speaker guidance");
  return slide;
}
