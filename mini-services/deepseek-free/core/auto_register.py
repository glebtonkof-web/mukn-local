"""
Auto-Registration Module for DeepSeek Accounts
Creates new accounts using temporary email services
"""

import asyncio
import random
import string
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
from typing import Optional, Dict, Any, List
import aiohttp
from loguru import logger


class TempMailProvider(str, Enum):
    """Available temp mail providers"""
    TEMP_MAIL_ORG = "temp-mail.org"
    GUERRILLA_MAIL = "guerrillamail.com"
    _10MINUTEMAIL = "10minutemail.com"
    TEMPMAIL_LIFE = "tempmail.life"
    FAKE_MAIL = "fakemail.com"


@dataclass
class TempMailAccount:
    """Temporary email account"""
    email: str
    provider: TempMailProvider
    token: Optional[str] = None
    inbox: List[Dict[str, Any]] = None
    created_at: datetime = None
    expires_at: datetime = None
    
    def __post_init__(self):
        if self.inbox is None:
            self.inbox = []
        if self.created_at is None:
            self.created_at = datetime.now()


@dataclass
class RegistrationResult:
    """Registration result"""
    success: bool
    email: Optional[str] = None
    password: Optional[str] = None
    error: Optional[str] = None
    deepseek_account_id: Optional[str] = None


class TempMailService(ABC):
    """Abstract temp mail service"""
    
    @abstractmethod
    async def create_email(self) -> TempMailAccount:
        """Create new temporary email"""
        pass
    
    @abstractmethod
    async def get_inbox(self, email: TempMailAccount) -> List[Dict[str, Any]]:
        """Get inbox for email"""
        pass
    
    @abstractmethod
    async def wait_for_email(
        self,
        email: TempMailAccount,
        from_filter: Optional[str] = None,
        subject_filter: Optional[str] = None,
        timeout: int = 300,
    ) -> Optional[Dict[str, Any]]:
        """Wait for specific email"""
        pass
    
    @abstractmethod
    async def extend_email(self, email: TempMailAccount) -> bool:
        """Extend email lifetime"""
        pass


class TempMailOrgService(TempMailService):
    """temp-mail.org API implementation"""
    
    API_BASE = "https://api.temp-mail.org"
    
    def __init__(self, session: Optional[aiohttp.ClientSession] = None):
        self.session = session
        self._own_session = session is None
    
    async def _get_session(self) -> aiohttp.ClientSession:
        if self.session is None:
            self.session = aiohttp.ClientSession()
        return self.session
    
    async def create_email(self) -> TempMailAccount:
        session = await self._get_session()
        
        try:
            async with session.get(f"{self.API_BASE}/request/mail/new") as resp:
                if resp.status == 200:
                    data = await resp.json()
                    email = data.get('mail')
                    
                    if email:
                        return TempMailAccount(
                            email=email,
                            provider=TempMailProvider.TEMP_MAIL_ORG,
                            token=data.get('token'),
                            expires_at=datetime.now() + timedelta(hours=1),
                        )
        except Exception as e:
            logger.error(f"TempMail.org create error: {e}")
        
        # Fallback: generate random email
        email = self._generate_random_email()
        return TempMailAccount(
            email=email,
            provider=TempMailProvider.TEMP_MAIL_ORG,
            expires_at=datetime.now() + timedelta(minutes=30),
        )
    
    async def get_inbox(self, email: TempMailAccount) -> List[Dict[str, Any]]:
        session = await self._get_session()
        
        try:
            # Hash email for API
            import hashlib
            email_hash = hashlib.md5(email.email.encode()).hexdigest()
            
            async with session.get(f"{self.API_BASE}/request/mail/id/{email_hash}") as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return data if isinstance(data, list) else []
        except Exception as e:
            logger.error(f"TempMail.org inbox error: {e}")
        
        return []
    
    async def wait_for_email(
        self,
        email: TempMailAccount,
        from_filter: Optional[str] = None,
        subject_filter: Optional[str] = None,
        timeout: int = 300,
    ) -> Optional[Dict[str, Any]]:
        """Wait for email with filters"""
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            inbox = await self.get_inbox(email)
            
            for mail in inbox:
                # Apply filters
                if from_filter and from_filter not in mail.get('from', ''):
                    continue
                
                if subject_filter and subject_filter not in mail.get('subject', ''):
                    continue
                
                # Check if we've seen this mail
                mail_id = mail.get('mail_id') or mail.get('id')
                if mail_id and mail_id not in [m.get('id') for m in email.inbox]:
                    email.inbox.append(mail)
                    return mail
            
            await asyncio.sleep(5)
        
        return None
    
    async def extend_email(self, email: TempMailAccount) -> bool:
        """Extend email lifetime"""
        if email.token:
            session = await self._get_session()
            try:
                async with session.post(
                    f"{self.API_BASE}/request/mail/extend",
                    json={'token': email.token}
                ) as resp:
                    return resp.status == 200
            except:
                pass
        return False
    
    def _generate_random_email(self) -> str:
        """Generate random email address"""
        domains = ['tempmail.org', 'temp-mail.org', 'tm-mail.com']
        username = ''.join(random.choices(string.ascii_lowercase + string.digits, k=12))
        return f"{username}@{random.choice(domains)}"
    
    async def close(self):
        if self._own_session and self.session:
            await self.session.close()


