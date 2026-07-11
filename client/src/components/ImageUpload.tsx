import { useRef, useState } from "react";
import { Upload, X, ZoomIn, IdCard, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  icon?: "id" | "license";
  currentUrl?: string | null;
  onFileSelect: (base64: string, mimeType: string) => void;
  onRemove?: () => void;
  disabled?: boolean;
  uploading?: boolean;
  className?: string;
};

export default function ImageUpload({
  label,
  icon = "id",
  currentUrl,
  onFileSelect,
  onRemove,
  disabled,
  uploading,
  className,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const displayUrl = currentUrl || preview;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("يرجى اختيار ملف صورة صالح");
      return;
    }
    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("حجم الصورة يجب أن لا يتجاوز 5 ميجابايت");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setPreview(result);
      // Extract base64 part (remove data:image/xxx;base64, prefix)
      const base64 = result.split(",")[1];
      onFileSelect(base64, file.type);
    };
    reader.readAsDataURL(file);

    // Reset input so same file can be re-selected
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setPreview(result);
      const base64 = result.split(",")[1];
      onFileSelect(base64, file.type);
    };
    reader.readAsDataURL(file);
  }

  function handleRemove(e: React.MouseEvent) {
    e.stopPropagation();
    setPreview(null);
    onRemove?.();
  }

  const IconComponent = icon === "id" ? IdCard : Car;

  return (
    <>
      <div className={cn("space-y-1.5", className)}>
        <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
          <IconComponent className="h-4 w-4 text-muted-foreground" />
          {label}
        </p>

        {displayUrl ? (
          <div className="relative group rounded-lg overflow-hidden border bg-muted aspect-[3/2]">
            <img
              src={displayUrl}
              alt={label}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-8 w-8 p-0"
                onClick={() => setLightboxOpen(true)}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              {!disabled && (
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className="h-8 w-8 p-0"
                  onClick={handleRemove}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {uploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="text-white text-sm font-medium animate-pulse">جاري الرفع...</div>
              </div>
            )}
          </div>
        ) : (
          <div
            onClick={() => !disabled && inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            className={cn(
              "border-2 border-dashed rounded-lg aspect-[3/2] flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer",
              disabled ? "opacity-50 cursor-not-allowed border-muted" : "border-muted hover:border-primary/50 hover:bg-primary/5",
              uploading && "opacity-50 cursor-not-allowed"
            )}
          >
            {uploading ? (
              <div className="text-sm text-muted-foreground animate-pulse">جاري الرفع...</div>
            ) : (
              <>
                <Upload className="h-6 w-6 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-xs font-medium text-foreground">اضغط لرفع الصورة</p>
                  <p className="text-xs text-muted-foreground">أو اسحب وأفلت هنا</p>
                  <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG, WEBP (حتى 5MB)</p>
                </div>
              </>
            )}
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled || uploading}
        />
      </div>

      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconComponent className="h-4 w-4" />
              {label}
            </DialogTitle>
          </DialogHeader>
          <div className="rounded-lg overflow-hidden">
            {displayUrl && (
              <img src={displayUrl} alt={label} className="w-full h-auto max-h-[70vh] object-contain" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
