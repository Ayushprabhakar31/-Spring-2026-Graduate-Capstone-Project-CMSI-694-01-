import { bg, body, footer, panel, text, theme, title, topbar, label, bulletList } from "./slide-helpers.mjs";

export async function slide11(presentation, ctx) {
  const slide = presentation.slides.add();
  bg(slide, ctx);
  topbar(slide, ctx);

  label(slide, ctx, "Reflection", 58, 124, 180);
  title(slide, ctx, "What I learned and what I would do differently", 58, 150, 820, 60);
  body(slide, ctx, "The biggest lesson from this capstone is that technical scope evolution is normal, but it has to be documented and managed honestly.", 58, 224, 780, 42, { size: 19 });

  panel(slide, ctx, 58, 302, 552, 316, { accent: theme.teal });
  text(slide, ctx, "Most valuable lessons", 82, 330, 190, 18, { size: 11, color: theme.dim, face: theme.mono });
  bulletList(
    slide,
    ctx,
    [
      "Backend features become more valuable when they live inside clear product workflows.",
      "Real-time systems create UX and presentation problems, not just backend problems.",
      "Removing low-value features can improve a product more than adding more modules.",
      "Project storytelling is part of engineering communication, not separate from it.",
    ],
    82,
    366,
    454,
    theme.teal,
    15,
    38,
  );

  panel(slide, ctx, 638, 302, 584, 316, { accent: theme.amber });
  text(slide, ctx, "If I did it again", 662, 330, 160, 18, { size: 11, color: theme.dim, face: theme.mono });
  bulletList(
    slide,
    ctx,
    [
      "Document scope changes earlier and preserve the semester narrative while building.",
      "Lock the design system and navigation model sooner.",
      "Deploy public infrastructure earlier so hosted testing happens before the final sprint.",
      "Separate demo-only features from production-hardening goals more explicitly.",
    ],
    662,
    366,
    484,
    theme.amber,
    15,
    38,
  );

  footer(slide, ctx, 11, "Reflection | lessons learned");
  return slide;
}
