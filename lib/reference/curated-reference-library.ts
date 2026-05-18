import { existsSync } from "node:fs";
import { join } from "node:path";
import type { StyleCardData } from "@/lib/schemas";

type CuratedPhotoAsset = {
  file: string;
  tags: string[];
};

const curatedPhotoAssets: CuratedPhotoAsset[] = [
  { file: "denim-casual.webp", tags: ["denim", "casual", "white tee", "street"] },
  { file: "minimal-street.webp", tags: ["minimal", "street", "neutral", "sneakers"] },
  { file: "desert-resort.webp", tags: ["desert", "resort", "linen", "camp"] },
  { file: "utility-vacation.webp", tags: ["utility", "travel", "airport", "walking"] },
  { file: "racing-jersey.webp", tags: ["racing", "sport", "night", "streetwear"] },
  { file: "retro-bowling.webp", tags: ["bowling", "retro", "dinner", "night"] },
  { file: "crochet-knit.webp", tags: ["crochet", "knit", "texture", "resort"] },
  { file: "linen-relaxed.webp", tags: ["linen", "relaxed", "summer", "resort"] },
  { file: "neutral-monochrome.webp", tags: ["neutral", "monochrome", "minimal", "mocha"] },
  { file: "bold-pattern.webp", tags: ["pattern", "print", "statement", "night"] },
  { file: "varsity-casual.webp", tags: ["varsity", "casual", "street", "sneakers"] },
  { file: "camp-collar-print.webp", tags: ["camp", "collar", "print", "resort"] },
];
type CuratedReferenceTheme = {
  key: string;
  background: string;
  card: string;
  ink: string;
  skin: string;
  top: string;
  topAlt: string;
  bottom: string;
  shoe: string;
  accent: string;
  pattern: "minimal" | "denim" | "linen" | "stripe" | "knit" | "utility" | "racing" | "varsity" | "print";
};

const themes: CuratedReferenceTheme[] = [
  {
    key: "minimal",
    background: "#edf1ed",
    card: "#fffaf2",
    ink: "#183544",
    skin: "#b9815d",
    top: "#f8f4ea",
    topAlt: "#d8d1c4",
    bottom: "#7b756a",
    shoe: "#24282d",
    accent: "#9aa88f",
    pattern: "minimal",
  },
  {
    key: "denim",
    background: "#e9eef3",
    card: "#f9fbfb",
    ink: "#172f45",
    skin: "#a97050",
    top: "#f8f6ef",
    topAlt: "#8fb0c8",
    bottom: "#2f5d88",
    shoe: "#f1efe8",
    accent: "#c69255",
    pattern: "denim",
  },
  {
    key: "resort",
    background: "#f6efe3",
    card: "#fffaf0",
    ink: "#344334",
    skin: "#c08a64",
    top: "#efe1bd",
    topAlt: "#f8f2dd",
    bottom: "#a77849",
    shoe: "#76533b",
    accent: "#78906b",
    pattern: "linen",
  },
  {
    key: "bowling",
    background: "#f4e8df",
    card: "#fffaf2",
    ink: "#352c2a",
    skin: "#b77956",
    top: "#943f35",
    topAlt: "#f4e7c7",
    bottom: "#2d3030",
    shoe: "#251e1b",
    accent: "#d29b62",
    pattern: "stripe",
  },
  {
    key: "knit",
    background: "#edf0e6",
    card: "#fffaf2",
    ink: "#394232",
    skin: "#ad7654",
    top: "#e8dfbf",
    topAlt: "#b8c19d",
    bottom: "#8d7661",
    shoe: "#6c4f3d",
    accent: "#b3a273",
    pattern: "knit",
  },
  {
    key: "utility",
    background: "#e7ece6",
    card: "#fbfaf2",
    ink: "#24352f",
    skin: "#bf815d",
    top: "#667a59",
    topAlt: "#d9dfc8",
    bottom: "#303b35",
    shoe: "#27302d",
    accent: "#b9a66d",
    pattern: "utility",
  },
  {
    key: "racing",
    background: "#eceff2",
    card: "#fffaf4",
    ink: "#202b36",
    skin: "#b97856",
    top: "#d64a3a",
    topAlt: "#f7efe2",
    bottom: "#20232a",
    shoe: "#f4f0e7",
    accent: "#1f4e72",
    pattern: "racing",
  },
  {
    key: "varsity",
    background: "#eef1e9",
    card: "#fffaf3",
    ink: "#1b3141",
    skin: "#b8795b",
    top: "#1e5d46",
    topAlt: "#f3efe4",
    bottom: "#d4c6a8",
    shoe: "#27333d",
    accent: "#d2a34e",
    pattern: "varsity",
  },
  {
    key: "pattern",
    background: "#f0e9e7",
    card: "#fffaf3",
    ink: "#332b33",
    skin: "#ba7d59",
    top: "#d2aa4a",
    topAlt: "#4e5368",
    bottom: "#2c3036",
    shoe: "#24272b",
    accent: "#9c4f44",
    pattern: "print",
  },
];

