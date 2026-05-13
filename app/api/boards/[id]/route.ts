import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { storageBuckets } from "@/lib/supabase/config";

export const runtime = "nodejs";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return jsonError("Supabase is not configured.", 503);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return jsonError("You must be logged in to delete a board.", 401);
    }

    const { data: board, error: boardError } = await supabase
      .from("boards")
      .select("id, source_photo_id, final_board_image_path")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (boardError || !board) {
      return jsonError("Board not found.", 404);
    }

    const { data: images } = await supabase
      .from("board_images")
      .select("storage_path, image_type")
      .eq("board_id", id)
      .eq("user_id", user.id);

    const boardPaths = [
      board.final_board_image_path,
      ...(images ?? [])
        .filter((image) => image.image_type !== "source_photo")
        .map((image) => image.storage_path),
    ].filter(Boolean) as string[];

    if (boardPaths.length > 0) {
      await supabase.storage.from(storageBuckets.generatedBoards).remove(boardPaths);
    }

    if (board.source_photo_id) {
      const { data: photo } = await supabase
        .from("user_photos")
        .select("image_path")
        .eq("id", board.source_photo_id)
        .eq("user_id", user.id)
        .single();

      if (photo?.image_path) {
        await supabase.storage
          .from(storageBuckets.userPhotos)
          .remove([photo.image_path]);
      }
      await supabase
        .from("user_photos")
        .delete()
        .eq("id", board.source_photo_id)
        .eq("user_id", user.id);
    }

    const deleteResult = await supabase
      .from("boards")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteResult.error) {
      throw deleteResult.error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("delete board failed", error);
    return jsonError(
      error instanceof Error ? error.message : "Failed to delete board.",
      500,
    );
  }
}
