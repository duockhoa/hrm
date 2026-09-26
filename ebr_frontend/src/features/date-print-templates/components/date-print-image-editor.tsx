"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { toast } from "sonner";
import {
  ArrowUpRight,
  RectangleHorizontal,
  Square,
  Type,
  Undo2,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Hand,
} from "lucide-react";
import { fetchAuthenticatedImage } from "@/lib/authenticated-image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Point = { x: number; y: number };
type Mark = {
  tool: "arrow" | "rectangle" | "square" | "text";
  start: Point;
  end: Point;
  color: string;
  width: number;
  text: string;
  fontSize: number;
};

function paint(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  marks: Mark[],
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0);
  for (const mark of marks) {
    ctx.strokeStyle = mark.color;
    ctx.fillStyle = mark.color;
    ctx.lineWidth = mark.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const { start: a, end: b } = mark;
    if (mark.tool === "text") {
      ctx.font = `${mark.fontSize}px Arial, sans-serif`;
      ctx.textBaseline = "top";
      mark.text
        .split("\n")
        .forEach((line, index) =>
          ctx.fillText(line, a.x, a.y + index * mark.fontSize * 1.2),
        );
    } else if (mark.tool === "rectangle" || mark.tool === "square") {
      ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
    } else {
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      const head = Math.max(mark.width * 4, 12);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(
        b.x - head * Math.cos(angle - Math.PI / 6),
        b.y - head * Math.sin(angle - Math.PI / 6),
      );
      ctx.lineTo(
        b.x - head * Math.cos(angle + Math.PI / 6),
        b.y - head * Math.sin(angle + Math.PI / 6),
      );
      ctx.closePath();
      ctx.fill();
    }
  }
}

