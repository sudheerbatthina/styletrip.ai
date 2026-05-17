# StyleTrip AI

StyleTrip AI is a saved-board web app for travel outfit inspiration. Users can sign up with email/password, create AI outfit boards from a full-body photo and trip preferences, save generated boards, revisit them from a dashboard, download them, and delete them.

The app keeps mock-mode generation working, so UI development does not require OpenAI, paid image generation, or Supabase.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn-style local UI primitives
- lucide-react
- React Hook Form
- Zod validation
- Provider router skeleton for mock, OpenAI, Gemini, and fal
- Supabase Auth, Postgres, and Storage
- Frontend-rendered fashion boards exported as PNG

## Board Generation Strategy

The user-facing workflow is visual-first:

1. User uploads a photo and answers simple trip/style questions.
2. The app analyzes styling cues and creates an internal style plan.
3. The app shows visual reference look cards, not a wall of fashion labels.
4. The user selects looks they like or marks a look as not their style.
5. "Not my style" feedback downranks similar cards and can surface a replacement from the curated/reference pool.
6. Only after look selection does the app generate personalized/mock outfit panels.
7. The frontend renders the final fashion board with React/CSS and real text.

The app does not rely on AI to generate the full final collage with readable text. Outfit titles, occasions, item lists, colors/fit, and labels are frontend text. This gives cleaner typography, better layout control, and reliable support for `1:1`, `4:5`, and `16:9`.

For MVP, mock mode uses local curated SVG reference illustrations, deterministic match scoring, and mock outfit images. No paid APIs are called by default. Real curated/stock/catalog reference providers, AI scoring, provider routing, and paid personalized image providers are future integration points.

## Feedback and Ranking

The Pick Looks step keeps a lightweight feedback state in `preferences.referenceFeedback`. It tracks selected, deselected, not-my-style, generated, saved, downloaded, and refresh-count signals.

In mock/curated mode, feedback is used locally:

- Selected looks stay pinned near the top during refresh.
- "Not my style" deselects the card, mutes it, reduces its match score, moves it down, and tries to replace it with an unshown curated/reference look.
- "Refresh Looks" re-ranks the current pool using feedback without calling OpenAI, Gemini, fal, Runware, Pexels, Unsplash, or any paid provider.
- Disliked styles, favorite colors, preferred fit, selected occasions, and style-analysis palette still affect deterministic match scores.

When Supabase is configured and the user is logged in, `/api/style-feedback` can persist and load individual feedback events from the optional `style_feedback` table. The app derives a compact Style Memory from those rows: liked/disliked titles, colors, fits, occasions, plus selected/rejected/saved/downloaded counts. Future reference discovery uses that memory to boost similar selected/saved/downloaded looks and downrank patterns marked "Not my style."

The Dashboard includes a compact Style Memory card with liked colors, disliked colors, liked fits, disliked fits, recent selected styles, recent rejected styles, and a reset button. Reset deletes the current user's `style_feedback` rows after confirmation. If the migration has not been run, the app gracefully keeps local-only feedback and still allows board creation.

## Routes

- `/` landing page
- `/login` and `/signup`
- `/logout`
- `/dashboard` saved boards
- `/boards/new` board creation flow
- `/boards/[id]` saved board detail

## Environment Variables

