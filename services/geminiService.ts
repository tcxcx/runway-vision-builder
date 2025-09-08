/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// FIX: Implement the geminiService module, which was previously missing.
// This file contains all the logic for interacting with the Google Generative AI API.

import { GoogleGenAI, Modality, Type } from "@google/genai";
import { Product, Model, Scene, Accessory, Pose } from '../types';

// Initialize the Google AI client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Converts a data URL string (e.g., from a file reader) into a part object
 * for the Gemini API.
 * @param dataUrl The data URL to convert.
 * @returns An object formatted for the Gemini API.
 */
const dataUrlToPart = (dataUrl: string) => {
    const base64Data = dataUrl.split(',')[1];
    const mimeType = dataUrl.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
    return {
        inlineData: {
            data: base64Data,
            mimeType: mimeType,
        }
    };
};

/**
 * Generates a clothing item image from a text prompt.
 * @param prompt The user's description of the clothing item.
 * @returns An object containing the data URL of the generated image.
 */
export const generateClothingItem = async (prompt: string): Promise<{ imageUrl: string }> => {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: `A professional, clean, high-resolution, e-commerce product shot of the following clothing item on a pure white background. The item should be the only thing in the image, perfectly centered, and well-lit: "${prompt}"`,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/png',
            aspectRatio: '1:1',
        },
    });

    if (!response.generatedImages || response.generatedImages.length === 0) {
        throw new Error("Image generation failed, no images returned.");
    }
    const base64ImageBytes = response.generatedImages[0].image.imageBytes;
    return { imageUrl: `data:image/png;base64,${base64ImageBytes}` };
};

/**
 * Generates an accessory image from a text prompt.
 * @param prompt The user's description of the accessory.
 * @returns An object containing the data URL of the generated image.
 */
export const generateAccessory = async (prompt: string): Promise<{ imageUrl: string }> => {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: `A professional, clean, high-resolution, e-commerce product shot of the following accessory on a pure white background. The item should be the only thing in the image, perfectly centered, and well-lit: "${prompt}"`,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/png',
            aspectRatio: '1:1',
        },
    });

    if (!response.generatedImages || response.generatedImages.length === 0) {
        throw new Error("Image generation failed, no images returned.");
    }
    const base64ImageBytes = response.generatedImages[0].image.imageBytes;
    return { imageUrl: `data:image/png;base64,${base64ImageBytes}` };
};

/**
 * Generates a scene image from a text prompt.
 * @param prompt The user's description of the scene.
 * @returns An object containing the data URL of the generated image.
 */
export const generateScene = async (prompt: string): Promise<{ imageUrl: string }> => {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: `A high-quality, photorealistic background scene for a fashion photoshoot. The scene should be beautiful and visually interesting but not distract from a model who will be placed in the foreground. Scene description: "${prompt}"`,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: '3:4',
        },
    });

    if (!response.generatedImages || response.generatedImages.length === 0) {
        throw new Error("Image generation failed, no images returned.");
    }
    const base64ImageBytes = response.generatedImages[0].image.imageBytes;
    return { imageUrl: `data:image/jpeg;base64,${base64ImageBytes}` };
};

/**
 * Generates a model image from a text prompt.
 * @param prompt The user's description of the model.
 * @returns An object containing the data URL of the generated image.
 */
export const generateModel = async (prompt: string): Promise<{ imageUrl: string }> => {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: `Full-body fashion model photo. A photorealistic, high-fashion model standing against a solid neutral gray background. The model should be the sole focus. Model description: "${prompt}"`,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/png',
            aspectRatio: '3:4',
        },
    });

    if (!response.generatedImages || response.generatedImages.length === 0) {
        throw new Error("Image generation failed, no images returned.");
    }
    const base64ImageBytes = response.generatedImages[0].image.imageBytes;
    return { imageUrl: `data:image/png;base64,${base64ImageBytes}` };
};

/**
 * Removes the background from an image, leaving the subject on a transparent background.
 * @param imageUrl The data URL of the image to process.
 * @returns The data URL of the processed image with a transparent background.
 */
