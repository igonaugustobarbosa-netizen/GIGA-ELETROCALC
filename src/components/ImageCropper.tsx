import React, { useState, useCallback } from 'react';
import Cropper, { Area, Point } from 'react-easy-crop';

interface ImageCropperProps {
  image: string;
  onCropDone: (croppedAreaPixels: Area, rotation: number) => void;
  onCancel: () => void;
}

export const ImageCropper: React.FC<ImageCropperProps> = ({ image, onCropDone, onCancel }) => {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/95 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white rounded-[2.5rem] p-4 shadow-2xl relative flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tighter">Ajustar Imagem</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Recorte a planta no tamanho correto</p>
          </div>
          <button 
            onClick={onCancel}
            className="w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl flex items-center justify-center transition-colors"
          >
            ×
          </button>
        </div>

        <div className="relative w-full h-[45vh] bg-slate-50 mt-4 rounded-3xl overflow-hidden border border-slate-100">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={undefined}
            onCropChange={setCrop}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
          />
        </div>

        <div className="mt-8 px-6 pb-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Zoom: {zoom.toFixed(1)}x</label>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Girar: {rotation}°</label>
              <input
                type="range"
                value={rotation}
                min={0}
                max={360}
                step={1}
                onChange={(e) => setRotation(Number(e.target.value))}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={onCancel}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-500 font-black text-[12px] uppercase tracking-widest py-4 rounded-2xl transition-all active:scale-95"
            >
              Cancelar
            </button>
            <button
              onClick={() => croppedAreaPixels && onCropDone(croppedAreaPixels, rotation)}
              className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white font-black text-[12px] uppercase tracking-widest py-4 rounded-2xl shadow-xl shadow-blue-600/20 active:scale-95 transition-all"
            >
              Confirmar Ajuste
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
