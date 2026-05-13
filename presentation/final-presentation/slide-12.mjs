import { bg, body, chip, footer, label, panel, text, theme, title, topbar } from "./slide-helpers.mjs";

export async function slide12(presentation, ctx) {
  const slide = presentation.slides.add();
  bg(slide, ctx);
  topbar(slide, ctx, "PULSEOPS", "Thank you");

  chip(slide, ctx, "Closing takeaway", 58, 126, 180, theme.teal);
  title(slide, ctx, "PulseOps began as rate limiting.", 58, 176, 600, 54, 36);
  title(slide, ctx, "It became a real-time AI operations platform.", 58, 230, 760, 60, 40);
  body(
    slide,
    ctx,
    "The final value of the project came from following the problem where it led: from suspicious traffic, to observability, to response workflows, to product-scale communication and automation.",
    58,
    320,
    770,
    88,
    { size: 22, color: theme.white },
  );

  panel(slide, ctx, 58, 474, 744, 142, { accent: theme.blue });
  text(slide, ctx, "Final message", 84, 502, 160, 18, { size: 11, color: theme.dim, face: theme.mono });
  text(slide, ctx, "This project is strongest when presented as both a technical system and a record of disciplined project evolution.", 84, 536, 638, 48, { size: 24, color: theme.white, bold: true });

  panel(slide, ctx, 850, 150, 372, 466, { accent: theme.violet });
  label(slide, ctx, "Questions", 876, 180, 140);
  text(slide, ctx, "Thank you", 876, 216, 220, 42, { size: 34, bold: true, color: theme.white });
  body(slide, ctx, "References to mention during Q&A:", 876, 274, 240, 24, { size: 18, color: theme.white });
  text(slide, ctx, "Jira", 876, 320, 80, 22, { size: 22, bold: true, color: theme.teal });
  body(slide, ctx, "SCRUM board and sprint reports", 954, 322, 188, 22, { size: 16, color: theme.white });
  body(slide, ctx, "prabhakarayush21.atlassian.net", 876, 350, 250, 20, { size: 15, color: theme.muted });
  text(slide, ctx, "GitHub", 876, 404, 90, 22, { size: 22, bold: true, color: theme.blue });
  body(slide, ctx, "project repository and PR history", 968, 406, 190, 22, { size: 16, color: theme.white });
  body(slide, ctx, "github.com/Ayushprabhakar31/...", 876, 434, 250, 20, { size: 15, color: theme.muted });
  text(slide, ctx, "Live site", 876, 488, 100, 22, { size: 22, bold: true, color: theme.amber });
  body(slide, ctx, "public demo frontend + hosted backend", 978, 490, 190, 22, { size: 16, color: theme.white });
  body(slide, ctx, "ayushprabhakar31.github.io/...", 876, 518, 250, 20, { size: 15, color: theme.muted });

  footer(slide, ctx, 12, "Closing | Q&A");
  return slide;
}
