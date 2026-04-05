"""
Free Video Generator - Scene Splitter
LLM-powered scenario splitting into individual scenes
"""

import json
import re
from typing import List, Dict, Any, Optional
from loguru import logger

from .types import VideoScene, VideoScript, TransitionType, VideoRatio


class SceneSplitter:
    """
    Splits long video scenarios into individual scenes.
    
    Uses LLM to:
    - Break down narrative into visual scenes
    - Generate prompts for each scene
    - Suggest transitions between scenes
    - Estimate scene durations
    """
    
    def __init__(
        self,
        llm_client: Any = None,
        default_scene_duration: float = 8.0,
        min_scene_duration: float = 5.0,
        max_scene_duration: float = 10.0
    ):
        self.llm_client = llm_client
        self.default_scene_duration = default_scene_duration
        self.min_scene_duration = min_scene_duration
        self.max_scene_duration = max_scene_duration
    
    async def split_scenario(
        self,
        prompt: str,
        target_duration: float = 60.0,
        style: Optional[str] = None,
        voiceover: bool = False
    ) -> VideoScript:
        """
        Split a long prompt into multiple scenes.
        
        Args:
            prompt: Long text description of the video
            target_duration: Target total duration in seconds
            style: Visual style (cinematic, anime, realistic, etc.)
            voiceover: Whether to generate voiceover text for each scene
            
        Returns:
            VideoScript with multiple scenes
        """
        
        # Calculate number of scenes needed
        num_scenes = max(2, int(target_duration / self.default_scene_duration))
        
        logger.info(f"Splitting scenario into ~{num_scenes} scenes...")
        
        if self.llm_client:
            scenes = await self._llm_split(prompt, num_scenes, style, voiceover)
        else:
            scenes = await self._rule_based_split(prompt, num_scenes, style)
        
        # Create script
        script = VideoScript(
            title=self._extract_title(prompt),
            description=prompt[:200],
            total_duration=target_duration,
            scenes=scenes,
            voiceover_enabled=voiceover,
        )
        
        # Adjust scene durations to match target
        script = self._adjust_durations(script, target_duration)
        
        logger.info(f"Created script with {len(scenes)} scenes")
        
        return script
    
    async def _llm_split(
        self,
        prompt: str,
        num_scenes: int,
        style: Optional[str],
        voiceover: bool
    ) -> List[VideoScene]:
        """Use LLM to split the scenario"""
        
        system_prompt = """You are a video director. Your task is to break down a video concept into individual scenes.

For each scene, provide:
1. A detailed visual prompt for AI video generation (50-100 words)
2. Duration in seconds (5-10 seconds per scene)
3. Transition type (fade, crossfade, zoom_in, zoom_out, slide_left, slide_right, or none)
4. Voiceover text if requested

Output JSON array of scenes:
[
  {
    "prompt": "Detailed visual description for video AI...",
    "duration": 8,
    "transition": "crossfade",
    "voiceover": "Narration text for this scene"
  }
]

Guidelines:
- Each scene should be visually distinct
- Prompts should describe camera movement, lighting, colors
- Transitions help smooth scene changes
- Total scenes should match the requested number
- Make prompts cinematic and evocative"""

        user_prompt = f"""Create {num_scenes} scenes for this video concept:

"{prompt}"

Style: {style or 'cinematic'}
Voiceover: {'Yes' if voiceover else 'No'}

Output only the JSON array of scenes."""

        try:
            # Call LLM
            response = await self.llm_client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.7,
                max_tokens=2000
            )
            
            content = response.choices[0].message.content
            
            # Extract JSON from response
            json_match = re.search(r'\[.*\]', content, re.DOTALL)
            if json_match:
                scenes_data = json.loads(json_match.group())
            else:
                raise ValueError("No JSON array found in LLM response")
            
            # Convert to VideoScene objects
            scenes = []
            for i, scene_data in enumerate(scenes_data):
                scene = VideoScene(
                    id=f"scene_{i+1}",
                    prompt=scene_data.get('prompt', ''),
                    duration=float(scene_data.get('duration', self.default_scene_duration)),
                    transition_out=TransitionType(scene_data.get('transition', 'crossfade')),
                    voiceover_text=scene_data.get('voiceover') if voiceover else None,
                )
                scenes.append(scene)
            
            return scenes
            
        except Exception as e:
            logger.error(f"LLM split failed: {e}")
            # Fall back to rule-based
            return await self._rule_based_split(prompt, num_scenes, style)
    
    async def _rule_based_split(
        self,
        prompt: str,
        num_scenes: int,
        style: Optional[str]
    ) -> List[VideoScene]:
        """Rule-based scene splitting without LLM"""
        
        # Split by sentences
        sentences = re.split(r'[.!?]+', prompt)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        scenes = []
        
        # Group sentences into scenes
        sentences_per_scene = max(1, len(sentences) // num_scenes)
        
        for i in range(num_scenes):
            start_idx = i * sentences_per_scene
            end_idx = start_idx + sentences_per_scene if i < num_scenes - 1 else len(sentences)
            
            scene_sentences = sentences[start_idx:end_idx]
            
            if not scene_sentences:
                break
            
            # Create prompt from sentences
            scene_text = '. '.join(scene_sentences)
            
            # Enhance prompt with style
            enhanced_prompt = self._enhance_prompt(scene_text, style)
            
            # Determine transition
            if i == 0:
                transition = TransitionType.NONE
            elif i == num_scenes - 1:
                transition = TransitionType.FADE
            else:
                transition = TransitionType.CROSSFADE
            
            scene = VideoScene(
                id=f"scene_{i+1}",
                prompt=enhanced_prompt,
                duration=self.default_scene_duration,
                transition_in=transition if i > 0 else TransitionType.NONE,
                transition_out=transition if i < num_scenes - 1 else TransitionType.FADE,
            )
            
            scenes.append(scene)
        
        return scenes
    
    def _enhance_prompt(self, text: str, style: Optional[str]) -> str:
        """Enhance scene prompt with style and quality modifiers"""
        
        style_modifiers = {
            'cinematic': ', cinematic lighting, dramatic, film grain, 4k quality',
            'anime': ', anime style, vibrant colors, studio ghibli inspired, detailed',
            'realistic': ', photorealistic, natural lighting, high detail, 8k',
            '3d': ', 3D rendered, octane render, volumetric lighting, detailed textures',
            'vintage': ', vintage film, warm tones, film grain, nostalgic atmosphere',
            'dark': ', dark moody atmosphere, low key lighting, dramatic shadows',
            'bright': ', bright colorful, sunny, vibrant, high key lighting',
        }
        
        modifier = style_modifiers.get(style, ', cinematic, high quality, detailed')
        
        # Add camera movement hints if not present
        camera_hints = ['camera', 'shot', 'angle', 'zoom', 'pan', 'tilt']
        if not any(hint in text.lower() for hint in camera_hints):
            modifier += ', smooth camera movement'
        
        return text + modifier
    
    def _extract_title(self, prompt: str) -> str:
        """Extract title from prompt"""
        # Take first sentence or first 50 chars
        match = re.match(r'^[^.!?]+', prompt)
        if match:
            title = match.group().strip()
        else:
            title = prompt[:50]
        
        # Clean up
        title = re.sub(r'[^\w\s-]', '', title)
        title = title.strip()[:50]
        
        return title or "Untitled Video"
    
    def _adjust_durations(self, script: VideoScript, target_duration: float) -> VideoScript:
        """Adjust scene durations to match target total duration"""
        
        if not script.scenes:
            return script
        
        # Calculate current total
        current_total = sum(s.duration for s in script.scenes)
        
        if current_total == 0:
            return script
        
        # Scale durations
        scale_factor = target_duration / current_total
        
        for scene in script.scenes:
            new_duration = scene.duration * scale_factor
            scene.duration = max(self.min_scene_duration, min(self.max_scene_duration, new_duration))
        
        return script
    
    async def enhance_prompt(self, prompt: str, style: Optional[str] = None) -> str:
        """Enhance a single prompt for better generation results"""
        
        if self.llm_client:
            try:
                system_prompt = """You are an expert at creating prompts for AI video generation.
Enhance the given prompt to be more detailed and cinematic.
Add details about:
- Camera movement and angles
- Lighting conditions
- Color palette
- Atmosphere and mood
- Important visual details

Keep the enhanced prompt under 150 words.
Output only the enhanced prompt, nothing else."""

                response = await self.llm_client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": f"Enhance this prompt: {prompt}\nStyle: {style or 'cinematic'}"}
                    ],
                    temperature=0.7,
                    max_tokens=200
                )
                
                return response.choices[0].message.content.strip()
                
            except Exception as e:
                logger.error(f"Prompt enhancement failed: {e}")
        
        return self._enhance_prompt(prompt, style)
    
    async def generate_variations(
        self,
        prompt: str,
        num_variations: int = 3
    ) -> List[str]:
        """Generate variations of a prompt for multiple generations"""
        
        if self.llm_client:
            try:
                system_prompt = f"""Generate {num_variations} different variations of this video prompt.
Each variation should have different:
- Camera angles
- Lighting conditions
- Time of day
- Color mood

Keep each variation under 100 words.
Output as JSON array: ["variation1", "variation2", "variation3"]"""

                response = await self.llm_client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.9,
                    max_tokens=500
                )
                
                content = response.choices[0].message.content
                json_match = re.search(r'\[.*\]', content, re.DOTALL)
                
                if json_match:
                    return json.loads(json_match.group())
                    
            except Exception as e:
                logger.error(f"Variation generation failed: {e}")
        
        # Fallback: simple variations
        return [prompt for _ in range(num_variations)]


def load_json_script(json_path: str) -> VideoScript:
    """Load script from JSON file"""
    
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    scenes = []
    for i, scene_data in enumerate(data.get('scenes', [])):
        scene = VideoScene(
            id=scene_data.get('id', f"scene_{i+1}"),
            prompt=scene_data.get('prompt', ''),
            duration=float(scene_data.get('duration_sec', scene_data.get('duration', 8))),
            transition_in=TransitionType(scene_data.get('transition_in', 'none')),
            transition_out=TransitionType(scene_data.get('transition_out', 'crossfade')),
            voiceover_text=scene_data.get('voiceover'),
        )
        scenes.append(scene)
    
    return VideoScript(
        id=data.get('id', 'imported_script'),
        title=data.get('title', 'Imported Script'),
        description=data.get('description'),
        total_duration=data.get('total_duration', sum(s.duration for s in scenes)),
        ratio=VideoRatio(data.get('ratio', '9:16')),
        scenes=scenes,
        voiceover_text=data.get('voiceover'),
        tags=data.get('tags', []),
    )
