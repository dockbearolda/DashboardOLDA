import { NextRequest, NextResponse } from "next/server";
import { uploadFileToDropbox } from "@/lib/dropboxService";

/**
 * POST /api/upload/dropbox
 * Uploads a file to Dropbox and returns the temporary link
 *
 * Body: FormData with:
 *   - file: File to upload
 *   - path: Dropbox path (e.g., "/profiles/user-id/photo.jpg")
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const path = formData.get("path") as string;

    if (!file || !path) {
      return NextResponse.json(
        { error: "Missing file or path" },
        { status: 400 }
      );
    }

    const link = await uploadFileToDropbox(file, path);

    return NextResponse.json({ success: true, link });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
