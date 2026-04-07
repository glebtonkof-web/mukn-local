/**
 * Services Registry - Полный реестр сервисов регистрации
 * 
 * Содержит конфигурации для всех поддерживаемых платформ:
 * - YouTube/Google, TikTok, Instagram, Twitter, Telegram
 * - VK, Odnoklassniki, Discord, LinkedIn, Pinterest
 * - Spotify, Twitch, OnlyFans, Reddit, Facebook
 * - WhatsApp, Snapchat, и другие
 */

import type { Platform } from './types'

// ==================== ТИПЫ ====================

export interface ServiceConfig {
  id: string
  name: string
  nameRu: string
  url: string
  alternativeUrls?: string[]
  
  // Требования
  requiresPhone: boolean
  requiresEmail: boolean
  requiresSms: boolean
  requiresVpn: boolean
  requiresManual: boolean  // Требует ручного вмешательства
  
  // Антидетект
  riskLevel: 'low' | 'medium' | 'high' | 'extreme'
  requiresProxy: boolean
  requiresMobileFingerprint: boolean
  
  // Лимиты
  maxAccountsPerPhone: number
  minPauseBetweenRegs: number  // минут
  
  // Юридические ограничения
  blockedInRussia: boolean
  extremistOrganization: boolean  // Facebook
  
  // Селекторы
  selectors: {
    phoneInput?: string[]
    emailInput?: string[]
    codeInput: string[]
    usernameInput?: string[]
    passwordInput?: string[]
    firstNameInput?: string[]
    lastNameInput?: string[]
    dateOfBirthDay?: string[]
    dateOfBirthMonth?: string[]
    dateOfBirthYear?: string[]
    genderSelect?: string[]
    submitButton: string[]
    successIndicator: string[]
    errorIndicator: string[]
    captchaIndicator: string[]
  }
  
  // SMS паттерны
  smsPatterns: {
    senders: string[]
    keywords: string[]
    codePattern: RegExp
  }
  
  // Особенности
  notes: string[]
  warnings: string[]
}

// ==================== РЕЕСТР СЕРВИСОВ ====================

