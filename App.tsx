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

  // Generation
  const [generationState, setGenerationState] = useState<GenerationState>('idle');
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generatedResult, setGeneratedResult] = useState<GeneratedResult | null>(null);
  const [videoDescription, setVideoDescription] = useState<string>('');
  
  // App Features
  const [stylistSuggestions, setStylistSuggestions] = useState<StylistSuggestion[]>([]);
  const [isStylistLoading, setIsStylistLoading] = useState(false);
  const [lookbook, setLookbook] = useState<Collection[]>([]);
  const [referenceImageUrlForConsistency, setReferenceImageUrlForConsistency] = useState<string | null>(null);
  
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
    setReferenceImageUrlForConsistency(null);
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
          setGenerationError(error instanceof Error ? error.message : "Failed to process model image.");
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

  const handleSelectProduct = createToggleHandler(setSelectedProducts, true);
  const handleSelectModel = createToggleHandler(setSelectedModels, true);
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
    const product = products.find(p => p.name === suggestion.productName);
    const model = models.find(m => m.name === suggestion.modelName);
    const scene = scenes.find(s => s.name === suggestion.sceneName);
    const selectedAccessories = accessories.filter(a => suggestion.accessoryNames.includes(a.name));

    if (product) setSelectedProducts([product]);
    if (model) {
      setSelectedModels([model]);
      setReferenceImageUrlForConsistency(model.imageUrl);
    }
    if (scene) setSelectedScene(scene);
    setSelectedAccessories(selectedAccessories);
  };
  
  // Main generation flow
  const handleGenerate = useCallback(async () => {
    if (isGenerateDisabled || selectedProducts.length === 0 || selectedModels.length === 0 || !selectedPose) return;

    setGenerationState('loading-image');
    setGenerationError(null);
    setGeneratedResult(null);

    const params = {
      product: selectedProducts[0],
      model: selectedModels[0],
      scene: selectedScene,
      sceneColor: selectedColor,
      pose: selectedPose,
      accessories: selectedAccessories,
      referenceImageUrl: referenceImageUrlForConsistency,
    };
    
    try {
      // 1. Generate Product Shot
      const result = await generateProductShot(params);
      setGeneratedResult({ image: result.imageUrl });
      
      // 2. Create Cutout (in parallel)
      setGenerationState('loading-cutout');
      createProductCutout(result.imageUrl).then(cutoutResult => {
        setGeneratedResult(prev => ({ ...prev, cutoutImage: cutoutResult.imageUrl }));
      }).catch(err => console.error("Cutout failed:", err)); // Non-blocking failure

      // 3. Generate Video Description
      setGenerationState('loading-video-description');
      const description = await generateDescriptionForVideo(result.imageUrl);
      setVideoDescription(description);

      // 4. Generate Video
      setGenerationState('loading-video');
      const videoOperation = await generateRunwayVideo(result.imageUrl, description);
      setGeneratedResult(prev => ({ ...prev, videoOperation: videoOperation }));

    } catch (error) {
      console.error("Generation failed:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      setGenerationError(errorMessage);
      setGenerationState('error');
    }
  }, [isGenerateDisabled, selectedProducts, selectedModels, selectedScene, selectedColor, selectedPose, selectedAccessories, referenceImageUrlForConsistency]);

  // Poll for video result
  useEffect(() => {
    if (generationState === 'loading-video' && generatedResult?.videoOperation && !generatedResult.videoOperation.done) {
      const interval = setInterval(async () => {
        try {
          const operation = await pollVideoOperation(generatedResult.videoOperation);
          setGeneratedResult(prev => ({...prev!, videoOperation: operation}));
          if (operation.done) {
            clearInterval(interval);
            const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
            if (videoUri) {
              const videoUrl = `${videoUri}&key=${process.env.API_KEY}`;
              setGeneratedResult(prev => ({ ...prev!, video: videoUrl }));
              setGenerationState('success');
            } else {
              throw new Error("Video generation completed, but no video URI was found.");
            }
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
  }, [generationState, generatedResult?.videoOperation]);

  const saveToLookbook = () => {
    if (!generatedResult || !selectedProducts[0] || !selectedModels[0] || !selectedPose) return;
    const newCollection: Collection = {
      id: Date.now(),
      timestamp: new Date(),
      result: generatedResult,
      selections: {
        product: selectedProducts[0],
        model: selectedModels[0],
        scene: selectedScene,
        color: selectedColor,
        accessories: selectedAccessories,
        pose: selectedPose
      }
    };
    setLookbook(prev => [newCollection, ...prev]);
  };
  
  const loadFromLookbook = (collection: Collection) => {
    setSelectedProducts(collection.selections.product ? [collection.selections.product] : []);
    setSelectedModels(collection.selections.model ? [collection.selections.model] : []);
    setSelectedScene(collection.selections.scene);
    setSelectedColor(collection.selections.color);
    setSelectedAccessories(collection.selections.accessories);
    setSelectedPose(collection.selections.pose);
    setGeneratedResult(collection.result);
    setGenerationState('success');
  };

  const getGenerationMessage = () => {
    switch (generationState) {
      case 'loading-image': return 'Generating product shot...';
      case 'loading-cutout': return 'Creating transparent cutout...';
      case 'loading-video-description': return 'Analyzing image for video...';
      case 'loading-video': return 'Generating runway video... This may take a few minutes.';
      case 'success': return 'Generation complete!';
      case 'error': return 'An error occurred.';
      default: return '';
    }
  };

  return (
    <div className="bg-zinc-50 min-h-screen font-sans text-zinc-800">
      <Header onLogoClick={resetSelections} />
      <main className="container mx-auto p-4 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-8">
          {/* Left Column: Controls */}
          <div className="space-y-6">
            
            {/* AI Stylist */}
            <div className="bg-white p-4 rounded-lg border border-zinc-200 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                    <h2 className="text-xl font-bold">AI Stylist</h2>
                    <Tooltip text="Get new suggestions">
                        <button onClick={fetchStylistSuggestions} disabled={isStylistLoading} className="p-1 text-zinc-500 hover:text-zinc-800 disabled:text-zinc-300">
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isStylistLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 4l1.5 1.5A9 9 0 0120.5 17.5L20 20" /></svg>
                        </button>
                    </Tooltip>
                </div>
                {isStylistLoading ? <div className="text-center p-4"><Spinner /></div> : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {stylistSuggestions.slice(0,3).map((s, i) => (
                            <button key={i} onClick={() => applySuggestion(s)} className="p-3 bg-zinc-100 rounded-lg text-left hover:bg-zinc-200 transition-colors text-sm">
                                <p className="font-bold truncate">{s.description}</p>
                                <p className="text-zinc-600 truncate">{s.productName}</p>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <h2 className="text-2xl font-bold text-center text-zinc-600">OR</h2>
            
            <h2 className="text-xl font-bold">Build Your Own Look</h2>

            <section id="product-selection">
              <h3 className="text-lg font-semibold text-zinc-800 mb-2 flex items-center">
                <span className="bg-zinc-800 text-white rounded-full h-8 w-8 text-sm font-bold flex items-center justify-center mr-3">1</span> Select Product
              </h3>
              <ProductSelector products={products} selectedProducts={selectedProducts} onSelectProduct={handleSelectProduct} onAddProduct={addProduct} onDeleteProduct={deleteProduct} onProductCreated={productCreated} />
            </section>
            
            <section id="model-selection">
              <h3 className="text-lg font-semibold text-zinc-800 mb-2 flex items-center">
                <span className="bg-zinc-800 text-white rounded-full h-8 w-8 text-sm font-bold flex items-center justify-center mr-3">2</span> Select Model
              </h3>
              <ModelSelector models={models} selectedModels={selectedModels} onSelectModel={handleSelectModel} onModelCreated={modelCreated} onDeleteModel={deleteModel} onUploadAndProcessModel={uploadAndProcessModel}/>
            </section>
            
            <section id="scene-selection">
               <h3 className="text-lg font-semibold text-zinc-800 mb-2 flex items-center">
                <span className="bg-zinc-800 text-white rounded-full h-8 w-8 text-sm font-bold flex items-center justify-center mr-3">3</span> Select Background
              </h3>
              <SceneSelector scenes={scenes} selectedScene={selectedScene} onSelectScene={handleSelectScene} selectedColor={selectedColor} onColorChange={handleColorChange} onAddScene={addScene} onSceneCreated={sceneCreated} onDeleteScene={deleteScene} />
            </section>

             <section id="pose-selection">
               <PoseSelector poses={poses} selectedPose={selectedPose} onSelectPose={setSelectedPose} />
            </section>

             <section id="accessory-selection">
                <h3 className="text-lg font-semibold text-zinc-800 mb-2 flex items-center">
                  <span className="bg-zinc-800 text-white rounded-full h-8 w-8 text-sm font-bold flex items-center justify-center mr-3">5</span> Add Accessories (Optional)
                </h3>
               <AccessorySelector accessories={accessories} selectedAccessories={selectedAccessories} onSelectAccessory={handleSelectAccessory} onAddAccessory={addAccessory} onDeleteAccessory={deleteAccessory} onAccessoryCreated={accessoryCreated} />
            </section>
          </div>
          
          {/* Right Column: Generation & Result */}
          <div className="sticky top-8 mt-8 lg:mt-0 space-y-4">
            <div className="bg-white p-4 rounded-lg border border-zinc-200 shadow-sm">
                <button
                    onClick={handleGenerate}
                    disabled={isGenerateDisabled}
                    className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition-all disabled:bg-zinc-300 disabled:cursor-not-allowed hover:enabled:bg-blue-700 hover:enabled:shadow-lg"
                >
                    {generationState !== 'idle' && generationState !== 'success' && generationState !== 'error' ? 'Generating...' : 'Generate Product Shot & Video'}
                </button>
            </div>

            <div className="bg-white p-4 rounded-lg border border-zinc-200 shadow-sm min-h-[400px] flex flex-col justify-center items-center text-center">
              {generationState === 'idle' && !generatedResult && (
                <div className="text-zinc-500">
                  <p className="font-bold text-lg">Your result will appear here.</p>
                  <p>Select your items and click "Generate".</p>
                </div>
              )}
              
              {(generationState !== 'idle' && generationState !== 'success') && (
                <div className="space-y-4">
                  <Spinner />
                  <p className="font-semibold text-lg text-zinc-700">{getGenerationMessage()}</p>
                  {generationState === 'loading-video' && videoDescription && <p className="text-sm text-zinc-500 italic">"{videoDescription}"</p>}
                </div>
              )}
              
              {generationError && (
                 <div className="text-red-600 space-y-2">
                    <p className="font-bold">Generation Failed</p>
                    <p className="text-sm">{generationError}</p>
                 </div>
              )}

              {generatedResult && (
                 <div className="w-full space-y-4">
                    {generatedResult.video ? (
                        <video src={generatedResult.video} controls autoPlay loop muted className="w-full rounded-md" />
                    ) : generatedResult.image ? (
                        <img src={generatedResult.image} alt="Generated product shot" className="w-full rounded-md" />
                    ) : null}
                    
                    {generationState === 'success' && (
                        <div className="flex gap-2">
                           <button onClick={saveToLookbook} className="flex-1 bg-zinc-800 text-white font-bold py-2 px-4 rounded-lg hover:bg-zinc-900">Save to Lookbook</button>
                           {generatedResult.cutoutImage && <a href={generatedResult.cutoutImage} download="cutout.png" className="flex-1 block text-center bg-zinc-200 text-zinc-800 font-bold py-2 px-4 rounded-lg hover:bg-zinc-300">Download Cutout</a>}
                        </div>
                    )}
                 </div>
              )}
            </div>

            {lookbook.length > 0 && (
                <div className="bg-white p-4 rounded-lg border border-zinc-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-zinc-800 mb-3">Lookbook</h3>
                    <div className="grid grid-cols-3 gap-3">
                        {lookbook.map(collection => (
                            <button key={collection.id} onClick={() => loadFromLookbook(collection)} className="aspect-square rounded-md overflow-hidden hover:scale-105 transition-transform">
                                <img src={collection.result.image} alt={`Look created at ${collection.timestamp.toLocaleString()}`} className="w-full h-full object-cover"/>
                            </button>
                        ))}
                    </div>
                </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
