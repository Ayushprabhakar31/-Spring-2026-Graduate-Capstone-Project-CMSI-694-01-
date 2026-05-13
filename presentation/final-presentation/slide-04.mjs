import { bg, body, footer, numberPill, panel, text, theme, title, topbar, label } from "./slide-helpers.mjs";

export async function slide04(presentation, ctx) {
  const slide = presentation.slides.add();
  bg(slide, ctx);
  topbar(slide, ctx);

  label(slide, ctx, "Lifecycle", 58, 124, 180);
  title(slide, ctx, "Project evolution: five phases", 58, 150, 600, 60);
  body(slide, ctx, "This is the story the final report needs to tell: a progression from a tight security feature into a broader product platform.", 58, 224, 730, 42, { size: 19 });

  const phases = [
    { y: 294, n: 1, c: theme.coral, h: "Rate limiting foundation", b: "Started with suspicious traffic visibility, blocked-request patterns, and backend-first defensive logic." },
    { y: 368, n: 2, c: theme.teal, h: "Observability expansion", b: "Added telemetry collection, dashboards, trend interpretation, and system posture surfaces." },
    { y: 442, n: 3, c: theme.blue, h: "Incident workflow layer", b: "Built analyst and war-room experiences so signals could turn into action and narrative." },
    { y: 516, n: 4, c: theme.amber, h: "Product cleanup", b: "Refined navigation, removed weaker features, fixed UX debt, and made the system feel coherent." },
    { y: 590, n: 5, c: theme.violet, h: "Real-time + automation", b: "Completed live data integration, automation rules, deployment work, and final validation." },
  ];

  panel(slide, ctx, 58, 286, 774, 360, { accent: theme.blue });
  phases.forEach((phase) => {
    numberPill(slide, ctx, phase.n, 84, phase.y, phase.c);
    text(slide, ctx, phase.h, 136, phase.y - 2, 260, 26, { size: 22, bold: true, color: theme.white });
    body(slide, ctx, phase.b, 398, phase.y - 4, 398, 28, { size: 15 });
  });

  panel(slide, ctx, 872, 286, 350, 360, { accent: theme.teal });
  text(slide, ctx, "Constant themes", 898, 316, 180, 18, { size: 11, color: theme.dim, face: theme.mono });
  [
    "Security and suspicious traffic stayed central throughout the project.",
    "Operational clarity mattered as much as backend correctness.",
    "The final scope got wider, but it stayed anchored in practical system response.",
  ].forEach((line, idx) => {
    text(slide, ctx, line, 898, 360 + idx * 84, 276, 52, { size: 22, color: idx === 1 ? theme.teal : theme.white, bold: idx !== 0 });
  });

  footer(slide, ctx, 4, "Project lifecycle | phase progression");
  return slide;
}
