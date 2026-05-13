import type { Preferences, StyleAnalysis } from "@/lib/schemas";

export function buildStyleOptionsPrompt(
  analysis: StyleAnalysis,
  preferences: Preferences,
) {
  return `You are an expert men's fashion stylist building trip outfits for a user. Based on the style analysis and preferences, create 24 creative but wearable outfit style options. The user wants vacation/trip outfits, not office formals. Make the options visually different from each other.

Use this user context:
Photo analysis: ${JSON.stringify(analysis, null, 2)}
Preferences: ${JSON.stringify(preferences, null, 2)}

Return strict JSON:
{
"styles": [
{
"id": "",
"title": "",
"vibe": "",
"bestFor": "",
"whyItFitsUser": "",
"items": [],
"colors": [],
"footwear": [],
"accessories": [],
"avoidIf": "",
"imagePromptHint": ""
}
]
}

Rules:
Use relaxed vacation styling.
Avoid repeating the same black night-out outfit.
Include creative categories like racing jersey, western modern, satin camp shirt, scarf print, silk bomber, utility shorts, crochet polo, retro windbreaker, skater casual, sneakerhead, old-money vacation, and desert resort.
Make color recommendations based on the analysis.
Prefer items that photograph well.
Keep the outfit practical and buyable.`;
}
