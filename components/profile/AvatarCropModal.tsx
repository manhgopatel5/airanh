"use client";
import { useState, useCallback } from "react";
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { getCroppedImg } from "@/lib/utils/image";

type Props = {
  imageSrc: string;
  onClose: () => void;
  onCropComplete: (croppedBlob: Blob) => void;
  accentGradient: string;
};

export default function AvatarCropModal({ imageSrc, onClose, onCropComplete, accentGradient }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const onCropCompleteCallback = useCallback((_croppedArea: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    setSaving(true);
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels);
      onCropComplete(blob);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="relative flex-1">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={1}
          onCropChange={setCrop}
          onCropComplete={onCropCompleteCallback}
          onZoomChange={setZoom}
          cropShape="round"
          showGrid={false}
        />
      </div>
      <div className="bg-white dark:bg-zinc-900 p-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <button onClick={() => setZoom(z => Math.max(1, z - 0.2))} className="p-3 bg-gray-100 dark:bg-zinc-800 rounded-xl">
            <ZoomOut className="w-5 h-5" />
          </button>
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1"
          />
          <button onClick={() => setZoom(z => Math.min(3, z + 0.2))} className="p-3 bg-gray-100 dark:bg-zinc-800 rounded-xl">
            <ZoomIn className="w-5 h-5" />
          </button>
          <button onClick={() => setRotation(r => r + 90)} className="p-3 bg-gray-100 dark:bg-zinc-800 rounded-xl">
            <RotateCw className="w-5 h-5" />
          </button>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 font-semibold disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex-1 py-3 rounded-xl bg-gradient-to-r ${accentGradient} font-semibold text-white disabled:opacity-50`}
          >
            {saving? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  );
}