import { bg, body, footer, metricCard, panel, text, theme, title, topbar, label, bulletList } from "./slide-helpers.mjs";

export async function slide08(presentation, ctx) {
  const slide = presentation.slides.add();
  bg(slide, ctx);
  topbar(slide, ctx);

  label(slide, ctx, "Project management", 58, 124, 240);
  title(slide, ctx, "How sprint execution shaped the final product", 58, 150, 720, 60);
  body(slide, ctx, "Working in sprints made the project easier to evolve honestly: it created checkpoints for expanding scope, pruning weaker ideas, and validating what actually produced value.", 58, 224, 860, 44, { size: 19 });

  metricCard(slide, ctx, 58, 302, 228, 144, "SCRUM-31", "Backend", "stability fixes", theme.teal);
  metricCard(slide, ctx, 306, 302, 228, 144, "SCRUM-32", "Frontend", "dashboard improvements", theme.blue);
  metricCard(slide, ctx, 554, 302, 228, 144, "SCRUM-33", "Advanced", "observability enhancements", theme.amber);
  metricCard(slide, ctx, 802, 302, 228, 144, "SCRUM-35", "Real time", "data integration", theme.violet);
  metricCard(slide, ctx, 1050, 302, 172, 144, "SCRUM-36", "Final QA", "validation", theme.coral);

  panel(slide, ctx, 58, 482, 548, 160, { accent: theme.blue });
  text(slide, ctx, "What sprints helped with", 82, 510, 180, 18, { size: 11, color: theme.dim, face: theme.mono });
  bulletList(
    slide,
    ctx,
    [
      "Made scope change visible instead of accidental",
      "Created concrete Jira alignment between features and validation",
      "Supported final cleanup instead of endless feature accumulation",
    ],
    82,
    544,
    446,
    theme.blue,
    15,
    30,
  );

  panel(slide, ctx, 630, 482, 592, 160, { accent: theme.teal });
  text(slide, ctx, "What was difficult", 654, 510, 140, 18, { size: 11, color: theme.dim, face: theme.mono });
  bulletList(
    slide,
    ctx,
    [
      "Keeping the UI coherent while the platform widened",
      "Balancing demo value against production-style hardening",
      "Recognizing when removing a feature was better than keeping it",
    ],
    654,
    544,
    510,
    theme.teal,
    15,
    30,
  );

  footer(slide, ctx, 8, "Sprint process | Jira alignment | project management");
  return slide;
}
