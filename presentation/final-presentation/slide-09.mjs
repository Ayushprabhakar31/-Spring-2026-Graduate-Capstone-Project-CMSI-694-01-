import { bg, body, footer, panel, text, theme, title, topbar, label, bulletList } from "./slide-helpers.mjs";

export async function slide09(presentation, ctx) {
  const slide = presentation.slides.add();
  bg(slide, ctx);
  topbar(slide, ctx);

  label(slide, ctx, "Challenges", 58, 124, 180);
  title(slide, ctx, "Key decisions, tradeoffs, and stakeholder thinking", 58, 150, 780, 60);
  body(slide, ctx, "A big part of this project was deciding what kind of system it needed to become, and who it needed to be useful for.", 58, 224, 760, 42, { size: 19 });

  panel(slide, ctx, 58, 302, 372, 318, { accent: theme.coral });
  text(slide, ctx, "Major challenges", 82, 330, 180, 18, { size: 11, color: theme.dim, face: theme.mono });
  bulletList(
    slide,
    ctx,
    [
      "Scope expansion risk as more capabilities became obviously useful",
      "Frontend clutter and readability as the workspace count increased",
      "Making real-time behavior feel credible rather than simulated",
      "Explaining technical risk clearly to non-technical judges",
    ],
    82,
    366,
    286,
    theme.coral,
    15,
    36,
  );

  panel(slide, ctx, 454, 302, 372, 318, { accent: theme.blue });
  text(slide, ctx, "Alternatives considered", 478, 330, 180, 18, { size: 11, color: theme.dim, face: theme.mono });
  bulletList(
    slide,
    ctx,
    [
      "Stay narrow and deliver only the rate-limiting feature",
      "Keep every experimental UI surface instead of pruning",
      "Prioritize pure backend depth over end-to-end product experience",
      "Treat the capstone as a tool instead of a platform",
    ],
    478,
    366,
    286,
    theme.blue,
    15,
    36,
  );

  panel(slide, ctx, 850, 302, 372, 318, { accent: theme.teal });
  text(slide, ctx, "Stakeholders / customers", 874, 330, 200, 18, { size: 11, color: theme.dim, face: theme.mono });
  bulletList(
    slide,
    ctx,
    [
      "Technical operators who need visibility and response guidance",
      "Non-technical judges who need a clear story about value",
      "Future employers reviewing system design, UX, and engineering execution",
      "The project owner: me, as a portfolio and learning outcome",
    ],
    874,
    366,
    286,
    theme.teal,
    15,
    36,
  );

  footer(slide, ctx, 9, "Challenges | alternatives | stakeholders");
  return slide;
}
