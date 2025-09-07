/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// FIX: Add necessary imports from @google/genai and types.
// FIX: Import Modality for use in image editing API calls.
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { Product, Scene, Model, Accessory, Pose } from "../types";

// FIX: Initialize the GoogleGenAI client according to guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

/**
 * Helper function to convert an image URL to a base64 encoded string for the Gemini API.
 */
const imageUrlToBase64 = async (imageUrl: string): Promise<{ base64: string, mimeType: string }> => {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
        reader.onloadend = () => {
            const base64Data = (reader.result as string).split(',')[1];
            resolve({ base64: base64Data, mimeType: blob.type || 'image/png' });
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};


/**
 * Generates an image using the Imagen model.
 * @param prompt The text prompt for image generation.
 * @param aspectRatio The desired aspect ratio for the image.
 * @returns An object containing the imageUrl of the generated image.
 */
async function generateImage(prompt: string, aspectRatio: '1:1' | '3:4' | '4:3' = '1:1'): Promise<{ imageUrl: string }> {
    // FIX: Use the correct model for image generation tasks ('imagen-4.0-generate-001').
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
          aspectRatio: aspectRatio,
        },
    });

    if (!response.generatedImages || response.generatedImages.length === 0) {
        throw new Error("Image generation failed. No images were returned.");
    }
    
    // FIX: Correctly extract base64 image bytes and create a data URL.
    const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
    const imageUrl = `data:image/png;base64,${base64ImageBytes}`;

    return { imageUrl };
}

/**
 * Generates a clothing item image.
 * @param prompt The description of the clothing item.
 * @returns A promise that resolves to an object with the image URL.
 */
export const generateClothingItem = (prompt: string): Promise<{ imageUrl: string }> => {
    const fullPrompt = `A high-resolution, photorealistic image of a single clothing item, '${prompt}', on a clean, white, flat background. Studio lighting, front view, no shadows. The item should be perfectly laid out.`;
    return generateImage(fullPrompt, '1:1');
};

/**
 * Generates a scene/background image.
 * @param prompt The description of the scene.
 * @returns A promise that resolves to an object with the image URL.
 */
export const generateScene = (prompt: string): Promise<{ imageUrl: string }> => {
    const fullPrompt = `A high-resolution, photorealistic image of a fashion photoshoot background: '${prompt}'. The scene should be empty, with no people or distracting elements. Focus on the environment.`;
    return generateImage(fullPrompt, '4:3');
};

/**
 * Generates a fashion model image.
 * @param prompt The description of the model.
 * @returns A promise that resolves to an object with the image URL.
 */
export const generateModel = (prompt: string): Promise<{ imageUrl:string }> => {
    const fullPrompt = `A high-resolution, full-body portrait of a fashion model: '${prompt}'. The model should be standing in a neutral pose against a plain, light gray background. Studio lighting.`;
    return generateImage(fullPrompt, '3:4');
};

/**
 * Generates an accessory item image.
 * @param prompt The description of the accessory.
 * @returns A promise that resolves to an object with the image URL.
 */
export const generateAccessory = (prompt: string): Promise<{ imageUrl: string }> => {
    const fullPrompt = `A high-resolution, photorealistic image of a single fashion accessory, '${prompt}', on a clean, white background. Studio lighting, no shadows.`;
    return generateImage(fullPrompt, '1:1');
};

/**
 * Processes a user-uploaded image of a person into a standardized model portrait.
 * @param imageUrl The URL of the uploaded image.
 * @returns A promise that resolves to an object with the processed image URL.
 */
