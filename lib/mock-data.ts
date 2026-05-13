import type { StyleAnalysis, StyleCardData } from "@/lib/schemas";

export const mockAnalysis: StyleAnalysis = {
  visibleStyleProfile: {
    bodyFrame: "Lean to average visual frame; keep comments practical and fit-focused.",
    proportionNotes:
      "Straight-leg or softly tapered bottoms with slightly cropped hems should help keep outfits balanced in photos.",
    skinToneStylingNotes:
      "Warm neutrals, cream, olive, rust, mocha, indigo, and charcoal are strong styling directions.",
    currentOutfitNotes:
      "The current outfit reads casual, so vacation looks can build from relaxed silhouettes and stronger textures.",
    fitAdvice: [
      "Try relaxed camp collars, open overshirts, clean tanks or tees, and straight-leg pants.",
      "Use vertical lines, tonal layers, and cropped hems for a photo-friendly frame.",
    ],
    avoidAdvice: [
      "Avoid skinny pants or very long oversized tops if the goal is a sharper travel silhouette.",
      "Avoid overly formal officewear for this trip context.",
    ],
  },
  recommendedColorPalette: [
    "cream",
    "olive",
    "rust",
    "mocha",
    "indigo",
    "charcoal",
    "white",
    "sage",
  ],
  recommendedSilhouettes: [
    "relaxed camp shirt with straight-leg trousers",
    "cropped overshirt with utility shorts",
    "textured knit polo with clean denim",
    "light bomber with tapered travel pants",
  ],
  confidenceNotes:
    "Mock analysis for local development. In production, the model should note uncertainty when the photo does not show a full-body view.",
};

type StyleSeed = [
  string,
  string,
  string,
  string,
  string[],
  string[],
  string[],
  string[],
  string,
  string,
];

