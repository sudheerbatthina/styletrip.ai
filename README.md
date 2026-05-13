# StyleTrip AI

StyleTrip AI is a saved-board web app for travel outfit inspiration. Users can sign up, create AI outfit boards from a full-body photo and trip preferences, save generated boards, revisit them from a dashboard, download them, and delete them.

The app keeps the original mock-mode generation flow working, so UI development does not require OpenAI or Supabase.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn-style local UI primitives
- lucide-react
- React Hook Form
- Zod validation
- OpenAI API
- Supabase Auth, Postgres, and Storage

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
OPENAI_TEXT_MODEL=
OPENAI_IMAGE_MODEL=
NEXT_PUBLIC_MOCK_MODE=true
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000
```

Model names are read from env. Change `OPENAI_TEXT_MODEL` for photo analysis/style planning and `OPENAI_IMAGE_MODEL` for image generation.

## Local Development

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:3000`.

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

Mock mode returns sample photo analysis, 24 style cards, and a mock generated board without calling OpenAI. If Supabase is configured, mock-generated boards can still be saved to the database and storage. If Supabase is not configured, the builder still works but saved boards/auth are disabled with visible warnings.

To use real OpenAI calls:

```bash
NEXT_PUBLIC_MOCK_MODE=false
OPENAI_API_KEY=...
OPENAI_TEXT_MODEL=...
OPENAI_IMAGE_MODEL=...
```

## Supabase Setup

1. Create a Supabase project.
2. Copy the project URL and anon key into `.env.local`.
3. Copy the service role key into `.env.local` for server/admin workflows.
4. Run the SQL migration in `supabase/migrations/202605120001_styletrip_saved_boards.sql`.

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
- Photos are sent only to OpenAI for analysis/generation when mock mode is off.
- The app does not identify the person.
- The app does not infer sensitive traits.
- The app avoids sexualized, explicit, underwear-only, or exact try-on language.
- The output is always described as AI outfit inspiration.

## API Notes

- `POST /api/analyze-photo`
- `POST /api/generate-style-options`
- `POST /api/generate-style-board`
- `POST /api/refine-board`
- `POST /api/boards/save`
- `DELETE /api/boards/[id]`

## Future Improvements

- Shopping agent: search verified retailers for matching items by color, fabric, silhouette, and price.
- Closet upload: generate outfits from clothes users already own.
- User feedback: save liked/disliked styles to improve future recommendations.
- Trip packing list: convert selected outfits into a packing checklist.
- Multiple boards: generate separate boards for day, night, pool, airport, dinner, club, and photoshoot.
