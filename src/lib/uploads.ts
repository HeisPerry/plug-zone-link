import { MAX_UPLOAD_BYTES, uploadFile, type UploadFolder } from "./uploads.functions";

export { MAX_UPLOAD_BYTES };
export type { UploadFolder };

/** Sends one file to the server, which stores it on UploadThing under the signed-in user. */
export async function uploadToStorage(file: File, folder: UploadFolder): Promise<string> {
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("Files must be 20 MB or smaller");
  const body = new FormData();
  body.set("file", file);
  body.set("folder", folder);
  const { url } = await uploadFile({ data: body });
  return url;
}