const styleSeeds: Array<Omit<StyleCardData, "id">> = ([
  ["Minimal Street", "Minimal street", "airport and daytime walking", "Clean proportions keep the outfit sharp without looking formal.", ["boxy white tee", "taupe straight-leg pants", "light overshirt"], ["white", "taupe", "charcoal"], ["minimal leather sneakers"], ["watch", "thin chain"], "You want loud graphics.", "clean neutral street outfit"],
  ["Vintage Graphic Street", "Vintage graphic streetwear", "casual night", "A faded print adds personality while relaxed pants keep the line easy.", ["vintage-style tee", "washed denim", "open camp shirt"], ["cream", "faded black", "indigo"], ["retro runners"], ["rings", "cap"], "You dislike graphic tees.", "vintage tee vacation streetwear"],
  ["Desert Resort", "Desert resort", "daytime walking and photos", "Airy layers and earth tones fit warm travel settings.", ["linen camp shirt", "tank", "pleated shorts"], ["sand", "olive", "cream"], ["suede sandals"], ["sunglasses", "woven belt"], "You need a colder-weather look.", "desert resort linen look"],
  ["Retro Bowling Shirt", "Retro bowling shirt", "dinner and strip walk", "The shirt creates a strong focal point without needing a suit.", ["contrast bowling shirt", "straight trousers", "ribbed tank"], ["rust", "cream", "brown"], ["loafers or sneakers"], ["watch", "chain"], "You prefer very minimal tops.", "retro bowling shirt outfit"],
  ["Crochet Texture", "Crochet/knit texture", "pool-to-dinner", "Texture photographs well and keeps the look vacation-forward.", ["crochet polo", "drawstring trousers", "tank"], ["cream", "sage", "mocha"], ["leather sandals"], ["sunglasses"], "You want machine-wash-only basics.", "crochet knit resort outfit"],
  ["Denim Casual", "Denim casual", "daytime walking", "Denim grounds brighter accessories and works across casual plans.", ["light denim overshirt", "white tee", "straight jeans"], ["indigo", "white", "tan"], ["canvas sneakers"], ["cap", "crossbody"], "You dislike denim-on-denim.", "clean denim vacation outfit"],
  ["Utility Vacation", "Utility vacation", "airport and long walking", "Pocket details feel practical while relaxed proportions stay polished.", ["utility overshirt", "nylon shorts", "breathable tee"], ["olive", "charcoal", "cream"], ["trail sneakers"], ["crossbody bag", "watch"], "You want dressier dinner style.", "utility travel outfit"],
  ["Racing Jersey", "Racing jersey", "club-adjacent casual night", "A generic racing graphic gives movement and color without real logos.", ["generic racing jersey", "black relaxed pants", "white tee"], ["red", "cream", "charcoal"], ["chunky sneakers"], ["rings", "sunglasses"], "You dislike sporty pieces.", "generic racing jersey streetwear"],
  ["Western Modern", "Western modern", "Vegas photoshoot", "Western details feel location-aware when balanced with clean trousers.", ["embroidered short-sleeve shirt", "straight pants", "suede belt"], ["cream", "brown", "rust"], ["western-inspired boots"], ["silver jewelry"], "You do not want boots.", "modern western Vegas outfit"],
  ["Varsity Casual", "Varsity casual", "casual night", "A lightweight varsity layer adds structure over relaxed basics.", ["light varsity jacket", "plain tee", "cropped chinos"], ["cream", "green", "navy"], ["retro sneakers"], ["cap", "watch"], "It is too hot for layers.", "vacation varsity casual outfit"],
  ["Silk Bomber Clean", "Silk bomber clean", "dinner and lounge", "A sheen layer upgrades the outfit while staying relaxed.", ["silk-look bomber", "knit tee", "pleated pants"], ["charcoal", "mocha", "cream"], ["sleek sneakers"], ["watch", "chain"], "You want beach-only clothes.", "clean silk bomber vacation outfit"],
  ["Ombre Resort", "Ombre resort", "pool and photos", "Soft color fade creates an easy hero piece for a board.", ["ombre camp shirt", "linen shorts", "tank"], ["sage", "cream", "teal"], ["sandals"], ["sunglasses"], "You prefer no color gradients.", "ombre resort camp shirt outfit"],
  ["Scarf-Print Statement", "Scarf-print statement", "dinner and club", "A scarf print brings Vegas energy without needing heavy layers.", ["scarf-print shirt", "black straight pants", "tank"], ["gold", "cream", "charcoal"], ["loafers"], ["rings", "watch"], "You dislike statement prints.", "scarf print vacation shirt outfit"],
  ["Satin Camp Shirt", "Satin camp shirt", "Vegas night", "Subtle shine reads elevated in night photos without formalwear.", ["satin camp shirt", "wide straight trousers", "clean tank"], ["mocha", "cream", "black"], ["loafers or sleek sneakers"], ["chain", "watch"], "You want matte fabrics only.", "satin camp shirt night outfit"],
  ["Cutwork Cuban", "Cutwork Cuban", "resort dinner", "Open texture adds depth while the Cuban collar frames the upper body.", ["cutwork Cuban shirt", "linen trousers", "tank"], ["white", "olive", "tan"], ["huarache sandals"], ["sunglasses"], "You dislike breathable open textures.", "cutwork Cuban shirt outfit"],
  ["Short-Sleeve Hoodie", "Short-sleeve hoodie", "airport comfort", "A short-sleeve layer keeps comfort but avoids bulky proportions.", ["short-sleeve hoodie", "tapered travel pants", "tee"], ["charcoal", "sage", "white"], ["comfortable sneakers"], ["crossbody"], "You want a dressier look.", "short sleeve hoodie travel fit"],
  ["Old-Money Vacation", "Old-money vacation but not formal", "lunch and dinner", "Soft tailoring and knits feel polished without office energy.", ["knit polo", "pleated linen pants", "suede belt"], ["cream", "navy", "brown"], ["loafers"], ["watch", "sunglasses"], "You dislike preppy styling.", "old money vacation knit polo"],
  ["Skater Casual", "Skater casual", "daytime walking", "Roomy shorts and clean sneakers make it relaxed and youthful.", ["workwear tee", "baggy-but-clean shorts", "open overshirt"], ["olive", "white", "denim"], ["skate shoes"], ["cap", "rings"], "You want a sharper dinner outfit.", "skater vacation casual outfit"],
  ["Sneakerhead Fit", "Sneakerhead fit", "photoshoot and casual night", "Keeps the shoes as the focal point while the clothes stay balanced.", ["cropped tee", "relaxed cargos", "statement sneakers"], ["cream", "charcoal", "accent color"], ["statement sneakers"], ["chain", "watch"], "You want discreet footwear.", "sneakerhead vacation outfit"],
  ["Earth-Tone Monochrome", "Earth-tone monochrome", "day to night", "Tonal dressing elongates the outfit and photographs cleanly.", ["mocha overshirt", "brown tee", "taupe pants"], ["mocha", "brown", "taupe"], ["sand sneakers"], ["watch"], "You prefer bright contrast.", "earth tone monochrome outfit"],
  ["Pool-to-Strip", "Pool-to-strip casual", "pool and casual night", "Swim-ready pieces can be styled with a better shirt and accessories.", ["resort shirt", "tailored swim shorts", "tank"], ["olive", "cream", "rust"], ["slides or sandals"], ["sunglasses", "bracelet"], "You need closed-toe only.", "pool to strip casual outfit"],
  ["Airport Comfort", "Airport comfort fit", "airport", "Soft layers and tapered pants keep travel comfortable without sloppiness.", ["lightweight jacket", "premium tee", "tapered jogger-trousers"], ["charcoal", "cream", "sage"], ["cushioned sneakers"], ["crossbody", "cap"], "You want no athleisure.", "airport comfort travel outfit"],
  ["Night Market", "Night market casual", "casual night", "Pattern and utility details work well for walking and photos.", ["printed camp shirt", "utility pants", "tank"], ["indigo", "cream", "olive"], ["retro runners"], ["watch", "sunglasses"], "You dislike prints.", "night market casual vacation outfit"],
  ["Photo-Friendly Vegas", "Photo-friendly Vegas fit", "photoshoot and dinner", "Balanced shine, texture, and warm neutrals give the board a standout final look.", ["textured camp shirt", "pleated trousers", "clean tank"], ["cream", "rust", "charcoal"], ["loafers"], ["chain", "rings", "watch"], "You want extremely casual only.", "photo friendly Vegas outfit"],
  ] as StyleSeed[]).map(([title, vibe, bestFor, whyItFitsUser, items, colors, footwear, accessories, avoidIf, imagePromptHint]) => ({
  title,
  vibe,
  bestFor,
  whyItFitsUser,
  items,
  colors,
  footwear,
  accessories,
  avoidIf,
  imagePromptHint,
}));

