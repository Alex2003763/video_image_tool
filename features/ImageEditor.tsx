
import React, { useState, useRef, useCallback, useEffect } from 'react';
import FileUploader from '../components/FileUploader';
import LoadingSpinner from '../components/LoadingSpinner';
import { ImageIcon, CropIcon } from '../components/IconComponents';
import { fetchImageAsFile } from '../utils';

type OutputFormat = 'png' | 'jpeg' | 'webp';
interface FilterOption {
  name: string;
  value: string; // CSS filter value
}

interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CropInteractionState {
  isDragging?: boolean;
  isResizing?: boolean;
  resizeHandle?: string | null; // e.g., 'nw', 'se', 'n', 'e', 's', 'w'
  startX?: number;
  startY?: number;
  startRect?: CropRect;
}

const MIN_CROP_SIZE = 20; // Minimum width/height for crop selection
const HANDLE_SIZE = 10; // Size of resize handles

const ImageEditor: React.FC = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [originalImageDimensions, setOriginalImageDimensions] = useState<{ width: number; height: number } | null>(null);
  
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('png');
  const [jpegQuality, setJpegQuality] = useState<number>(0.92);
  
  const [rotation, setRotation] = useState<number>(0);
  const [activeFilter, setActiveFilter] = useState<string>('none');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isUrlLoading, setIsUrlLoading] = useState<boolean>(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  const [isCroppingActive, setIsCroppingActive] = useState<boolean>(false);
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const [cropInteraction, setCropInteraction] = useState<CropInteractionState>({});

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const cropOverlayRef = useRef<HTMLDivElement>(null);


  const availableFilters: FilterOption[] = [
    { name: 'None', value: 'none' },
    { name: 'Grayscale', value: 'grayscale(100%)' },
    { name: 'Sepia', value: 'sepia(100%)' },
    { name: 'Invert', value: 'invert(100%)' },
    { name: 'Brightness (150%)', value: 'brightness(1.5)' },
    { name: 'Contrast (150%)', value: 'contrast(1.5)' },
  ];

  const handleFileSelect = useCallback((file: File, resetUrlStates: boolean = true) => {
    if (!file.type.startsWith('image/')) {
      setError('Invalid file type. Please upload an image file (PNG, JPG, WEBP, GIF etc.).');
      return;
    }
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    setError(null);
    setRotation(0);
    setActiveFilter('none');
    setIsCroppingActive(false);
    setCropRect(null);
    setOriginalImageDimensions(null); // Reset this to be set on image load
    if (resetUrlStates) {
        setImageUrl('');
        setUrlError(null);
    }
  }, []);

  const handleLoadFromUrl = useCallback(async () => {
    if (!imageUrl) {
      setUrlError('Please enter an image URL.');
      return;
    }
    setIsUrlLoading(true);
    setUrlError(null);
    setError(null);
    try {
      const file = await fetchImageAsFile(imageUrl, imageFile?.name || 'image_from_url');
      handleFileSelect(file, false);
    } catch (err: any) {
      setUrlError(err.message || 'Failed to load image from URL.');
      console.error(err);
    } finally {
      setIsUrlLoading(false);
    }
  }, [imageUrl, handleFileSelect, imageFile?.name]);
  
  const drawImageToCanvas = useCallback(() => {
    if (!imageRef.current || !canvasRef.current || !imageRef.current.complete || imageRef.current.naturalWidth === 0) {
      return;
    }
  
    const img = imageRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
  
    if (!ctx) {
      setError('Could not get canvas context.');
      return;
    }
  
    const { naturalWidth: iw, naturalHeight: ih } = img;
  
    const rad = rotation * Math.PI / 180;
    const absCos = Math.abs(Math.cos(rad));
    const absSin = Math.abs(Math.sin(rad));
  
    canvas.width = iw * absCos + ih * absSin;
    canvas.height = iw * absSin + ih * absCos;
  
    ctx.filter = activeFilter;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(rad);
    ctx.drawImage(img, -iw / 2, -ih / 2, iw, ih);
    
    ctx.setTransform(1, 0, 0, 1, 0, 0); 
  }, [rotation, activeFilter]);


  useEffect(() => {
    if (!imageSrc || !imageRef.current) return;
    const img = imageRef.current;
    
    const handleLoad = () => {
      setOriginalImageDimensions({width: img.naturalWidth, height: img.naturalHeight });
      drawImageToCanvas();
      if (isCroppingActive && !cropRect && canvasRef.current) { 
          const canvasEl = canvasRef.current;
          const { clientWidth: dispWidth, clientHeight: dispHeight } = canvasEl;
          const imgAspectRatio = img.naturalWidth / img.naturalHeight;
          
          let rectWidth = dispWidth * 0.7;
          let rectHeight = rectWidth / imgAspectRatio;

          if (rectHeight > dispHeight * 0.7) {
              rectHeight = dispHeight * 0.7;
              rectWidth = rectHeight * imgAspectRatio;
          }
          rectWidth = Math.max(MIN_CROP_SIZE, rectWidth);
          rectHeight = Math.max(MIN_CROP_SIZE, rectHeight);

          setCropRect({ // Initialize relative to cropOverlayRef
              x: canvasEl.offsetLeft + (dispWidth - rectWidth) / 2,
              y: canvasEl.offsetTop + (dispHeight - rectHeight) / 2,
              width: rectWidth,
              height: rectHeight,
          });
      }
    };

    img.onload = handleLoad;
    img.onerror = () => {
      setError("Failed to load image. The file might be corrupted or not a displayable image format.");
      setImageSrc(null);
    };

    if (img.src !== imageSrc) {
      img.src = imageSrc;
    } else if (img.complete && img.naturalWidth > 0) {
      handleLoad();
    }
  }, [imageSrc, drawImageToCanvas, isCroppingActive, cropRect]);

  useEffect(() => {
    drawImageToCanvas();
  }, [rotation, activeFilter, drawImageToCanvas]);


  const handleDownload = useCallback(() => {
    if (!canvasRef.current || !imageFile) {
      setError('No image loaded or canvas not ready.');
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const canvas = canvasRef.current; 
      const mimeType = `image/${outputFormat}`;
      let qualityArg = outputFormat === 'jpeg' || outputFormat === 'webp' ? jpegQuality : undefined;

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const originalName = imageFile.name.substring(0, imageFile.name.lastIndexOf('.')) || 'image';
            link.download = `${originalName}_edited.${outputFormat}`;
            link.href = url;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          } else {
            setError(`Failed to create blob for ${outputFormat}. Browser might not support it or canvas is tainted.`);
          }
          setIsLoading(false);
        },
        mimeType,
        qualityArg
      );
    } catch (e: any) {
      setError(`Error during image export: ${e.message}`);
      setIsLoading(false);
    }
  }, [outputFormat, jpegQuality, imageFile]);

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };
  
  const resetAll = () => {
    setImageFile(null); 
    setImageSrc(null); 
    setError(null); 
    setUrlError(null);
    setImageUrl('');
    setRotation(0);
    setActiveFilter('none');
    setOriginalImageDimensions(null);
    setIsCroppingActive(false);
    setCropRect(null);
    setCropInteraction({});
    if (imageRef.current) imageRef.current.src = ''; 
    if (canvasRef.current) { 
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0,0, canvas.width, canvas.height);
        }
        canvas.width = 300; 
        canvas.height = 150;
    }
  };

  const toggleCropMode = () => {
    setIsCroppingActive(prev => {
      const newCropState = !prev;
      if (newCropState && canvasRef.current && imageRef.current && imageRef.current.complete) {
        const canvasEl = canvasRef.current;
        const img = imageRef.current;
        const { clientWidth: dispWidth, clientHeight: dispHeight } = canvasEl;
        const imgAspectRatio = img.naturalWidth / img.naturalHeight;
        
        let rectWidth = dispWidth * 0.7;
        let rectHeight = rectWidth / imgAspectRatio;

        if (rectHeight > dispHeight * 0.7) {
            rectHeight = dispHeight * 0.7;
            rectWidth = rectHeight * imgAspectRatio;
        }
        rectWidth = Math.max(MIN_CROP_SIZE, rectWidth);
        rectHeight = Math.max(MIN_CROP_SIZE, rectHeight);

        setCropRect({
          x: canvasEl.offsetLeft + (dispWidth - rectWidth) / 2,
          y: canvasEl.offsetTop + (dispHeight - rectHeight) / 2,
          width: rectWidth,
          height: rectHeight,
        });
      }
      return newCropState;
    });
  };
  
  const handleApplyCrop = useCallback(() => {
    if (!cropRect || !canvasRef.current || !imageRef.current || !originalImageDimensions) return;
  
    setIsLoading(true);
    const sourceCanvas = canvasRef.current; 
    const img = imageRef.current; 
  
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) {
      setError("Failed to create temporary canvas for cropping.");
      setIsLoading(false);
      return;
    }
  
    const canvasEl = sourceCanvas;
    const cropRectOnCanvasX = cropRect.x - canvasEl.offsetLeft;
    const cropRectOnCanvasY = cropRect.y - canvasEl.offsetTop;
    
    const scaleX = canvasEl.width / canvasEl.clientWidth;
    const scaleY = canvasEl.height / canvasEl.clientHeight;

    const sx = cropRectOnCanvasX * scaleX;
    const sy = cropRectOnCanvasY * scaleY;
    const sWidth = cropRect.width * scaleX;
    const sHeight = cropRect.height * scaleY;
    
    tempCanvas.width = sWidth;
    tempCanvas.height = sHeight;

    tempCtx.drawImage(
      sourceCanvas,
      sx, sy, sWidth, sHeight,      
      0, 0, sWidth, sHeight         
    );
  
    const croppedDataUrl = tempCanvas.toDataURL(imageFile?.type || 'image/png');
    setImageSrc(croppedDataUrl);
    
    setOriginalImageDimensions({ width: Math.round(sWidth), height: Math.round(sHeight) });
  
    setRotation(0);
    setActiveFilter('none');
    
    setIsCroppingActive(false);
    setIsLoading(false);
  
  }, [cropRect, originalImageDimensions, imageFile?.type]);


  const getCursorForHandle = (handle: string | undefined) => {
    if (!handle) return 'move'; 
    switch (handle) {
      case 'nw': case 'se': return 'nwse-resize';
      case 'ne': case 'sw': return 'nesw-resize';
      case 'n': case 's': return 'ns-resize';
      case 'e': case 'w': return 'ew-resize';
      default: return 'default';
    }
  };

  const getHandleUnderCursor = (e: React.MouseEvent<HTMLDivElement>): string | null => {
    if (!cropRect || !cropOverlayRef.current) return null;
    
    // cropRect x,y,width,height are relative to cropOverlayRef
    const { x: cropX, y: cropY, width: cropWidth, height: cropHeight } = cropRect;
    const overlay = cropOverlayRef.current;
    const rect = overlay.getBoundingClientRect(); // Viewport-relative rect of the overlay div
    const mouseXInOverlay = e.clientX - rect.left; // mouseX relative to the overlay div
    const mouseYInOverlay = e.clientY - rect.top; // mouseY relative to the overlay div

    const handles: { name: string; hx: number; hy: number }[] = [
        { name: 'nw', hx: cropX, hy: cropY }, 
        { name: 'n', hx: cropX + cropWidth / 2, hy: cropY }, 
        { name: 'ne', hx: cropX + cropWidth, hy: cropY },
        { name: 'w', hx: cropX, hy: cropY + cropHeight / 2 }, 
        { name: 'e', hx: cropX + cropWidth, hy: cropY + cropHeight / 2 },
        { name: 'sw', hx: cropX, hy: cropY + cropHeight }, 
        { name: 's', hx: cropX + cropWidth / 2, hy: cropY + cropHeight }, 
        { name: 'se', hx: cropX + cropWidth, hy: cropY + cropHeight },
    ];

    for (const handle of handles) {
        if (Math.abs(mouseXInOverlay - handle.hx) < HANDLE_SIZE && Math.abs(mouseYInOverlay - handle.hy) < HANDLE_SIZE) {
            return handle.name;
        }
    }
    if (mouseXInOverlay > cropX && mouseXInOverlay < cropX + cropWidth && mouseYInOverlay > cropY && mouseYInOverlay < cropY + cropHeight) {
        return 'drag';
    }
    return null;
  };


  const handleCropMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isCroppingActive || !cropRect || !cropOverlayRef.current) return;
    e.preventDefault(); // Prevent text selection or other default actions
    const handle = getHandleUnderCursor(e);
    if (!handle) return;

    const overlay = cropOverlayRef.current;
    const rect = overlay.getBoundingClientRect();
    const startX = e.clientX - rect.left; // startX relative to overlay
    const startY = e.clientY - rect.top; // startY relative to overlay

    if (handle === 'drag') {
        setCropInteraction({ isDragging: true, startX, startY, startRect: { ...cropRect } });
    } else {
        setCropInteraction({ isResizing: true, resizeHandle: handle, startX, startY, startRect: { ...cropRect } });
    }
  };
  
  const handleCropMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isCroppingActive || !cropRect || !cropInteraction.startRect || !cropOverlayRef.current) return;
    if (!cropInteraction.isDragging && !cropInteraction.isResizing) return;
    
    e.preventDefault();
    const overlay = cropOverlayRef.current;
    const parentRect = overlay.getBoundingClientRect(); // This is the viewport-relative rect of the overlay
    const mouseX = e.clientX - parentRect.left; // mouseX relative to overlay
    const mouseY = e.clientY - parentRect.top; // mouseY relative to overlay

    const dx = mouseX - (cropInteraction.startX ?? 0);
    const dy = mouseY - (cropInteraction.startY ?? 0);
    let { x, y, width, height } = cropInteraction.startRect;

    if (cropInteraction.isDragging) {
        x += dx;
        y += dy;
    } else if (cropInteraction.isResizing && cropInteraction.resizeHandle) {
        const handle = cropInteraction.resizeHandle;
        if (handle.includes('e')) width = Math.max(MIN_CROP_SIZE, width + dx);
        if (handle.includes('w')) {
            const newWidth = Math.max(MIN_CROP_SIZE, width - dx);
            x += (width - newWidth); // Adjust x when resizing from left
            width = newWidth;
        }
        if (handle.includes('s')) height = Math.max(MIN_CROP_SIZE, height + dy);
        if (handle.includes('n')) {
            const newHeight = Math.max(MIN_CROP_SIZE, height - dy);
            y += (height - newHeight); // Adjust y when resizing from top
            height = newHeight;
        }
    }

    // Constrain to parent bounds (cropOverlayRef)
    const { clientWidth: parentWidth, clientHeight: parentHeight } = overlay;
    x = Math.max(0, Math.min(x, parentWidth - width));
    y = Math.max(0, Math.min(y, parentHeight - height));
    // Ensure width/height don't exceed bounds if x/y are at edges
    width = Math.min(width, parentWidth - x);
    height = Math.min(height, parentHeight - y);
    
    setCropRect({ x, y, width, height });
  };

  const handleCropMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isCroppingActive) return;
    e.preventDefault();
    setCropInteraction({}); 
  };
  
  const handleMouseLeaveCropArea = (e: React.MouseEvent<HTMLDivElement>) => {
    if (cropInteraction.isDragging || cropInteraction.isResizing) {
        handleCropMouseUp(e);
    }
  };


  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-indigo-400 flex items-center">
        <ImageIcon className="w-7 h-7 mr-2" /> Image Editor & Converter
      </h2>
      
      <img ref={imageRef} alt="Image Preload" style={{ display: 'none' }} crossOrigin="anonymous" />

      {!imageFile ? (
        <div className="space-y-4">
          <FileUploader onFileSelect={(file) => handleFileSelect(file)} accept="image/*" id="image-file-upload" />
          <div className="my-2 text-center text-gray-400 text-sm">OR</div>
          <div className="space-y-2">
            <label htmlFor="imageUrlEditor" className="block text-sm font-medium text-gray-300">
              Load from Image URL
            </label>
            <input
              type="url"
              id="imageUrlEditor"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.png"
              className="block w-full bg-gray-800 border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-white"
              aria-describedby="urlErrorImageEditor"
            />
            <button
              onClick={handleLoadFromUrl}
              disabled={isUrlLoading}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-75"
            >
              {isUrlLoading ? 'Loading Image...' : 'Load Image from URL'}
            </button>
            {isUrlLoading && <LoadingSpinner size="sm" text="Fetching image..." />}
            {urlError && <p id="urlErrorImageEditor" className="text-red-400 text-sm mt-1 p-2 bg-red-900 bg-opacity-30 rounded-md">{urlError}</p>}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <button
              onClick={resetAll}
              className="text-sm text-indigo-400 hover:text-indigo-300 mb-2"
            >
              &#8592; Choose another image or URL
          </button>
          
          <div 
            ref={cropOverlayRef}
            className="relative flex justify-center items-center bg-gray-700 p-1 sm:p-2 rounded-lg shadow-inner max-h-[50vh] overflow-hidden select-none"
            onMouseDown={handleCropMouseDown}
            onMouseMove={handleCropMouseMove}
            onMouseUp={handleCropMouseUp}
            onMouseLeave={handleMouseLeaveCropArea} 
            style={{ cursor: isCroppingActive ? getCursorForHandle(cropInteraction.resizeHandle || (cropInteraction.isDragging ? 'drag' : undefined)) : 'default' }}
          >
            <canvas 
                ref={canvasRef} 
                className="max-w-full max-h-[48vh] object-contain rounded"
                style={{ 
                    imageRendering: 'pixelated', 
                    filter: activeFilter !== 'none' && !isCroppingActive ? activeFilter : 'none' 
                }}
            />
            {isCroppingActive && cropRect && cropOverlayRef.current && (
              <>
                {/* Dim overlay parts, now using cropRect relative to cropOverlayRef */}
                <div className="absolute bg-black opacity-50 pointer-events-none" style={{ top: 0, left: 0, width: '100%', height: `${cropRect.y}px` }}></div>
                <div className="absolute bg-black opacity-50 pointer-events-none" style={{ top: `${cropRect.y + cropRect.height}px`, left: 0, width: '100%', bottom: 0 }}></div>
                <div className="absolute bg-black opacity-50 pointer-events-none" style={{ top: `${cropRect.y}px`, left: 0, width: `${cropRect.x}px`, height: `${cropRect.height}px` }}></div>
                <div className="absolute bg-black opacity-50 pointer-events-none" style={{ top: `${cropRect.y}px`, left: `${cropRect.x + cropRect.width}px`, right: 0, height: `${cropRect.height}px` }}></div>
                
                <div
                  className="absolute border-2 border-dashed border-blue-400 pointer-events-none"
                  style={{
                    left: `${cropRect.x}px`,
                    top: `${cropRect.y}px`,
                    width: `${cropRect.width}px`,
                    height: `${cropRect.height}px`,
                  }}
                >
                  {['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map(handle => (
                    <div
                      key={handle}
                      className="absolute bg-blue-500 border-2 border-blue-200 rounded-full shadow-lg"
                      style={{
                        width: `${HANDLE_SIZE}px`,
                        height: `${HANDLE_SIZE}px`,
                        cursor: getCursorForHandle(handle),
                        left: handle.includes('w') ? -HANDLE_SIZE / 2 : (handle.includes('e') ? cropRect.width - HANDLE_SIZE / 2 : cropRect.width / 2 - HANDLE_SIZE / 2),
                        top: handle.includes('n') ? -HANDLE_SIZE / 2 : (handle.includes('s') ? cropRect.height - HANDLE_SIZE / 2 : cropRect.height / 2 - HANDLE_SIZE / 2),
                        pointerEvents: 'all' 
                      }}
                      data-handle={handle} 
                    />
                  ))}
                </div>
              </>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 p-4 bg-gray-700 rounded-lg">
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                    onClick={toggleCropMode}
                    className={`w-full font-semibold py-2 px-4 rounded-lg transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-opacity-75
                                ${isCroppingActive ? 'bg-yellow-600 hover:bg-yellow-700 text-white focus:ring-yellow-500' 
                                                  : 'bg-purple-600 hover:bg-purple-700 text-white focus:ring-purple-500'}`}
                >
                   <CropIcon className="w-5 h-5 inline-block mr-2"/> {isCroppingActive ? 'Cancel Crop' : 'Enable Crop Mode'}
                </button>
                {isCroppingActive && (
                    <button
                        onClick={handleApplyCrop}
                        disabled={isLoading || !cropRect}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors shadow-md disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75"
                    >
                        Apply Crop
                    </button>
                )}
                 {!isCroppingActive && <div className="sm:col-span-2"></div>} 
                 {isCroppingActive && <div className="sm:col-span-1"></div>} 
            </div>


            {!isCroppingActive && (
              <>
                <div>
                  <label htmlFor="outputFormat" className="block text-sm font-medium text-gray-300">Output Format</label>
                  <select
                    id="outputFormat"
                    value={outputFormat}
                    onChange={(e) => setOutputFormat(e.target.value as OutputFormat)}
                    className="mt-1 block w-full bg-gray-800 border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-white"
                  >
                    <option value="png">PNG</option>
                    <option value="jpeg">JPEG</option>
                    <option value="webp">WEBP</option>
                  </select>
                </div>

                {(outputFormat === 'jpeg' || outputFormat === 'webp') && (
                  <div>
                    <label htmlFor="jpegQuality" className="block text-sm font-medium text-gray-300">
                      Quality: {Math.round(jpegQuality * 100)}%
                    </label>
                    <input
                      type="range"
                      id="jpegQuality"
                      min="0.1"
                      max="1"
                      step="0.01"
                      value={jpegQuality}
                      onChange={(e) => setJpegQuality(parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-indigo-500 mt-2"
                    />
                  </div>
                )}
                
                <div>
                    <label className="block text-sm font-medium text-gray-300">Transform</label>
                    <button
                        onClick={handleRotate}
                        className="mt-1 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
                    >
                        Rotate 90° (Current: {rotation}°)
                    </button>
                </div>
                 <div>
                    <label htmlFor="filterSelect" className="block text-sm font-medium text-gray-300">Filter</label>
                    <select
                        id="filterSelect"
                        value={activeFilter}
                        onChange={(e) => setActiveFilter(e.target.value)}
                        className="mt-1 block w-full bg-gray-800 border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-white"
                    >
                        {availableFilters.map(f => <option key={f.value} value={f.value}>{f.name}</option>)}
                    </select>
                </div>
              </>
            )}
          </div>
          
          {!isCroppingActive && (
            <button
                onClick={handleDownload}
                disabled={isLoading || !imageFile}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75"
            >
                {isLoading ? 'Processing...' : `Download as ${outputFormat.toUpperCase()}`}
            </button>
          )}

          {error && <p className="text-red-400 text-sm text-center p-2 bg-red-900 bg-opacity-30 rounded-md">{error}</p>}
          {isLoading && !isCroppingActive && <LoadingSpinner text="Processing image..." />}
        </div>
      )}
       <div className="mt-4 p-3 bg-yellow-900 bg-opacity-30 border border-yellow-700 rounded-md text-yellow-300 text-sm">
        <p className="font-semibold mb-1">Note:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>All image processing is done in your browser. Larger images may take more time.</li>
          <li>Loading images from some URLs might fail due to CORS unless the server allows it or the proxy can access it.</li>
          <li>Cropping is applied to the currently viewed image (including rotations/filters). These effects are baked in after cropping.</li>
        </ul>
      </div>
    </div>
  );
};

export default ImageEditor;
    