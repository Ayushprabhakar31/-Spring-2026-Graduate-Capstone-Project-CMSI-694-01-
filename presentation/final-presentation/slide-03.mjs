import { bg, body, footer, label, panel, rule, text, theme, title, topbar } from "./slide-helpers.mjs";

export async function slide03(presentation, ctx) {
  const slide = presentation.slides.add();
  bg(slide, ctx);
  topbar(slide, ctx);

  label(slide, ctx, "Scope evolution", 58, 124, 220);
  title(slide, ctx, "Why the scope changed over the semester", 58, 150, 740, 60);
  body(slide, ctx, "The project expanded because one feature was not enough to explain risk, response, or stakeholder value.", 58, 224, 780, 44, { size: 19 });

  panel(slide, ctx, 58, 302, 1164, 320, { accent: theme.teal });
  text(slide, ctx, "Every useful answer created a bigger system question.", 84, 334, 640, 32, { size: 28, bold: true, color: theme.white });

  const chain = [
    { x: 84, q: "Requests were being limited.", a: "But what traffic is causing it?" , color: theme.coral },
    { x: 366, q: "Suspicious traffic was visible.", a: "But what endpoint or site is affected?", color: theme.amber },
    { x: 648, q: "Telemetry gave context.", a: "But what should the operator do next?", color: theme.blue },
    { x: 930, q: "Response guidance existed.", a: "But how do we explain it clearly?", color: theme.violet },
  ];

  chain.forEach((step) => {
    panel(slide, ctx, step.x, 390, 248, 176, { accent: step.color });
    text(slide, ctx, step.q, step.x + 18, 420, 210, 48, { size: 24, bold: true, color: theme.white });
    rule(slide, ctx, step.x + 18, 490, 44, step.color, 3);
    body(slide, ctx, step.a, step.x + 18, 514, 210, 38, { size: 16 });
  });

  panel(slide, ctx, 866, 124, 356, 126, { accent: theme.violet });
  text(slide, ctx, "Result", 892, 150, 80, 18, { size: 11, color: theme.dim, face: theme.mono });
  text(slide, ctx, "Rate limiting became the entry point, not the whole capstone.", 892, 182, 278, 48, { size: 24, color: theme.white, bold: true });

  footer(slide, ctx, 3, "Decision logic | why the system had to grow");
  return slide;
}