export const removeBackground = async (imageUrl: string): Promise<string> => {
    const imagePart = dataUrlToPart(imageUrl);

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: {
            parts: [
                imagePart,
                { text: 'Analyze the image and identify the main human subject. Create a new image where this person is perfectly isolated on a transparent background. Ensure the edges are clean and professional. The output MUST be just the image with a transparent background.' },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    
    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            const base64ImageBytes = part.inlineData.data;
            const mimeType = part.inlineData.mimeType;
            return `data:${mimeType};base64,${base64ImageBytes}`;
        }
    }

    throw new Error('Background removal failed: No image was returned from the model.');
};

/**
 * Composes the final photoshoot images by combining models, products, and a scene.
 * This function now makes a separate API call for each angle to avoid the AI
 * creating a single image with multiple people.
 * @returns A promise that resolves to an array of generated results, one for each model.
 */
export const composeFinalImage = async (
    models: Model[],
    products: Product[],
    scene: Scene | null,
    accessories: Accessory[],
    pose: Pose,
    customPosePrompt: string,
    selectedColor: string | null,
    aspectRatio: '9:16' | '16:9'
): Promise<{ model: Model; images: { angle: string; image: string }[] }[]> => {

    const imageGenerationPromises = models.map(async (model) => {
        const productParts = products.map(p => dataUrlToPart(p.imageUrl));
        const accessoryParts = accessories.map(a => dataUrlToPart(a.imageUrl));
        const modelPart = dataUrlToPart(model.imageUrl);

        let scenePromptPart: string;
        const sceneParts = [];
        if (scene) {
            scenePromptPart = `Place the model in the provided scene.`;
            sceneParts.push(dataUrlToPart(scene.imageUrl));
        } else if (selectedColor) {
            scenePromptPart = `Place the model against a solid background of this color: ${selectedColor}.`;
        } else {
            scenePromptPart = `Place the model against a clean, neutral studio background.`;
        }
        
        const posePrompt = pose.name === 'Custom' ? customPosePrompt : pose.prompt;
        const angles = ['Front View', 'Side View', 'Three-Quarter View'];

        // Generate one image for each angle in parallel.
        const anglePromises = angles.map(async (angle) => {
            const singleImagePrompt = `
You are an expert AI fashion photoshoot director. Your task is to create a **single photorealistic image** of a fashion model wearing specific clothing and accessories in a given scene.

**Instructions:**
1.  **Model:** Use the provided reference model image as the base for the person in the final image. Preserve their facial features and body type.
2.  **Clothing & Accessories:** Dress the model in ALL of the provided clothing and accessory items. The items must be clearly visible and look natural on the model.
3.  **Scene:** ${scenePromptPart}
4.  **Pose:** The model should be in the following pose: "${posePrompt}".
5.  **Angle:** The final image must be from the **${angle}**.
6.  **Output:** Generate **one** high-resolution, photorealistic, full-body image of the final composition. The final image MUST have a ${aspectRatio === '9:16' ? 'vertical portrait (9:16)' : 'horizontal landscape (16:9)'} aspect ratio. The lighting should be professional and appropriate for the scene. The final image must be clean and professional.

Respond with ONLY the single generated image file. Do not include any text in your response.
`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image-preview',
                contents: {
                    parts: [
                        { text: "Reference Model:" },
                        modelPart,
                        { text: "Clothing to wear:" },
                        ...productParts,
                        { text: "Accessories to wear:" },
                        ...accessoryParts,
                        ...sceneParts.length > 0 ? [{ text: "Scene to use:" }, ...sceneParts] : [],
                        { text: singleImagePrompt },
                    ]
                },
                config: {
                    responseModalities: [Modality.IMAGE, Modality.TEXT],
                },
            });

            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    const base64ImageBytes = part.inlineData.data;
                    const mimeType = part.inlineData.mimeType;
                    return {
                        angle: angle,
                        image: `data:${mimeType};base64,${base64ImageBytes}`
                    };
                }
            }
            
            // If no image part was found, throw an error for this specific angle.
            const errorText = response.text?.trim();
            if (errorText) {
                 throw new Error(`Image composition failed for model ${model.name} (${angle}): ${errorText}`);
            }
            throw new Error(`Image composition failed for model ${model.name} (${angle}). The model did not return an image.`);
        });

        const images = await Promise.all(anglePromises);
        return { model, images };
    });
    
    return Promise.all(imageGenerationPromises);
};


/**
 * Generates a descriptive prompt for video generation based on an image and context.
 * @returns A promise that resolves to a string prompt.
 */
