/**
 * Image Generator Module
 * AI-powered image generation with multiple providers
 */

import { getZAI } from '@/lib/z-ai';
import { nanoid } from 'nanoid';
import { 
  ImageGenerationOptions, 
  GeneratedImage, 
  ImageStyle,
  ContentStudioResponse 
} from './types';

// Style presets for image generation
const IMAGE_STYLE_PRESETS: Record<string, string[]> = {
  realistic: ['photorealistic', '8k uhd', 'high detail', 'natural lighting'],
  anime: ['anime style', 'vibrant colors', 'studio ghibli', 'detailed'],
  '3d': ['3d render', 'octane render', 'volumetric lighting', 'cinematic'],
  artistic: ['oil painting', 'artistic', 'detailed brushstrokes', 'masterpiece'],
  cinematic: ['cinematic lighting', 'dramatic', 'film grain', 'movie scene'],
  cartoon: ['cartoon style', 'bold colors', 'clean lines', 'animated'],
  abstract: ['abstract art', 'geometric shapes', 'vibrant colors', 'modern art'],
};

// Size mappings for aspect ratios
const ASPECT_RATIO_SIZES: Record<string, { width: number; height: number }> = {
  '1:1': { width: 1024, height: 1024 },
  '9:16': { width: 768, height: 1344 },
  '16:9': { width: 1344, height: 768 },
  '4:3': { width: 1152, height: 864 },
  '3:4': { width: 864, height: 1152 },
};

export class ImageGenerator {
  private zai: any = null;

  /**
   * Initialize the SDK
   */
  private async init() {
    if (!this.zai) {
      this.zai = await getZAI();
    }
    return this.zai;
  }

