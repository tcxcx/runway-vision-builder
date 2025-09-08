/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// FIX: Implement the main App component, which was previously missing.
import React, { useState, useEffect, useCallback, useMemo } from 'react';

import Header from './components/Header';
import ProductSelector from './components/ProductSelector';
import ModelSelector from './components/ModelSelector';
import SceneSelector from './components/SceneSelector';
import AccessorySelector from './components/AccessorySelector';
import PoseSelector from './components/PoseSelector';
import Spinner from './components/Spinner';

// FIX: Import BaseItem to use as a type constraint for generic functions.
import { Product, Model, Scene, Accessory, Pose, GeneratedResult, GenerationState, BaseItem } from './types';
import { INITIAL_PRODUCTS, INITIAL_MODELS, INITIAL_SCENES, INITIAL_ACCESSORIES, INITIAL_POSES } from './data';
import { 
  composeFinalImage, 
  generateVideoDescription, 
  generateVideoPreview,
  generateFinalVideo, 
  removeBackground,
  checkVideoStatus,
} from './services/geminiService';

const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const PlayIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
    </svg>
);


const App: React.FC = () => {
  // UI State
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Data State
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [models, setModels] = useState<Model[]>(INITIAL_MODELS);
  const [scenes, setScenes] = useState<Scene[]>(INITIAL_SCENES);
  const [accessories, setAccessories] = useState<Accessory[]>(INITIAL_ACCESSORIES);
  const [poses] = useState<Pose[]>(INITIAL_POSES);

  // Selection State
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [selectedModels, setSelectedModels] = useState<Model[]>([]);
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedAccessories, setSelectedAccessories] = useState<Accessory[]>([]);
  const [selectedPose, setSelectedPose] = useState<Pose | null>(poses[0]);
  const [customPosePrompt, setCustomPosePrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9'>('9:16');
  
  // Generation State
  const [generationState, setGenerationState] = useState<GenerationState>('idle');
  const [generatedResults, setGeneratedResults] = useState<GeneratedResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isGenerateDisabled = useMemo(() => {
    return selectedProducts.length === 0 || selectedModels.length === 0 || (!selectedScene && !selectedColor) || !selectedPose || (selectedPose.name === 'Custom' && !customPosePrompt);
  }, [selectedProducts, selectedModels, selectedScene, selectedColor, selectedPose, customPosePrompt]);

  // FIX: Correct the generic constraint for item creation and use a safe type assertion.
  // The original constraint was missing `imageUrl`, causing a type mismatch.
  // The `as unknown as T` cast is used to satisfy TypeScript's strictness with generics,
  // as `T` could be a more specific subtype.
  // Handlers for adding/creating new items
  const createItem = useCallback(<T extends BaseItem>(
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    name: string,
    imageUrl: string
  ) => {
    setter(prev => {
      const newItem: T = {
        id: Date.now(),
        name,
        imageUrl,
        isCustom: true,
      } as unknown as T;
      return [newItem, ...prev];
    });
  }, []);
  
  const uploadAndAddItem = useCallback(async <T extends BaseItem>(
    file: File,
    setter: React.Dispatch<React.SetStateAction<T[]>>
  ) => {
    const imageUrl = await fileToDataUrl(file);
    createItem(setter, file.name, imageUrl);
  }, [createItem]);

  // Model-specific upload handler with background removal
  const handleUploadAndProcessModel = async (file: File) => {
    const imageUrl = await fileToDataUrl(file);
    const processedImageUrl = await removeBackground(imageUrl);
    createItem(setModels, `Uploaded: ${file.name}`, processedImageUrl);
  };

  const deleteItem = useCallback(<T extends { id: number }>(
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    id: number
  ) => {
    setter(prev => prev.filter(item => item.id !== id));
  }, []);

  // Selection handlers
  const handleSelectProduct = (product: Product) => {
    setSelectedProducts(prev => 
      prev.some(p => p.id === product.id)
        ? prev.filter(p => p.id !== product.id)
        : [...prev, product]
    );
  };

  const handleSelectModel = (model: Model) => {
    setSelectedModels(prev =>
      prev.some(m => m.id === model.id)
        ? prev.filter(m => m.id !== model.id)
        : [...prev, model]
    );
  };
  
  const handleSelectScene = (scene: Scene) => {
    setSelectedScene(scene);
    setSelectedColor(null);
  };

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    setSelectedScene(null);
  };
  
  const handleSelectAccessory = (accessory: Accessory) => {
    setSelectedAccessories(prev =>
      prev.some(a => a.id === accessory.id)
        ? prev.filter(a => a.id !== accessory.id)
        : [...prev, accessory]
    );
  };
  
  // Generation Flow
  const handleGenerate = useCallback(async () => {
    if (isGenerateDisabled) return;
    setError(null);
    setGenerationState('loading-image');
    try {
      const composedResults = await composeFinalImage(selectedModels, selectedProducts, selectedScene, selectedAccessories, selectedPose!, customPosePrompt, selectedColor, aspectRatio);
      
      let initialResults: GeneratedResult[] = composedResults.map(res => {
        const representativeImage = res.images.find(img => img.angle === 'Front View')?.image || res.images[0]?.image;
        return {
          model: res.model,
          images: res.images,
          representativeImage: representativeImage,
          activeDisplayUrl: representativeImage,
          aspectRatio: aspectRatio,
        };
      });
      
      const descriptions = await Promise.all(
        initialResults.map(result => {
           if (result.images.length === 0) {
            return Promise.resolve("Could not generate video description: no images found.");
          }
          return generateVideoDescription(
            result.images,
            result.model,
            selectedProducts,
            selectedAccessories,
            selectedScene
          );
        })
      );
      
      initialResults = initialResults.map((res, i) => ({ ...res, videoPrompt: descriptions[i] }));
      setGeneratedResults(initialResults);
      setGenerationState('image-success');

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An unknown error occurred during generation.");
      setGenerationState('error');
    }
  }, [isGenerateDisabled, selectedModels, selectedProducts, selectedScene, selectedAccessories, selectedPose, customPosePrompt, selectedColor, aspectRatio]);

  const handleGeneratePreview = useCallback(async (resultIndex: number) => {
    const targetResult = generatedResults[resultIndex];
    if (!targetResult || !targetResult.videoPrompt || !targetResult.representativeImage) return;

    setGeneratedResults(prev => prev.map((res, i) => i === resultIndex ? { ...res, isPreviewLoading: true, previewError: undefined } : res));

    try {
      const operation = await generateVideoPreview(targetResult.videoPrompt, targetResult.representativeImage, targetResult.aspectRatio);
      setGeneratedResults(prev => prev.map((res, i) => i === resultIndex ? { ...res, previewVideoOperation: operation } : res));
    } catch (err) {
       setGeneratedResults(prev => prev.map((res, i) => i === resultIndex ? { ...res, isPreviewLoading: false, previewError: err instanceof Error ? `Failed to start video preview generation. Details: ${err.message}` : 'Failed' } : res));
    }
  }, [generatedResults]);
  
  const handleGenerateFinalVideo = useCallback(async (resultIndex: number) => {
    const targetResult = generatedResults[resultIndex];
    if (!targetResult || !targetResult.videoPrompt || !targetResult.representativeImage) return;

    setGeneratedResults(prev => prev.map((res, i) => i === resultIndex ? { ...res, isFinalLoading: true, finalError: undefined } : res));

    try {
      const operation = await generateFinalVideo(targetResult.videoPrompt, targetResult.representativeImage, targetResult.aspectRatio);
      setGeneratedResults(prev => prev.map((res, i) => i === resultIndex ? { ...res, finalVideoOperation: operation } : res));
    } catch (err) {
       setGeneratedResults(prev => prev.map((res, i) => i === resultIndex ? { ...res, isFinalLoading: false, finalError: err instanceof Error ? `Failed to start final video generation. Details: ${err.message}` : 'Failed' } : res));
    }
  }, [generatedResults]);

  // Video Polling Effect
  useEffect(() => {
    const activeOperations = generatedResults.some(r => r.previewVideoOperation || r.finalVideoOperation);
    if (!activeOperations) return;

    const interval = setInterval(async () => {
      let needsStateUpdate = false;
      const updatedResults = [...generatedResults];

      for (let i = 0; i < updatedResults.length; i++) {
        const result = updatedResults[i];
        
        // Check Preview Video
        if (result.previewVideoOperation && !result.previewVideo) {
          try {
            const videoUrl = await checkVideoStatus(result.previewVideoOperation);
            if (videoUrl) {
              result.previewVideo = videoUrl;
              result.activeDisplayUrl = videoUrl;
              result.previewVideoOperation = null;
              result.isPreviewLoading = false;
              needsStateUpdate = true;
            }
          } catch (err) {
             result.previewError = err instanceof Error ? err.message : "Preview failed.";
             if ((err as any).directDownloadUrl) {
               result.previewVideoDirectLink = (err as any).directDownloadUrl;
             }
             result.previewVideoOperation = null;
             result.isPreviewLoading = false;
             needsStateUpdate = true;
          }
        }
        
        // Check Final Video
        if (result.finalVideoOperation && !result.finalVideo) {
           try {
            const videoUrl = await checkVideoStatus(result.finalVideoOperation);
            if (videoUrl) {
              result.finalVideo = videoUrl;
              result.activeDisplayUrl = videoUrl;
              result.finalVideoOperation = null;
              result.isFinalLoading = false;
              needsStateUpdate = true;
            }
          } catch (err) {
             result.finalError = err instanceof Error ? err.message : "Final video failed.";
             if ((err as any).directDownloadUrl) {
               result.finalVideoDirectLink = (err as any).directDownloadUrl;
             }
             result.finalVideoOperation = null;
             result.isFinalLoading = false;
             needsStateUpdate = true;
          }
        }
      }

      if (needsStateUpdate) {
        setGeneratedResults(updatedResults);
      }
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, [generatedResults]);

  const handleStartOver = () => {
    setGenerationState('idle');
    setGeneratedResults([]);
    setError(null);
    setSelectedProducts([]);
    setSelectedModels([]);
    setSelectedScene(null);
    setSelectedColor(null);
    setSelectedAccessories([]);
    setSelectedPose(poses[0]);
    setCustomPosePrompt('');
  };

  useEffect(() => {
    document.body.className = theme === 'light' ? 'light-mode' : '';
  }, [theme]);

  const handleFullscreen = (event: React.MouseEvent<HTMLButtonElement>) => {
    const container = event.currentTarget.parentElement;
    const video = container?.querySelector('video');
    if (video) {
      video.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    }
  };
  
  const handleSetActiveDisplay = (resultIndex: number, url: string) => {
    setGeneratedResults(prev => prev.map((res, i) => i === resultIndex ? { ...res, activeDisplayUrl: url } : res));
  };


  const renderGenerationStatus = () => {
    switch (generationState) {
      case 'loading-image':
        return "Generating initial photoshoot images...";
      case 'image-success':
        return "Your photoshoot is ready! Now, bring it to life.";
      case 'error':
        return "Something went wrong during image generation.";
      default:
        return "";
    }
  };

  return (
    <div className={`min-h-screen bg-[var(--background-primary)] text-[var(--text-primary)] font-sans antialiased`}>
      <Header onLogoClick={handleStartOver} theme={theme} setTheme={setTheme} />
      
      <main className="container mx-auto p-4 lg:p-8">
        {generationState === 'idle' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <section>
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">1. Select Clothing & Accessories</h2>
                <ProductSelector
                  products={products}
                  selectedProducts={selectedProducts}
                  onSelectProduct={handleSelectProduct}
                  onAddProduct={(file) => uploadAndAddItem(file, setProducts)}
                  onDeleteProduct={(id) => deleteItem(setProducts, id)}
                  onProductCreated={(name, imageUrl) => createItem(setProducts, name, imageUrl)}
                />
                <div className="mt-6">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Accessories</h3>
                     <AccessorySelector
                      accessories={accessories}
                      selectedAccessories={selectedAccessories}
                      onSelectAccessory={handleSelectAccessory}
                      onAddAccessory={(file) => uploadAndAddItem(file, setAccessories)}
                      onDeleteAccessory={(id) => deleteItem(setAccessories, id)}
                      onAccessoryCreated={(name, imageUrl) => createItem(setAccessories, name, imageUrl)}
                    />
                </div>
              </section>
              <section>
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">2. Select Model</h2>
                <ModelSelector 
                  models={models}
                  selectedModels={selectedModels}
                  onSelectModel={handleSelectModel}
                  onModelCreated={(name, imageUrl) => createItem(setModels, name, imageUrl)}
                  onDeleteModel={(id) => deleteItem(setModels, id)}
                  onUploadAndProcessModel={handleUploadAndProcessModel}
                />
              </section>
              <section>
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">3. Select Scene</h2>
                 <SceneSelector 
                    scenes={scenes}
                    selectedScene={selectedScene}
                    onSelectScene={handleSelectScene}
                    selectedColor={selectedColor}
                    onColorChange={handleColorChange}
                    onAddScene={(file) => uploadAndAddItem(file, setScenes)}
                    onSceneCreated={(name, imageUrl) => createItem(setScenes, name, imageUrl)}
                    onDeleteScene={(id) => deleteItem(setScenes, id)}
                 />
              </section>
                <section>
                    <PoseSelector
                        poses={poses}
                        selectedPose={selectedPose}
                        onSelectPose={setSelectedPose}
                        customPosePrompt={customPosePrompt}
                        onCustomPosePromptChange={setCustomPosePrompt}
                    />
              </section>
            </div>
            
            <aside className="lg:col-span-1 sticky top-24 h-fit bg-[var(--background-secondary)] p-6 rounded-lg shadow-lg">
              <h3 className="text-2xl font-bold mb-4">Your Runway</h3>
              <div className="space-y-4 text-sm">
                <p><strong>Models:</strong> {selectedModels.map(m => m.name).join(', ') || 'None'}</p>
                <p><strong>Clothing:</strong> {selectedProducts.map(p => p.name).join(', ') || 'None'}</p>
                <p><strong>Accessories:</strong> {selectedAccessories.map(a => a.name).join(', ') || 'None'}</p>
                <p><strong>Scene:</strong> {selectedScene?.name || (selectedColor ? `Solid: ${selectedColor}` : 'None')}</p>
                <p><strong>Pose:</strong> {selectedPose?.name || 'None'}</p>
              </div>
                <div className="mt-4 pt-4 border-t border-[var(--border-secondary)]">
                    <p className="font-semibold text-sm mb-2 text-center">Output Format</p>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => setAspectRatio('9:16')}
                            className={`py-2 px-3 rounded-md text-sm font-semibold transition-colors ${aspectRatio === '9:16' ? 'bg-[var(--accent-blue)] text-[var(--text-inverted)]' : 'bg-[var(--background-tertiary)] hover:bg-opacity-80'}`}
                        >
                            Vertical (9:16)
                        </button>
                        <button
                            onClick={() => setAspectRatio('16:9')}
                            className={`py-2 px-3 rounded-md text-sm font-semibold transition-colors ${aspectRatio === '16:9' ? 'bg-[var(--accent-blue)] text-[var(--text-inverted)]' : 'bg-[var(--background-tertiary)] hover:bg-opacity-80'}`}
                        >
                            Horizontal (16:9)
                        </button>
                    </div>
                </div>
              <button
                onClick={handleGenerate}
                disabled={isGenerateDisabled}
                className="w-full mt-6 bg-[var(--accent-magenta)] text-[var(--text-button)] font-bold py-3 px-4 rounded-lg transition-transform hover:scale-105 disabled:bg-[var(--disabled-bg)] disabled:text-[var(--disabled-text)] disabled:cursor-not-allowed disabled:scale-100"
              >
                Generate Photoshoot
              </button>
               {isGenerateDisabled && <p className="text-xs text-center mt-2 text-[var(--text-secondary)]">Please make a selection for each category.</p>}
            </aside>
          </div>
        ) : (
           <div className="text-center py-16">
            <h2 className="text-3xl font-bold mb-4">{renderGenerationStatus()}</h2>
            {generationState === 'loading-image' && (
              <div className="my-8">
                <Spinner />
              </div>
            )}

            {error && (
              <div className="my-8 p-4 bg-[var(--error-bg)] border border-[var(--error-border)] rounded-lg max-w-2xl mx-auto">
                <p className="font-bold text-[var(--error-text)]">An error occurred:</p>
                <p className="text-sm mt-2 text-[var(--error-text-soft)]">{error}</p>
              </div>
            )}

            <div className="flex flex-col items-center gap-12 mt-8">
              {generatedResults.map((result, index) => (
                <div key={result.model.id} className="bg-[var(--background-secondary)] p-6 rounded-lg shadow-lg w-full max-w-5xl mx-auto space-y-6">
                  <h3 className="font-bold text-2xl text-center">{result.model.name}</h3>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {/* Main Display Area */}
                    <div className={`md:col-span-3 w-full bg-[var(--background-tertiary)] rounded-lg overflow-hidden flex items-center justify-center ${result.aspectRatio === '16:9' ? 'aspect-video' : 'aspect-[9/16]'}`}>
                      {result.activeDisplayUrl?.startsWith('data:video/') || result.activeDisplayUrl?.startsWith('blob:') ? (
                        <div className="relative group w-full h-full">
                          <video src={result.activeDisplayUrl} controls autoPlay loop muted className="w-full h-full object-contain bg-[var(--background-tertiary)]"></video>
                          <button 
                              onClick={handleFullscreen}
                              className="absolute bottom-2 right-2 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Enter Fullscreen"
                              aria-label="Enter Fullscreen"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 0h-4m4 0l-5-5" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <img src={result.activeDisplayUrl} alt="Main display" className="w-full h-full object-contain" />
                      )}
                    </div>

                    {/* Thumbnails Area */}
                    <div className="md:col-span-1 flex md:flex-col gap-4 overflow-x-auto md:overflow-x-visible pb-2">
                        {result.images.map(shot => (
                            <div
                                key={shot.image}
                                onClick={() => handleSetActiveDisplay(index, shot.image)}
                                className={`relative group cursor-pointer rounded-md overflow-hidden border-2 transition-all w-28 aspect-square md:w-full flex-shrink-0 ${result.activeDisplayUrl === shot.image ? 'border-[var(--accent-blue)]' : 'border-transparent hover:border-[var(--accent-magenta)]'}`}
                                title={`View ${shot.angle}`}
                            >
                                <img src={shot.image} alt={shot.angle} className="w-full h-full object-cover"/>
                                <div className="absolute bottom-0 left-0 right-0 p-1 text-center bg-black/50">
                                    <p className="text-xs text-white font-semibold truncate">{shot.angle}</p>
                                </div>
                            </div>
                        ))}
                        {result.previewVideo && (
                            <div
                                onClick={() => handleSetActiveDisplay(index, result.previewVideo!)}
                                className={`relative group cursor-pointer rounded-md overflow-hidden border-2 transition-all w-28 aspect-square md:w-full flex-shrink-0 ${result.activeDisplayUrl === result.previewVideo ? 'border-[var(--accent-blue)]' : 'border-transparent hover:border-[var(--accent-magenta)]'}`}
                                title="View Preview Video"
                           >
                                <img src={result.representativeImage} alt="Preview Video Thumbnail" className="w-full h-full object-cover"/>
                                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                                    <PlayIcon className="h-8 w-8 text-white/80" />
                                    <p className="text-xs text-white font-semibold mt-1">Preview</p>
                                </div>
                            </div>
                        )}
                        {result.finalVideo && (
                           <div
                                onClick={() => handleSetActiveDisplay(index, result.finalVideo!)}
                                className={`relative group cursor-pointer rounded-md overflow-hidden border-2 transition-all w-28 aspect-square md:w-full flex-shrink-0 ${result.activeDisplayUrl === result.finalVideo ? 'border-[var(--accent-blue)]' : 'border-transparent hover:border-[var(--accent-magenta)]'}`}
                                title="View HQ Video"
                           >
                                <img src={result.representativeImage} alt="HQ Video Thumbnail" className="w-full h-full object-cover"/>
                                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                                    <PlayIcon className="h-8 w-8 text-white/80" />
                                    <p className="text-xs text-white font-semibold mt-1">HQ Video</p>
                                </div>
                            </div>
                        )}
                    </div>
                  </div>

                  {/* Buttons Section */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[var(--border-secondary)]">
                    {/* Preview Video Button */}
                    <div>
                        {result.previewVideo ? (
                             <div className="w-full bg-[var(--success-bg)] text-[var(--success-text)] font-bold py-2 px-4 rounded-lg text-center text-sm">Preview Ready</div>
                        ) : result.isPreviewLoading ? (
                             <div className="w-full aspect-video bg-[var(--background-tertiary)] flex flex-col items-center justify-center rounded-md p-4">
                                <Spinner />
                                <p className="text-xs mt-2 text-[var(--text-secondary)]">Generating preview...</p>
                            </div>
                        ) : result.previewError ? (
                            <div className="bg-[var(--error-bg)] rounded-md p-3 text-[var(--error-text)] text-left h-full flex flex-col justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-center">Preview Failed</p>
                                    <p className="text-xs mt-2 text-[var(--error-text-soft)] break-all w-full">{result.previewError}</p>
                                </div>
                                {result.previewVideoDirectLink && (
                                    <a 
                                        href={result.previewVideoDirectLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block w-full text-center mt-3 bg-[var(--info-bg)] hover:bg-[var(--info-bg-hover)] text-[var(--info-text)] text-xs font-bold py-1.5 px-2 rounded-md"
                                    >
                                        Download Manually
                                    </a>
                                )}
                            </div>
                        ) : (
                            <button onClick={() => handleGeneratePreview(index)} className="w-full bg-[var(--accent-blue)]/80 text-[var(--text-button)] font-bold py-2 px-4 rounded-lg hover:bg-[var(--accent-blue)]">Generate Preview</button>
                        )}
                    </div>

                    {/* Final Video Button */}
                    <div>
                        {result.finalVideo ? (
                             <div className="w-full bg-[var(--success-bg)] text-[var(--success-text)] font-bold py-2 px-4 rounded-lg text-center text-sm">HQ Video Ready</div>
                        ) : result.isFinalLoading ? (
                             <div className="w-full aspect-video bg-[var(--background-tertiary)] flex flex-col items-center justify-center rounded-md p-4">
                                <Spinner />
                                <p className="text-xs mt-2 text-[var(--text-secondary)]">Generating HQ video...</p>
                                <p className="text-xs mt-1 text-[var(--text-secondary)]">(This may take a minute)</p>
                            </div>
                        ) : result.finalError ? (
                             <div className="bg-[var(--error-bg)] rounded-md p-3 text-[var(--error-text)] text-left h-full flex flex-col justify-between">
                                 <div>
                                    <p className="text-sm font-semibold text-center">HQ Video Failed</p>
                                    <p className="text-xs mt-2 text-[var(--error-text-soft)] break-all w-full">{result.finalError}</p>
                                </div>
                                {result.finalVideoDirectLink && (
                                     <a 
                                        href={result.finalVideoDirectLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block w-full text-center mt-3 bg-[var(--info-bg)] hover:bg-[var(--info-bg-hover)] text-[var(--info-text)] text-xs font-bold py-1.5 px-2 rounded-md"
                                    >
                                        Download Manually
                                    </a>
                                )}
                            </div>
                        ) : (
                            <button onClick={() => handleGenerateFinalVideo(index)} className="w-full bg-[var(--accent-magenta)] text-[var(--text-button)] font-bold py-2 px-4 rounded-lg hover:bg-opacity-80">Generate HQ Video</button>
                        )}
                    </div>
                  </div>

                </div>
              ))}
            </div>

            {(generationState === 'image-success' || generationState === 'error') && (
              <button onClick={handleStartOver} className="mt-12 bg-[var(--accent-blue)] text-[var(--text-button)] font-bold py-3 px-6 rounded-lg hover:bg-opacity-80">
                Start Over
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;