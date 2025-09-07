/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useRef, useEffect, useState } from 'react';
import Spinner from './Spinner';

interface CameraViewProps {
  onCapture: (dataUrl: string) => void;
  isProcessing: boolean;
  processingError: string | null;
  onRetake: () => void;
  onUsePhoto: () => void;
  capturedImage: string | null;
}

const CameraView: React.FC<CameraViewProps> = ({ 
    onCapture, 
    isProcessing,
    processingError,
    onRetake,
    onUsePhoto,
    capturedImage
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStreamActive, setIsStreamActive] = useState(false);

  useEffect(() => {
    // This effect manages the camera stream's entire lifecycle. It starts the
    // camera when needed and ensures it's properly shut down on cleanup.
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      // Don't start the camera if we already have a captured image.
      if (capturedImage) {
        setIsStreamActive(false);
        return;
      }

      setError(null);
      setIsStreamActive(false);

      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1280 }, 
            height: { ideal: 720 }, 
            facingMode: 'user' 
          } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Set stream active only after metadata is loaded to ensure video is ready.
          videoRef.current.onloadedmetadata = () => {
            setIsStreamActive(true);
          };
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        if (err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")) {
          setError("Camera permission denied. Please allow camera access in your browser settings to use this feature.");
        } else {
          setError("Could not access the camera. Please check your browser permissions and ensure a camera is connected.");
        }
      }
    };

    startCamera();

    // The cleanup function is critical. It's called when the component unmounts
    // (e.g., switching tabs) or when the effect's dependencies change.
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setIsStreamActive(false);
    };
  }, [capturedImage]);

  const handleCapture = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        // Flip the image horizontally for a mirror effect, matching the preview.
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        onCapture(dataUrl);
      }
    }
  };
  
  if (isProcessing) {
      return (
          <div className="text-center p-8 space-y-4">
              <Spinner />
              <p className="font-semibold">Preparing your model shot...</p>
              <p className="text-sm text-zinc-500">The AI is creating a professional portrait for you.</p>
          </div>
      );
  }

  if (processingError) {
      return (
        <div className="text-center p-8 space-y-4">
            <p className="text-red-600 font-semibold">Processing Failed</p>
            <p className="text-sm text-zinc-500">{processingError}</p>
            <button
                onClick={onRetake}
                className="bg-zinc-800 text-white font-bold py-2 px-4 rounded-lg hover:bg-zinc-900"
            >
                Try Again
            </button>
        </div>
      );
  }

  if (capturedImage) {
    return (
      <div className="space-y-4 text-center">
        <img src={capturedImage} alt="Captured" className="w-full max-w-sm mx-auto aspect-[3/4] object-cover rounded-md border" />
        <div className="flex gap-4 max-w-sm mx-auto">
            <button
                onClick={onRetake}
                className="flex-1 bg-zinc-200 text-zinc-800 font-bold py-2 px-4 rounded-lg hover:bg-zinc-300"
            >
                Retake
            </button>
            <button
                onClick={onUsePhoto}
                className="flex-1 bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700"
            >
                Use This Photo
            </button>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-600 text-center p-8 bg-red-50 rounded-lg">{error}</div>;
  }

  return (
    <div className="space-y-4 text-center">
      <div className="relative w-full max-w-sm mx-auto aspect-[3/4] bg-zinc-900 rounded-lg overflow-hidden border">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100"></video>
        {!isStreamActive && <div className="absolute inset-0 flex items-center justify-center"><Spinner /></div>}
      </div>
      <button
        onClick={handleCapture}
        disabled={!isStreamActive}
        className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-zinc-400"
      >
        Take Photo
      </button>
    </div>
  );
};

export default CameraView;