export const mockStyleCards: StyleCardData[] = styleSeeds.map((style, index) => ({
  ...style,
  id: `style-${index + 1}`,
}));

export const mockBoardDataUrl =
  "data:image/svg+xml;base64," +
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><rect width="1024" height="1024" fill="#f8f3ea"/><text x="64" y="92" font-family="Arial" font-size="48" font-weight="700" fill="#123d52">StyleTrip AI</text><text x="64" y="136" font-family="Arial" font-size="24" fill="#51616b">Mock 1:1 AI outfit inspiration board</text><g font-family="Arial">${Array.from({ length: 12 }).map((_, i) => { const col = i % 4; const row = Math.floor(i / 4); const x = 64 + col * 230; const y = 180 + row * 245; return `<rect x="${x}" y="${y}" width="190" height="200" rx="8" fill="${i % 2 ? "#dfe9df" : "#eadccb"}" stroke="#c5b9a8"/><text x="${x + 18}" y="${y + 38}" font-size="28" font-weight="700" fill="#16394a">${i + 1}</text><text x="${x + 18}" y="${y + 76}" font-size="18" font-weight="700" fill="#16394a">Outfit ${i + 1}</text><text x="${x + 18}" y="${y + 110}" font-size="14" fill="#43515a">camp shirt</text><text x="${x + 18}" y="${y + 132}" font-size="14" fill="#43515a">straight pants</text><text x="${x + 18}" y="${y + 154}" font-size="14" fill="#43515a">clean sneakers</text>`; }).join("")}</g><rect x="64" y="920" width="896" height="48" rx="8" fill="#123d52"/><text x="88" y="952" font-family="Arial" font-size="18" fill="#fff">Best colors: cream, olive, rust, mocha, indigo | Accessories: sunglasses, watch, chain, crossbody</text></svg>`,
  ).toString("base64");
