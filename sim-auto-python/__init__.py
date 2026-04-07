"""
SIM Auto-Registration PRO
Автоматическая регистрация, прогрев и монетизация аккаунтов
"""

from utils import (
    ADBClient,
    AccountStorage,
    Logger,
    generate_profile,
    generate_password,
    human_delay,
    human_click,
    human_typing,
    human_mouse_move,
    random_scroll,
    simulate_reading,
    create_stealth_context,
)

from services import (
    SERVICES,
    BLOCKED_IN_RUSSIA,
    SMS_VERIFICATION_REQUIRED,
    get_service,
    list_services,
    BaseRegistrationService,
    RegistrationResult,
)

from warming import (
    WarmingManager,
    WarmingPhase,
    WarmingAction,
    WARMING_CONFIGS,
)

from monetization import (
    MonetizationManager,
    MonetizationType,
    RiskLevel,
    MonetizationScheme,
    MONETIZATION_SCHEMES,
)

__version__ = "1.0.0"
__author__ = "SIM Auto-Registration PRO"

__all__ = [
    # Utils
    'ADBClient',
    'AccountStorage',
    'Logger',
    'generate_profile',
    'generate_password',
    'human_delay',
    'human_click',
    'human_typing',
    'human_mouse_move',
    'random_scroll',
    'simulate_reading',
    'create_stealth_context',
    
    # Services
    'SERVICES',
    'BLOCKED_IN_RUSSIA',
    'SMS_VERIFICATION_REQUIRED',
    'get_service',
    'list_services',
    'BaseRegistrationService',
    'RegistrationResult',
    
    # Warming
    'WarmingManager',
    'WarmingPhase',
    'WarmingAction',
    'WARMING_CONFIGS',
    
    # Monetization
    'MonetizationManager',
    'MonetizationType',
    'RiskLevel',
    'MonetizationScheme',
    'MONETIZATION_SCHEMES',
]
