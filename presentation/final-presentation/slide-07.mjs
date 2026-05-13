import { bg, body, footer, metricCard, panel, text, theme, title, topbar, label, bulletList } from "./slide-helpers.mjs";

export async function slide07(presentation, ctx) {
  const slide = presentation.slides.add();
  bg(slide, ctx);
  topbar(slide, ctx);

  label(slide, ctx, "Differentiation", 58, 124, 220);
  title(slide, ctx, "What makes PulseOps more than a dashboard", 58, 150, 760, 60);
  body(slide, ctx, "The project became stronger when it connected telemetry to explanation, action, and presentation instead of stopping at charts.", 58, 224, 780, 42, { size: 19 });

  metricCard(slide, ctx, 58, 304, 272, 150, "Signal", "Traffic-aware", "Live request data, suspicious events, source classification", theme.teal);
  metricCard(slide, ctx, 352, 304, 272, 150, "Interpretation", "AI-guided", "Analyst, chat, prompt workflows, executive summaries", theme.blue);
  metricCard(slide, ctx, 646, 304, 272, 150, "Action", "Response flow", "War room, admin controls, playbooks, runtime posture", theme.amber);
  metricCard(slide, ctx, 940, 304, 282, 150, "Scale-up", "Automation", "Rules engine, alert actions, share/report generation", theme.violet);

  panel(slide, ctx, 58, 486, 540, 156, { accent: theme.coral });
  text(slide, ctx, "Included in scope", 82, 514, 170, 18, { size: 11, color: theme.dim, face: theme.mono });
  bulletList(
    slide,
    ctx,
    [
      "Real-time telemetry and suspicious traffic visibility",
      "Operational UI across monitoring, response, reporting, and automation",
      "AI-assisted explanations that support both technical and non-technical audiences",
    ],
    82,
    548,
    448,
    theme.coral,
    15,
    30,
  );

  panel(slide, ctx, 622, 486, 600, 156, { accent: theme.blue });
  text(slide, ctx, "Explicitly excluded or deferred", 646, 514, 220, 18, { size: 11, color: theme.dim, face: theme.mono });
  bulletList(
    slide,
    ctx,
    [
      "Full multi-tenant production hardening and enterprise auth",
      "External paid infrastructure and deep third-party integrations at production depth",
      "Every possible module idea; weaker or noisier features were intentionally removed",
    ],
    646,
    548,
    520,
    theme.blue,
    15,
    30,
  );

  footer(slide, ctx, 7, "Scope discipline | what was included and excluded");
  return slide;
}
