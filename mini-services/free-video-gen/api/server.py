"""
Free Video Generator - HTTP API Server
FastAPI server for video generation service
"""

import os
import asyncio
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field

from loguru import logger

# Import core modules
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.types import (
    VideoScene,
    VideoScript,
    VideoProject,
    GenerationTask,
    TaskStatus,
    TransitionType,
    VideoRatio,
)
from core.utils import load_config, setup_logging, ensure_dir
from core.queue import TaskQueue, TaskWorker
from core.cache import VideoCache
from core.video_stitcher import VideoStitcher
from core.scene_splitter import SceneSplitter, load_json_script
from core.audio_mixer import AudioMixer
from providers.manager import ProviderManager


# Initialize FastAPI
app = FastAPI(
    title="Free Video Generator API",
    description="API для бесплатной генерации видео через Kling AI, Luma, Runway",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request/Response Models
class GenerateRequest(BaseModel):
    """Request for single video generation"""
    prompt: str = Field(..., description="Text prompt for video generation")
    duration: float = Field(10.0, description="Video duration in seconds (5 or 10)")
    ratio: str = Field("9:16", description="Aspect ratio: 9:16, 16:9, 1:1")
    provider: Optional[str] = Field(None, description="Provider: kling, luma, runway")
    style: Optional[str] = Field(None, description="Visual style: cinematic, anime, realistic")


class LongVideoRequest(BaseModel):
    """Request for long video generation"""
    prompt: str = Field(..., description="Long text prompt describing the video")
    target_duration: float = Field(60.0, description="Target duration in seconds")
    ratio: str = Field("9:16", description="Aspect ratio")
    style: Optional[str] = Field(None, description="Visual style")
    voiceover: bool = Field(False, description="Generate voiceover")
    music_style: Optional[str] = Field(None, description="Background music style")


class ScriptRequest(BaseModel):
    """Request with pre-defined script"""
    script: Dict[str, Any] = Field(..., description="Video script JSON")
    voiceover: bool = Field(False)
    music_style: Optional[str] = None


class TaskResponse(BaseModel):
    """Response for task creation"""
    task_id: str
    status: str
    message: str


class StatusResponse(BaseModel):
    """Response for status check"""
    status: str
    healthy: bool
    providers: Dict[str, Any]
    queue: Dict[str, Any]


# Global instances
config: Dict[str, Any] = None
provider_manager: ProviderManager = None
task_queue: TaskQueue = None
video_cache: VideoCache = None
video_stitcher: VideoStitcher = None
scene_splitter: SceneSplitter = None
audio_mixer: AudioMixer = None
projects: Dict[str, VideoProject] = {}


@app.on_event("startup")
async def startup():
    """Initialize services on startup"""
    global config, provider_manager, task_queue, video_cache, video_stitcher, scene_splitter, audio_mixer
    
    # Load config
    config = load_config()
    
    # Setup logging
    log_level = os.getenv('LOG_LEVEL', config.get('logging', {}).get('level', 'INFO'))
    log_file = config.get('logging', {}).get('file', './logs/free-video-gen.log')
    setup_logging(log_level, log_file)
    
    logger.info("=" * 60)
    logger.info("Free Video Generator API Starting")
    logger.info("=" * 60)
    
    # Ensure directories
    ensure_dir(config.get('video', {}).get('output_dir', './output/videos'))
    ensure_dir(config.get('video', {}).get('temp_dir', './output/temp'))
    
    # Initialize components
    output_dir = config.get('video', {}).get('output_dir', './output/videos')
    temp_dir = config.get('video', {}).get('temp_dir', './output/temp')
    scenes_dir = config.get('video', {}).get('scenes_dir', './output/scenes')
    
    # Provider manager
    provider_manager = ProviderManager(config, scenes_dir)
    await provider_manager.initialize_all()
    
    # Task queue
    queue_config = config.get('queue', {})
    task_queue = TaskQueue(
        max_workers=queue_config.get('max_workers', 3),
        max_retries=queue_config.get('max_retries', 3),
        retry_delays=queue_config.get('retry_delays', [300, 900, 3600]),
        persistence_path="./data/queue.json"
    )
    
    # Register handler
    task_queue.register_handler('generate', handle_generation_task)
    await task_queue.start()
    
    # Video cache
    video_cache = VideoCache(
        cache_dir="./cache/videos",
        max_size_gb=config.get('cache', {}).get('max_size', 5),
        ttl_hours=config.get('cache', {}).get('ttl', 24)
    )
    await video_cache.initialize()
    
    # Video stitcher
    video_stitcher = VideoStitcher(
        output_dir=output_dir,
        temp_dir=temp_dir
    )
    
    # Scene splitter
    scene_splitter = SceneSplitter(
        default_scene_duration=config.get('video', {}).get('default_duration', 8.0)
    )
    
    # Audio mixer
    audio_mixer = AudioMixer(
        output_dir=str(Path(temp_dir) / "audio")
    )
    
    logger.info("All services initialized")


@app.on_event("shutdown")
async def shutdown():
    """Cleanup on shutdown"""
    logger.info("Shutting down...")
    
    if task_queue:
        await task_queue.stop()
    
    if provider_manager:
        await provider_manager.close_all()
    
    logger.info("Shutdown complete")


# ============== API Endpoints ==============

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "Free Video Generator API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }


@app.get("/health")
async def health():
    """Health check endpoint"""
    health_result = await provider_manager.health_check()
    
    return {
        "status": "healthy" if health_result['healthy'] else "degraded",
        "timestamp": datetime.utcnow().isoformat(),
        "providers": health_result['providers'],
    }


@app.get("/status", response_model=StatusResponse)
async def status():
    """Get full service status"""
    providers_status = provider_manager.get_all_status()
    queue_stats = await task_queue.get_stats()
    cache_stats = await video_cache.get_stats()
    
    return StatusResponse(
        status="running",
        healthy=any(p['available'] for p in providers_status.values()),
        providers=providers_status,
        queue={
            **queue_stats,
            'cache': cache_stats
        }
    )


@app.get("/providers")
async def list_providers():
    """List all providers and their status"""
    return {
        "providers": provider_manager.get_all_status(),
        "capacity": provider_manager.get_total_capacity()
    }


@app.post("/generate", response_model=TaskResponse)
async def generate_short_video(request: GenerateRequest, background_tasks: BackgroundTasks):
    """
    Generate a short video (5-10 seconds).
    
    Creates a task and returns task ID for tracking.
    """
    
    # Check cache first
    cached = await video_cache.get(
        request.prompt,
        request.provider or 'auto',
        request.duration
    )
    
    if cached:
        return TaskResponse(
            task_id=f"cache_{cached['key']}",
            status="completed",
            message="Video found in cache"
        )
    
    # Create task
    task = GenerationTask(
        project_id=f"short_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
        scene_id="scene_1",
        prompt=request.prompt,
        duration=request.duration,
        provider=request.provider,
        metadata={
            'ratio': request.ratio,
            'style': request.style,
        }
    )
    
    task_id = await task_queue.submit(task)
    
    return TaskResponse(
        task_id=task_id,
        status="pending",
        message="Video generation task created"
    )


@app.post("/generate/long", response_model=TaskResponse)
async def generate_long_video(request: LongVideoRequest, background_tasks: BackgroundTasks):
    """
    Generate a long video (30-180 seconds) from a scenario.
    
    The scenario will be split into multiple scenes.
    """
    
    # Create project
    project_id = f"long_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    
    # Split scenario into scenes
    script = await scene_splitter.split_scenario(
        prompt=request.prompt,
        target_duration=request.target_duration,
        style=request.style,
        voiceover=request.voiceover
    )
    
    project = VideoProject(
        id=project_id,
        script=script,
        metadata={
            'music_style': request.music_style,
            'voiceover': request.voiceover,
        }
    )
    
    projects[project_id] = project
    
    # Submit tasks for each scene
    task_ids = []
    for scene in script.scenes:
        task = GenerationTask(
            project_id=project_id,
            scene_id=scene.id,
            prompt=scene.prompt,
            duration=scene.duration,
            metadata={'transition': scene.transition_out.value}
        )
        task_id = await task_queue.submit(task)
        task_ids.append(task_id)
    
    return TaskResponse(
        task_id=project_id,
        status="pending",
        message=f"Created project with {len(script.scenes)} scenes"
    )


@app.post("/generate/script", response_model=TaskResponse)
async def generate_from_script(request: ScriptRequest):
    """
    Generate video from pre-defined script JSON.
    
    Script format:
    {
        "title": "Video Title",
        "scenes": [
            {"prompt": "...", "duration_sec": 10, "transition_out": "crossfade"}
        ]
    }
    """
    
    project_id = f"script_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    
    # Load script
    script = load_json_script_from_dict(request.script)
    
    project = VideoProject(
        id=project_id,
        script=script,
        metadata={
            'music_style': request.music_style,
            'voiceover': request.voiceover,
        }
    )
    
    projects[project_id] = project
    
    # Submit tasks
    for scene in script.scenes:
        task = GenerationTask(
            project_id=project_id,
            scene_id=scene.id,
            prompt=scene.prompt,
            duration=scene.duration,
        )
        await task_queue.submit(task)
    
    return TaskResponse(
        task_id=project_id,
        status="pending",
        message=f"Created project with {len(script.scenes)} scenes"
    )


@app.get("/task/{task_id}")
async def get_task_status(task_id: str):
    """Get task status and result"""
    
    # Check if it's a project
    if task_id in projects:
        project = projects[task_id]
        project.update_progress()
        
        return {
            "type": "project",
            "id": task_id,
            "status": project.status.value,
            "progress": {
                "total": project.total_scenes,
                "completed": project.completed_scenes,
                "failed": project.failed_scenes,
            },
            "output_path": project.output_path,
        }
    
    # Check task queue
    task = await task_queue.get_task(task_id)
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return {
        "type": "task",
        "id": task.id,
        "status": task.status.value,
        "prompt": task.prompt,
        "provider": task.provider,
        "result_path": task.result_path,
        "error": task.last_error,
        "created_at": task.created_at.isoformat(),
        "completed_at": task.completed_at.isoformat() if task.completed_at else None,
    }


@app.get("/task/{task_id}/wait")
async def wait_for_task(task_id: str, timeout: int = 300):
    """Wait for task to complete"""
    
    task = await task_queue.get_task(task_id)
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Poll for completion
    start = datetime.utcnow()
    
    while (datetime.utcnow() - start).total_seconds() < timeout:
        task = await task_queue.get_task(task_id)
        
        if task.status in [TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED]:
            return {
                "status": task.status.value,
                "result_path": task.result_path,
                "error": task.last_error,
            }
        
        await asyncio.sleep(2)
    
    return {
        "status": "timeout",
        "message": f"Task did not complete within {timeout} seconds"
    }


@app.get("/download/{filename}")
async def download_video(filename: str):
    """Download generated video"""
    
    output_dir = Path(config.get('video', {}).get('output_dir', './output/videos'))
    file_path = output_dir / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        file_path,
        media_type="video/mp4",
        filename=filename
    )


