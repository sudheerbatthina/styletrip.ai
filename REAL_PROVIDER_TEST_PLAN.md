# Real Provider Test Plan

This app is mock-first. Do not enable paid providers until the free workflow is stable.

## Step 1: Test Curated Mode

Use:

```bash
NEXT_PUBLIC_MOCK_MODE=true
REFERENCE_IMAGE_PROVIDER=curated
AI_TEXT_PROVIDER=mock
AI_IMAGE_PROVIDER=mock
ENABLE_PAID_IMAGE_GENERATION=false
```

Run the full flow: upload, preferences, discover looks, select looks, generate mock board, save, download, dashboard detail, delete.

## Step 2: Test Reference Providers Only

Keep image generation disabled:

```bash
ENABLE_PAID_IMAGE_GENERATION=false
AI_IMAGE_PROVIDER=mock
```

Then test one reference provider at a time:

```bash
REFERENCE_IMAGE_PROVIDER=pexels
PEXELS_API_KEY=...
```

or:

```bash
REFERENCE_IMAGE_PROVIDER=unsplash
UNSPLASH_ACCESS_KEY=...
```

If the provider fails or has too few results, the app should fall back to curated references.

## Step 3: Prepare One-Image Paid Test

Only when ready:

```bash
NEXT_PUBLIC_MOCK_MODE=false
ENABLE_PAID_IMAGE_GENERATION=true
MAX_REAL_IMAGES_PER_BOARD=1
MAX_ESTIMATED_COST_PER_BOARD_USD=0.25
AI_TEXT_PROVIDER=mock
AI_IMAGE_PROVIDER=openai
```

Use the provider status panel on the dashboard and `GET /api/provider-status?imageCount=1` to confirm the estimate before testing.

## Step 4: Run One Image Test

Select exactly one look if the UI supports a one-image test path later. If the current UI requires four looks, do not run real generation yet. Keep using mock mode until a dedicated one-image test harness exists.

## Step 5: Inspect Cost and Logs

Review:

- Provider status panel
- API response from `/api/provider-status?imageCount=1`
- Server logs
- Provider dashboard usage/cost logs

Stop immediately if estimated or real cost is higher than expected.

## Step 6: Disable Paid Generation

Return to safe defaults:

```bash
NEXT_PUBLIC_MOCK_MODE=true
AI_TEXT_PROVIDER=mock
AI_IMAGE_PROVIDER=mock
ENABLE_PAID_IMAGE_GENERATION=false
MAX_REAL_IMAGES_PER_BOARD=4
```

Run one mock board after disabling paid generation to confirm the app is back in free mode.
