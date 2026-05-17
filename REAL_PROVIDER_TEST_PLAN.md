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

## Step 2.5: Test Mock Provider Lab

In development, or with:

```bash
SHOW_PROVIDER_TEST_LAB=true
ENABLE_PAID_IMAGE_GENERATION=false
AI_IMAGE_PROVIDER=mock
```

Open the dashboard and run the Real Provider Test Lab with `mock`. It should generate exactly one local demo image and show `$0` estimated cost.

Use the prompt selector before running:

- `v1-basic-look` for a plain baseline.
- `v2-full-body-fashion` for the default full-body framing test.
- `v3-strong-resemblance-safe` when testing with an uploaded reference image later.

If you are signed in and have run `supabase/migrations/202605150002_provider_test_runs.sql`, the run should appear in **Recent Test Runs**. If the migration is missing, the lab should still work and simply skip persisted history.

## Step 3: Prepare One-Image Paid Test

Only when ready:

```bash
NEXT_PUBLIC_MOCK_MODE=false
SHOW_PROVIDER_TEST_LAB=true
ENABLE_PAID_IMAGE_GENERATION=true
MAX_REAL_TEST_IMAGES=1
MAX_REAL_IMAGES_PER_BOARD=4
MAX_ESTIMATED_COST_PER_BOARD_USD=0.25
AI_TEXT_PROVIDER=mock
AI_IMAGE_PROVIDER=openai
OPENAI_API_KEY=...
```

Use the provider status panel on the dashboard and `GET /api/provider-status?imageCount=1` to confirm the estimate before testing.
OpenAI is the first implemented one-image real provider in the test lab. Gemini and fal remain guarded TODO providers and should return clear not-implemented errors.

## Step 4: Run One Image Test Lab

Open the dashboard and use **Real Provider Test Lab**. It is developer-only and calls `POST /api/provider-test/generate-one`.

Rules:

- Select exactly one provider.
- Select one reference look.
- Upload an optional reference image if needed.
- Check the explicit confirmation box.
- Generate exactly one image.
- Confirm the result metadata shows provider, model, estimated cost, image count, prompt summary, and whether a reference image was used.
- Review the result with the quality checklist.
- Save checklist notes for prompt tuning if provider test history is available.

Do not test the normal 4/8/12/16 board generator with real providers yet.

## Step 5: Inspect History, Quality, Cost, and Logs

Review:

- Provider status panel
- API response from `/api/provider-status?imageCount=1`
- Recent Test Runs in the lab
- Saved prompt version and prompt used
- Quality checklist notes
- Server logs
- Provider dashboard usage/cost logs

Stop immediately if estimated or real cost is higher than expected.

## Step 6: Disable Paid Generation

Return to safe defaults:

```bash
NEXT_PUBLIC_MOCK_MODE=true
SHOW_PROVIDER_TEST_LAB=false
AI_TEXT_PROVIDER=mock
AI_IMAGE_PROVIDER=mock
ENABLE_PAID_IMAGE_GENERATION=false
MAX_REAL_TEST_IMAGES=1
MAX_REAL_IMAGES_PER_BOARD=4
```

Run one mock board after disabling paid generation to confirm the app is back in free mode.
