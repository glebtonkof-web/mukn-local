"""
Content Studio Infinite - Prompt Variator
Генерация уникальных промптов из шаблонов

МУКН | Трафик - Enterprise AI-powered Content Generation Platform
"""

import random
from typing import List, Dict, Optional
from loguru import logger


class PromptVariator:
    """
    Автоматическая генерация тысяч уникальных промптов.
    
    Позволяет создавать вариации из шаблонов с подстановкой:
    - Субъектов (subjects)
    - Действий (actions)
    - Стилей (styles)
    - Камер (camera angles)
    - Освещения (lighting)
    - Настроений (mood)
    """
    
    def __init__(self):
        # Базовые наборы для подстановки
        self.subjects = [
            "a beautiful woman", "a handsome man", "a cute cat", "a playful dog",
            "a majestic lion", "a colorful bird", "a mysterious wolf", "a tiny mouse",
            "an elegant horse", "a wise owl", "a graceful deer", "a powerful eagle",
            "a curious fox", "a serene koi fish", "a stunning butterfly", "a magical unicorn",
            "a brave knight", "a wise wizard", "a beautiful princess", "a mysterious rogue",
            "an ancient tree", "a crystal lake", "a snow-capped mountain", "a golden desert",
            "a lush forest", "a vibrant city", "a peaceful village", "a magical castle",
            "a futuristic spaceship", "a vintage car", "a sailing ship", "a flying dragon"
        ]
        
        self.actions = [
            "walking through", "running across", "dancing in", "flying over",
            "swimming in", "jumping over", "climbing up", "resting by",
            "playing with", "watching", "exploring", "protecting",
            "discovering", "creating", "transforming", "glowing",
            "floating above", "diving into", "emerging from", "disappearing into",
            "meditating near", "fighting against", "embracing", "contemplating"
        ]
        
        self.styles = [
            "cinematic", "photorealistic", "anime", "cartoon", "3D rendered",
            "oil painting", "watercolor", "digital art", "pencil sketch",
            "cyberpunk", "steampunk", "fantasy", "sci-fi", "vintage",
            "noir", "minimalist", "abstract", "impressionist", "surrealist",
            "gothic", "baroque", "art nouveau", "pop art", "vaporwave"
        ]
        
        self.cameras = [
            "close-up shot", "wide shot", "medium shot", "extreme close-up",
            "drone view", "POV", "aerial shot", "low angle", "high angle",
            "over the shoulder", "tracking shot", "panning shot", "zoom in",
            "dolly shot", "crane shot", "handheld", "static shot", "Dutch angle"
        ]
        
        self.lighting = [
            "golden hour lighting", "blue hour lighting", "harsh midday sun",
            "soft diffused light", "dramatic chiaroscuro", "neon lights",
            "candlelight", "moonlight", "firelight", "studio lighting",
            "backlit silhouette", "rim lighting", "volumetric lighting",
            "natural daylight", "artificial mixed lighting", "bioluminescent"
        ]
        
        self.moods = [
            "peaceful and serene", "dramatic and intense", "mysterious and enigmatic",
            "joyful and vibrant", "melancholic and sad", "romantic and dreamy",
            "epic and grand", "intimate and personal", "wild and untamed",
            "magical and enchanting", "dark and ominous", "bright and hopeful",
            "nostalgic and vintage", "futuristic and sleek", "cozy and warm"
        ]
        
        self.environments = [
            "ancient forest", "modern city", "underwater world", "mountain peak",
            "desert dunes", "tropical beach", "snowy tundra", "volcanic landscape",
            "enchanted garden", "abandoned ruins", "futuristic metropolis",
            "medieval village", "alien planet", "underground cave", "floating islands",
            "cherry blossom grove", "aurora-lit sky", "stormy ocean", "peaceful meadow"
        ]
        
        self.colors = [
            "warm golden tones", "cool blue tones", "vibrant rainbow colors",
            "monochromatic black and white", "sepia toned", "muted pastels",
            "rich saturated colors", "earth tones", "neon brights", "soft creams"
        ]
        
        self.movements = [
            "slow motion", "time-lapse", "normal speed", "fast paced",
            "smooth tracking", "dynamic hand-held", "elegant dolly", "dramatic zoom"
        ]
        
        # Шаблоны промптов
        self.templates = [
            "{style} {camera} of {subject} {action} {environment}, {lighting}, {mood}",
            "{subject} {action} {environment}, {style}, {camera}, {lighting}",
            "{mood} scene: {subject} {action} {environment}, {style}, {camera}",
            "{camera}, {style}: {subject} {action} {environment}, {lighting}, {colors}",
            "{environment} with {subject} {action}, {style}, {lighting}, {mood}",
            "{movement} {camera} of {subject} in {environment}, {style}, {lighting}",
            "{style} portrait of {subject}, {lighting}, {mood}, {camera}",
            "cinematic {movement} shot: {subject} {action} {environment}, {lighting}",
        ]
    
    def generate(
        self,
        template: str = None,
        subject: str = None,
        action: str = None,
        style: str = None,
        camera: str = None,
        lighting: str = None,
        mood: str = None,
        environment: str = None,
        color: str = None,
        movement: str = None
    ) -> str:
        """
        Генерация одного промпта.
        
        Все параметры опциональны - если не указаны, выбираются случайно.
        """
        # Выбор шаблона
        template = template or random.choice(self.templates)
        
        # Подстановка
        prompt = template.format(
            subject=subject or random.choice(self.subjects),
            action=action or random.choice(self.actions),
            style=style or random.choice(self.styles),
            camera=camera or random.choice(self.cameras),
            lighting=lighting or random.choice(self.lighting),
            mood=mood or random.choice(self.moods),
            environment=environment or random.choice(self.environments),
            colors=color or random.choice(self.colors),
            movement=movement or random.choice(self.movements),
        )
        
        return prompt
    
    def generate_batch(
        self,
        count: int,
        base_prompt: str = None,
        template: str = None,
        variations: Dict[str, List[str]] = None
    ) -> List[str]:
        """
        Генерация множества уникальных промптов.
        
        Args:
            count: Количество промптов
            base_prompt: Базовый промпт для модификации
            template: Шаблон для использования
            variations: Словарь с конкретными вариациями
            
        Returns:
            Список уникальных промптов
        """
        prompts = []
        generated = set()
        
        while len(prompts) < count:
            if base_prompt:
                # Модификация базового промпта
                prompt = self._vary_prompt(base_prompt, variations)
            else:
                # Полностью случайная генерация
                prompt = self.generate(template)
            
            # Проверка на уникальность
            if prompt not in generated:
                prompts.append(prompt)
                generated.add(prompt)
        
        return prompts
    
    def _vary_prompt(
        self,
        base_prompt: str,
        variations: Dict[str, List[str]] = None
    ) -> str:
        """
        Создание вариации базового промпта.
        
        Добавляет случайные модификаторы к базовому промпту.
        """
        prompt = base_prompt
        
        # Добавляем случайные модификаторы
        modifiers = []
        
        # С вероятностью 50% добавляем стиль
        if random.random() > 0.5:
            modifiers.append(random.choice(self.styles))
        
        # С вероятностью 40% добавляем освещение
        if random.random() > 0.6:
            modifiers.append(random.choice(self.lighting))
        
        # С вероятностью 30% добавляем настроение
        if random.random() > 0.7:
            modifiers.append(random.choice(self.moods))
        
        # С вероятностью 30% добавляем камеру
        if random.random() > 0.7:
            modifiers.append(random.choice(self.cameras))
        
        # Если есть специфичные вариации
        if variations:
            for key, values in variations.items():
                if values and random.random() > 0.5:
                    modifiers.append(random.choice(values))
        
        if modifiers:
            prompt = f"{prompt}, {', '.join(modifiers)}"
        
        return prompt
    
    def generate_for_long_video(
        self,
        theme: str,
        scene_count: int,
        style: str = "cinematic"
    ) -> List[str]:
        """
        Генерация промптов для сцен длинного видео.
        
        Создаёт связную последовательность сцен на одну тему.
        
        Args:
            theme: Тема видео (например, "journey through nature")
            scene_count: Количество сцен
            style: Стиль всех сцен
            
        Returns:
            Список промптов для каждой сцены
        """
        prompts = []
        
        # Разбиваем тему на сцены с прогрессией
        for i in range(scene_count):
            progress = i / scene_count  # 0.0 to 1.0
            
            # Прогрессия времени суток
            if progress < 0.25:
                time_of_day = "dawn"
                lighting = "soft golden morning light"
            elif progress < 0.5:
                time_of_day = "day"
                lighting = "bright natural daylight"
            elif progress < 0.75:
                time_of_day = "dusk"
                lighting = "warm golden hour lighting"
            else:
                time_of_day = "night"
                lighting = "dramatic moonlight and starlight"
            
            # Прогрессия настроения
            if progress < 0.3:
                mood = "peaceful and serene"
            elif progress < 0.6:
                mood = "adventurous and exciting"
            elif progress < 0.9:
                mood = "dramatic and intense"
            else:
                mood = "triumphant and fulfilling"
            
            # Генерируем промпт для сцены
            prompt = self.generate(
                template=f"{style} {{camera}} of {{subject}} {{action}} {{environment}}, {lighting}, {mood}",
                style=style,
                lighting=lighting,
                mood=mood,
            )
            
            # Добавляем тему
            prompt = f"{prompt}, {theme}, scene {i + 1}"
            
            prompts.append(prompt)
        
        return prompts
    
    def generate_story_prompts(
        self,
        story: str,
        scene_count: int
    ) -> List[str]:
        """
        Генерация промптов на основе истории/сценария.
        
        Args:
            story: Описание истории
            scene_count: Количество сцен
            
        Returns:
            Список промптов
        """
        # Базовые промпты на основе истории
        prompts = []
        
        for i in range(scene_count):
            # Создаём уникальную вариацию для каждой сцены
            prompt = f"{story}, scene {i + 1} of {scene_count}"
            
            # Добавляем стиль и детали
            prompt = self._vary_prompt(prompt)
            
            prompts.append(prompt)
        
        return prompts
    
    def add_custom_lists(
        self,
        subjects: List[str] = None,
        actions: List[str] = None,
        styles: List[str] = None,
        environments: List[str] = None
    ) -> None:
        """Добавление пользовательских списков"""
        if subjects:
            self.subjects.extend(subjects)
        if actions:
            self.actions.extend(actions)
        if styles:
            self.styles.extend(styles)
        if environments:
            self.environments.extend(environments)


