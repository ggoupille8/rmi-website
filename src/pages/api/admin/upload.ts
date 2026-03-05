import type { APIRoute } from "astro";
import { put } from "@vercel/blob";
import { isAdminAuthorized } from "../../../lib/admin-auth";

export const prerender = false;

const SECURITY_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const POST: APIRoute = async ({ request }) => {
  if (!isAdminAuthorized(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: {
        ...SECURITY_HEADERS,
        "WWW-Authenticate": 'Bearer realm="admin"',
      },
    });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return new Response(
        JSON.stringify({ error: "No file provided. Use multipart/form-data with a 'file' field." }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.has(file.type)) {
      return new Response(
        JSON.stringify({
          error: `Invalid file type: ${file.type}. Allowed: JPEG, PNG, WebP.`,
        }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({
          error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum: 10MB.`,
        }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    // Generate a clean filename with timestamp
    const ext = file.name.split(".").pop()?.toLowerCase() || "webp";
    const safeName = file.name
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .toLowerCase()
      .slice(0, 50);
    const timestamp = Date.now();
    const blobPath = `media/${safeName}-${timestamp}.${ext}`;

    // Upload to Vercel Blob
    const blob = await put(blobPath, file, {
      access: "public",
      contentType: file.type,
    });

    return new Response(
      JSON.stringify({
        url: blob.url,
        size: file.size,
        contentType: file.type,
        fileName: file.name,
      }),
      { status: 200, headers: SECURITY_HEADERS }
    );
  } catch (error) {
    console.error(
      "Media upload error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return new Response(
      JSON.stringify({ error: "Upload failed" }),
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
};
