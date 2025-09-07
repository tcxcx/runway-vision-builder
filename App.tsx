/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
// FIX: Replace placeholder content with a complete, functional React component.
// This resolves "not a module" errors and provides the application's core logic.
import React, { useState, useEffect, useCallback, useMemo } from 'react';

import Header from './components/Header';
import ProductSelector from './components/ProductSelector';
import ModelSelector from './components/ModelSelector';
import SceneSelector from './components/SceneSelector';
import AccessorySelector from './components/AccessorySelector';
import PoseSelector from './components/PoseSelector';
import Spinner from './components/Spinner';
import Tooltip from './components/Tooltip';
import HoverCard from './components/HoverCard';

import { INITIAL_PRODUCTS, INITIAL_MODELS, INITIAL_SCENES, INITIAL_ACCESSORIES, INITIAL_POSES } from './data';
import { Product, Model, Scene, Accessory, Pose, GeneratedResult, GenerationState, StylistSuggestion, Collection } from './types';

import { 
  generateProductShot,
  createProductCutout,
  generateDescriptionForVideo,
  generateRunwayVideo,
  pollVideoOperation,
  getStylingSuggestions,
  processUploadedModelImage
} from './services/geminiService';

const App: React.FC = () => {
  // Theme
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('vision-runway-theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme;
    }
    // Default to dark if no preference or system preference is light
    return 'dark';
  });

  useEffect(() => {
    document.body.classList.remove('light-mode');
    if (theme === 'light') {
      document.body.classList.add('light-mode');
    }
    localStorage.setItem('vision-runway-theme', theme);
  }, [theme]);

  // Catalogues
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [models, setModels] = useState<Model[]>(INITIAL_MODELS);
  const [scenes, setScenes] = useState<Scene[]>(INITIAL_SCENES);
  const [accessories, setAccessories] = useState<Accessory[]>(INITIAL_ACCESSORIES);
  const [poses] = useState<Pose[]>(INITIAL_POSES);

  // Selections
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [selectedModels, setSelectedModels] = useState<Model[]>([]);
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedAccessories, setSelectedAccessories] = useState<Accessory[]>([]);
  const [selectedPose, setSelectedPose] = useState<Pose | null>(poses[0]);
  const [customPosePrompt, setCustomPosePrompt] = useState<string>(
    INITIAL_POSES.find(p => p.name === 'Custom')?.prompt || 'A dynamic, high-fashion pose.'
  );

  // Generation
  const [generationState, setGenerationState] = useState<GenerationState>('idle');
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generatedResult, setGeneratedResult] = useState<GeneratedResult[] | null>(null);
  const [videoDescription, setVideoDescription] = useState<string>('');
  const [negativePrompt, setNegativePrompt] = useState<string>('');
  
  // App Features
  const [stylistSuggestions, setStylistSuggestions] = useState<StylistSuggestion[]>([]);
  const [isStylistLoading, setIsStylistLoading] = useState(false);
  const [lookbook, setLookbook] = useState<Collection[]>([]);
  const [lockedCharacterImage, setLockedCharacterImage] = useState<string | null>(null);
  
  const isGenerateDisabled = useMemo(() => {
    return selectedProducts.length === 0 || selectedModels.length === 0 || !selectedPose || (!selectedScene && !selectedColor) || (generationState !== 'idle' && generationState !== 'success' && generationState !== 'error');
  }, [selectedProducts, selectedModels, selectedPose, selectedScene, selectedColor, generationState]);

  const resetSelections = useCallback(() => {
    setSelectedProducts([]);
    setSelectedModels([]);
    setSelectedScene(null);
    setSelectedColor(null);
    setSelectedAccessories([]);
    setSelectedPose(poses[0]);
    setGeneratedResult(null);
    setGenerationState('idle');
    setGenerationError(null);
    setLockedCharacterImage(null);
    setCustomPosePrompt(INITIAL_POSES.find(p => p.name === 'Custom')?.prompt || 'A dynamic, high-fashion pose.');
    setNegativePrompt('');
  }, [poses]);

  // File to Data URL converter
  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
  };
  
  // Handlers for adding custom items
  const createItemHandler = <T extends Product | Scene | Model | Accessory>(setter: React.Dispatch<React.SetStateAction<T[]>>) => 
    async (file: File) => {
      const imageUrl = await fileToDataUrl(file);
      setter(prev => [...prev, { id: Date.now(), name: file.name, imageUrl, isCustom: true } as T]);
  };
  
  const addProduct = createItemHandler(setProducts);
  const addScene = createItemHandler(setScenes);
  const addAccessory = createItemHandler(setAccessories);

  const createItemFromAICall = <T extends Product | Scene | Model | Accessory>(setter: React.Dispatch<React.SetStateAction<T[]>>) => 
    (name: string, imageUrl: string) => {
      setter(prev => [...prev, { id: Date.now(), name, imageUrl, isCustom: true } as T]);
  };

  const productCreated = createItemFromAICall(setProducts);
  const sceneCreated = createItemFromAICall(setScenes);
  const modelCreated = createItemFromAICall(setModels);
  const accessoryCreated = createItemFromAICall(setAccessories);

  const uploadAndProcessModel = async (file: File) => {
      const imageUrl = await fileToDataUrl(file);
      try {
          const result = await processUploadedModelImage(imageUrl);
          setModels(prev => [...prev, { id: Date.now(), name: file.name, imageUrl: result.imageUrl, isCustom: true }]);
      } catch (error) {
          console.error("Failed to process model image:", error);
          const message = error instanceof Error ? error.message : "Failed to process model image.";
          setGenerationError(message);
          throw new Error(message);
      }
  };

  // Handlers for deleting custom items
  const createDeleteHandler = <T extends {id: number}>(setter: React.Dispatch<React.SetStateAction<T[]>>) =>
    (id: number) => {
      setter(prev => prev.filter(item => item.id !== id));
  };

  const deleteProduct = createDeleteHandler(setProducts);
  const deleteScene = createDeleteHandler(setScenes);
  const deleteModel = createDeleteHandler(setModels);
  const deleteAccessory = createDeleteHandler(setAccessories);

  // Handlers for toggling selections
  const createToggleHandler = <T extends {id: number}>(
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    singleSelection: boolean = false
  ) => (item: T) => {
    setter(prev => {
      if (singleSelection) {
        return prev.find(p => p.id === item.id) ? [] : [item];
      }
      const isSelected = prev.some(p => p.id === item.id);
      return isSelected ? prev.filter(p => p.id !== item.id) : [...prev, item];
    });
  };

  const handleSelectProduct = createToggleHandler(setSelectedProducts, false);
  const handleSelectModel = createToggleHandler(setSelectedModels, false);
  const handleSelectAccessory = createToggleHandler(setSelectedAccessories, false);

  const handleSelectScene = (scene: Scene) => {
    setSelectedScene(scene);
    setSelectedColor(null);
  };

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    setSelectedScene(null);
  };

  // AI Stylist
  const fetchStylistSuggestions = useCallback(async () => {
    setIsStylistLoading(true);
    try {
      const suggestions = await getStylingSuggestions({ products, models, scenes, accessories });
      setStylistSuggestions(suggestions);
    } catch (error) {
      console.error("Error fetching stylist suggestions:", error);
    } finally {
      setIsStylistLoading(false);
    }
  }, [products, models, scenes, accessories]);

  useEffect(() => {
    fetchStylistSuggestions();
  }, [fetchStylistSuggestions]);

  const applySuggestion = (suggestion: StylistSuggestion) => {
    resetSelections();
    const productsToSelect = products.filter(p => suggestion.productNames.includes(p.name));
    const model = models.find(m => m.name === suggestion.modelName);
    const scene = scenes.find(s => s.name === suggestion.sceneName);
    const selectedAccessories = accessories.filter(a => suggestion.accessoryNames.includes(a.name));

    if (productsToSelect.length > 0) setSelectedProducts(productsToSelect);
    if (model) setSelectedModels([model]);
    if (scene) setSelectedScene(scene);
    setSelectedAccessories(selectedAccessories);
  };

  // Main generation flow
  const handleGenerate = useCallback(async () => {
    if (isGenerateDisabled || selectedProducts.length === 0 || selectedModels.length === 0 || !selectedPose) return;
    
    setGenerationState('loading-image');
    setGenerationError(null);
    setGeneratedResult([]); // Initialize as an empty array for progressive loading

    const isMultiModel = selectedModels.length > 1;

    try {
      const generationPromises = selectedModels.map(model => {
        const params = {
          products: selectedProducts,
          model: model,
          scene: selectedScene,
          sceneColor: selectedColor,
          pose: selectedPose,
          customPosePrompt: selectedPose?.name === 'Custom' ? customPosePrompt : undefined,
          accessories: selectedAccessories,
          referenceImageUrl: lockedCharacterImage,
          negativePrompt: negativePrompt,
        };
        return generateProductShot(params).then(result => {
          const newResult: GeneratedResult = { image: result.imageUrl, model: model };
          setGeneratedResult(prev => [...(prev || []), newResult]);
          return newResult;
        });
      });

      const results = await Promise.all(generationPromises);

      // Video generation only for single model mode
      if (!isMultiModel && results.length > 0) {
        const firstResult = results[0];
        
        // Create Cutout
        setGenerationState('loading-cutout');
        createProductCutout(firstResult.image!).then(cutoutResult => {
            setGeneratedResult(prev => prev ? [{ ...prev[0], cutoutImage: cutoutResult.imageUrl }] : null);
        }).catch(err => console.error("Cutout failed:", err)); // Non-blocking failure

        // Generate Video Description
        setGenerationState('loading-video-description');
        const description = await generateDescriptionForVideo(firstResult.image!);
        setVideoDescription(description);

        // Generate Video
        setGenerationState('loading-video');
        const videoOperation = await generateRunwayVideo(firstResult.image!, description);
        setGeneratedResult(prev => prev ? [{ ...prev[0], videoOperation: videoOperation }] : null);
      } else {
        setGenerationState('success');
      }
    // FIX: A malformed try...catch block was causing all subsequent state variables to be out of scope.
    // Correcting the block structure by ensuring the catch clause is properly formed resolves all cascading errors.
    } catch (error) {
      console.error("Generation failed:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      setGenerationError(errorMessage);
      setGenerationState('error');
    }
  }, [isGenerateDisabled, selectedProducts, selectedModels, selectedScene, selectedColor, selectedPose, customPosePrompt, selectedAccessories, lockedCharacterImage, negativePrompt]);


  // Poll for video result
  useEffect(() => {
    if (generationState === 'loading-video' && generatedResult && generatedResult.length > 0 && generatedResult[0].videoOperation && !generatedResult[0].videoOperation.done) {
      const interval = setInterval(async () => {
        try {
          const operation = await pollVideoOperation(generatedResult[0].videoOperation);
          
          if (operation.done) {
            clearInterval(interval);
            const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
            if (videoUri) {
              const videoUrl = `${videoUri}&key=${process.env.API_KEY}`;
              setGeneratedResult(prev => prev ? [{ ...prev[0], video: videoUrl, videoOperation: operation }] : null);
              setGenerationState('success');
            } else {
              throw new Error("Video generation completed, but no video URI was found.");
            }
          } else {
             setGeneratedResult(prev => prev ? [{ ...prev[0], videoOperation: operation }] : null);
          }
        } catch (error) {
          console.error("Video polling failed:", error);
          const errorMessage = error instanceof Error ? error.message : "An unknown video polling error occurred.";
          setGenerationError(errorMessage);
          setGenerationState('error');
          clearInterval(interval);
        }
      }, 10000); // Poll every 10 seconds

      return () => clearInterval(interval);
    }
  }, [generationState, generatedResult]);

  const saveToLookbook = () => {
    if (!generatedResult || selectedProducts.length === 0 || selectedModels.length === 0 || !selectedPose) return;
    const newCollection: Collection = {
      id: Date.now(),
      timestamp: new Date(),
      result: generatedResult,
      selections: {
        products: selectedProducts,
        models: selectedModels,
        scene: selectedScene,
        color: selectedColor,
        accessories: selectedAccessories,
        pose: selectedPose
      }
    };
    setLookbook(prev => [newCollection, ...prev]);
  };
  
  const loadFromLookbook = (collection: Collection) => {
    setSelectedProducts(collection.selections.products || []);
    setSelectedModels(collection.selections.models || []);
    setSelectedScene(collection.selections.scene);
    setSelectedColor(collection.selections.color);
    setSelectedAccessories(collection.selections.accessories);
    setSelectedPose(collection.selections.pose);
    setGeneratedResult(collection.result);
    setGenerationState('success');
  };

  const getGenerationMessage = () => {
    switch (generationState) {
      case 'loading-image': return selectedModels.length > 1 ? `Generating ${selectedModels.length} product shots...` : 'Generating product shot...';
      case 'loading-cutout': return 'Creating transparent cutout...';
      case 'loading-video-description': return 'Analyzing model for video...';
      case 'loading-video': return 'Composing runway video... This can take a few minutes.';
      case 'success': return 'Generation complete!';
      case 'error': return 'An error occurred.';
      default: return 'Main Canvas';
    }
  };

  const getButtonText = () => {
    if (generationState !== 'idle' && generationState !== 'success' && generationState !== 'error') {
      return 'Generating...';
    }
    return 'Generate';
  }

  const stylistCardBorders = [
    'border-[var(--accent-blue)]', // Neon Blue
    'border-[var(--accent-magenta)]', // Magenta
    'border-[var(--accent-gold)]', // Metallic Gold
  ];

  return (
    <div className="bg-[var(--background-secondary)] min-h-screen font-sans text-[var(--text-primary)]">
      <Header onLogoClick={resetSelections} theme={theme} setTheme={setTheme} />
      <main className="container mx-auto p-4 lg:px-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-8">
          {/* Left Column: Controls */}
          <div className="space-y-8">
            
            {/* AI Stylist */}
            <section>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">1. AI Stylist</h2>
                    <Tooltip text="Get new suggestions">
                        <button onClick={fetchStylistSuggestions} disabled={isStylistLoading} className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:text-[var(--disabled-text)]">
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isStylistLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 4l1.5 1.5A9 9 0 0120.5 17.5L20 20" /></svg>
                        </button>
                    </Tooltip>
                </div>
                {isStylistLoading ? <div className="text-center p-4"><Spinner /></div> : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {stylistSuggestions.slice(0,3).map((s, i) => (
                           <HoverCard
                              key={i}
                              trigger={
                                <button onClick={() => applySuggestion(s)} className={`p-4 bg-[var(--background-tertiary)] rounded-lg text-left w-full h-full transition-all duration-200 border-2 ${stylistCardBorders[i % stylistCardBorders.length]} shadow-md hover:scale-105 hover:shadow-xl`}>
                                    <p className="font-bold truncate text-base">{s.description}</p>
                                    <p className="text-[var(--text-secondary)] truncate text-sm">{s.productNames.join(', ')}</p>
                                </button>
                              }
                              content={
                                <div className="p-4">
                                  <h4 className="font-bold mb-2">{s.description}</h4>
                                  <div className="text-sm text-[var(--text-secondary)] space-y-1 text-left">
                                      <p><strong className="text-[var(--text-primary)]">Products:</strong> {s.productNames.join(', ')}</p>
                                      <p><strong className="text-[var(--text-primary)]">Model:</strong> {s.modelName}</p>
                                      <p><strong className="text-[var(--text-primary)]">Scene:</strong> {s.sceneName}</p>
                                      <p><strong className="text-[var(--text-primary)]">Accessories:</strong> {s.accessoryNames.join(', ') || 'None'}</p>
                                  </div>
                                </div>
                              }
                           />
                        ))}
                    </div>
                )}
            </section>
            
            <div className="space-y-8 p-6 bg-[var(--background-tertiary)] rounded-lg border border-[var(--border-primary)]">
                {lockedCharacterImage && (
                  <div className="p-4 rounded-lg border border-[var(--accent-blue)] bg-[var(--accent-blue)]/10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <img src={lockedCharacterImage} alt="Locked character reference" className="w-16 h-16 rounded-md object-cover" />
                          <div>
                            <h3 className="font-bold text-[var(--accent-blue)]">Character Locked</h3>
                            <p className="text-sm text-sky-200">This model's appearance will be kept consistent.</p>
                          </div>
                        </div>
                        <button onClick={() => setLockedCharacterImage(null)} className="text-sky-300 hover:text-white font-semibold text-sm">
                          Unlock
                        </button>
                    </div>
                  </div>
                )}

                <section id="product-selection">
                  <h2 className="text-xl font-bold mb-4">2. Select Product</h2>
                  <ProductSelector products={products} selectedProducts={selectedProducts} onSelectProduct={handleSelectProduct} onAddProduct={addProduct} onDeleteProduct={deleteProduct} onProductCreated={productCreated} />
                </section>
                
                <section id="model-selection">
                  <h2 className="text-xl font-bold mb-4">3. Select Model</h2>
                  <ModelSelector models={models} selectedModels={selectedModels} onSelectModel={handleSelectModel} onModelCreated={modelCreated} onDeleteModel={deleteModel} onUploadAndProcessModel={uploadAndProcessModel}/>
                </section>
                
                <section id="scene-selection">
                   <h2 className="text-xl font-bold mb-4">4. Select Background</h2>
                  <SceneSelector scenes={scenes} selectedScene={selectedScene} onSelectScene={handleSelectScene} selectedColor={selectedColor} onColorChange={handleColorChange} onAddScene={addScene} onSceneCreated={sceneCreated} onDeleteScene={deleteScene} />
                </section>

                 <section id="pose-selection">
                   <PoseSelector poses={poses} selectedPose={selectedPose} onSelectPose={setSelectedPose} customPosePrompt={customPosePrompt} onCustomPosePromptChange={setCustomPosePrompt} />
                </section>

                 <section id="accessory-selection">
                    <h2 className="text-xl font-bold mb-4">6. Add Accessories <span className="font-normal text-[var(--text-secondary)]">(Optional)</span></h2>
                   <AccessorySelector accessories={accessories} selectedAccessories={selectedAccessories} onSelectAccessory={handleSelectAccessory} onAddAccessory={addAccessory} onDeleteAccessory={deleteAccessory} onAccessoryCreated={accessoryCreated} />
                </section>

                <section id="advanced-controls">
                    <h2 className="text-xl font-bold mb-4">7. Advanced Controls <span className="font-normal text-[var(--text-secondary)]">(Optional)</span></h2>
                    <div className="p-4 rounded-lg border border-[var(--border-secondary)]">
                        <label htmlFor="negative-prompt" className="block text-sm font-semibold mb-1">
                            Negative Prompt
                        </label>
                        <p className="text-xs text-[var(--text-secondary)] mb-2">Describe elements to avoid in the final image.</p>
                        <textarea
                            id="negative-prompt"
                            value={negativePrompt}
                            onChange={(e) => setNegativePrompt(e.target.value)}
                            placeholder="e.g., text, logos, watermarks, distorted hands, blurry"
                            className="w-full p-2 bg-[var(--background-secondary)] border border-[var(--border-tertiary)] rounded-md focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-[var(--accent-blue)] text-[var(--text-primary)]"
                            rows={2}
                        />
                    </div>
                </section>
            </div>
          </div>
          
          {/* Right Column: Generation & Result */}
          <div className="sticky top-8 mt-8 lg:mt-0 space-y-4">
             <button
                onClick={handleGenerate}
                disabled={isGenerateDisabled}
                className="w-full bg-[var(--accent-blue)] text-[var(--text-button)] font-bold py-4 px-4 rounded-lg transition-all disabled:bg-[var(--disabled-bg)] disabled:text-[var(--disabled-text)] disabled:cursor-not-allowed hover:enabled:bg-white text-lg"
            >
                {getButtonText()}
            </button>

            <div className="bg-[var(--background-primary)] p-1 rounded-xl shadow-lg relative min-h-[500px] flex flex-col justify-center items-center text-center shadow-[0_0_25px_var(--shadow-blue)]">
              <div className="bg-[var(--background-primary)] w-full h-full rounded-lg flex flex-col justify-center items-center p-4">
                  
                  {(generationState === 'idle' || (generationState !== 'loading-image' && generationState !== 'loading-cutout' && generationState !== 'loading-video-description' && generationState !== 'loading-video')) && !generatedResult && (
                    <div className="text-[var(--text-secondary)]">
                      <p className="font-bold text-lg text-[var(--text-primary)]">Main Canvas</p>
                      <p>Your result will appear here. Select items and click <span className="text-[var(--accent-blue)] font-semibold">Generate</span>.</p>
                    </div>
                  )}
                  
                  {(generationState !== 'idle' && generationState !== 'success' && generationState !== 'error') && (
                    <div className="space-y-4">
                      <Spinner />
                      <p className="font-semibold text-lg text-[var(--text-primary)]">{getGenerationMessage()}</p>
                      {generationState === 'loading-video' && videoDescription && <p className="text-sm text-[var(--text-secondary)] italic">"{videoDescription}"</p>}
                    </div>
                  )}
                  
                  {generationError && (
                     <div className="text-red-400 space-y-2">
                        <p className="font-bold">Generation Failed</p>
                        <p className="text-sm">{generationError}</p>
                     </div>
                  )}

                  {generatedResult && generatedResult.length > 0 && (
                     <div className="w-full space-y-4">
                        {selectedModels.length > 1 ? (
                          <div className="grid grid-cols-2 gap-4">
                            {generatedResult.map((result, index) => (
                               <div key={index} className="space-y-2">
                                 <img src={result.image} alt={`Generated shot for ${result.model.name}`} className="w-full rounded-md" />
                                 <p className="text-sm font-semibold text-[var(--text-primary)]">{result.model.name}</p>
                               </div>
                            ))}
                          </div>
                        ) : (
                          <div>
                            {generatedResult[0].video ? (
                                <video src={generatedResult[0].video} controls autoPlay loop muted className="w-full rounded-md" />
                            ) : generatedResult[0].image ? (
                                <img src={generatedResult[0].image} alt="Generated product shot" className="w-full rounded-md" />
                            ) : null}
                          </div>
                        )}
                     </div>
                  )}
              </div>
            </div>

            {lookbook.length > 0 && (
                <div className="bg-[var(--background-tertiary)] p-4 rounded-lg border border-[var(--border-primary)]">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">Lookbook</h3>
                    <div className="grid grid-cols-3 gap-3">
                        {lookbook.map(collection => (
                            <button key={collection.id} onClick={() => loadFromLookbook(collection)} className="aspect-square rounded-md overflow-hidden hover:scale-105 transition-transform border-2 border-transparent hover:border-[var(--accent-blue)]">
                                <img src={collection.result[0].image} alt={`Look created at ${collection.timestamp.toLocaleString()}`} className="w-full h-full object-cover"/>
                            </button>
                        ))}
                    </div>
                </div>
            )}
          </div>
        </div>
      </main>
      <footer className="sticky bottom-0 z-40 bg-[var(--background-primary)] py-4 border-t border-[var(--border-primary)]">
        <div className="container mx-auto px-4 lg:px-8 flex justify-end items-center gap-4">
            <button 
                disabled={generationState !== 'success'}
                className="bg-[var(--accent-blue)] text-[var(--text-button)] font-bold py-2 px-6 rounded-md transition-colors hover:enabled:bg-white disabled:bg-[var(--disabled-bg)] disabled:text-[var(--disabled-text)] disabled:cursor-not-allowed">
                Export
            </button>
            <button
                disabled={generationState !== 'success'}
                className="bg-[var(--background-tertiary)] text-[var(--text-primary)] font-bold py-2 px-6 rounded-md border border-[var(--border-secondary)] hover:enabled:border-zinc-500 hover:enabled:bg-[#2A2A2A] transition-colors disabled:bg-[var(--disabled-bg)] disabled:text-[var(--disabled-text)] disabled:cursor-not-allowed disabled:border-[var(--border-secondary)]">
                Download
            </button>
            <button
                disabled={generationState !== 'success'}
                className="bg-[var(--accent-gold)] text-black font-bold py-2 px-6 rounded-md hover:enabled:bg-amber-300 transition-all disabled:bg-amber-900/50 disabled:text-[var(--disabled-text)] disabled:cursor-not-allowed">
                Share
            </button>
        </div>
      </footer>
    </div>
  );
};

export default App;
