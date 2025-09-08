

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import ObjectCard from './ObjectCard';
import TabButton from './TabButton';
import Spinner from './Spinner';
import CameraView from './CameraView';
import { Model } from '../types';
import { generateModel } from '../services/geminiService';

interface ModelSelectorProps {
  models: Model[];
  selectedModels: Model[];
  onSelectModel: (model: Model) => void;
  onModelCreated: (name: string, imageUrl: string) => void;
  onDeleteModel: (id: number) => void;
  onUploadAndProcessModel: (file: File) => Promise<void>;
}

type ActiveTab = 'catalogue' | 'create' | 'upload' | 'camera';

const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) throw new Error('Invalid data URL');
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
};

const PlusIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14" />
        <path d="M12 5v14" />
    </svg>
);

const ModelSelector: React.FC<ModelSelectorProps> = ({ models, selectedModels, onSelectModel, onModelCreated, onDeleteModel, onUploadAndProcessModel }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('catalogue');
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsLoading(true);
    setError(null);
    setGeneratedImageUrl(null);
    try {
      const result = await generateModel(prompt);
      if (result.imageUrl) {
        setGeneratedImageUrl(result.imageUrl);
      } else {
        throw new Error("The model did not return an image.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveGenerated = () => {
    if (generatedImageUrl) {
      onModelCreated(prompt, generatedImageUrl);
      setPrompt('');
      setGeneratedImageUrl(null);
      setActiveTab('catalogue');
    }
  };
  
  const processFile = async (file: File) => {
      setIsProcessing(true);
      setProcessingError(null);
      try {
        await onUploadAndProcessModel(file);
        setActiveTab('catalogue');
        setCapturedImage(null);
      } catch (err) {
        setProcessingError(err instanceof Error ? err.message : "An unknown error occurred during processing.");
      } finally {
        setIsProcessing(false);
      }
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const triggerFileUpload = () => {
    setProcessingError(null);
    fileInputRef.current?.click();
  };

  const handleCapture = (dataUrl: string) => {
    setCapturedImage(dataUrl);
  };
    
  const handleRetake = () => {
      setCapturedImage(null);
      setProcessingError(null);
  };

  const handleUsePhoto = () => {
      if (capturedImage) {
          const file = dataURLtoFile(capturedImage, `model-capture-${Date.now()}.jpg`);
          processFile(file);
      }
  };

  return (
    <div className="w-full">
      <input type="file" ref={fileInputRef} onChange={handleFileSelected} accept="image/png, image/jpeg, image/webp" className="hidden" />
      <div className="flex border-b border-[var(--border-secondary)] mb-4">
        <TabButton label="Catalogue" isActive={activeTab === 'catalogue'} onClick={() => setActiveTab('catalogue')} />
        <TabButton label="Create with AI" isActive={activeTab === 'create'} onClick={() => setActiveTab('create')} />
        <TabButton label="Upload" isActive={activeTab === 'upload'} onClick={() => setActiveTab('upload')} />
        <TabButton label="Become the Model" isActive={activeTab === 'camera'} onClick={() => setActiveTab('camera')} />
      </div>

      {activeTab === 'catalogue' && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {models.map((model) => (
            <ObjectCard
              key={model.id}
              item={model}
              isSelected={selectedModels.some(m => m.id === model.id)}
              onClick={() => onSelectModel(model)}
              onDelete={model.isCustom ? onDeleteModel : undefined}
            />
          ))}
          <div
            onClick={!isProcessing ? triggerFileUpload : undefined}
            className={`flex flex-col items-center justify-center text-center p-4 aspect-square bg-[var(--background-tertiary)] rounded-lg border-2 border-dashed border-[var(--border-tertiary)] text-[var(--text-secondary)] transition-colors ${!isProcessing ? 'cursor-pointer hover:border-[var(--accent-blue)] hover:text-[var(--accent-blue)]' : 'cursor-wait'}`}
            title={isProcessing ? "Processing uploaded model..." : "Add new from file"}
          >
            {isProcessing ? (
                <>
                    <Spinner size="sm" />
                    <span className="font-semibold text-xs mt-2">Processing...</span>
                </>
            ) : (
                <>
                    <PlusIcon className="w-8 h-8 mb-2" />
                    <span className="font-semibold text-sm">Add New</span>
                </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'create' && (
        <div className="space-y-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., a professional female fashion model with long blonde hair and blue eyes"
            className="w-full p-2 bg-[var(--background-secondary)] border border-[var(--border-tertiary)] rounded-md focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-[var(--accent-blue)] text-[var(--text-primary)]"
            rows={3}
          />
          <button
            onClick={handleGenerate}
            disabled={isLoading || !prompt}
            className="w-full bg-[var(--accent-blue)] text-[var(--text-button)] font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-[var(--disabled-bg)] disabled:text-[var(--disabled-text)] hover:enabled:bg-white"
          >
            {isLoading ? 'Generating...' : 'Generate'}
          </button>

          {isLoading && <Spinner />}
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          {generatedImageUrl && (
            <div className="space-y-2 text-center">
              <img src={generatedImageUrl} alt="Generated model" className="w-full aspect-[3/4] object-cover rounded-md border border-[var(--border-secondary)]" />
              <button
                onClick={handleSaveGenerated}
                className="w-full bg-[var(--accent-blue)] text-[var(--text-button)] font-bold py-2 px-4 rounded-lg hover:bg-white"
              >
                Save to Catalogue
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'upload' && (
        <div className="space-y-4 text-center p-8 border-2 border-dashed border-[var(--border-secondary)] rounded-lg">
          <h4 className="text-lg font-semibold">Upload Your Own Model</h4>
          <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
              Our AI will prepare your photo to be used as a fashion model by placing them on a neutral background.
          </p>
          <button
              onClick={triggerFileUpload}
              disabled={isProcessing}
              className="bg-[var(--accent-blue)] text-[var(--text-button)] font-bold py-2 px-4 rounded-lg hover:bg-white disabled:bg-[var(--disabled-bg)] disabled:text-[var(--disabled-text)]"
          >
              {isProcessing ? 'Processing...' : 'Choose an Image'}
          </button>
          {isProcessing && <div className="pt-4"><Spinner /></div>}
          {processingError && <p className="text-red-500 text-sm mt-2">{processingError}</p>}
        </div>
      )}

      {activeTab === 'camera' && (
        <div className="space-y-4 text-center p-4">
            <h4 className="text-lg font-semibold">Become the Model</h4>
            <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
                Use your camera to take a photo. Our AI will turn it into a professional model shot.
            </p>
            <CameraView 
                onCapture={handleCapture}
                isProcessing={isProcessing}
                processingError={processingError}
                capturedImage={capturedImage}
                onRetake={handleRetake}
                onUsePhoto={handleUsePhoto}
            />
        </div>
      )}
    </div>
  );
};

export default ModelSelector;