@app.get("/cache/stats")
async def cache_stats():
    """Get cache statistics"""
    return await video_cache.get_stats()


@app.delete("/cache")
async def clear_cache():
    """Clear video cache"""
    await video_cache.clear()
    return {"message": "Cache cleared"}


@app.post("/split-scenario")
async def split_scenario(prompt: str, target_duration: float = 60.0, style: Optional[str] = None):
    """
    Split a long scenario into scenes without generating.
    
    Returns the parsed script with scene prompts.
    """
    script = await scene_splitter.split_scenario(
        prompt=prompt,
        target_duration=target_duration,
        style=style
    )
    
    return {
        "title": script.title,
        "total_duration": script.total_duration,
        "scenes": [
            {
                "id": s.id,
                "prompt": s.prompt,
                "duration": s.duration,
                "transition": s.transition_out.value,
            }
            for s in script.scenes
        ]
    }


@app.post("/enhance-prompt")
async def enhance_prompt(prompt: str, style: Optional[str] = None):
    """Enhance a prompt for better generation results"""
    enhanced = await scene_splitter.enhance_prompt(prompt, style)
    return {"original": prompt, "enhanced": enhanced}


# ============== Helper Functions ==============

async def handle_generation_task(task: GenerationTask) -> Dict[str, Any]:
    """Handle a video generation task"""
    
    logger.info(f"Processing task: {task.id}")
    
    # Check cache
    cached = await video_cache.get(
        task.prompt,
        task.provider or 'auto',
        task.duration
    )
    
    if cached:
        logger.info(f"Using cached video for task: {task.id}")
        return {
            'success': True,
            'output_path': cached['video_path'],
            'duration': cached['duration'],
        }
    
    # Generate video
    result = await provider_manager.generate(
        prompt=task.prompt,
        duration=task.duration,
        ratio=task.metadata.get('ratio', '9:16'),
        provider_name=task.provider,
        style=task.metadata.get('style')
    )
    
    if result.success:
        # Cache the result
        await video_cache.set(
            task.prompt,
            result.metadata.get('provider', 'unknown'),
            result.video_path,
            result.duration,
            result.metadata
        )
        
        return {
            'success': True,
            'output_path': result.video_path,
            'duration': result.duration,
        }
    else:
        return {
            'success': False,
            'error': result.error,
        }


def load_json_script_from_dict(data: Dict[str, Any]) -> VideoScript:
    """Load script from dictionary"""
    
    scenes = []
    for i, scene_data in enumerate(data.get('scenes', [])):
        scene = VideoScene(
            id=scene_data.get('id', f"scene_{i+1}"),
            prompt=scene_data.get('prompt', ''),
            duration=float(scene_data.get('duration_sec', scene_data.get('duration', 8))),
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


# Run server
if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv('PORT', 8766))
    
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )
