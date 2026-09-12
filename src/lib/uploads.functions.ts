import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Hard ceiling for any single upload (chat attachments are the largest case). */
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

const FOLDERS = ["ads", "avatars", "messages"] as const;
export type UploadFolder = (typeof FOLDERS)[number];

function safeName(name: string) {
  return name.replace(/[^\w.\-]+/g, "_").slice(-80) || "file";
}

/**
 * Uploads one file to UploadThing and returns its public URL.
 * The storage key is always prefixed with the *authenticated* user's id taken from
 * the verified token — never from the browser — so one user can't write under another.
 */
export const uploadFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: FormData) => {
    if (!(data instanceof FormData)) throw new Error("Expected a file upload");
    const file = data.get("file");
    const folder = String(data.get("folder") ?? "");
    if (!(file instanceof File)) throw new Error("No file provided");
    if (file.size === 0) throw new Error("That file is empty");
    if (file.size > MAX_UPLOAD_BYTES) throw new Error("Files must be 20 MB or smaller");
    if (!FOLDERS.includes(folder as UploadFolder)) throw new Error("Unknown upload type");
    return { file, folder: folder as UploadFolder };
  })
  .handler(async ({ data, context }): Promise<{ url: string }> => {
    const token = process.env["UPLOADTHING_TOKEN"];
    if (!token) throw new Error("File uploads are not configured yet");

    const { UTApi } = await import("uploadthing/server");
    const api = new UTApi({ token });

    const key = `${data.folder}/${context.userId}/${Date.now()}-${safeName(data.file.name)}`;
    const named = new File([await data.file.arrayBuffer()], key, {
      type: data.file.type || "application/octet-stream",
    });

    const result = await api.uploadFiles(named);
    if (result.error || !result.data) throw new Error(result.error?.message ?? "Upload failed");
    return { url: result.data.ufsUrl };
  });