export const processUploadedModelImage = async (imageUrl: string): Promise<{ imageUrl: string }> => {
    const model = 'gemini-2.5-flash-image-preview';
    const prompt = `From the provided image, perfectly isolate the person from their background. Place them on a clean, neutral, light-gray studio background. The final image should be a 3:4 portrait aspect ratio and look like a professional model headshot.`;
    
    const { base64, mimeType } = await imageUrlToBase64(imageUrl);
    const imagePart = { inlineData: { data: base64, mimeType: mimeType } };

    const response = await ai.models.generateContent({
        model: model,
        contents: { parts: [{ text: prompt }, imagePart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            const base64ImageBytes: string = part.inlineData.data;
            const newImageUrl = `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
            return { imageUrl: newImageUrl };
        }
    }
    throw new Error("Model processing failed. The model did not return an image.");
};


interface CompositionParams {
    product: Product;
    model: Model;
    scene: Scene | null;
    sceneColor: string | null;
    pose: Pose;
    accessories: Accessory[];
    referenceImageUrl?: string | null;
}

/**
 * Generates the final product shot by combining all selected elements.
 * @param params The selected elements for the composition.
 * @returns A promise that resolves to an object with the image URL.
 */
export const generateProductShot = async (params: CompositionParams): Promise<{ imageUrl: string }> => {
    const model = 'gemini-2.5-flash-image-preview';
    
    let prompt = `Create a photorealistic fashion product shot.
- **Model**: Use the provided model image as the base.
- **Clothing**: Dress the model in the provided clothing item ('${params.product.name}'). The clothing must fit perfectly and look natural.
- **Pose**: The model should adopt the specified pose. Use the pose image as a visual reference for the body position.
- **Background**: Place the model in the provided scene. If a solid color background is provided, use that instead.
- **Accessories**: Add the following accessories to the model: ${params.accessories.map(a => a.name).join(', ') || 'none'}. Place them appropriately (e.g., sunglasses on face, handbag in hand).
- **Style**: The final image should be high-fashion, with professional lighting and a cohesive look.`;

    if (params.sceneColor) {
        prompt += ` The background should be a solid color: ${params.sceneColor}.`;
    }
    
    if (params.referenceImageUrl) {
        prompt += `\n- **IMPORTANT CONSISTENCY INSTRUCTION**: Use the provided Reference Image to ensure the model's face and body identity are an exact match. Ignore the clothing and pose in the reference image; only use it to maintain the model's personal identity.`;
    }

    const imageToPart = async (imageUrl: string) => {
        const { base64, mimeType } = await imageUrlToBase64(imageUrl);
        return { inlineData: { data: base64, mimeType: mimeType } };
    };

    const parts: any[] = [
        { text: prompt },
        { text: "Model Image:" },
        await imageToPart(params.model.imageUrl),
        { text: "Clothing Image:" },
        await imageToPart(params.product.imageUrl),
        { text: "Pose Reference:" },
        await imageToPart(params.pose.imageUrl),
    ];

    if (params.scene) {
        parts.push({ text: "Scene Image:" });
        parts.push(await imageToPart(params.scene.imageUrl));
    }
    
    if(params.referenceImageUrl) {
        parts.push({ text: "Reference Image for Model Consistency:" });
        parts.push(await imageToPart(params.referenceImageUrl));
    }

    for (const acc of params.accessories) {
        parts.push({ text: `Accessory: ${acc.name}` });
        parts.push(await imageToPart(acc.imageUrl));
    }

    const response = await ai.models.generateContent({
        model: model,
        contents: { parts: parts },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            const base64ImageBytes: string = part.inlineData.data;
            const imageUrl = `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
            return { imageUrl };
        }
    }
    
    throw new Error("Final image generation failed. The model did not return an image.");
};

/**
 * Creates a transparent cutout of the model and clothing from a final product shot.
 * @param imageUrl The URL of the final product shot.
 * @returns A promise that resolves to an object with the cutout image URL.
 */
export const createProductCutout = async (imageUrl: string): Promise<{ imageUrl: string }> => {
    const model = 'gemini-2.5-flash-image-preview';
    const prompt = "From the provided image, perfectly isolate the person and all their clothing and accessories from the background. The output must be a PNG image with a fully transparent background.";

    const { base64, mimeType } = await imageUrlToBase64(imageUrl);
    const imagePart = { inlineData: { data: base64, mimeType: mimeType } };

    const response = await ai.models.generateContent({
        model: model,
        contents: { parts: [{ text: prompt }, imagePart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            const base64ImageBytes: string = part.inlineData.data;
            const newImageUrl = `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
            return { imageUrl: newImageUrl };
        }
    }

    throw new Error("Cutout generation failed. The model did not return an image.");
};

/**
 * Generates a descriptive sentence for a video prompt based on an image.
 * @param imageUrl The image to describe.
 * @returns A promise that resolves to the descriptive string.
 */
export const generateDescriptionForVideo = async (imageUrl: string): Promise<string> => {
    const model = 'gemini-2.5-flash';
    const prompt = "Describe the person in this image, including their clothing, accessories, and overall style, in a single, concise sentence for a video generation prompt.";
    const { base64, mimeType } = await imageUrlToBase64(imageUrl);
    const imagePart = { inlineData: { data: base64, mimeType: mimeType } };

    const response = await ai.models.generateContent({
        model: model,
        contents: { parts: [{ text: prompt }, imagePart] },
    });

    return response.text.trim();
}

/**
 * Generates a short runway video based on the final product shot.
 * @param finalImageUrl The generated product shot to animate.
 * @param description A detailed description of the model and outfit.
 * @returns A promise that resolves to a video operation object.
 */
export const generateRunwayVideo = async (finalImageUrl: string, description: string) => {
    const model = 'veo-2.0-generate-001';
    
    const prompt = `${description}, walking down a runway as if in a fashion show. The movement should be subtle and elegant. The background should remain consistent with the image. The camera should have a slight parallax effect.`;

    const { base64, mimeType } = await imageUrlToBase64(finalImageUrl);

    let operation = await ai.models.generateVideos({
        model: model,
        prompt: prompt,
        image: {
            imageBytes: base64,
            mimeType: mimeType,
        },
        config: {
            numberOfVideos: 1
        }
    });

    return operation;
};

/**
 * Polls the status of a video generation operation.
 * @param operation The operation object to poll.
 * @returns An updated operation object.
 */
export const pollVideoOperation = async (operation: any) => {
    const updatedOperation = await ai.operations.getVideosOperation({ operation: operation });
    return updatedOperation;
};

/**
 * Gets styling suggestions from the Gemini text model.
 * @param catalogues - An object containing all available items.
 * @returns A promise that resolves to an array of suggestions.
 */
export const getStylingSuggestions = async (catalogues: { products: Product[], models: Model[], scenes: Scene[], accessories: Accessory[] }) => {
    const prompt = `You are an expert fashion stylist. Based on the following available assets, suggest three distinct and creative outfits. Provide your response as a valid JSON array.

    Available Products: ${JSON.stringify(catalogues.products.map(p => p.name))}
    Available Models: ${JSON.stringify(catalogues.models.map(m => m.name))}
    Available Scenes: ${JSON.stringify(catalogues.scenes.map(s => s.name))}
    Available Accessories: ${JSON.stringify(catalogues.accessories.map(a => a.name))}
    `;
    
    const responseSchema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING, description: "A short, creative description of the look's style." },
            productName: { type: Type.STRING, description: "The name of the main clothing product." },
            modelName: { type: Type.STRING, description: "The name of the model for this look." },
            sceneName: { type: Type.STRING, description: "The name of the scene for this look." },
            accessoryNames: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A list of accessory names for this look. Can be empty." }
          },
          required: ['description', 'productName', 'modelName', 'sceneName', 'accessoryNames']
        }
    };
    
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
        },
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
};