Create `.env.local` from `.env.example`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
GEMINI_API_KEY=
FAL_KEY=
OPENAI_TEXT_MODEL=
OPENAI_IMAGE_MODEL=
NEXT_PUBLIC_MOCK_MODE=true
NEXT_PUBLIC_APP_URL=http://localhost:3000
SHOW_PROVIDER_TEST_LAB=false
AI_TEXT_PROVIDER=mock
AI_IMAGE_PROVIDER=mock
AI_IMAGE_FALLBACK_PROVIDER=
ENABLE_PAID_IMAGE_GENERATION=false
MAX_REAL_IMAGES_PER_BOARD=4
MAX_REAL_TEST_IMAGES=1
MAX_ESTIMATED_COST_PER_BOARD_USD=0.25
OPENAI_EST_IMAGE_COST_PER_IMAGE_USD=0.04
GEMINI_EST_IMAGE_COST_PER_IMAGE_USD=0.04
FAL_EST_IMAGE_COST_PER_IMAGE_USD=0.01
TEXT_EST_COST_PER_REQUEST_USD=0.005
REFERENCE_IMAGE_PROVIDER=curated
PEXELS_API_KEY=
UNSPLASH_ACCESS_KEY=
REFERENCE_PROVIDER_MAX_RESULTS=24
REFERENCE_PROVIDER_CACHE_ENABLED=true
```

Provider names are read from env. Keep `AI_TEXT_PROVIDER=mock` and `AI_IMAGE_PROVIDER=mock` for local development. OpenAI, Gemini, and fal provider files are present as disabled TODO stubs. Paid image generation is blocked unless `ENABLE_PAID_IMAGE_GENERATION=true`, provider keys are configured, and future cost confirmation UX is enabled.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Useful checks:

```bash
npm run lint
npm run typecheck
npm run build
```

## Mock Mode

Set:

```bash
NEXT_PUBLIC_MOCK_MODE=true
```

Mock mode returns sample photo analysis, an internal style plan, ranked visual reference look cards with match scores, a $0 cost estimate card, and mock generated outfit images without calling OpenAI, Gemini, fal, Runware, or paid image-generation providers. The final board is still rendered in the frontend. If Supabase is configured, mock-generated boards can be saved to the database and storage after login. If Supabase is not configured, the builder still works but saved boards/auth are disabled with visible warnings.

Real providers are intentionally disabled for now. Keep local development on:

```bash
NEXT_PUBLIC_MOCK_MODE=true
AI_TEXT_PROVIDER=mock
AI_IMAGE_PROVIDER=mock
ENABLE_PAID_IMAGE_GENERATION=false
```

## Reference Image Providers

`REFERENCE_IMAGE_PROVIDER=curated` is the default and uses local StyleTrip demo illustrations. This path is free, works offline, and does not call external image APIs.

Optional future providers:

```bash
REFERENCE_IMAGE_PROVIDER=pexels
PEXELS_API_KEY=...
```

```bash
REFERENCE_IMAGE_PROVIDER=unsplash
UNSPLASH_ACCESS_KEY=...
```

Pexels and Unsplash modules normalize results into the same reference look schema, including image URL, source URL, photographer, and attribution text. If a provider key is missing, the provider is disabled. If an external request fails or returns too few results, the app falls back to curated local references.

Google Images scraping is intentionally not supported because it is unreliable for licensing, attribution, and terms compliance. Future production reference sources should be licensed stock APIs, curated owned libraries, or retailer/product feeds with clear attribution rules.

External providers are for visual reference discovery only. They are not try-on, resemblance, or paid AI image-generation providers. Reference cards show source badges and attribution links when stock provider metadata is available. The app caches reference-provider results in memory when `REFERENCE_PROVIDER_CACHE_ENABLED=true`; cache keys include provider/query/preference hashes and never store API keys.

To test Pexels references:

```bash
REFERENCE_IMAGE_PROVIDER=pexels
PEXELS_API_KEY=...
REFERENCE_PROVIDER_MAX_RESULTS=24
REFERENCE_PROVIDER_CACHE_ENABLED=true
REFERENCE_PROVIDER_TIMEOUT_MS=8000
```

To test Unsplash references:

```bash
REFERENCE_IMAGE_PROVIDER=unsplash
UNSPLASH_ACCESS_KEY=...
REFERENCE_PROVIDER_MAX_RESULTS=24
REFERENCE_PROVIDER_CACHE_ENABLED=true
REFERENCE_PROVIDER_TIMEOUT_MS=8000
```

Leave `AI_IMAGE_PROVIDER=mock` and `ENABLE_PAID_IMAGE_GENERATION=false`; these stock reference providers do not generate personalized images.
## Provider and Cost Guard

Current defaults are intentionally demo-safe:

```bash
NEXT_PUBLIC_MOCK_MODE=true
AI_TEXT_PROVIDER=mock
AI_IMAGE_PROVIDER=mock
AI_IMAGE_FALLBACK_PROVIDER=
ENABLE_PAID_IMAGE_GENERATION=false
MAX_REAL_IMAGES_PER_BOARD=4
MAX_REAL_TEST_IMAGES=1
MAX_ESTIMATED_COST_PER_BOARD_USD=0.25
REFERENCE_IMAGE_PROVIDER=curated
PEXELS_API_KEY=
UNSPLASH_ACCESS_KEY=
REFERENCE_PROVIDER_MAX_RESULTS=24
REFERENCE_PROVIDER_CACHE_ENABLED=true
REFERENCE_PROVIDER_TIMEOUT_MS=8000
```

The active routes use mock responses unless providers are explicitly enabled later. Real providers should stay behind selection, consent, pricing, and confirmation checks.

`GET /api/provider-status` returns safe public provider/cost status for the dashboard dev panel. It never returns API keys. The Generate step uses the same estimator shape:

- `mock`: `$0`, no paid APIs called.
- `blocked`: paid generation disabled, over limit, or otherwise unavailable.
- `estimate`: paid generation is enabled and within configured limits; user confirmation is required before generation.

For first real-provider testing later, set `MAX_REAL_IMAGES_PER_BOARD=1` and keep `MAX_ESTIMATED_COST_PER_BOARD_USD` low. Turn paid generation off again with `ENABLE_PAID_IMAGE_GENERATION=false`.

The developer-only Real Provider Test Lab is hidden by default in production. It appears in development or when `SHOW_PROVIDER_TEST_LAB=true`. It calls only `POST /api/provider-test/generate-one`, which is hard-limited to exactly one image and requires explicit confirmation. The normal board generator should not be used for real 4/8/12/16 image tests yet.

The first implemented real provider for the test lab is OpenAI via the installed official `openai` SDK. Gemini and fal remain guarded TODO adapters and return clear not-implemented errors. OpenAI still runs only when `SHOW_PROVIDER_TEST_LAB=true`, `ENABLE_PAID_IMAGE_GENERATION=true`, `MAX_REAL_TEST_IMAGES=1`, `OPENAI_API_KEY` exists, the estimate is within `MAX_ESTIMATED_COST_PER_BOARD_USD`, and the user explicitly confirms the one-image test.

The test lab supports prompt versioning and manual quality review:

- `v1-basic-look`: simple outfit inspiration baseline.
- `v2-full-body-fashion`: default full-body framing and outfit visibility.
- `v3-strong-resemblance-safe`: stronger resemblance guidance when a reference image is provided.

When the optional `provider_test_runs` migration is applied, signed-in users get recent test history in the lab. Each run stores provider, model, status, selected reference look JSON, prompt version, prompt used, estimated cost, image count, output image path/URL when storage succeeds, error message, and metadata. Generated test images are saved to the private `generated-outfits` bucket under `{user_id}/provider-tests/{run_id}.*` when Storage is configured. If the migration or Storage bucket is missing, the lab still works and reports that history/storage was skipped.

After a result appears, use the manual checklist to mark Pass or Needs work, note issues such as cropped body, weak resemblance, outfit mismatch, overly formal styling, or artifacts, and save that quality metadata back to the test run when available. The checklist only records feedback; it never regenerates automatically.
Saved-look provider testing:

- The Provider Test Lab can load recent saved boards and their selected reference looks.
- Saved board source photos are offered as optional resemblance/reference inputs when available.
- Saved board detail pages show a developer-only **Test this look in Provider Lab** action when the lab is visible.
- Test run details are available at `/dashboard/provider-test/runs/[id]` with image, provider/model/status, prompt version, selected look, prompt used, quality checklist, tuning notes, and safe metadata.
- This still does not connect real providers to the normal 4/8/12/16 board generator.
## Setup Health

Open `/dashboard/setup-health` or use the compact Setup Health card on the dashboard before any real-provider test. The check is read-only and returns only safe booleans/messages from `GET /api/setup-health`; it never exposes API keys or raw secrets.

Setup Health checks:

- Supabase URL, anon key, and server-side service role key presence.
- Auth session status for the current request.
- Required private Storage buckets: `user-photos`, `generated-outfits`, and `generated-boards`.
- Required tables: `profiles`, `user_photos`, `boards`, `board_images`, `generations`, `style_feedback`, and `provider_test_runs`.
- Migration checklist inferred from table existence.
- Reference provider status and key presence booleans.
- Provider Test Lab visibility, paid-generation flag, OpenAI/Gemini/fal key booleans, max real test images, cost limit, and normal board-generation guard status.

The final summary, **Safe to test one real image**, should be `yes` only when the Provider Test Lab is visible, paid generation is intentionally enabled, `MAX_REAL_TEST_IMAGES=1`, `OPENAI_API_KEY` is configured, `generated-outfits` exists, `provider_test_runs` exists, a cost limit is configured, and normal board generation remains protected. If any item is missing, Setup Health lists the suggested fix.
## Supabase Setup

1. Create a Supabase project.
2. Copy the project URL and anon key into `.env.local`.
3. Copy the service role key into `.env.local` for server/admin workflows.
4. Run the SQL migration in `supabase/migrations/202605120001_styletrip_saved_boards.sql`.
5. Run `supabase/migrations/202605150001_style_feedback.sql` to enable persistent feedback events.
6. Run `supabase/migrations/202605150002_provider_test_runs.sql` to enable provider test run history and checklist persistence.

You can run migrations with the Supabase CLI:

```bash
supabase link --project-ref your-project-ref
supabase db push
```

Or paste the migration SQL into the Supabase SQL editor.

## Database

The migration creates:

- `profiles`
- `user_photos`
- `boards`
- `board_images`
- `generations`
- `style_feedback` stores optional selected/deselected/not-my-style/generated/saved/downloaded look feedback.
- `provider_test_runs` stores optional developer-only one-image provider test history and quality checklist metadata.

It also enables Row Level Security so users can only access their own profiles, photos, boards, board images, and generations.

## Storage Buckets

The migration attempts to create these private buckets:

- `user-photos`
- `generated-boards`
- `generated-outfits`

If bucket creation is blocked in your Supabase environment, create them manually in Storage with the exact names above and keep them private. The migration also includes storage policies that scope access by the first folder segment, which is the user id.

## Privacy and Safety

- Uploaded photos are not stored unless the user saves a generated board.
- Saved source photos and generated boards are stored in private Supabase buckets under the user id.
- Photos are sent only to configured model providers when mock mode is off. Paid personalized image generation remains guarded and should run only after the user selects looks and confirms cost.
- The app does not identify the person.
- The app does not infer sensitive traits.
- The app avoids sexualized, explicit, underwear-only, or exact try-on language.
- The output is always described as AI outfit inspiration.

## API Notes

- `POST /api/analyze-photo`
- `POST /api/generate-reference-looks`
- `POST /api/generate-style-options` (legacy/provider compatibility)
- `POST /api/generate-outfit-images`
- `POST /api/generate-style-board`
- `POST /api/refine-board`
- `POST /api/boards/save`
- `GET /api/style-feedback` loads Style Memory for the current user.
- `POST /api/style-feedback` saves a feedback event opportunistically.
- `DELETE /api/style-feedback` resets the current user's Style Memory.
- `GET /api/provider-test/boards` loads recent saved boards and reference looks for the Provider Test Lab.
- `POST /api/provider-test/generate-one` runs the guarded developer-only one-image provider test.
- `GET /api/provider-test/runs` loads recent provider test history when the optional migration exists.
- `PATCH /api/provider-test/runs` saves manual quality checklist metadata for a test run.
- `DELETE /api/boards/[id]`

`generate-style-board` and `refine-board` remain available for compatibility, but the current UI uses `generate-outfit-images` plus the frontend board renderer.

## Auth Notes

Email/password auth is implemented for MVP. Google Sign-In is intentionally not implemented yet. The auth form is structured around Supabase auth so Google OAuth can be added later with `supabase.auth.signInWithOAuth`.

## Future Improvements

- Shopping agent: search verified retailers for matching items by color, fabric, silhouette, and price.
- Closet upload: generate outfits from clothes users already own.
- Reference providers: test Pexels, Unsplash, curated fashion catalogs, and retailer/product feeds with attribution and fallback.
- Try-on extension: run personalized image generation only after selection, consent, and cost confirmation.
- AI match scoring: replace the mock scorer in `lib/matching` with a provider-backed scorer after cost and privacy review.
- User feedback: use persisted feedback across sessions to improve future recommendations and replacement quality.
- Trip packing list: convert selected outfits into a packing checklist.
- Multiple boards: generate separate boards for day, night, pool, airport, dinner, club, and photoshoot.
- Google Sign-In: add Supabase OAuth after email/password MVP is stable.
- Mobile app: package the upload-to-board flow once the web workflow is validated.


## Prompt Lab Manual Workflow

Prompt Lab is a developer/demo-only copy-paste workflow for testing strong ChatGPT-style fashion board prompts without adding any paid API dependency to the app. It appears in development, when `SHOW_PROVIDER_TEST_LAB=true`, or when `SHOW_PROMPT_LAB=true`.

Prompt Lab can:

- Load a recent saved board and its selected reference looks.
- Include saved source-photo instructions when a signed source photo URL is available.
- Generate copyable prompts for `v4-chatgpt-style-board`, `v5-chatgpt-try-different-styles`, and `v6-shopping-style-reference-board`.
- Import a manually generated image back into StyleTrip as a user-provided asset.
- Store manual imports in the optional `manual_prompt_results` table and the `generated-boards` bucket.
- Capture a lightweight quality checklist and a `useAsInspiration` metadata flag.

Prompt Lab does not call ChatGPT, OpenAI, Gemini, fal, or any image-generation API. The expected manual loop is: copy prompt, run it manually in ChatGPT if desired, download the result image, then upload/import it into StyleTrip.

Apply `supabase/migrations/202605170001_manual_prompt_results.sql` to persist manual imports. If that migration is missing, Prompt Lab still shows local previews and explains that persistence requires the migration.

Future TODO: parse imported boards into structured reference looks/items and let selected manual results seed future reference discovery.