export default function DatePrintImageEditor({
  src,
  onClose,
  onSave,
}: {
  src: string;
  onClose: () => void;
  onSave: (file: File) => Promise<void>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<{
    id: number;
    x: number;
    y: number;
    left: number;
    top: number;
  } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panning, setPanning] = useState(false);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const draftRef = useRef<Mark | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [tool, setTool] = useState<Mark["tool"]>("arrow");
  const [color, setColor] = useState("#ff0000");
  const [width, setWidth] = useState(4);
  const [fontSize, setFontSize] = useState(28);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  // Dialog content mounts in a portal, possibly after the parent's effects.
  // Measure when the actual viewport attaches, not only on the first render.
  const attachViewport = useCallback((viewport: HTMLDivElement | null) => {
    viewportRef.current = viewport;
    if (!viewport) return;
    const measure = () =>
      setViewportSize({
        width: viewport.clientWidth,
        height: viewport.clientHeight,
      });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    return () => {
      observer.disconnect();
      viewportRef.current = null;
    };
  }, []);

  const fitScale = image
    ? Math.min(
        Math.max(1, viewportSize.width) / image.naturalWidth,
        Math.max(1, viewportSize.height) / image.naturalHeight,
      )
    : 1;
  const displayWidth = (image?.naturalWidth ?? 0) * fitScale * zoom;
  const displayHeight = (image?.naturalHeight ?? 0) * fitScale * zoom;

  useEffect(() => {
    const controller = new AbortController();
    let url = "";
    void (async () => {
      try {
        const blob = await fetchAuthenticatedImage(src, {
          original: true,
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        url = URL.createObjectURL(blob);
        const loaded = new Image();
        loaded.src = url;
        await loaded.decode();
        if (!controller.signal.aborted) setImage(loaded);
      } catch {
        if (!controller.signal.aborted) setLoadError(true);
      }
    })();
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [src]);

  const attachCanvas = useCallback(
    (canvas: HTMLCanvasElement | null) => {
      canvasRef.current = canvas;
      if (canvas && image) paint(canvas, image, marks);
    },
    [image, marks],
  );

  const point = (event: PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = event.currentTarget;
    const bounds = canvas.getBoundingClientRect();
    return {
      x: Math.max(
        0,
        Math.min(
          canvas.width,
          ((event.clientX - bounds.left) * canvas.width) / bounds.width,
        ),
      ),
      y: Math.max(
        0,
        Math.min(
          canvas.height,
          ((event.clientY - bounds.top) * canvas.height) / bounds.height,
        ),
      ),
    };
  };

  const endPoint = (mark: Mark, event: PointerEvent<HTMLCanvasElement>) => {
    const end = point(event);
    if (mark.tool !== "square") return end;
    const dx = end.x - mark.start.x;
    const dy = end.y - mark.start.y;
    const side = Math.min(Math.abs(dx), Math.abs(dy));
    return {
      x: mark.start.x + Math.sign(dx) * side,
      y: mark.start.y + Math.sign(dy) * side,
    };
  };

  const save = async () => {
    if (!image || !marks.length || saving) return;
    setSaving(true);
    try {
      const output = document.createElement("canvas");
      output.width = image.naturalWidth;
      output.height = image.naturalHeight;
      paint(output, image, marks);
      const blob = await new Promise<Blob>((resolve, reject) =>
        output.toBlob(
          (result) =>
            result ? resolve(result) : reject(new Error("Không thể tạo ảnh.")),
          "image/png",
        ),
      );
      if (blob.size > 20 * 1024 * 1024)
        throw new Error("Ảnh sau chỉnh sửa vượt quá 20 MB.");
      await onSave(
        new File([blob], "date-print-edited.png", { type: "image/png" }),
      );
      toast.success("Đã lưu ảnh chỉnh sửa thay thế ảnh cũ.");
      onClose();
    } catch (error) {
      const serverMessage = (
        error as { response?: { data?: { message?: string } } }
      ).response?.data?.message;
      toast.error(
        serverMessage ||
          (error instanceof Error
            ? error.message
            : "Không thể lưu ảnh chỉnh sửa."),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saving) onClose();
      }}
    >
      <DialogContent
        onKeyDown={(event) => {
          if (
            !(event.ctrlKey || event.metaKey) ||
            event.key.toLowerCase() !== "z" ||
            event.shiftKey ||
            event.altKey ||
            event.nativeEvent.isComposing
          )
            return;
          // Keep native text undo when editing a toolbar input.
          const target = event.target;
          if (
            target instanceof HTMLElement &&
            target.closest("input, textarea, [contenteditable='true']")
          )
            return;
          event.preventDefault();
          event.stopPropagation();
          if (saving || !image) return;
          draftRef.current = null;
          setMarks((current) => current.slice(0, -1));
        }}
        className="grid h-[calc(100dvh-1rem)] max-h-[900px] max-w-[calc(100vw-1rem)] grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-3 overflow-hidden p-3 sm:h-[90dvh] sm:max-w-[min(calc(100vw-1rem),calc(72rem+232px))] sm:p-5"
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader className="min-w-0 pr-8">
          <DialogTitle>Sửa ảnh minh họa</DialogTitle>
          <DialogDescription className="sr-only">Lưu sẽ thay thế ảnh cũ.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-1 rounded-md border bg-white px-2 py-1.5">
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            disabled={!image || saving || zoom <= 0.25}
            title="Thu nhỏ"
            aria-label="Thu nhỏ ảnh"
            onClick={() => setZoom((current) => Math.max(0.25, current - 0.25))}
          >
            <ZoomOut className="size-4" />
          </Button>
          <span
            className="min-w-14 text-center text-sm font-medium tabular-nums"
            aria-live="polite"
          >
            {Math.round(zoom * 100)}%
          </span>
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            disabled={!image || saving || zoom >= 4}
            title="Phóng to"
            aria-label="Phóng to ảnh"
            onClick={() => setZoom((current) => Math.min(4, current + 0.25))}
          >
            <ZoomIn className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            disabled={!image || saving}
            title="Vừa khung ảnh"
            aria-label="Đặt lại zoom"
            onClick={() => {
              setZoom(1);
              viewportRef.current?.scrollTo(0, 0);
            }}
          >
            <RotateCcw className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant={panning ? "default" : "outline"}
            disabled={!image || saving}
            title="Kéo để di chuyển ảnh"
            aria-label="Kéo để di chuyển ảnh"
            aria-pressed={panning}
            onClick={() => setPanning((current) => !current)}
          >
            <Hand className="size-4" />
          </Button>
        </div>
        <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_112px] items-stretch gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
          <fieldset
            disabled={saving || !image}
            aria-label="Công cụ sửa ảnh"
            className="order-2 min-h-0 min-w-0 overflow-y-auto rounded-xl bg-[#272727] text-white disabled:opacity-50"
          >
            <div className="grid grid-cols-2 gap-2 border-b border-white/15 p-3 sm:grid-cols-4">
              {(
                [
                  ["arrow", "Mũi tên", ArrowUpRight],
                  ["rectangle", "Khung chữ nhật", RectangleHorizontal],
                  ["square", "Ô vuông", Square],
                  ["text", "Chữ", Type],
                ] as const
              ).map(([value, label, Icon]) => (
                <button
                  key={value}
                  type="button"
                  title={label}
                  aria-label={label}
                  className={`flex size-9 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300 ${tool === value ? "bg-[#344f76] text-blue-200" : "text-neutral-300 hover:bg-white/10"}`}
                  aria-pressed={tool === value}
                  onClick={() => {
                    setTool(value);
                    setPanning(false);
                  }}
                >
                  <Icon className="size-5" />
                </button>
              ))}
            </div>
            <div className="space-y-3 border-b border-white/15 p-3 sm:p-4">
              <p className="text-xs text-neutral-300">Nét vẽ</p>
              <div
                className="flex flex-wrap gap-1"
                role="group"
                aria-label="Độ dày nét vẽ"
              >
                {[1, 2, 4, 7, 10].map((size) => (
                  <button
                    key={size}
                    type="button"
                    title={`${size} px`}
                    aria-label={`Nét vẽ ${size} px`}
                    aria-pressed={width === size}
                    onClick={() => setWidth(size)}
                    className={`flex size-8 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-blue-300 ${width === size ? "bg-[#344f76] text-blue-200" : "text-neutral-300 hover:bg-white/10"}`}
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        d="M6 18 18 6"
                        stroke="currentColor"
                        strokeWidth={size / 2 + 0.5}
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-4 border-b border-white/15 p-3 sm:p-4">
              <p className="text-xs text-neutral-300">Màu</p>
              <div
                className="grid grid-cols-2 gap-3 sm:grid-cols-4"
                role="group"
                aria-label="Màu nét vẽ và chữ"
              >
                {[
                  ["#000000", "Đen"],
                  ["#ffffff", "Trắng"],
                  ["#ff0000", "Đỏ"],
                  ["#ffcc00", "Vàng"],
                  ["#22c55e", "Xanh lá"],
                  ["#3b82f6", "Xanh dương"],
                  ["#a855f7", "Tím"],
                ].map(([hex, label]) => (
                  <button
                    key={hex}
                    type="button"
                    title={label}
                    aria-label={label}
                    aria-pressed={color === hex}
                    onClick={() => setColor(hex)}
                    style={{ backgroundColor: hex }}
                    className={`flex size-8 items-center justify-center rounded-full border border-white/40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-300 ${color === hex ? "ring-2 ring-blue-300 ring-offset-2 ring-offset-[#272727]" : "hover:scale-110"}`}
                  >
                    {color === hex && (
                      <Check
                        className={`size-4 ${hex === "#ffffff" || hex === "#ffcc00" ? "text-black" : "text-white"}`}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
            {tool === "text" && (
              <div className="space-y-3 border-b border-white/15 p-3 sm:p-4">
                <label className="block text-xs text-neutral-300">
                  Chữ
                  <input
                    className="mt-2 w-full min-w-0 rounded border border-white/20 bg-white/5 p-2 text-sm text-white"
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder="Nhập chữ…"
                    title="Nhập chữ rồi bấm lên ảnh"
                  />
                </label>
                <label className="block text-xs text-neutral-300">
                  Cỡ chữ
                  <input
                    className="mt-2 w-full rounded border border-white/20 bg-white/5 p-2 text-sm text-white"
                    type="number"
                    min={8}
                    max={200}
                    value={fontSize}
                    onChange={(event) =>
                      setFontSize(
                        Math.max(
                          8,
                          Math.min(200, Number(event.target.value) || 8),
                        ),
                      )
                    }
                  />
                </label>
              </div>
            )}
            <div className="p-3 sm:p-4">
              <button
                type="button"
                title="Hoàn tác (Ctrl+Z / ⌘Z)"
                aria-keyshortcuts="Control+z Meta+z"
                aria-label="Hoàn tác"
                className="flex size-9 items-center justify-center rounded-full text-neutral-300 hover:bg-white/10 disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-blue-300"
                disabled={!marks.length}
                onClick={() => setMarks((current) => current.slice(0, -1))}
              >
                <Undo2 className="size-5" />
              </button>
            </div>
          </fieldset>
          <div
            ref={attachViewport}
            className="order-1 min-h-0 min-w-0 overflow-auto overscroll-contain rounded-md bg-black/5"
            aria-label="Khung chỉnh sửa ảnh có thể cuộn"
          >
            {loadError ? (
              <p role="alert">
                Không thể tải ảnh gốc. Vui lòng đóng và mở lại trình sửa ảnh.
              </p>
            ) : !image ? (
              <p>Đang tải ảnh…</p>
            ) : (
              <div
                className="flex items-center justify-center"
                style={{
                  width: Math.max(viewportSize.width, displayWidth),
                  height: Math.max(viewportSize.height, displayHeight),
                }}
              >
                <canvas
                  ref={attachCanvas}
                  width={image.naturalWidth}
                  height={image.naturalHeight}
                  aria-label="Ảnh minh họa để thêm chú thích"
                  className={`block shrink-0 touch-none ${panning ? "cursor-grab active:cursor-grabbing" : "cursor-crosshair"}`}
                  style={{
                    width: displayWidth,
                    height: displayHeight,
                  }}
                  onPointerDown={(event) => {
                    if (saving || event.button !== 0 || !event.isPrimary)
                      return;
                    if (panning && viewportRef.current) {
                      panRef.current = {
                        id: event.pointerId,
                        x: event.clientX,
                        y: event.clientY,
                        left: viewportRef.current.scrollLeft,
                        top: viewportRef.current.scrollTop,
                      };
                      event.currentTarget.setPointerCapture(event.pointerId);
                      return;
                    }
                    const start = point(event);
                    const mark: Mark = {
                      tool,
                      start,
                      end: start,
                      color,
                      width,
                      text,
                      fontSize,
                    };
                    if (tool === "text") {
                      if (!text.trim()) {
                        toast.error("Vui lòng nhập nội dung chữ.");
                        return;
                      }
                      setMarks((current) => [...current, mark]);
                    } else {
                      draftRef.current = mark;
                      event.currentTarget.setPointerCapture(event.pointerId);
                    }
                  }}
                  onPointerMove={(event) => {
                    const pan = panRef.current;
                    if (
                      pan &&
                      pan.id === event.pointerId &&
                      viewportRef.current
                    ) {
                      viewportRef.current.scrollLeft =
                        pan.left - (event.clientX - pan.x);
                      viewportRef.current.scrollTop =
                        pan.top - (event.clientY - pan.y);
                      return;
                    }
                    if (!draftRef.current || !event.isPrimary) return;
                    draftRef.current.end = endPoint(draftRef.current, event);
                    paint(event.currentTarget, image, [
                      ...marks,
                      draftRef.current,
                    ]);
                  }}
                  onPointerUp={(event) => {
                    if (panRef.current?.id === event.pointerId) {
                      panRef.current = null;
                      event.currentTarget.releasePointerCapture(
                        event.pointerId,
                      );
                      return;
                    }
                    const draft = draftRef.current;
                    if (!draft || !event.isPrimary) return;
                    draft.end = endPoint(draft, event);
                    draftRef.current = null;
                    if (
                      Math.hypot(
                        draft.end.x - draft.start.x,
                        draft.end.y - draft.start.y,
                      ) > 2
                    )
                      setMarks((current) => [...current, draft]);
                    else paint(event.currentTarget, image, marks);
                    event.currentTarget.releasePointerCapture(event.pointerId);
                  }}
                  onPointerCancel={(event) => {
                    panRef.current = null;
                    draftRef.current = null;
                    paint(event.currentTarget, image, marks);
                  }}
                />
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={onClose}
          >
            Hủy
          </Button>
          <Button
            type="button"
            disabled={saving || !image || !marks.length}
            onClick={() => void save()}
          >
            {saving ? "Đang lưu…" : "Lưu thay ảnh cũ"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
