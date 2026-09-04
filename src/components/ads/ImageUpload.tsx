import { useRef, useState } from "react";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { MAX_AD_IMAGES, MAX_IMAGE_BYTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function ImageUpload({
  images,
  onChange,
  upload,
}: {
  images: string[];
  onChange: (urls: string[]) => void;
  upload: (file: File) => Promise<string>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(list: FileList | File[]) {
    setError(null);
    const files = Array.from(list).filter((f) => f.type.startsWith("image/"));
    const room = MAX_AD_IMAGES - images.length;
    if (files.length > room) setError(`You can add ${room} more image${room === 1 ? "" : "s"}.`);
    const accepted = files.slice(0, room);
    const tooBig = accepted.filter((f) => f.size > MAX_IMAGE_BYTES);
    if (tooBig.length) setError("Each image must be under 2MB.");
    const ok = accepted.filter((f) => f.size <= MAX_IMAGE_BYTES);
    if (!ok.length) return;
    setUploading(ok.length);
    const urls: string[] = [];
    for (const f of ok) {
      try {
        urls.push(await upload(f));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setUploading((n) => n - 1);
      }
    }
    onChange([...images, ...urls]);
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-md border border-dashed px-4 py-6 text-center transition-colors",
          dragging ? "border-primary bg-primary-soft" : "hover:border-foreground",
          images.length >= MAX_AD_IMAGES && "pointer-events-none opacity-50",
        )}
      >
        {uploading > 0 ? <Loader2 size={22} className="animate-spin text-primary" /> : <ImagePlus size={22} className="text-muted-foreground" />}
        <p className="mt-2 text-[15px]">{uploading > 0 ? `Uploading ${uploading}…` : "Drag photos here or click to choose"}</p>
        <p className="text-sm text-muted-foreground">
          Up to {MAX_AD_IMAGES} images, 2MB each. {images.length}/{MAX_AD_IMAGES} added.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      {error && <p className="field-error">{error}</p>}
      {images.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-3">
          {images.map((url, i) => (
            <li key={url} className="relative">
              <img src={url} alt={`Upload ${i + 1}`} className="h-20 w-20 rounded-md border object-cover" />
              <button
                type="button"
                aria-label="Remove image"
                onClick={() => onChange(images.filter((u) => u !== url))}
                className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border bg-background text-muted-foreground hover:text-destructive"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
