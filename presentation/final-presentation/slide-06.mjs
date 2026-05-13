import { bg, footer, metricCard, sectionCard, title, body, topbar, label } from "./slide-helpers.mjs";

export async function slide06(presentation, ctx) {
  const slide = presentation.slides.add();
  bg(slide, ctx);
  topbar(slide, ctx);

  label(slide, ctx, "Delivered product", 58, 124, 240);
  title(slide, ctx, "What was actually built", 58, 150, 560, 60);
  body(slide, ctx, "The final result is a much bigger system than the original plan, but it preserves the same core objective: turn risky traffic and system behavior into useful operator decisions.", 58, 224, 860, 42, { size: 19 });

  metricCard(slide, ctx, 58, 302, 274, 150, "Workspaces", "11", "Monitoring, analysis, response, reporting, admin", "#11D6AF");
  metricCard(slide, ctx, 352, 302, 274, 150, "Real-time layer", "Live", "Streaming summaries, polling, source-aware traffic", "#38A7FF");
  metricCard(slide, ctx, 646, 302, 274, 150, "Automation", "Rule engine", "Webhook, lockdown, playbook, share actions", "#F2BF4B");
  metricCard(slide, ctx, 940, 302, 282, 150, "Edge controls", "Site-level", "Cloudflare-style runtime and posture controls", "#868DFF");

  sectionCard(slide, ctx, 58, 486, 360, 156, "Monitor", "Command surfaces", [
    "Command Center for live posture and operating state.",
    "Website Guard for snippets, sites, risk, and threat evidence.",
  ]);
  sectionCard(slide, ctx, 450, 486, 360, 156, "Respond", "Operational flow", [
    "Security Analyst and War Room for diagnosis, action, and coordination.",
    "Admin Console for users, keys, integrations, and imports.",
  ], "#F2BF4B");
  sectionCard(slide, ctx, 842, 486, 380, 156, "Explain", "AI and reporting", [
    "Chat Workspace, Prompt Studio, Executive Suite, and Export Center.",
    "Automation Center for repeatable system behavior and escalation.",
  ], "#868DFF");

  footer(slide, ctx, 6, "Delivered value | product surfaces | system maturity");
  return slide;
}
