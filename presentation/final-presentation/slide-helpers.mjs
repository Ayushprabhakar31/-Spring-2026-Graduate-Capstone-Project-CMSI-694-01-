export const SLIDE = { width: 1280, height: 720 };

export const theme = {
  bg: "#060B12",
  bgAlt: "#09111B",
  panel: "#0D141E",
  panelSoft: "#121B28",
  line: "#1A2637",
  lineBright: "#23354C",
  text: "#F4F7FB",
  muted: "#8D9CB5",
  dim: "#5E6E87",
  teal: "#11D6AF",
  blue: "#38A7FF",
  amber: "#F2BF4B",
  coral: "#FF6B6B",
  violet: "#868DFF",
  white: "#FFFFFF",
  ink: "#01050A",
  sans: "Avenir Next",
  mono: "Menlo",
};

export function text(slide, ctx, value, x, y, w, h, opts = {}) {
  return ctx.addText(slide, {
    text: String(value ?? ""),
    left: x,
    top: y,
    width: w,
    height: h,
    fontSize: opts.size ?? 18,
    color: opts.color ?? theme.text,
    bold: Boolean(opts.bold),
    typeface: opts.face ?? theme.sans,
    align: opts.align ?? "left",
    valign: opts.valign ?? "top",
    fill: opts.fill ?? "#00000000",
    line: opts.line ?? ctx.line({ color: "#00000000" }),
    margin: 0,
    breakLine: false,
    fit: "shrink",
    name: opts.name,
  });
}

export function rect(slide, ctx, x, y, w, h, fill, opts = {}) {
  return ctx.addShape(slide, {
    left: x,
    top: y,
    width: w,
    height: h,
    geometry: opts.geometry ?? "roundRect",
    radius: opts.radius ?? 20,
    fill,
    line: opts.line ?? ctx.line({ color: opts.lineColor ?? theme.line, width: opts.lineWidth ?? 1 }),
    name: opts.name,
  });
}

export function rule(slide, ctx, x, y, w, color = theme.line, h = 1) {
  return rect(slide, ctx, x, y, w, h, color, {
    geometry: "rect",
    radius: 0,
    line: ctx.line({ color, width: 0 }),
  });
}

export function bg(slide, ctx) {
  rect(slide, ctx, 0, 0, SLIDE.width, SLIDE.height, theme.bg, {
    geometry: "rect",
    radius: 0,
    line: ctx.line({ color: theme.bg, width: 0 }),
  });
  rect(slide, ctx, 928, -90, 420, 420, "#11345622", {
    geometry: "ellipse",
    radius: 210,
    line: ctx.line({ color: "#00000000", width: 0 }),
  });
  rect(slide, ctx, -120, 470, 380, 380, "#12D6AF14", {
    geometry: "ellipse",
    radius: 190,
    line: ctx.line({ color: "#00000000", width: 0 }),
  });
  rule(slide, ctx, 0, 94, SLIDE.width, theme.line, 1);
}

export function label(slide, ctx, value, x, y, w = 280, color = theme.dim) {
  return text(slide, ctx, String(value).toUpperCase(), x, y, w, 18, {
    size: 11,
    color,
    face: theme.mono,
  });
}

export function title(slide, ctx, value, x, y, w = 760, h = 68, size = 34) {
  return text(slide, ctx, value, x, y, w, h, {
    size,
    color: theme.white,
    bold: true,
  });
}

export function body(slide, ctx, value, x, y, w, h, opts = {}) {
  return text(slide, ctx, value, x, y, w, h, {
    size: opts.size ?? 18,
    color: opts.color ?? theme.muted,
    face: opts.face ?? theme.sans,
  });
}

export function chip(slide, ctx, value, x, y, w, color, fill = "#00000000") {
  rect(slide, ctx, x, y, w, 34, fill, {
    radius: 17,
    lineColor: color,
  });
  text(slide, ctx, value, x, y + 8, w, 16, {
    size: 11,
    color,
    bold: true,
    face: theme.mono,
    align: "center",
  });
}

export function topbar(slide, ctx, left = "PULSEOPS", right = "CMSI 694 | Final Capstone") {
  text(slide, ctx, left, 54, 40, 220, 24, { size: 20, bold: true, color: theme.teal, face: theme.mono });
  text(slide, ctx, right, 932, 42, 294, 20, { size: 11, color: theme.dim, align: "right", face: theme.mono });
}

export function panel(slide, ctx, x, y, w, h, opts = {}) {
  rect(slide, ctx, x, y, w, h, opts.fill ?? theme.panel, {
    radius: opts.radius ?? 22,
    lineColor: opts.lineColor ?? theme.line,
    lineWidth: opts.lineWidth ?? 1,
  });
  if (opts.accent) {
    rule(slide, ctx, x + 20, y + h - 16, opts.accentWidth ?? 90, opts.accent, 3);
  }
}

export function metricCard(slide, ctx, x, y, w, h, eyebrow, value, note, color = theme.teal) {
  panel(slide, ctx, x, y, w, h);
  label(slide, ctx, eyebrow, x + 22, y + 18, w - 44);
  text(slide, ctx, value, x + 22, y + 58, w - 44, 52, { size: 34, bold: true, color, face: theme.sans });
  body(slide, ctx, note, x + 22, y + 116, w - 44, 42, { size: 16 });
}

export function bulletList(slide, ctx, items, x, y, w, color = theme.blue, size = 16, rowGap = 36) {
  items.forEach((item, idx) => {
    rect(slide, ctx, x, y + idx * rowGap + 8, 8, 8, color, {
      geometry: "ellipse",
      radius: 4,
      line: ctx.line({ color, width: 0 }),
    });
    body(slide, ctx, item, x + 20, y + idx * rowGap, w - 20, 26, { size });
  });
}

export function sectionCard(slide, ctx, x, y, w, h, kicker, heading, lines, accent = theme.blue) {
  panel(slide, ctx, x, y, w, h, { accent });
  label(slide, ctx, kicker, x + 22, y + 18, w - 44);
  text(slide, ctx, heading, x + 22, y + 50, w - 44, 32, { size: 24, bold: true, color: theme.white });
  bulletList(slide, ctx, lines, x + 22, y + 98, w - 44, accent, 15, 32);
}

export function numberPill(slide, ctx, n, x, y, color) {
  rect(slide, ctx, x, y, 34, 34, color, {
    geometry: "ellipse",
    radius: 17,
    line: ctx.line({ color, width: 0 }),
  });
  text(slide, ctx, String(n), x, y + 8, 34, 14, { size: 12, bold: true, color: theme.ink, align: "center", face: theme.mono });
}

export function footer(slide, ctx, page, note = "PulseOps | Final Presentation") {
  rule(slide, ctx, 48, 682, 1184, theme.line, 1);
  text(slide, ctx, note, 48, 691, 600, 16, { size: 10, color: theme.dim, face: theme.mono });
  text(slide, ctx, String(page).padStart(2, "0"), 1192, 691, 40, 16, { size: 10, color: theme.dim, align: "right", face: theme.mono });
}