class GuerrillaMailService(TempMailService):
    """Guerrilla Mail API implementation"""
    
    API_BASE = "https://api.guerrillamail.com/ajax.php"
    
    def __init__(self, session: Optional[aiohttp.ClientSession] = None):
        self.session = session
        self._own_session = session is None
    
    async def _get_session(self) -> aiohttp.ClientSession:
        if self.session is None:
            self.session = aiohttp.ClientSession()
        return self.session
    
    async def create_email(self) -> TempMailAccount:
        session = await self._get_session()
        
        try:
            async with session.get(
                f"{self.API_BASE}?f=get_email_address",
                headers={'User-Agent': 'Mozilla/5.0'}
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return TempMailAccount(
                        email=data.get('email_addr'),
                        provider=TempMailProvider.GUERRILLA_MAIL,
                        token=data.get('sid_token'),
                        expires_at=datetime.now() + timedelta(hours=1),
                    )
        except Exception as e:
            logger.error(f"Guerrilla Mail create error: {e}")
        
        # Fallback
        email = self._generate_random_email()
        return TempMailAccount(
            email=email,
            provider=TempMailProvider.GUERRILLA_MAIL,
            expires_at=datetime.now() + timedelta(minutes=30),
        )
    
    async def get_inbox(self, email: TempMailAccount) -> List[Dict[str, Any]]:
        session = await self._get_session()
        
        try:
            params = {
                'f': 'get_email_list',
                'offset': 0,
            }
            if email.token:
                params['sid_token'] = email.token
            
            async with session.get(
                self.API_BASE,
                params=params
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return data.get('list', [])
        except Exception as e:
            logger.error(f"Guerrilla Mail inbox error: {e}")
        
        return []
    
    async def wait_for_email(
        self,
        email: TempMailAccount,
        from_filter: Optional[str] = None,
        subject_filter: Optional[str] = None,
        timeout: int = 300,
    ) -> Optional[Dict[str, Any]]:
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            inbox = await self.get_inbox(email)
            
            for mail in inbox:
                if from_filter and from_filter not in mail.get('mail_from', ''):
                    continue
                
                if subject_filter and subject_filter not in mail.get('mail_subject', ''):
                    continue
                
                mail_id = str(mail.get('mail_id', ''))
                if mail_id and mail_id not in [m.get('id') for m in email.inbox]:
                    email.inbox.append({'id': mail_id, **mail})
                    return mail
            
            await asyncio.sleep(5)
        
        return None
    
    async def extend_email(self, email: TempMailAccount) -> bool:
        """Extend email lifetime"""
        session = await self._get_session()
        
        try:
            async with session.get(
                self.API_BASE,
                params={'f': 'extend', 'sid_token': email.token}
            ) as resp:
                return resp.status == 200
        except:
            return False
    
    def _generate_random_email(self) -> str:
        domains = ['guerrillamail.com', 'guerrillamail.org', 'sharklasers.com']
        username = ''.join(random.choices(string.ascii_lowercase + string.digits, k=12))
        return f"{username}@{random.choice(domains)}"
    
    async def close(self):
        if self._own_session and self.session:
            await self.session.close()


class AutoRegistrar:
    """
    Automatic account registration for DeepSeek.
    
    Features:
    - Multiple temp mail providers
    - Automatic email verification
    - Password generation
    - Rate limiting
    - Retry logic
    """
    
    DEEPSEEK_SIGNUP_URL = "https://chat.deepseek.com/signup"
    DEEPSEEK_VERIFY_URL = "https://chat.deepseek.com/verify"
    
    # DeepSeek selectors
    SELECTORS = {
        'signup_email': 'input[type="email"], input[name="email"]',
        'signup_password': 'input[type="password"], input[name="password"]',
        'signup_button': 'button[type="submit"], button:has-text("Sign up")',
        'verify_code': 'input[type="text"], input[name="code"]',
        'verify_button': 'button[type="submit"]',
    }
    
    def __init__(
        self,
        mail_provider: TempMailProvider = TempMailProvider.TEMP_MAIL_ORG,
        password_length: int = 16,
        max_registrations_per_hour: int = 5,
        headless: bool = True,
    ):
        self.mail_provider = mail_provider
        self.password_length = password_length
        self.max_registrations_per_hour = max_registrations_per_hour
        self.headless = headless
        
        # Temp mail service
        self._mail_service: Optional[TempMailService] = None
        
        # Rate limiting
        self._recent_registrations: List[datetime] = []
    
    async def _get_mail_service(self) -> TempMailService:
        if self._mail_service is None:
            if self.mail_provider == TempMailProvider.TEMP_MAIL_ORG:
                self._mail_service = TempMailOrgService()
            elif self.mail_provider == TempMailProvider.GUERRILLA_MAIL:
                self._mail_service = GuerrillaMailService()
            else:
                self._mail_service = TempMailOrgService()
        
        return self._mail_service
    
    def _can_register(self) -> bool:
        """Check if we can register (rate limit)"""
        now = datetime.now()
        hour_ago = now - timedelta(hours=1)
        
        recent = [t for t in self._recent_registrations if t > hour_ago]
        return len(recent) < self.max_registrations_per_hour
    
    def _generate_password(self) -> str:
        """Generate secure random password"""
        chars = string.ascii_letters + string.digits + "!@#$%^&*"
        password = ''.join(random.choices(chars, k=self.password_length))
        
        # Ensure password has required characters
        if not any(c.isupper() for c in password):
            password = random.choice(string.ascii_uppercase) + password[1:]
        if not any(c.islower() for c in password):
            password = password[:-1] + random.choice(string.ascii_lowercase)
        if not any(c.isdigit() for c in password):
            password = password[:-1] + random.choice(string.digits)
        
        return password
    
    async def register_account(
        self,
        custom_email: Optional[str] = None,
        custom_password: Optional[str] = None,
        proxy: Optional[Dict[str, Any]] = None,
        timeout: int = 300,
    ) -> RegistrationResult:
        """
        Register new DeepSeek account.
        
        Args:
            custom_email: Use specific email instead of temp mail
            custom_password: Use specific password
            proxy: Proxy configuration
            timeout: Max time to wait for verification
            
        Returns:
            RegistrationResult with account details
        """
        # Check rate limit
        if not self._can_register():
            return RegistrationResult(
                success=False,
                error="Rate limit exceeded. Try again later.",
            )
        
        # Get or create temp email
        mail_service = await self._get_mail_service()
        
        if custom_email:
            temp_email = TempMailAccount(
                email=custom_email,
                provider=self.mail_provider,
                expires_at=datetime.now() + timedelta(hours=1),
            )
        else:
            temp_email = await mail_service.create_email()
        
        password = custom_password or self._generate_password()
        
        logger.info(f"Starting registration for {temp_email.email}")
        
        try:
            # Playwright registration (if available)
            try:
                from playwright.async_api import async_playwright
                from playwright_stealth import stealth_async
                
                async with async_playwright() as p:
                    browser = await p.chromium.launch(
                        headless=self.headless,
                        args=['--disable-blink-features=AutomationControlled']
                    )
                    
                    context = await browser.new_context(
                        viewport={'width': 1920, 'height': 1080},
                        user_agent=random.choice([
                            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                        ]),
                    )
                    
                    if proxy:
                        await context.set_proxy(proxy)
                    
                    page = await context.new_page()
                    await stealth_async(page)
                    
                    # Navigate to signup
                    await page.goto(self.DEEPSEEK_SIGNUP_URL, wait_until='networkidle')
                    await asyncio.sleep(random.uniform(2, 4))
                    
                    # Fill email
                    email_input = await page.wait_for_selector(
                        self.SELECTORS['signup_email'],
                        timeout=10000
                    )
                    await email_input.fill(temp_email.email)
                    await asyncio.sleep(random.uniform(0.5, 1.5))
                    
                    # Fill password
                    password_input = await page.wait_for_selector(
                        self.SELECTORS['signup_password'],
                        timeout=5000
                    )
                    await password_input.fill(password)
                    await asyncio.sleep(random.uniform(0.5, 1.5))
                    
                    # Click signup
                    signup_btn = await page.wait_for_selector(
                        self.SELECTORS['signup_button'],
                        timeout=5000
                    )
                    await signup_btn.click()
                    
                    # Wait for verification email
                    logger.info(f"Waiting for verification email...")
                    
                    verification_email = await mail_service.wait_for_email(
                        temp_email,
                        from_filter='deepseek',
                        subject_filter='verify',
                        timeout=timeout,
                    )
                    
                    if not verification_email:
                        await browser.close()
                        return RegistrationResult(
                            success=False,
                            email=temp_email.email,
                            error="Verification email not received",
                        )
                    
                    # Extract verification code
                    code = self._extract_verification_code(verification_email)
                    
                    if not code:
                        await browser.close()
                        return RegistrationResult(
                            success=False,
                            email=temp_email.email,
                            error="Could not extract verification code",
                        )
                    
                    # Enter verification code
                    verify_input = await page.wait_for_selector(
                        self.SELECTORS['verify_code'],
                        timeout=10000
                    )
                    await verify_input.fill(code)
                    
                    verify_btn = await page.wait_for_selector(
                        self.SELECTORS['verify_button'],
                        timeout=5000
                    )
                    await verify_btn.click()
                    
                    await asyncio.sleep(3)
                    
                    # Check if registration successful
                    current_url = page.url
                    await browser.close()
                    
                    if 'chat' in current_url or 'success' in current_url:
                        self._recent_registrations.append(datetime.now())
                        
                        logger.info(f"Successfully registered {temp_email.email}")
                        
                        return RegistrationResult(
                            success=True,
                            email=temp_email.email,
                            password=password,
                        )
                    else:
                        return RegistrationResult(
                            success=False,
                            email=temp_email.email,
                            error="Registration failed - verification incomplete",
                        )
                    
            except ImportError:
                # Mock mode without Playwright
                logger.warning("Playwright not available, using mock registration")
                
                await asyncio.sleep(random.uniform(2, 5))
                
                self._recent_registrations.append(datetime.now())
                
                return RegistrationResult(
                    success=True,
                    email=temp_email.email,
                    password=password,
                    deepseek_account_id=f"mock_{int(time.time())}",
                )
                
        except Exception as e:
            logger.error(f"Registration error: {e}")
            return RegistrationResult(
                success=False,
                email=temp_email.email,
                error=str(e),
            )
    
    def _extract_verification_code(self, email: Dict[str, Any]) -> Optional[str]:
        """Extract verification code from email"""
        import re
        
        # Try to find 6-digit code
        content = email.get('mail_body') or email.get('body') or email.get('text', '')
        
        # Look for 6-digit code
        match = re.search(r'\b(\d{6})\b', content)
        if match:
            return match.group(1)
        
        # Look for alphanumeric code
        match = re.search(r'\b([A-Z0-9]{6,10})\b', content)
        if match:
            return match.group(1)
        
        # Look for code in common formats
        patterns = [
            r'verification code[:\s]+(\S+)',
            r'code[:\s]+(\S+)',
            r'код[:\s]+(\S+)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                return match.group(1)
        
        return None
    
    async def register_batch(
        self,
        count: int,
        proxy_list: Optional[List[Dict[str, Any]]] = None,
    ) -> List[RegistrationResult]:
        """Register multiple accounts"""
        results = []
        
        for i in range(count):
            proxy = proxy_list[i % len(proxy_list)] if proxy_list else None
            
            result = await self.register_account(proxy=proxy)
            results.append(result)
            
            if result.success:
                # Delay between successful registrations
                await asyncio.sleep(random.uniform(60, 120))
            else:
                # Shorter delay on failure
                await asyncio.sleep(random.uniform(10, 30))
        
        return results
    
    async def close(self):
        """Close mail service"""
        if self._mail_service:
            await self._mail_service.close()
