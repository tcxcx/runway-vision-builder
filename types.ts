/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// FIX: Add export keyword to interfaces to make them importable modules.

// A generic item with common properties for all selectable objects.
export interface BaseItem {
  id: number;
  name: string;
  imageUrl: string;
  isCustom?: boolean;
}

// Specific types for each category, extending the base item.
export interface Product extends BaseItem {}
export interface Scene extends BaseItem {}
export interface Model extends BaseItem {}
export interface Accessory extends BaseItem {}
export interface Pose extends BaseItem {}

// Type for a saved collection in the Lookbook.
export interface Collection {
    id: number;
    timestamp: Date;
    result: GeneratedResult;
    selections: {
        product: Product | null;
        model: Model | null;
        scene: Scene | null;
        color: string | null;
        accessories: Accessory[];
        pose: Pose | null;
    }
}

// Type for a recommendation from the AI Stylist.
export interface StylistSuggestion {
  description: string;
  productName: string;
  modelName: string;
  sceneName: string;
  accessoryNames: string[];
}


// Type for the generated result from the final composition.
export interface GeneratedResult {
    image?: string;
    video?: string;
    error?: string;
    videoOperation?: any; 
    cutoutImage?: string;
}

// Type for the state of the generation process.
export type GenerationState = 'idle' | 'loading-image' | 'loading-video-description' | 'loading-video' | 'loading-cutout' | 'success' | 'error';