export function getCuratedReferenceImage(style: StyleCardData, index: number, fit: string) {
  const theme = getTheme(style, index);
  return svgDataUrl(buildReferenceSvg(style, index, fit, theme));
}

function getCuratedPhotoAsset(style: StyleCardData, index: number) {
  const root = join(process.cwd(), "public", "reference-looks");
  const text = `${style.title} ${style.vibe} ${style.bestFor} ${style.items.join(" ")} ${style.colors.join(" ")} ${style.imagePromptHint}`.toLowerCase();
  const ranked = curatedPhotoAssets
    .map((asset, assetIndex) => ({
      asset,
      assetIndex,
      score: asset.tags.reduce((sum, tag) => sum + (text.includes(tag) ? 1 : 0), 0),
    }))
    .sort((first, second) => second.score - first.score || first.assetIndex - second.assetIndex);
  const preferred = ranked.find((item) => item.score > 0)?.asset ?? curatedPhotoAssets[index % curatedPhotoAssets.length];
  if (!preferred) {
    return null;
  }
  const absolutePath = join(root, preferred.file);
  return existsSync(absolutePath) ? `/reference-looks/${preferred.file}` : null;
}
function getTheme(style: StyleCardData, index: number) {
  const text = `${style.title} ${style.vibe} ${style.imagePromptHint}`.toLowerCase();
  const selected =
    themes.find((theme) => text.includes(theme.key)) ??
    (text.includes("crochet") || text.includes("knit") ? themes.find((theme) => theme.key === "knit") : undefined) ??
    (text.includes("resort") || text.includes("linen") || text.includes("desert") ? themes.find((theme) => theme.key === "resort") : undefined) ??
    (text.includes("racing") ? themes.find((theme) => theme.key === "racing") : undefined) ??
    (text.includes("utility") ? themes.find((theme) => theme.key === "utility") : undefined) ??
    (text.includes("bowling") ? themes.find((theme) => theme.key === "bowling") : undefined) ??
    (text.includes("varsity") ? themes.find((theme) => theme.key === "varsity") : undefined) ??
    (text.includes("print") || text.includes("graphic") ? themes.find((theme) => theme.key === "pattern") : undefined);

  return selected ?? themes[index % themes.length];
}