export const SERVICES_REGISTRY: Record<string, ServiceConfig> = {
  // ==================== YOUTUBE / GOOGLE ====================
  youtube: {
    id: 'youtube',
    name: 'YouTube',
    nameRu: 'YouTube / Google',
    url: 'https://accounts.google.com/signup/v2/webcreateaccount?service=youtube',
    
    requiresPhone: true,
    requiresEmail: false,
    requiresSms: true,
    requiresVpn: false,
    requiresManual: false,
    
    riskLevel: 'high',
    requiresProxy: true,
    requiresMobileFingerprint: false,
    
    maxAccountsPerPhone: 1,
    minPauseBetweenRegs: 1440, // 24 часа
    
    blockedInRussia: false,
    extremistOrganization: false,
    
    selectors: {
      phoneInput: [
        'input[type="tel"]',
        'input[name="phoneNumber"]',
        '#phoneNumberId',
        'input[aria-label*="phone" i]'
      ],
      codeInput: [
        'input[type="text"][maxlength="6"]',
        'input[name="code"]',
        '#code'
      ],
      usernameInput: [
        'input[name="Username"]',
        'input[type="text"][name="username"]'
      ],
      passwordInput: [
        'input[name="Passwd"]',
        'input[type="password"]',
        'input[name="password"]'
      ],
      firstNameInput: [
        'input[name="firstName"]',
        '#firstName'
      ],
      lastNameInput: [
        'input[name="lastName"]',
        '#lastName'
      ],
      dateOfBirthDay: [
        'select[name="day"]',
        '#day'
      ],
      dateOfBirthMonth: [
        'select[name="month"]',
        '#month'
      ],
      dateOfBirthYear: [
        'select[name="year"]',
        '#year'
      ],
      genderSelect: [
        'select[name="gender"]',
        '#gender'
      ],
      submitButton: [
        'button[type="submit"]',
        'button:has-text("Next")',
        '#identifierNext',
        'button:has-text("Далее")'
      ],
      successIndicator: [
        'ytd-topbar-logo-renderer',
        '[class*="youtube"]',
        'ytd-app'
      ],
      errorIndicator: [
        '[class*="error"]',
        '.OyEIQb',
        '[role="alert"]'
      ],
      captchaIndicator: [
        'iframe[src*="recaptcha"]',
        '#recaptcha'
      ]
    },
    
    smsPatterns: {
      senders: ['Google', 'YouTube', 'G', 'YT'],
      keywords: ['verification', 'code', 'verify', 'код'],
      codePattern: /\b(\d{6})\b/
    },
    
    notes: [
      'Самый строгий антибот',
      'После регистрации может запросить повторную верификацию через 24-48 часов',
      'Банят за "странную активность"'
    ],
    warnings: [
      'Требует уникальный fingerprint для каждого аккаунта',
      'Не спамить регистрациями - минимум 24 часа между попытками'
    ]
  },
  
  // ==================== TIKTOK ====================
  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    nameRu: 'TikTok',
    url: 'https://www.tiktok.com/signup/phone',
    
    requiresPhone: true,
    requiresEmail: false,
    requiresSms: true,
    requiresVpn: true,
    requiresManual: false,
    
    riskLevel: 'medium',
    requiresProxy: true,
    requiresMobileFingerprint: true,
    
    maxAccountsPerPhone: 1,
    minPauseBetweenRegs: 60,
    
    blockedInRussia: true,
    extremistOrganization: false,
    
    selectors: {
      phoneInput: [
        'input[type="tel"]',
        'input[name="mobile"]',
        'input[placeholder*="phone" i]'
      ],
      codeInput: [
        'input[name="verify_code"]',
        'input[type="text"][maxlength="6"]',
        'input[placeholder*="code" i]'
      ],
      usernameInput: [
        'input[name="username"]'
      ],
      passwordInput: [
        'input[name="password"]',
        'input[type="password"]'
      ],
      dateOfBirthDay: [
        'select[name="birthday-day"]',
        'select[id*="day"]'
      ],
      dateOfBirthMonth: [
        'select[name="birthday-month"]',
        'select[id*="month"]'
      ],
      dateOfBirthYear: [
        'select[name="birthday-year"]',
        'select[id*="year"]'
      ],
      submitButton: [
        'button[type="submit"]',
        'button:has-text("Send code")',
        'button:has-text("Next")',
        'button:has-text("Sign up")'
      ],
      successIndicator: [
        '[data-e2e="profile-icon"]',
        '[class*="Avatar"]',
        '[data-e2e="foryou-tab"]'
      ],
      errorIndicator: [
        '[class*="error"]',
        '[class*="Error"]',
        '[data-e2e="error"]'
      ],
      captchaIndicator: [
        'iframe[src*="captcha"]',
        '[class*="captcha"]',
        '[class*="verify"]'
      ]
    },
    
    smsPatterns: {
      senders: ['TikTok', 'short video', 'Tik'],
      keywords: ['verification', 'code', 'TikTok'],
      codePattern: /\b(\d{4,6})\b/
    },
    
    notes: [
      'Требует мобильный fingerprint',
      'После регистрации может запросить email'
    ],
    warnings: [
      'В РФ заблокирован — нужен VPN',
      'Рекомендуется VPN через США, Германию или Нидерланды'
    ]
  },
  
  // ==================== INSTAGRAM ====================
  instagram: {
    id: 'instagram',
    name: 'Instagram',
    nameRu: 'Instagram',
    url: 'https://www.instagram.com/accounts/emailsignup/',
    
    requiresPhone: true,
    requiresEmail: false,
    requiresSms: true,
    requiresVpn: true,
    requiresManual: false,
    
    riskLevel: 'high',
    requiresProxy: true,
    requiresMobileFingerprint: false,
    
    maxAccountsPerPhone: 1,
    minPauseBetweenRegs: 1440,
    
    blockedInRussia: true,
    extremistOrganization: false,
    
    selectors: {
      phoneInput: [
        'input[name="tel"]',
        'input[type="tel"]',
        'input[placeholder*="phone" i]',
        'input[aria-label*="phone" i]'
      ],
      emailInput: [
        'input[name="email"]',
        'input[type="email"]'
      ],
      codeInput: [
        'input[name="verificationCode"]',
        'input[type="text"][maxlength="6"]',
        'input[placeholder*="code" i]',
        'input[name="code"]'
      ],
      usernameInput: [
        'input[name="username"]',
        'input[placeholder*="username" i]'
      ],
      passwordInput: [
        'input[name="password"]',
        'input[type="password"]'
      ],
      firstNameInput: [
        'input[name="fullName"]',
        'input[placeholder*="name" i]'
      ],
      dateOfBirthDay: [
        'select[title="Day"]',
        'select[name="day"]'
      ],
      dateOfBirthMonth: [
        'select[title="Month"]',
        'select[name="month"]'
      ],
      dateOfBirthYear: [
        'select[title="Year"]',
        'select[name="year"]'
      ],
      submitButton: [
        'button[type="submit"]',
        'button:has-text("Sign up")',
        'button:has-text("Next")',
        'button:has-text("Continue")'
      ],
      successIndicator: [
        '[href*="/accounts/edit"]',
        '[data-testid="user-avatar"]',
        'svg[aria-label="Home"]',
        '[role="navigation"]'
      ],
      errorIndicator: [
        '[class*="error"]',
        '#slfErrorAlert',
        '[role="alert"]'
      ],
      captchaIndicator: [
        'iframe[src*="recaptcha"]',
        '[class*="captcha"]'
      ]
    },
    
    smsPatterns: {
      senders: ['Instagram', 'insta', 'IG', 'Meta', 'Facebook', '32665'],
      keywords: ['verification', 'code', 'Instagram'],
      codePattern: /\b(\d{6})\b/
    },
    
    notes: [
      'Один номер = один аккаунт (жёстко)',
      'Очень чувствителен к IP',
      'Требует фото/аватарку в первые 24 часа'
    ],
    warnings: [
      'Рекомендуется VPN',
      'Пустой профиль = бот - нужно заполнить'
    ]
  },
  
  // ==================== TWITTER / X ====================
  twitter: {
    id: 'twitter',
    name: 'Twitter',
    nameRu: 'Twitter / X',
    url: 'https://twitter.com/i/flow/signup',
    
    requiresPhone: true,
    requiresEmail: true,
    requiresSms: true,
    requiresVpn: true,
    requiresManual: false,
    
    riskLevel: 'medium',
    requiresProxy: true,
    requiresMobileFingerprint: false,
    
    maxAccountsPerPhone: 10,
    minPauseBetweenRegs: 30,
    
    blockedInRussia: true,
    extremistOrganization: false,
    
    selectors: {
      phoneInput: [
        'input[name="phone_number"]',
        'input[type="tel"]',
        'input[data-testid="ocfEnterTextTextInput"]'
      ],
      emailInput: [
        'input[type="email"]',
        'input[name="email"]'
      ],
      codeInput: [
        'input[data-testid="ocfEnterTextTextInput"]',
        'input[name="verif_code"]',
        'input[type="text"][maxlength="6"]'
      ],
      usernameInput: [
        'input[name="screen_name"]',
        'input[placeholder*="username" i]'
      ],
      passwordInput: [
        'input[name="password"]',
        'input[type="password"]'
      ],
      dateOfBirthDay: [
        'select[name="day"]',
        'select[data-testid="Day"]'
      ],
      dateOfBirthMonth: [
        'select[name="month"]',
        'select[data-testid="Month"]'
      ],
      dateOfBirthYear: [
        'select[name="year"]',
        'select[data-testid="Year"]'
      ],
      submitButton: [
        'button[data-testid="ocfEnterTextNextButton"]',
        'button[type="submit"]',
        'button:has-text("Next")',
        'button[data-testid="Button"]'
      ],
      successIndicator: [
        '[data-testid="AppTabBar_Home_Link"]',
        '[data-testid="SideNav_AccountSwitcher_Button"]',
        '[role="navigation"]'
      ],
      errorIndicator: [
        '[data-testid="toast"]',
        '[class*="error"]',
        '[role="alert"]'
      ],
      captchaIndicator: [
        'iframe[src*="recaptcha"]',
        'iframe[src*="arkose"]'
      ]
    },
    
    smsPatterns: {
      senders: ['Twitter', 'X.com', 'verify'],
      keywords: ['verification', 'code', 'Twitter'],
      codePattern: /\b(\d{6})\b/
    },
    
    notes: [
      'Позволяет несколько аккаунтов на один номер (до 5-10)',
      'Требует подтверждения email',
      'Банят за массовое действие'
    ],
    warnings: [
      'Рекомендуется VPN (Германия, Нидерланды)',
      'Не спамить - паузы между действиями'
    ]
  },
  
  // ==================== TELEGRAM ====================
  telegram: {
    id: 'telegram',
    name: 'Telegram',
    nameRu: 'Telegram',
    url: 'https://web.telegram.org/a/',
    alternativeUrls: ['https://web.telegram.org/k/'],
    
    requiresPhone: true,
    requiresEmail: false,
    requiresSms: true,
    requiresVpn: false,
    requiresManual: false,
    
    riskLevel: 'low',
    requiresProxy: false,
    requiresMobileFingerprint: false,
    
    maxAccountsPerPhone: 1,
    minPauseBetweenRegs: 1440,
    
    blockedInRussia: false,
    extremistOrganization: false,
    
    selectors: {
      phoneInput: [
        'input[type="tel"]',
        'input[placeholder*="phone" i]',
        'input[autocomplete="tel"]',
        '#sign-in-phone-number',
        'input[name="phone"]'
      ],
      codeInput: [
        'input[type="text"][maxlength="6"]',
        'input[inputmode="numeric"]',
        'input[placeholder*="code" i]',
        'input[name="code"]',
        '.code-input input'
      ],
      submitButton: [
        'button[type="submit"]',
        'button.Button.primary',
        'button:has-text("Continue")',
        'button:has-text("Next")',
        'button:has-text("Sign In")'
      ],
      successIndicator: [
        '.chat-list',
        '[class*="ChatList"]',
        '[class*="MainHeader"]',
        '#column-center'
      ],
      errorIndicator: [
        '.error',
        '[class*="error"]',
        '[class*="Error"]',
        '.modal-content'
      ],
      captchaIndicator: []
    },
    
    smsPatterns: {
      senders: ['Telegram', 'TG', 'Telega', 'Telegram code'],
      keywords: ['Telegram', 'login', 'code', 'verify'],
      codePattern: /\b(\d{5,6})\b/
    },
    
    notes: [
      'Работает в РФ без VPN',
      'Код приходит в виде SMS или в другой аккаунт Telegram',
      'Нет веб-регистрации - только через WebK или десктоп'
    ],
    warnings: []
  },
  
  // ==================== VK ====================
  vk: {
    id: 'vk',
    name: 'VK',
    nameRu: 'ВКонтакте',
    url: 'https://vk.com/join',
    
    requiresPhone: true,
    requiresEmail: false,
    requiresSms: true,
    requiresVpn: false,
    requiresManual: false,
    
    riskLevel: 'low',
    requiresProxy: false,
    requiresMobileFingerprint: false,
    
    maxAccountsPerPhone: 1,
    minPauseBetweenRegs: 1440,
    
    blockedInRussia: false,
    extremistOrganization: false,
    
    selectors: {
      phoneInput: [
        'input[name="phone"]',
        'input[type="tel"]',
        '#join_phone'
      ],
      codeInput: [
        'input[name="code"]',
        'input[type="text"][maxlength="6"]',
        '#join_code'
      ],
      firstNameInput: [
        'input[name="firstname"]',
        '#join_first_name'
      ],
      lastNameInput: [
        'input[name="lastname"]',
        '#join_last_name'
      ],
      dateOfBirthDay: [
        'select[name="bday"]',
        '#join_day'
      ],
      dateOfBirthMonth: [
        'select[name="bmonth"]',
        '#join_month'
      ],
      dateOfBirthYear: [
        'select[name="byear"]',
        '#join_year'
      ],
      genderSelect: [
        'input[name="sex"][value="1"]',  // женский
        'input[name="sex"][value="2"]'   // мужской
      ],
      passwordInput: [
        'input[name="password"]',
        'input[type="password"]'
      ],
      submitButton: [
        'button[type="submit"]',
        'button:has-text("Зарегистрироваться")',
        '#join_send_code',
        '.FlatButton--primary'
      ],
      successIndicator: [
        '#l_pr',
        '.top_profile_name',
        '[href="/feed"]'
      ],
      errorIndicator: [
        '.msg_error',
        '[class*="error"]',
        '.join_error'
      ],
      captchaIndicator: [
        'img[src*="captcha"]',
        '.captcha'
      ]
    },
    
    smsPatterns: {
      senders: ['VK', 'ВКонтакте', 'Vkontakte'],
      keywords: ['VK', 'код', 'code', 'подтверждение'],
      codePattern: /\b(\d{4,6})\b/
    },
    
    notes: [
      'Работает в РФ без VPN',
      'Простая регистрация',
      'Можно привязать email после'
    ],
    warnings: []
  },
  
  // ==================== ODNOKLASSNIKI ====================
  ok: {
    id: 'ok',
    name: 'Odnoklassniki',
    nameRu: 'Одноклассники',
    url: 'https://ok.ru/reg',
    
    requiresPhone: true,
    requiresEmail: false,
    requiresSms: true,
    requiresVpn: false,
    requiresManual: false,
    
    riskLevel: 'low',
    requiresProxy: false,
    requiresMobileFingerprint: false,
    
    maxAccountsPerPhone: 1,
    minPauseBetweenRegs: 1440,
    
    blockedInRussia: false,
    extremistOrganization: false,
    
    selectors: {
      phoneInput: [
        'input[name="phone"]',
        'input[type="tel"]',
        '.field_phone input'
      ],
      codeInput: [
        'input[name="code"]',
        'input[type="text"][maxlength="6"]',
        '.field_code input'
      ],
      firstNameInput: [
        'input[name="firstname"]',
        '.field_firstname input'
      ],
      lastNameInput: [
        'input[name="lastname"]',
        '.field_lastname input'
      ],
      dateOfBirthDay: [
        'select[name="day"]'
      ],
      dateOfBirthMonth: [
        'select[name="month"]'
      ],
      dateOfBirthYear: [
        'select[name="year"]'
      ],
      genderSelect: [
        'input[name="gender"][value="male"]',
        'input[name="gender"][value="female"]'
      ],
      submitButton: [
        'button[type="submit"]',
        'button:has-text("Зарегистрироваться")',
        '.button-pro __wide'
      ],
      successIndicator: [
        '.toolbar_avatar',
        '#hook_Block_TopMenu',
        '[href*="/profile"]'
      ],
      errorIndicator: [
        '.form-error',
        '[class*="error"]'
      ],
      captchaIndicator: [
        'img[src*="captcha"]'
      ]
    },
    
    smsPatterns: {
      senders: ['OK', 'Odnoklassniki', 'Одноклассники'],
      keywords: ['код', 'code', 'OK', 'подтверждение'],
      codePattern: /\b(\d{4,6})\b/
    },
    
    notes: [
      'Работает в РФ без VPN',
      'Простая регистрация'
    ],
    warnings: []
  },
  
  // ==================== DISCORD ====================
  discord: {
    id: 'discord',
    name: 'Discord',
    nameRu: 'Discord',
    url: 'https://discord.com/register',
    
    requiresPhone: false,
    requiresEmail: true,
    requiresSms: true,  // может потребоваться позже
    requiresVpn: false,
    requiresManual: false,
    
    riskLevel: 'low',
    requiresProxy: true,
    requiresMobileFingerprint: false,
    
    maxAccountsPerPhone: 5,
    minPauseBetweenRegs: 30,
    
    blockedInRussia: false,
    extremistOrganization: false,
    
    selectors: {
      emailInput: [
        'input[type="email"]',
        'input[name="email"]',
        'input[placeholder*="email" i]'
      ],
      phoneInput: [
        'input[name="phone"]',
        'input[type="tel"]'
      ],
      codeInput: [
        'input[name="verification_code"]',
        'input[type="text"][maxlength="6"]'
      ],
      usernameInput: [
        'input[name="username"]',
        'input[placeholder*="username" i]'
      ],
      passwordInput: [
        'input[name="password"]',
        'input[type="password"]'
      ],
      dateOfBirthDay: [
        'select[name="date_of_birth_day"]',
        'select[aria-label="Day"]'
      ],
      dateOfBirthMonth: [
        'select[name="date_of_birth_month"]',
        'select[aria-label="Month"]'
      ],
      dateOfBirthYear: [
        'select[name="date_of_birth_year"]',
        'select[aria-label="Year"]'
      ],
      submitButton: [
        'button[type="submit"]',
        'button:has-text("Continue")',
        'button:has-text("Зарегистрироваться")'
      ],
      successIndicator: [
        '[class*="guilds"]',
        '[class*="channels"]',
        '.wrapper-1BJsBx',
        '[aria-label="Servers"]'
      ],
      errorIndicator: [
        '[class*="error"]',
        '.error-3CkYDe'
      ],
      captchaIndicator: [
        'iframe[src*="hcaptcha"]',
        'iframe[src*="recaptcha"]'
      ]
    },
    
    smsPatterns: {
      senders: ['Discord', 'discord'],
      keywords: ['verification', 'code', 'Discord'],
      codePattern: /\b(\d{6})\b/
    },
    
    notes: [
      'Номер опционален, но для верификации нужен',
      'Можно зарегистрироваться без номера, потом добавить',
      'Требует верификацию email'
    ],
    warnings: []
  },
  
  // ==================== LINKEDIN ====================
  linkedin: {
    id: 'linkedin',
    name: 'LinkedIn',
    nameRu: 'LinkedIn',
    url: 'https://www.linkedin.com/signup',
    
    requiresPhone: false,
    requiresEmail: true,
    requiresSms: true,
    requiresVpn: true,
    requiresManual: false,
    
    riskLevel: 'medium',
    requiresProxy: true,
    requiresMobileFingerprint: false,
    
    maxAccountsPerPhone: 1,
    minPauseBetweenRegs: 1440,
    
    blockedInRussia: false,
    extremistOrganization: false,
    
    selectors: {
      emailInput: [
        'input#email-address',
        'input[type="email"]',
        'input[name="email"]'
      ],
      phoneInput: [
        'input#phone-number',
        'input[type="tel"]'
      ],
      codeInput: [
        'input#verification-code',
        'input[type="text"][maxlength="6"]'
      ],
      firstNameInput: [
        'input#first-name',
        'input[name="firstName"]'
      ],
      lastNameInput: [
        'input#last-name',
        'input[name="lastName"]'
      ],
      passwordInput: [
        'input#password',
        'input[type="password"]'
      ],
      submitButton: [
        'button:has-text("Join now")',
        'button:has-text("Agree & Join")',
        'button:has-text("Продолжить")',
        'button[type="submit"]'
      ],
      successIndicator: [
        '.global-nav',
        '[data-control-name="identity_welcome_message"]',
        '.feed-container'
      ],
      errorIndicator: [
        '[class*="error"]',
        '.alert-danger'
      ],
      captchaIndicator: [
        'iframe[src*="recaptcha"]',
        'iframe[src*="challenge"]'
      ]
    },
    
    smsPatterns: {
      senders: ['LinkedIn', 'Linked In'],
      keywords: ['verification', 'code', 'LinkedIn'],
      codePattern: /\b(\d{6})\b/
    },
    
    notes: [
      'Нужен реальный email и номер',
      'Профиль должен выглядеть профессионально',
      'Банят за "фейковые" аккаунты'
    ],
    warnings: [
      'Рекомендуется VPN',
      'Заполняйте профиль качественно'
    ]
  },
  
  // ==================== PINTEREST ====================
  pinterest: {
    id: 'pinterest',
    name: 'Pinterest',
    nameRu: 'Pinterest',
    url: 'https://www.pinterest.com/signup',
    
    requiresPhone: false,
    requiresEmail: true,
    requiresSms: true,
    requiresVpn: true,
    requiresManual: false,
    
    riskLevel: 'low',
    requiresProxy: true,
    requiresMobileFingerprint: false,
    
    maxAccountsPerPhone: 3,
    minPauseBetweenRegs: 60,
    
    blockedInRussia: false,
    extremistOrganization: false,
    
    selectors: {
      emailInput: [
        'input#email',
        'input[type="email"]',
        'input[name="email"]'
      ],
      phoneInput: [
        'input#phone_number',
        'input[type="tel"]'
      ],
      codeInput: [
        'input#verification_code',
        'input[type="text"][maxlength="6"]'
      ],
      passwordInput: [
        'input#password',
        'input[type="password"]'
      ],
      dateOfBirthDay: [
        'select[name="day"]'
      ],
      dateOfBirthMonth: [
        'select[name="month"]'
      ],
      dateOfBirthYear: [
        'select[name="year"]'
      ],
      submitButton: [
        'button:has-text("Continue")',
        'button:has-text("Продолжить")',
        'button:has-text("Sign up")',
        'button[type="submit"]'
      ],
      successIndicator: [
        '[data-test-id="header-profile"]',
        '.homeFeedPage',
        '[href*="/settings/"]'
      ],
      errorIndicator: [
        '[class*="error"]',
        '.error_message'
      ],
      captchaIndicator: [
        'iframe[src*="recaptcha"]'
      ]
    },
    
    smsPatterns: {
      senders: ['Pinterest', 'Pin'],
      keywords: ['verification', 'code', 'Pinterest'],
      codePattern: /\b(\d{6})\b/
    },
    
    notes: [
      'Можно зарегистрироваться через email',
      'Номер телефона опционален'
    ],
    warnings: [
      'Рекомендуется VPN'
    ]
  },
  
  // ==================== SPOTIFY ====================
  spotify: {
    id: 'spotify',
    name: 'Spotify',
    nameRu: 'Spotify',
    url: 'https://www.spotify.com/signup',
    
    requiresPhone: false,
    requiresEmail: true,
    requiresSms: false,
    requiresVpn: false,
    requiresManual: false,
    
    riskLevel: 'low',
    requiresProxy: false,
    requiresMobileFingerprint: false,
    
    maxAccountsPerPhone: 1,
    minPauseBetweenRegs: 60,
    
    blockedInRussia: false,
    extremistOrganization: false,
    
    selectors: {
      emailInput: [
        'input#email',
        'input[type="email"]',
        'input[name="email"]'
      ],
      codeInput: [],
      passwordInput: [
        'input#password',
        'input[type="password"]'
      ],
      firstNameInput: [
        'input#displayname',
        'input[name="name"]'
      ],
      dateOfBirthDay: [
        'select#day',
        'select[name="day"]'
      ],
      dateOfBirthMonth: [
        'select#month',
        'select[name="month"]'
      ],
      dateOfBirthYear: [
        'select#year',
        'select[name="year"]'
      ],
      genderSelect: [
        'input[data-gender="male"]',
        'input[data-gender="female"]',
        'input[data-gender="non_binary"]'
      ],
      submitButton: [
        'button:has-text("Sign up")',
        'button:has-text("Зарегистрироваться")',
        'button[type="submit"]'
      ],
      successIndicator: [
        '.Root',
        '[data-testid="home"]',
        '.home-header'
      ],
      errorIndicator: [
        '[class*="error"]',
        '.sc-alert'
      ],
      captchaIndicator: [
        'iframe[src*="recaptcha"]'
      ]
    },
    
    smsPatterns: {
      senders: ['Spotify'],
      keywords: ['verification', 'code'],
      codePattern: /\b(\d{6})\b/
    },
    
    notes: [
      'Для подкастов нужен аккаунт Spotify и Anchor.fm',
      'Email обязателен'
    ],
    warnings: []
  },
  
  // ==================== TWITCH ====================
  twitch: {
    id: 'twitch',
    name: 'Twitch',
    nameRu: 'Twitch',
    url: 'https://www.twitch.tv/signup',
    
    requiresPhone: false,
    requiresEmail: true,
    requiresSms: false,
    requiresVpn: false,
    requiresManual: false,
    
    riskLevel: 'low',
    requiresProxy: true,
    requiresMobileFingerprint: false,
    
    maxAccountsPerPhone: 1,
    minPauseBetweenRegs: 60,
    
    blockedInRussia: false,
    extremistOrganization: false,
    
    selectors: {
      emailInput: [
        'input[name="email"]',
        'input[type="email"]',
        '#signup-email'
      ],
      phoneInput: [
        'input[name="phone_number"]',
        'input[type="tel"]'
      ],
      codeInput: [
        'input[name="verification_code"]'
      ],
      usernameInput: [
        'input[name="username"]',
        '#signup-username'
      ],
      passwordInput: [
        'input[name="password"]',
        'input[type="password"]',
        '#signup-password'
      ],
      dateOfBirthDay: [
        'select#birthday_month',
        'select[name="birthday_month"]'
      ],
      dateOfBirthMonth: [
        'select#birthday_day',
        'select[name="birthday_day"]'
      ],
      dateOfBirthYear: [
        'select#birthday_year',
        'select[name="birthday_year"]'
      ],
      submitButton: [
        'button[type="submit"]',
        'button:has-text("Sign Up")',
        'button:has-text("Зарегистрироваться")'
      ],
      successIndicator: [
        '[data-a-target="user-menu-toggle"]',
        '.top-nav',
        '[href*="/dashboard"]'
      ],
      errorIndicator: [
        '[class*="error"]',
        '.InputError'
      ],
      captchaIndicator: [
        'iframe[src*="recaptcha"]',
        'iframe[src*="arkose"]'
      ]
    },
    
    smsPatterns: {
      senders: ['Twitch'],
      keywords: ['verification', 'code', 'Twitch'],
      codePattern: /\b(\d{6})\b/
    },
    
    notes: [
      'Нужна верификация email',
      'Можно привязать телефон позже',
      'Для стриминга нужно 2FA'
    ],
    warnings: []
  },
  
  // ==================== REDDIT ====================
  reddit: {
    id: 'reddit',
    name: 'Reddit',
    nameRu: 'Reddit',
    url: 'https://www.reddit.com/register/',
    
    requiresPhone: true,
    requiresEmail: true,
    requiresSms: true,
    requiresVpn: true,
    requiresManual: false,
    
    riskLevel: 'medium',
    requiresProxy: true,
    requiresMobileFingerprint: false,
    
    maxAccountsPerPhone: 5,
    minPauseBetweenRegs: 30,
    
    blockedInRussia: true,
    extremistOrganization: false,
    
    selectors: {
      emailInput: [
        'input[name="email"]',
        'input[type="email"]',
        '#reg-email'
      ],
      phoneInput: [
        'input[name="phoneNumber"]',
        'input[type="tel"]'
      ],
      codeInput: [
        'input[name="otp"]',
        'input[type="text"][maxlength="6"]',
        'input[name="verificationCode"]'
      ],
      usernameInput: [
        'input[name="username"]',
        '#reg-username'
      ],
      passwordInput: [
        'input[name="password"]',
        'input[type="password"]',
        '#reg-password'
      ],
      submitButton: [
        'button[type="submit"]',
        'button:has-text("Continue")',
        'button:has-text("Sign Up")',
        '.SignupButton'
      ],
      successIndicator: [
        '[class*="Header"]',
        '[class*="profile"]',
        '#USER_DROPDOWN_ID'
      ],
      errorIndicator: [
        '[class*="error"]',
        '.AnimatedForm__errorMessage'
      ],
      captchaIndicator: [
        'iframe[src*="recaptcha"]'
      ]
    },
    
    smsPatterns: {
      senders: ['Reddit', 'reddit'],
      keywords: ['verification', 'code', 'Reddit'],
      codePattern: /\b(\d{6})\b/
    },
    
    notes: [
      'Требует номер телефона для верификации',
      'Email обязателен'
    ],
    warnings: [
      'Reddit заблокирован в РФ — нужен VPN'
    ]
  },
  
  // ==================== FACEBOOK ====================
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    nameRu: 'Facebook',
    url: 'https://www.facebook.com/r.php',
    
    requiresPhone: true,
    requiresEmail: false,
    requiresSms: true,
    requiresVpn: true,
    requiresManual: true,
    
    riskLevel: 'extreme',
    requiresProxy: true,
    requiresMobileFingerprint: false,
    
    maxAccountsPerPhone: 1,
    minPauseBetweenRegs: 1440,
    
    blockedInRussia: true,
    extremistOrganization: true,  // ВАЖНО: признан экстремистской организацией в РФ
    
    selectors: {
      phoneInput: [
        'input[name="reg_email__"]',
        'input[type="tel"]',
        'input[placeholder*="phone" i]'
      ],
      codeInput: [
        'input[name="code"]',
        'input[type="text"][maxlength="6"]'
      ],
      firstNameInput: [
        'input[name="firstname"]',
        '#u_0_b'
      ],
      lastNameInput: [
        'input[name="lastname"]',
        '#u_0_d'
      ],
      passwordInput: [
        'input[name="reg_passwd__"]',
        'input[type="password"]'
      ],
      dateOfBirthDay: [
        'select[name="birthday_day"]',
        '#day'
      ],
      dateOfBirthMonth: [
        'select[name="birthday_month"]',
        '#month'
      ],
      dateOfBirthYear: [
        'select[name="birthday_year"]',
        '#year'
      ],
      genderSelect: [
        'input[value="1"]',  // женский
        'input[value="2"]'   // мужской
      ],
      submitButton: [
        'button[name="websubmit"]',
        'button:has-text("Sign Up")',
        'button:has-text("Зарегистрироваться")',
        '#u_0_s'
      ],
      successIndicator: [
        '[role="navigation"]',
        '[data-pagelet="LeftRail"]',
        '.home_fixed'
      ],
      errorIndicator: [
        '[class*="error"]',
        '#reg_error_inner'
      ],
      captchaIndicator: [
        'iframe[src*="recaptcha"]',
        'iframe[src*="captcha"]'
      ]
    },
    
    smsPatterns: {
      senders: ['Facebook', 'Meta', 'FB', '32665'],
      keywords: ['verification', 'code', 'Facebook'],
      codePattern: /\b(\d{6})\b/
    },
    
    notes: [
      'Один номер = один аккаунт',
      'Очень строгий антибот'
    ],
    warnings: [
      '⚠️ ВНИМАНИЕ: Facebook признан экстремистской организацией в РФ',
      'Регистрация может повлечь юридические последствия',
      'Требует VPN'
    ]
  },
  
  // ==================== WHATSAPP ====================
  whatsapp: {
    id: 'whatsapp',
    name: 'WhatsApp',
    nameRu: 'WhatsApp',
    url: 'https://web.whatsapp.com/',
    
    requiresPhone: true,
    requiresEmail: false,
    requiresSms: true,
    requiresVpn: false,
    requiresManual: true,
    
    riskLevel: 'medium',
    requiresProxy: false,
    requiresMobileFingerprint: false,
    
    maxAccountsPerPhone: 1,
    minPauseBetweenRegs: 1440,
    
    blockedInRussia: false,
    extremistOrganization: false,
    
    selectors: {
      codeInput: [
        'input[type="text"][maxlength="6"]',
        'input[placeholder*="code" i]'
      ],
      submitButton: [
        'button[type="submit"]',
        'button:has-text("Next")',
        'button:has-text("Verify")'
      ],
      successIndicator: [
        '[data-testid="chat-list"]',
        '#side',
        'canvas'
      ],
      errorIndicator: [
        '[class*="error"]'
      ],
      captchaIndicator: []
    },
    
    smsPatterns: {
      senders: ['WhatsApp', 'whatsapp', 'WA'],
      keywords: ['verification', 'code', 'WhatsApp'],
      codePattern: /\b(\d{6})\b/
    },
    
    notes: [
      'Требует сканирование QR-кода с телефона',
      'Или регистрацию через мобильное приложение'
    ],
    warnings: [
      'Рекомендуется регистрировать через мобильное приложение'
    ]
  },
  
  // ==================== SNAPCHAT ====================
  snapchat: {
    id: 'snapchat',
    name: 'Snapchat',
    nameRu: 'Snapchat',
    url: 'https://accounts.snapchat.com/accounts/signup',
    
    requiresPhone: true,
    requiresEmail: false,
    requiresSms: true,
    requiresVpn: true,
    requiresManual: true,
    
    riskLevel: 'high',
    requiresProxy: true,
    requiresMobileFingerprint: true,
    
    maxAccountsPerPhone: 1,
    minPauseBetweenRegs: 1440,
    
    blockedInRussia: false,
    extremistOrganization: false,
    
    selectors: {
      phoneInput: [
        'input[type="tel"]',
        'input[name="phone"]'
      ],
      codeInput: [
        'input[name="verification_code"]',
        'input[type="text"][maxlength="6"]'
      ],
      usernameInput: [
        'input[name="username"]'
      ],
      passwordInput: [
        'input[name="password"]',
        'input[type="password"]'
      ],
      dateOfBirthDay: [
        'select[name="birthday_day"]'
      ],
      dateOfBirthMonth: [
        'select[name="birthday_month"]'
      ],
      dateOfBirthYear: [
        'select[name="birthday_year"]'
      ],
      submitButton: [
        'button[type="submit"]',
        'button:has-text("Sign Up")'
      ],
      successIndicator: [
        '.camera-screen',
        '[class*="home"]'
      ],
      errorIndicator: [
        '[class*="error"]'
      ],
      captchaIndicator: [
        'iframe[src*="recaptcha"]'
      ]
    },
    
    smsPatterns: {
      senders: ['Snapchat', 'Snap', 'Team Snap'],
      keywords: ['verification', 'code', 'Snapchat'],
      codePattern: /\b(\d{6})\b/
    },
    
    notes: [
      'Требует мобильное приложение для полной функциональности',
      'Веб-регистрация ограничена'
    ],
    warnings: [
      '📱 Рекомендация: установи Snapchat на телефон'
    ]
  },
  
  // ==================== ONLYFANS ====================
  onlyfans: {
    id: 'onlyfans',
    name: 'OnlyFans',
    nameRu: 'OnlyFans',
    url: 'https://onlyfans.com/signup',
    
    requiresPhone: true,
    requiresEmail: true,
    requiresSms: true,
    requiresVpn: true,
    requiresManual: true,
    
    riskLevel: 'high',
    requiresProxy: true,
    requiresMobileFingerprint: false,
    
    maxAccountsPerPhone: 1,
    minPauseBetweenRegs: 1440,
    
    blockedInRussia: false,
    extremistOrganization: false,
    
    selectors: {
      emailInput: [
        'input[name="email"]',
        'input[type="email"]'
      ],
      phoneInput: [
        'input[name="phoneNumber"]',
        'input[type="tel"]'
      ],
      codeInput: [
        'input[name="verificationCode"]',
        'input[type="text"][maxlength="6"]'
      ],
      usernameInput: [
        'input[name="username"]'
      ],
      passwordInput: [
        'input[name="password"]',
        'input[type="password"]'
      ],
      dateOfBirthDay: [
        'select[name="birthday_month"]',
        'select[name="birthday_day"]',
        'select[name="birthday_year"]'
      ],
      submitButton: [
        'button[type="submit"]',
        'button:has-text("Sign Up")'
      ],
      successIndicator: [
        '[href*="/my/dashboard"]',
        '.b-user-tabs'
      ],
      errorIndicator: [
        '[class*="error"]'
      ],
      captchaIndicator: [
        'iframe[src*="recaptcha"]',
        'iframe[src*="hcaptcha"]'
      ]
    },
    
    smsPatterns: {
      senders: ['OnlyFans', 'onlyfans'],
      keywords: ['verification', 'code', 'OnlyFans'],
      codePattern: /\b(\d{6})\b/
    },
    
    notes: [
      'Требует верификацию паспорта (ID)',
      'Номер телефона обязателен',
      'Для выплат нужно банковское подтверждение'
    ],
    warnings: [
      '⚠️ Только для пользователей 18+',
      'Для монетизации: пройти верификацию личности'
    ]
  }
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

