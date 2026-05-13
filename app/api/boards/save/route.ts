import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { storageBuckets } from "@/lib/supabase/config";
import { imageStringToUploadable, parseDataUrl } from "@/lib/storage-utils";
import { saveBoardRequestSchema } from "@/lib/schemas";

export const runtime = "nodejs";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return jsonError("Supabase is not configured. Saved boards are disabled.", 503);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError("You must be logged in to save a board.", 401);
    }

    const body = await request.json();
    const parsed = saveBoardRequestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "Invalid request.");
    }

    const { image, boardImage, analysis, selectedStyles, preferences, title } =
      parsed.data;
    const boardId = randomUUID();
    const photoId = randomUUID();
    const boardImageId = randomUUID();
    const photoUpload = parseDataUrl(image.dataUrl);
    const boardUpload = await imageStringToUploadable(boardImage);

    await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email,
      updated_at: new Date().toISOString(),
    });

    const photoPath = `${user.id}/${photoId}/source.${photoUpload.extension}`;
    const boardPath = `${user.id}/${boardId}/board.${boardUpload.extension}`;

    const photoResult = await supabase.storage
      .from(storageBuckets.userPhotos)
      .upload(photoPath, photoUpload.buffer, {
        contentType: photoUpload.mimeType,
        upsert: true,
      });
    if (photoResult.error) {
      throw photoResult.error;
    }

    const boardImageResult = await supabase.storage
      .from(storageBuckets.generatedBoards)
      .upload(boardPath, boardUpload.buffer, {
        contentType: boardUpload.mimeType,
        upsert: true,
      });
    if (boardImageResult.error) {
      throw boardImageResult.error;
    }

    const photoInsert = await supabase.from("user_photos").insert({
      id: photoId,
      user_id: user.id,
      image_path: photoPath,
      original_filename: `styletrip-source.${photoUpload.extension}`,
    });
    if (photoInsert.error) {
      throw photoInsert.error;
    }

    const boardInsert = await supabase.from("boards").insert({
      id: boardId,
      user_id: user.id,
      title:
        title ??
        `${preferences.tripLocation || "Trip"} ${preferences.tripType || "style"} board`,
      trip_location: preferences.tripLocation,
      trip_type: preferences.tripType,
      aspect_ratio: preferences.aspectRatio,
      number_of_styles: selectedStyles.length,
      source_photo_id: photoId,
      analysis_json: analysis,
      preferences_json: preferences,
      selected_styles_json: selectedStyles,
      status: "completed",
      final_board_image_path: boardPath,
    });
    if (boardInsert.error) {
      throw boardInsert.error;
    }

    const imageInsert = await supabase.from("board_images").insert({
      id: boardImageId,
      board_id: boardId,
      user_id: user.id,
      image_type: "final_board",
      storage_path: boardPath,
    });
    if (imageInsert.error) {
      throw imageInsert.error;
    }

    const generationInsert = await supabase.from("generations").insert({
      board_id: boardId,
      user_id: user.id,
      generation_type: "style_board",
      status: "completed",
      meta_json: {
        mockMode: process.env.NEXT_PUBLIC_MOCK_MODE === "true",
        numberOfStyles: selectedStyles.length,
        aspectRatio: preferences.aspectRatio,
        resemblanceMode: preferences.resemblanceMode,
      },
    });
    if (generationInsert.error) {
      throw generationInsert.error;
    }

    return NextResponse.json({ boardId });
  } catch (error) {
    console.error("save board failed", error);
    return jsonError(
      error instanceof Error ? error.message : "Failed to save board.",
      500,
    );
  }
}