export const generateVideoDescription = async (
    images: { angle: string; image: string }[],
    model: Model,
    products: Product[],
    accessories: Accessory[],
    scene: Scene | null
): Promise<string> => {
    const imageParts = images.map(img => dataUrlToPart(img.image));
    const productNames = products.map(p => p.name).join(', ');
    const accessoryNames = accessories.map(a => a.name).join(', ');

    const prompt = `
Analyze the provided images of a fashion model from three different angles ('Front View', 'Side View', 'Three-Quarter View'). Based on these images and the details below, create a short, dynamic, and exciting prompt (around 20-30 words) for an AI video generation model. The prompt should describe a short video clip suitable for a fashion ad, where the camera perspective might change to showcase the outfit from these different angles.

**Details:**
- **Model:** ${model.name}
- **Wearing:** ${productNames}
- **Accessories:** ${accessoryNames || 'None'}
- **Scene Description:** The model is in ${scene ? scene.name : 'a studio setting'}.

**Instructions:**
- The prompt should be vivid and action-oriented.
- Start the clip from the front view but suggest camera movement or cuts to show off the outfit's details, as seen in the side and three-quarter views.
- Focus on movement, emotion, and the overall vibe.
- Example: "A cinematic shot of a model walking confidently, the camera orbits from a front view to a side profile, showcasing the dress flowing behind her in a neon-lit city."

Generate ONLY the prompt text.
`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [...imageParts, { text: prompt }] },
    });
    
    return response.text.trim();
};

/**
 * Initiates a video generation job.
 * @param prompt The prompt for the video.
 * @param imageUrl The data URL of the image to use as a base.
 * @returns A promise that resolves to the operation object for polling.
 */
const generateVideo = async (prompt:string, imageUrl: string, aspectRatio: '9:16' | '16:9') => {
    const base64Data = imageUrl.split(',')[1];
    const mimeType = imageUrl.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
    
    const finalPrompt = `${prompt}. Ensure the final video has a ${aspectRatio} aspect ratio.`;

    const operation = await ai.models.generateVideos({
        model: 'veo-2.0-generate-001',
        prompt: finalPrompt,
        image: {
            imageBytes: base64Data,
            mimeType: mimeType,
        },
        config: {
            numberOfVideos: 1,
        }
    });
    return operation;
};

/**
 * Starts the generation of a preview-quality video.
 */
export const generateVideoPreview = async (prompt: string, image: string, aspectRatio: '9:16' | '16:9'): Promise<any> => {
    return generateVideo(prompt, image, aspectRatio);
};

/**
 * Starts the generation of a final, high-quality video.
 */
export const generateFinalVideo = async (prompt: string, image: string, aspectRatio: '9:16' | '16:9'): Promise<any> => {
    return generateVideo(prompt, image, aspectRatio);
};

/**
 * Checks the status of a video generation operation.
 * @param operation The operation object to check.
 * @returns A promise that resolves to a blob URL if the video is ready, or null if it's still processing.
 */
export const checkVideoStatus = async (operation: any): Promise<string | null> => {
    const updatedOperation = await ai.operations.getVideosOperation({ operation });

    if (updatedOperation.done) {
        if (updatedOperation.error) {
            // FIX: The error message from the API can be of type 'unknown'.
            // Explicitly cast to string to prevent a type error in the Error constructor.
            const error = new Error(String(updatedOperation.error.message) || 'Video generation failed.');
            // Attach the URI for manual download if it exists, even on failure.
            (error as any).directDownloadUrl = updatedOperation.response?.generatedVideos?.[0]?.video?.uri;
            throw error;
        }

        const downloadLink = updatedOperation.response?.generatedVideos?.[0]?.video?.uri;
        // FIX: The download link from the API can be of type 'unknown'. A simple
        // truthiness check is not enough. Use a type guard to ensure it's a string.
        if (typeof downloadLink === 'string' && downloadLink) {
            // Per docs, we must append an API key to fetch from the download link.
            const response = await fetch(`${downloadLink}&key=${String(process.env.API_KEY)}`);
            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`Failed to fetch video from URI. Status: ${response.status} ${response.statusText}. Body: ${errorBody}`);
            }
            const videoBlob = await response.blob();
            // Create a local URL for the browser to use
            return URL.createObjectURL(videoBlob);
        } else {
             throw new Error('Video generation finished, but no video URI was found in the response.');
        }
    }
    
    // Not done yet, return null to indicate polling should continue.
    return null;
};
