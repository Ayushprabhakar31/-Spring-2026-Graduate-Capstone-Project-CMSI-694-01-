import { bg, body, chip, footer, label, panel, text, theme, title, topbar } from "./slide-helpers.mjs";

export async function slide01(presentation, ctx) {
  const slide = presentation.slides.add();
  bg(slide, ctx);
  topbar(slide, ctx, "PULSEOPS", "Ayush Prabhakar | CMSI 694");

  chip(slide, ctx, "Rate limiting -> observability -> AI operations", 58, 126, 330, theme.teal);
  label(slide, ctx, "Final project presentation", 58, 178, 240);
  title(slide, ctx, "From rate limiting to an AI-native security operations platform.", 58, 206, 720, 124, 38);
  body(
    slide,
    ctx,
    "PulseOps is the result of a semester-long scope evolution: a project that started with abusive traffic control and matured into a real-time operator workspace for telemetry, incident response, automation, and executive communication.",
    58,
    352,
    720,
    112,
    { size: 20 },
  );

  panel(slide, ctx, 58, 520, 748, 110, { accent: theme.blue });
  text(slide, ctx, "Presentation thesis", 82, 546, 220, 20, { size: 11, color: theme.dim, face: theme.mono });
  text(
    slide,
    ctx,
    "The strongest story here is not just the final UI. It is the engineering journey that moved from one security feature to a coherent product system.",
    82,
    574,
    646,
    40,
    { size: 22, color: theme.white, bold: true },
  );

  panel(slide, ctx, 850, 126, 372, 504, { accent: theme.teal });
  label(slide, ctx, "Deck flow", 876, 152, 180);
  [
    "Original project plan",
    "Why the scope had to evolve",
    "System architecture and product surfaces",
    "Sprint 6 finalization and validation",
    "Live demo sequence and future work",
  ].forEach((line, idx) => {
    text(slide, ctx, String(idx + 1).padStart(2, "0"), 880, 214 + idx * 72, 28, 14, { size: 12, color: [theme.teal, theme.blue, theme.amber, theme.violet, theme.coral][idx], face: theme.mono });
    text(slide, ctx, line, 924, 206 + idx * 72, 250, 28, { size: 22, color: theme.white, bold: idx === 0 || idx === 3 });
    body(slide, ctx, idx === 0 ? "Begin with the honest starting point." : idx === 1 ? "Show the decision logic behind expansion." : idx === 2 ? "Explain what was actually built." : idx === 3 ? "Connect work to Jira and validation." : "End with confidence and scale-up potential.", 924, 238 + idx * 72, 250, 24, { size: 14 });
  });

  footer(slide, ctx, 1, "PulseOps | Honest project story + final product value");
  return slide;
}
