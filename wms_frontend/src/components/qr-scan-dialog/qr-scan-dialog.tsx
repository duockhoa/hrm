"use client";

import { Html5Qrcode } from "html5-qrcode";
import { QrCode } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type QrScanDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  onOpenChange: (open: boolean) => void;
  onScan: (decodedText: string) => void;
};

type QrInputButtonProps = {
  disabled?: boolean;
  onClick: () => void;
};

const stopMediaStream = (stream: MediaStream) => {
  stream.getTracks().forEach((track) => {
    track.stop();
  });
};

const waitForNextFrame = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });

const getCameraErrorMessage = (error: unknown) => {
  if (!window.isSecureContext) {
    return "Camera chỉ hoạt động trên HTTPS hoặc localhost.";
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    return "Trình duyệt không hỗ trợ camera.";
  }

  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return "Bạn chưa cấp quyền camera. Vui lòng cho phép camera trong trình duyệt.";
    }

    if (error.name === "NotFoundError") {
      return "Không tìm thấy camera trên thiết bị.";
    }

    if (error.name === "NotReadableError") {
      return "Camera đang được ứng dụng khác sử dụng.";
    }
  }

  return "Không thể mở camera. Vui lòng kiểm tra quyền camera.";
};

function QrScanDialog({
  open,
  title,
  description = "Đưa mã QR vào khung camera để tự động điền giá trị.",
  onOpenChange,
  onScan,
}: QrScanDialogProps) {
  const reactId = useId();
  const readerId = `qr-reader-${reactId.replace(/:/g, "")}`;
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [cameraError, setCameraError] = useState("");
  const [cameraStatus, setCameraStatus] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    let isMounted = true;

    const startScanner = async () => {
      try {
        setCameraError("");
        setCameraStatus("Đang chuẩn bị camera...");

        await waitForNextFrame();

        const readerElement = document.getElementById(readerId);
        if (!readerElement) {
          throw new Error("QR reader element is not mounted.");
        }

        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera is not available in this browser context.");
        }

        setCameraStatus("Đang xin quyền truy cập camera...");
        const permissionStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
        });
        stopMediaStream(permissionStream);

        if (!isMounted) {
          return;
        }

        setCameraStatus("Đang mở camera...");
        const scanner = new Html5Qrcode(readerId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 15,
            qrbox: { width: 240, height: 240 },
          },
          async (decodedText) => {
            onScan(decodedText);

            if (scanner.isScanning) {
              await scanner.stop();
            }

            scanner.clear();
            onOpenChange(false);
          },
          () => {},
        );

        if (isMounted) {
          setCameraStatus("");
        }
      } catch (error) {
        console.error("Error opening QR scanner:", error);
        if (isMounted) {
          setCameraStatus("");
          setCameraError(getCameraErrorMessage(error));
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      setCameraStatus("");

      const scanner = scannerRef.current;
      scannerRef.current = null;

      if (scanner?.isScanning) {
        scanner
          .stop()
          .then(() => scanner.clear())
          .catch((error) => {
            console.error("Error stopping QR scanner:", error);
          });
      } else {
        scanner?.clear();
      }
    };
  }, [open, onOpenChange, onScan, readerId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div
          id={readerId}
          className="min-h-[280px] overflow-hidden rounded-md border bg-gray-50"
        />
        {cameraStatus && (
          <p className="text-sm text-gray-600">{cameraStatus}</p>
        )}
        {cameraError && <p className="text-sm text-red-600">{cameraError}</p>}
      </DialogContent>
    </Dialog>
  );
}

function QrInputButton({ disabled, onClick }: QrInputButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-gray-600 hover:text-gray-900"
      disabled={disabled}
      onClick={onClick}
      aria-label="Quét QR"
      title="Quét QR"
    >
      <QrCode className="h-4 w-4" />
    </Button>
  );
}

export { QrInputButton, QrScanDialog };
