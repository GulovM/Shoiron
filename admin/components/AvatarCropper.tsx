'use client';

import Cropper from 'react-easy-crop';
import { ChangeEvent, useCallback, useState } from 'react';

async function getCroppedFile(imageSrc: string, cropPixels: { x: number; y: number; width: number; height: number }) {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
  });

  const canvas = document.createElement('canvas');
  canvas.width = cropPixels.width;
  canvas.height = cropPixels.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas is not available');
  }

  ctx.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    cropPixels.width,
    cropPixels.height
  );

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png', 0.95));
  if (!blob) {
    throw new Error('Crop failed');
  }
  return new File([blob], `avatar-${Date.now()}.png`, { type: 'image/png' });
}

export function AvatarCropper({
  onChange,
}: {
  onChange: (file: File, cropData: { x: number; y: number; width: number; height: number }) => void;
}) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPixels, setAreaPixels] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageSrc(String(reader.result));
    reader.readAsDataURL(file);
  };

  const onSaveCrop = useCallback(async () => {
    if (!imageSrc || !areaPixels) return;
    const file = await getCroppedFile(imageSrc, areaPixels);
    onChange(file, areaPixels);
    setImageSrc(null);
  }, [imageSrc, areaPixels, onChange]);

  return (
    <div className="avatar-cropper">
      <input type="file" accept="image/png,image/jpeg,image/webp,image/avif" onChange={onFile} />
      {imageSrc && (
        <div className="crop-modal">
          <div className="crop-area">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setAreaPixels(pixels)}
              aspect={1}
              cropShape="round"
              showGrid={false}
            />
          </div>
          <div className="crop-controls">
            <label>
              Zoom
              <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
            </label>
            <div className="row gap">
              <button type="button" className="btn btn-secondary" onClick={() => setImageSrc(null)}>
                Cancel
              </button>
              <button type="button" className="btn" onClick={onSaveCrop}>
                Apply Crop
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