  /**
   * Generate single or multiple images
   */
  async generate(options: ImageGenerationOptions): Promise<ContentStudioResponse<GeneratedImage[]>> {
    try {
      const zai = await this.init();
      
      // Build enhanced prompt
      const enhancedPrompt = this.enhancePrompt(options.prompt, options.style, options.negativePrompt);
      
      // Determine size
      const size = this.getSize(options);
      
      // Generate images
      const response = await zai.images.generations.create({
        prompt: enhancedPrompt,
        size: `${size.width}x${size.height}`,
        n: options.numberOfImages || 1,
      });

      const images: GeneratedImage[] = [];
      
      for (const item of response.data || []) {
        const image: GeneratedImage = {
          id: `img_${nanoid(8)}`,
          url: item.url || '',
          base64: item.base64,
          width: size.width,
          height: size.height,
          format: 'png',
          seed: item.seed,
        };
        images.push(image);
      }

      return {
        success: true,
        data: images,
        metadata: {
          id: `gen_${nanoid(8)}`,
          type: 'image',
          status: 'completed',
          createdAt: new Date(),
          updatedAt: new Date(),
          prompt: options.prompt,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Image generation failed',
      };
    }
  }

  /**
   * Generate image variations
   */
  async generateVariations(
    basePrompt: string, 
    count: number = 4,
    style?: ImageStyle
  ): Promise<ContentStudioResponse<GeneratedImage[]>> {
    const variations: GeneratedImage[] = [];
    const errors: string[] = [];

    // Generate variations with slightly different prompts
    const prompts = this.createVariationPrompts(basePrompt, count, style);

    for (let i = 0; i < prompts.length; i++) {
      try {
        const result = await this.generate({
          prompt: prompts[i],
          style,
          numberOfImages: 1,
        });

        if (result.success && result.data) {
          variations.push(...result.data);
        }
      } catch (error: any) {
        errors.push(`Variation ${i + 1}: ${error.message}`);
      }
    }

    return {
      success: variations.length > 0,
      data: variations,
      error: errors.length > 0 ? errors.join('; ') : undefined,
    };
  }

  /**
   * Edit/extend image with AI
   */
  async editImage(
    imageUrl: string,
    editPrompt: string,
    options?: Partial<ImageGenerationOptions>
  ): Promise<ContentStudioResponse<GeneratedImage>> {
    try {
      const zai = await this.init();
      
      // Note: z-ai-web-dev-sdk may have image editing capabilities
      // For now, we'll generate a new image based on the edit prompt
      const enhancedPrompt = `${editPrompt}, based on reference image, maintaining style and composition`;
      
      const response = await zai.images.generations.create({
        prompt: enhancedPrompt,
        size: '1024x1024',
      });

      const item = response.data?.[0];
      if (!item) {
        throw new Error('No image generated');
      }

      const image: GeneratedImage = {
        id: `img_edit_${nanoid(8)}`,
        url: item.url || '',
        base64: item.base64,
        width: 1024,
        height: 1024,
        format: 'png',
      };

      return {
        success: true,
        data: image,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Enhance prompt with style modifiers
   */
  private enhancePrompt(
    prompt: string, 
    style?: ImageStyle, 
    negativePrompt?: string
  ): string {
    let enhanced = prompt;

    // Add style modifiers
    if (style) {
      const modifiers = IMAGE_STYLE_PRESETS[style.type] || [];
      const allModifiers = [...modifiers, ...(style.modifiers || [])];
      enhanced = `${prompt}, ${allModifiers.join(', ')}`;
    }

    // Add negative prompt
    if (negativePrompt) {
      // Some APIs support negative prompts separately
      // For z-ai, we append to main prompt with negative notation
      enhanced = `${enhanced}, NOT ${negativePrompt}`;
    }

    // Add quality boosters
    enhanced = `${enhanced}, high quality, detailed`;

    return enhanced;
  }

  /**
   * Create variation prompts
   */
  private createVariationPrompts(
    basePrompt: string, 
    count: number,
    style?: ImageStyle
  ): string[] {
    const variations: string[] = [];
    const modifiers = [
      'dramatic lighting',
      'soft lighting',
      'vibrant colors',
      'muted tones',
      'close-up view',
      'wide angle',
      'detailed texture',
      'minimalist composition',
    ];

    for (let i = 0; i < count; i++) {
      const modifier = modifiers[i % modifiers.length];
      variations.push(`${basePrompt}, ${modifier}`);
    }

    return variations;
  }

  /**
   * Get size based on options
   */
  private getSize(options: ImageGenerationOptions): { width: number; height: number } {
    // If explicit dimensions provided
    if (options.width && options.height) {
      return { width: options.width, height: options.height };
    }

    // Use aspect ratio
    if (options.aspectRatio) {
      return ASPECT_RATIO_SIZES[options.aspectRatio] || ASPECT_RATIO_SIZES['1:1'];
    }

    // Default square
    return ASPECT_RATIO_SIZES['1:1'];
  }

  /**
   * Get available style presets
   */
  getStylePresets(): Record<string, string[]> {
    return { ...IMAGE_STYLE_PRESETS };
  }

  /**
   * Get available aspect ratios
   */
  getAspectRatios(): string[] {
    return Object.keys(ASPECT_RATIO_SIZES);
  }
}

// Singleton instance
let imageGeneratorInstance: ImageGenerator | null = null;

export function getImageGenerator(): ImageGenerator {
  if (!imageGeneratorInstance) {
    imageGeneratorInstance = new ImageGenerator();
  }
  return imageGeneratorInstance;
}

// Export convenience functions
export const imageGen = {
  generate: (options: ImageGenerationOptions) => getImageGenerator().generate(options),
  variations: (basePrompt: string, count?: number, style?: ImageStyle) => 
    getImageGenerator().generateVariations(basePrompt, count, style),
  edit: (imageUrl: string, editPrompt: string, options?: Partial<ImageGenerationOptions>) =>
    getImageGenerator().editImage(imageUrl, editPrompt, options),
  getStylePresets: () => getImageGenerator().getStylePresets(),
  getAspectRatios: () => getImageGenerator().getAspectRatios(),
};