/**
 * Получить конфигурацию сервиса
 */
export function getServiceConfig(serviceId: string): ServiceConfig | null {
  return SERVICES_REGISTRY[serviceId] || null
}

/**
 * Получить все сервисы
 */
export function getAllServices(): ServiceConfig[] {
  return Object.values(SERVICES_REGISTRY)
}

/**
 * Получить сервисы, работающие в РФ
 */
export function getServicesForRussia(): ServiceConfig[] {
  return Object.values(SERVICES_REGISTRY).filter(s => !s.blockedInRussia)
}

/**
 * Получить сервисы, не требующие VPN
 */
export function getServicesWithoutVpn(): ServiceConfig[] {
  return Object.values(SERVICES_REGISTRY).filter(s => !s.requiresVpn)
}

/**
 * Получить сервисы, поддерживающие автоматизацию
 */
export function getAutomatableServices(): ServiceConfig[] {
  return Object.values(SERVICES_REGISTRY).filter(s => !s.requiresManual)
}

/**
 * Проверить, можно ли регистрировать сервис
 */
export function canRegister(serviceId: string): { 
  canRegister: boolean
  reasons: string[] 
} {
  const service = SERVICES_REGISTRY[serviceId]
  const reasons: string[] = []
  
  if (!service) {
    return { canRegister: false, reasons: ['Сервис не найден'] }
  }
  
  if (service.extremistOrganization) {
    reasons.push('⚠️ Организация признана экстремистской в РФ')
  }
  
  if (service.requiresVpn) {
    reasons.push('⚠️ Требует VPN')
  }
  
  if (service.requiresManual) {
    reasons.push('⚠️ Требует ручного вмешательства')
  }
  
  return { 
    canRegister: true, 
    reasons 
  }
}

/**
 * Получить паузу между регистрациями для сервиса
 */
export function getPauseBetweenRegs(serviceId: string): number {
  const service = SERVICES_REGISTRY[serviceId]
  return service?.minPauseBetweenRegs || 60
}

/**
 * Проверить, нужен ли мобильный fingerprint
 */
export function needsMobileFingerprint(serviceId: string): boolean {
  const service = SERVICES_REGISTRY[serviceId]
  return service?.requiresMobileFingerprint || false
}

export default SERVICES_REGISTRY
