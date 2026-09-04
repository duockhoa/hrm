"use client"; // Bắt buộc phải có trong Next.js App Router

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

export default function QrScanner() {
  const [result, setResult] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    // Khởi tạo instance khi component mount
    scannerRef.current = new Html5Qrcode("reader");

    // Cleanup khi component unmount
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch((err) => console.error(err));
      }
    };
  }, []);

  const startScanning = async () => {
    if (!scannerRef.current) return;

    try {
      setIsScanning(true);
      setResult(null);

      await scannerRef.current.start(
        { facingMode: "environment" }, // Ưu tiên camera sau
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          setResult(decodedText);
          stopScanning(); // Dừng sau khi quét thành công
        },
        (errorMessage) => {
          // Lỗi này xảy ra liên tục khi không tìm thấy QR trong khung hình, có thể bỏ qua
        },
      );
    } catch (err) {
      console.error("Lỗi khi mở camera:", err);
      setIsScanning(false);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      await scannerRef.current.stop();
      setIsScanning(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h2 className="text-xl font-bold">QR Scanner (Next.js)</h2>

      {/* Vùng hiển thị Camera */}
      <div
        id="reader"
        className="overflow-hidden rounded-lg border-2 border-gray-300"
        style={{ width: "300px", height: "300px" }}
      ></div>

      <div className="flex gap-2">
        {!isScanning ? (
          <button
            onClick={startScanning}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Bật Camera
          </button>
        ) : (
          <button
            onClick={stopScanning}
            className="bg-red-500 text-white px-4 py-2 rounded"
          >
            Dừng Quét
          </button>
        )}
      </div>

      {result && (
        <div className="mt-4 p-2 bg-green-100 border border-green-400 rounded">
          <p className="font-semibold text-green-700">Kết quả:</p>
          <span className="break-all">{result}</span>
        </div>
      )}
    </div>
  );
}
