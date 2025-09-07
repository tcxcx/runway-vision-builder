/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { Product, Model, Scene, Accessory, Pose } from './types';

export const INITIAL_PRODUCTS: Product[] = [
  { id: 1, name: 'Denim Jacket', imageUrl: 'https://storage.googleapis.com/maker-suite-gallery/ImmersiveShopping/denim-jacket.png' },
  { id: 2, name: 'White T-Shirt', imageUrl: 'https://storage.googleapis.com/maker-suite-gallery/ImmersiveShopping/white-t-shirt.png' },
  { id: 3, name: 'Leather Boots', imageUrl: 'https://storage.googleapis.com/maker-suite-gallery/ImmersiveShopping/leather-boots.png' },
];

export const INITIAL_MODELS: Model[] = [
  { id: 1, name: 'Model Ava', imageUrl: 'https://storage.googleapis.com/maker-suite-gallery/ImmersiveShopping/model-ava.jpg' },
  { id: 2, name: 'Model Chloe', imageUrl: 'https://storage.googleapis.com/maker-suite-gallery/ImmersiveShopping/model-chloe.jpg' },
  { id: 3, name: 'Model Alex', imageUrl: 'https://storage.googleapis.com/maker-suite-gallery/ImmersiveShopping/model-alex.jpg' },
];

export const INITIAL_SCENES: Scene[] = [
  { id: 1, name: 'Mountain View', imageUrl: 'https://storage.googleapis.com/maker-suite-gallery/ImmersiveShopping/mountain-view.jpg' },
  { id: 2, name: 'City Street', imageUrl: 'https://storage.googleapis.com/maker-suite-gallery/ImmersiveShopping/city-street.jpg' },
  { id: 3, name: 'Beach Sunset', imageUrl: 'https://storage.googleapis.com/maker-suite-gallery/ImmersiveShopping/beach-sunset.jpg' },
];

export const INITIAL_ACCESSORIES: Accessory[] = [
    { id: 1, name: 'Sunglasses', imageUrl: 'https://storage.googleapis.com/maker-suite-gallery/ImmersiveShopping/sunglasses.png' },
    { id: 2, name: 'Handbag', imageUrl: 'https://storage.googleapis.com/maker-suite-gallery/ImmersiveShopping/handbag.png' },
    { id: 3, name: 'Watch', imageUrl: 'https://storage.googleapis.com/maker-suite-gallery/ImmersiveShopping/watch.png' },
];

export const INITIAL_POSES: Pose[] = [
    { id: 1, name: 'Standing', imageUrl: 'https://storage.googleapis.com/maker-suite-gallery/ImmersiveShopping/pose-standing.png' },
    { id: 2, name: 'Walking', imageUrl: 'https://storage.googleapis.com/maker-suite-gallery/ImmersiveShopping/pose-walking.png' },
    { id: 3, name: 'Editorial', imageUrl: 'https://storage.googleapis.com/maker-suite-gallery/ImmersiveShopping/pose-editorial.png' },
];