function svgDataUrl(svg: string) {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function escapeSvg(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildReferenceSvg(
  style: StyleCardData,
  index: number,
  fit: string,
  theme: CuratedReferenceTheme,
) {
  const title = escapeSvg(style.title);
  const itemOne = escapeSvg(style.items[0] ?? "relaxed top");
  const itemTwo = escapeSvg(style.items[1] ?? "easy pants");
  const itemThree = escapeSvg(style.items[2] ?? "clean shoes");
  const poseShift = index % 2 === 0 ? -18 : 18;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="1200" viewBox="0 0 960 1200">
    <defs>
      <linearGradient id="backdrop" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="${theme.background}"/>
        <stop offset="1" stop-color="${theme.card}"/>
      </linearGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#1e2b31" flood-opacity="0.16"/>
      </filter>
    </defs>
    <rect width="960" height="1200" fill="url(#backdrop)"/>
    <rect x="82" y="72" width="796" height="1056" rx="34" fill="${theme.card}" stroke="#d2c3ad" stroke-width="3"/>
    <rect x="136" y="136" width="688" height="754" rx="30" fill="${theme.background}"/>
    <path d="M182 820c110-58 215-86 315-86 105 0 203 27 294 80v76H182z" fill="${theme.accent}" opacity="0.18"/>
    <g filter="url(#shadow)" transform="translate(${poseShift} 0)">
      <ellipse cx="498" cy="858" rx="196" ry="30" fill="#1c2529" opacity="0.18"/>
      <circle cx="480" cy="246" r="62" fill="${theme.skin}"/>
      <path d="M430 216c18-44 90-45 112-4 12 22 8 48-2 64-16-24-46-37-88-36-10 0-18-8-22-24z" fill="${theme.ink}"/>
      <rect x="445" y="300" width="70" height="58" rx="24" fill="${theme.skin}"/>
      ${buildTop(theme)}
      ${buildPattern(theme)}
      <path d="M386 382c-62 48-92 116-96 207l72 19c12-75 38-130 78-166z" fill="${theme.topAlt}"/>
      <path d="M574 382c62 48 92 116 96 207l-72 19c-12-75-38-130-78-166z" fill="${theme.topAlt}"/>
      <path d="M406 642h116l-18 288h-92z" fill="${theme.bottom}"/>
      <path d="M542 642h112l-4 288h-91z" fill="${theme.bottom}"/>
      <path d="M390 924h130v40H360c-3-24 8-37 30-40z" fill="${theme.shoe}"/>
      <path d="M540 924h130c23 3 34 16 31 40H540z" fill="${theme.shoe}"/>
      <path d="M398 642h254" stroke="${theme.ink}" stroke-width="8" opacity="0.22"/>
    </g>
    <rect x="136" y="910" width="688" height="1.5" fill="#d2c3ad"/>
    <text x="136" y="970" font-family="Arial, sans-serif" font-size="36" font-weight="700" fill="${theme.ink}">${title}</text>
    <text x="136" y="1018" font-family="Arial, sans-serif" font-size="23" fill="#59666b">${escapeSvg(fit)} fit reference</text>
    <text x="136" y="1072" font-family="Arial, sans-serif" font-size="24" fill="${theme.ink}">${itemOne} / ${itemTwo}</text>
    <text x="136" y="1108" font-family="Arial, sans-serif" font-size="24" fill="${theme.ink}">${itemThree}</text>
  </svg>`;
}

function buildTop(theme: CuratedReferenceTheme) {
  if (theme.pattern === "linen") {
    return `<path d="M380 350h200c38 52 52 154 42 292H338c-8-126 5-224 42-292z" fill="${theme.top}"/>
      <path d="M480 352l-46 138h92z" fill="${theme.card}" opacity="0.9"/>
      <path d="M380 350c32 42 64 68 100 78 38-10 72-36 100-78" fill="none" stroke="${theme.ink}" stroke-width="8" opacity="0.22"/>`;
  }

  return `<path d="M378 350h204c42 54 58 154 42 292H336c-16-138 0-238 42-292z" fill="${theme.top}"/>
    <path d="M450 350h60l-20 292h-40z" fill="${theme.topAlt}" opacity="0.92"/>
    <path d="M380 350c30 38 64 62 100 72 36-10 70-34 102-72" fill="none" stroke="${theme.ink}" stroke-width="8" opacity="0.18"/>`;
}

function buildPattern(theme: CuratedReferenceTheme) {
  if (theme.pattern === "stripe") {
    return `<g opacity="0.95"><rect x="398" y="392" width="34" height="230" fill="${theme.topAlt}"/><rect x="528" y="392" width="34" height="230" fill="${theme.topAlt}"/></g>`;
  }
  if (theme.pattern === "denim") {
    return `<g fill="none" stroke="${theme.accent}" stroke-width="4" opacity="0.35"><path d="M352 694h148M556 694h84"/><path d="M430 650v278M584 650v278"/></g>`;
  }
  if (theme.pattern === "knit") {
    return `<g fill="none" stroke="${theme.accent}" stroke-width="5" opacity="0.4">${Array.from({ length: 7 }).map((_, i) => `<path d="M368 ${394 + i * 32}c32 24 64 24 96 0s64-24 96 0 48 24 72 8"/>`).join("")}</g>`;
  }
  if (theme.pattern === "utility") {
    return `<g fill="${theme.topAlt}" opacity="0.65"><rect x="382" y="450" width="62" height="58" rx="8"/><rect x="520" y="450" width="62" height="58" rx="8"/><rect x="580" y="720" width="54" height="66" rx="8"/></g>`;
  }
  if (theme.pattern === "racing") {
    return `<g><path d="M386 418h226v62H386z" fill="${theme.topAlt}"/><text x="498" y="520" text-anchor="middle" font-family="Arial" font-size="74" font-weight="700" fill="${theme.topAlt}">${"0"}</text><path d="M378 570h244" stroke="${theme.accent}" stroke-width="18"/></g>`;
  }
  if (theme.pattern === "varsity") {
    return `<g><path d="M378 390h204" stroke="${theme.topAlt}" stroke-width="32"/><text x="480" y="532" text-anchor="middle" font-family="Arial" font-size="88" font-weight="700" fill="${theme.topAlt}">S</text></g>`;
  }
  if (theme.pattern === "print") {
    return `<g fill="${theme.topAlt}" opacity="0.75">${Array.from({ length: 12 }).map((_, i) => `<circle cx="${390 + (i % 4) * 58}" cy="${410 + Math.floor(i / 4) * 62}" r="${14 + (i % 3) * 5}"/>`).join("")}</g>`;
  }
  return `<path d="M382 612h240" stroke="${theme.accent}" stroke-width="18" opacity="0.35"/>`;
}
