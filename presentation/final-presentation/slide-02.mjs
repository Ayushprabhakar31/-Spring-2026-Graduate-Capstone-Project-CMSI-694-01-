import { bg, body, bulletList, footer, label, panel, text, theme, title, topbar } from "./slide-helpers.mjs";

export async function slide02(presentation, ctx) {
  const slide = presentation.slides.add();
  bg(slide, ctx);
  topbar(slide, ctx);

  label(slide, ctx, "Original plan", 58, 124, 220);
  title(slide, ctx, "The project did not start as PulseOps.", 58, 150, 660, 64);
  body(slide, ctx, "It started as a narrower backend/security problem centered on rate limiting, suspicious traffic, and practical operator visibility.", 58, 226, 670, 52, { size: 19 });

  panel(slide, ctx, 58, 312, 536, 300, { accent: theme.coral });
  text(slide, ctx, "Initial objective", 82, 340, 180, 18, { size: 11, color: theme.dim, face: theme.mono });
  text(slide, ctx, "Build a system that could surface abusive request patterns and make rate-limiting behavior visible.", 82, 374, 448, 72, {
    size: 28,
    bold: true,
    color: theme.white,
  });
  bulletList(
    slide,
    ctx,
    [
      "Detect suspicious API behavior and blocked traffic patterns.",
      "Connect backend protection to operational visibility.",
      "Create a technically grounded capstone with real system value.",
    ],
    82,
    470,
    452,
    theme.coral,
    16,
    36,
  );

  panel(slide, ctx, 630, 312, 592, 300, { accent: theme.blue });
  text(slide, ctx, "Why this was a strong starting point", 654, 340, 300, 18, { size: 11, color: theme.dim, face: theme.mono });
  [
    { y: 382, h: "Security", b: "Rate limiting sits at the intersection of abuse prevention, platform safety, and reliability." },
    { y: 456, h: "Engineering", b: "It requires backend logic, telemetry interpretation, and decision rules rather than static UI alone." },
    { y: 530, h: "Product", b: "It creates a natural question chain: what happened, why, what is affected, and what should someone do next?" },
  ].forEach((item, idx) => {
    text(slide, ctx, item.h, 654, item.y, 170, 24, { size: 22, color: [theme.teal, theme.blue, theme.amber][idx], bold: true });
    body(slide, ctx, item.b, 822, item.y, 336, 40, { size: 16 });
  });

  footer(slide, ctx, 2, "Original scope | rate limiting | suspicious traffic");
  return slide;
}
