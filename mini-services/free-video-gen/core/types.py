"""
Free Video Generator - Type Definitions
All data types and models for the video generation system
"""

from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime


class TransitionType(str, Enum):
    """Available transition types between scenes"""
    NONE = "none"
    FADE = "fade"
    CROSSFADE = "crossfade"
    ZOOM_IN = "zoom_in"
    ZOOM_OUT = "zoom_out"
    SLIDE_LEFT = "slide_left"
    SLIDE_RIGHT = "slide_right"
    ROTATE = "rotate"


class VideoRatio(str, Enum):
    """Video aspect ratios"""
    VERTICAL = "9:16"  # TikTok, Reels, Shorts
    HORIZONTAL = "16:9"  # YouTube
    SQUARE = "1:1"  # Instagram feed


class TaskStatus(str, Enum):
    """Task status in queue"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    RETRYING = "retrying"


class ProviderName(str, Enum):
    """Available video providers"""
    KLING = "kling"
    LUMA = "luma"
    RUNWAY = "runway"


class WatermarkMethod(str, Enum):
    """Methods for handling watermarks"""
    NONE = "none"
    CROP = "crop"
    BLUR = "blur"
    LOGO = "logo"


class VideoScene(BaseModel):
    """Single scene in a video project"""
    id: str = Field(default_factory=lambda: f"scene_{generate_id()}")
    prompt: str
    duration: float = 10.0  # seconds
    transition_in: TransitionType = TransitionType.NONE
    transition_out: TransitionType = TransitionType.CROSSFADE
    visual_path: Optional[str] = None
    audio_path: Optional[str] = None
    voiceover_text: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    # Generated video info
    generated_path: Optional[str] = None
    generation_time: Optional[float] = None
    provider_used: Optional[ProviderName] = None


class VideoScript(BaseModel):
    """Full video script with multiple scenes"""
    id: str = Field(default_factory=lambda: f"script_{generate_id()}")
    title: str
    description: Optional[str] = None
    total_duration: float = 60.0  # Target duration in seconds
    ratio: VideoRatio = VideoRatio.VERTICAL
    scenes: List[VideoScene] = Field(default_factory=list)
    
    # Audio settings
    background_music: Optional[str] = None
    voiceover_enabled: bool = True
    voiceover_text: Optional[str] = None
    
    # Tags and metadata
    tags: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class VideoProject(BaseModel):
    """Complete video generation project"""
    id: str = Field(default_factory=lambda: f"project_{generate_id()}")
    script: VideoScript
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    status: TaskStatus = TaskStatus.PENDING
    
    # Output
    output_path: Optional[str] = None
    thumbnail_path: Optional[str] = None
    
    # Statistics
    total_scenes: int = 0
    completed_scenes: int = 0
    failed_scenes: int = 0
    
    def update_progress(self):
        """Update progress statistics"""
        self.total_scenes = len(self.script.scenes)
        self.completed_scenes = sum(1 for s in self.script.scenes if s.generated_path)
        self.failed_scenes = sum(1 for s in self.script.scenes if s.metadata.get('failed'))
        self.updated_at = datetime.utcnow()


class GenerationTask(BaseModel):
    """Task for the generation queue"""
    id: str = Field(default_factory=lambda: f"task_{generate_id()}")
    project_id: str
    scene_id: str
    prompt: str
    duration: float = 10.0
    provider: Optional[ProviderName] = None  # Auto-select if None
    
    status: TaskStatus = TaskStatus.PENDING
    priority: int = 5  # 1-10, lower is higher priority
    
    # Retry management
    retry_count: int = 0
    max_retries: int = 3
    last_error: Optional[str] = None
    
    # Timing
    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    # Result
    result_path: Optional[str] = None
    
    class Config:
        use_enum_values = True


class ProviderConfig(BaseModel):
    """Configuration for a video provider"""
    name: ProviderName
    enabled: bool = True
    url: str
    daily_credits: int = 100
    max_requests_per_hour: int = 5
    max_requests_per_day: int = 50
    video_duration: List[int] = [5, 10]
    max_resolution: str = "1080p"
    priority: int = 1
    
    # State
    current_credits: int = 100
    requests_today: int = 0
    requests_this_hour: int = 0
    last_request: Optional[datetime] = None
    cookies_path: Optional[str] = None
    
    class Config:
        use_enum_values = True


class GenerationResult(BaseModel):
    """Result of a generation operation"""
    success: bool
    task_id: str
    provider: ProviderName
    output_path: Optional[str] = None
    duration: float = 0.0
    error: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ProviderStatus(BaseModel):
    """Current status of a provider"""
    name: ProviderName
    available: bool
    credits_remaining: int
    requests_remaining_hour: int
    requests_remaining_day: int
    queue_position: int = 0
    estimated_wait: float = 0.0  # seconds


def generate_id(length: int = 8) -> str:
    """Generate random ID"""
    import random
    import string
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))
