/**
 * Dropbox Service
 * Manages uploads and file operations for OLDA Dashboard
 * - Profile photos: /profiles/{userId}
 * - PRT designs: /prt-designs/{requestId}
 */

import { Dropbox, DropboxResponse } from "dropbox";
import type { files } from "dropbox";

// Initialize Dropbox with access token from env
const getDropboxClient = () => {
  const token = process.env.NEXT_PUBLIC_DROPBOX_ACCESS_TOKEN;
  if (!token) {
    throw new Error("NEXT_PUBLIC_DROPBOX_ACCESS_TOKEN is not set");
  }
  return new Dropbox({ accessToken: token });
};

/**
 * Upload a file to Dropbox and return a temporary link
 * @param file - File to upload
 * @param path - Dropbox path (e.g., "/profiles/user-id/photo.jpg")
 * @returns Temporary download link
 */
export async function uploadFileToDropbox(
  file: File,
  path: string
): Promise<string> {
  try {
    const dbx = getDropboxClient();
    const buffer = await file.arrayBuffer();

    // Upload file
    await dbx.filesUpload({
      path,
      contents: buffer,
      autorename: true,
      mode: { ".tag": "overwrite" },
    });

    // Get temporary link (valid for 4 hours)
    const response = await dbx.filesGetTemporaryLink({ path });
    return response.result.link;
  } catch (error) {
    console.error("Dropbox upload error:", error);
    throw new Error("Failed to upload file to Dropbox");
  }
}

/**
 * Create a shared link for a file
 * @param path - Dropbox path
 * @returns Shared link
 */
export async function createShareLink(path: string): Promise<string> {
  try {
    const dbx = getDropboxClient();

    // Try to create a new shared link
    try {
      const response = await dbx.sharingCreateSharedLinkWithSettings({
        path,
        settings: {
          requested_visibility: { ".tag": "public" },
        },
      });
      return response.result.url;
    } catch (err: any) {
      // Link might already exist
      if (err.status === 409) {
        const links = await dbx.sharingListSharedLinks({ path });
        if (links.result.links.length > 0) {
          return links.result.links[0].url;
        }
      }
      throw err;
    }
  } catch (error) {
    console.error("Dropbox share link error:", error);
    throw new Error("Failed to create share link");
  }
}

/**
 * Delete a file from Dropbox
 * @param path - Dropbox path
 */
export async function deleteFileFromDropbox(path: string): Promise<void> {
  try {
    const dbx = getDropboxClient();
    await dbx.filesDeleteV2({ path });
  } catch (error) {
    console.error("Dropbox delete error:", error);
    throw new Error("Failed to delete file from Dropbox");
  }
}

/**
 * Get temporary link for a file (for preview/download)
 * @param path - Dropbox path
 * @returns Temporary download link
 */
export async function getTemporaryLink(path: string): Promise<string> {
  try {
    const dbx = getDropboxClient();
    const response = await dbx.filesGetTemporaryLink({ path });
    return response.result.link;
  } catch (error) {
    console.error("Dropbox temp link error:", error);
    throw new Error("Failed to get temporary link");
  }
}