# Предустановленные темы для генерации
THEMES = {
    "nature_journey": {
        "environments": ["ancient forest", "crystal lake", "mountain waterfall", "wildflower meadow"],
        "moods": ["peaceful and serene", "majestic and grand", "magical and enchanting"],
        "lighting": ["golden hour lighting", "soft diffused light", "dappled sunlight through trees"],
    },
    "city_nights": {
        "environments": ["neon-lit streets", "rooftop garden", "busy intersection", "quiet alley"],
        "moods": ["mysterious and enigmatic", "energetic and vibrant", "romantic and dreamy"],
        "lighting": ["neon lights", "street lights", "moonlight reflecting on wet pavement"],
    },
    "fantasy_adventure": {
        "environments": ["enchanted forest", "dragon's lair", "magical castle", "mystical ruins"],
        "moods": ["epic and grand", "mysterious and enigmatic", "magical and enchanting"],
        "lighting": ["magical glow", "firelight", "ethereal light"],
    },
    "sci_fi_space": {
        "environments": ["spaceship bridge", "alien planet", "space station", "nebula"],
        "moods": ["awe-inspiring", "mysterious", "futuristic"],
        "lighting": ["artificial lighting", "starlight", "nebula glow"],
    },
    "romantic": {
        "environments": ["sunset beach", "flower garden", "cozy cafe", "rainy street"],
        "moods": ["romantic and dreamy", "intimate and personal", "peaceful and serene"],
        "lighting": ["golden hour lighting", "soft candlelight", "warm ambient light"],
    },
}
