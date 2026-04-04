// Platform-specific warming configurations based on 2026 research
// Each platform has unique limits and strategies

export interface PhaseLimits {
  likes: { min: number; max: number };
  follows: { min: number; max: number };
  comments: { min: number; max: number };
  posts: { min: number; max: number };
  dm: { min: number; max: number };
  stories?: { min: number; max: number };
  timeSpent: { min: number; max: number }; // minutes per day
  invites?: { min: number; max: number }; // for Telegram
  retweets?: { min: number; max: number }; // for X
}

export interface WarmingPhase {
  name: string;
  nameRu: string;
  days: [number, number];
  limits: PhaseLimits;
  description: string;
  descriptionRu: string;
  color: string;
  icon: string;
  goals: string[];
  warnings: string[];
}

export interface PlatformConfig {
  id: string;
  name: string;
  icon: string;
  color: string;
  totalWarmingDays: number;
  phases: WarmingPhase[];
  proxyRequirements: {
    types: ('mobile' | 'residential' | 'datacenter')[];
    recommended: 'mobile' | 'residential';
    warning: string;
  };
  fingerprintRequirements: {
    canvasHash: boolean;
    webglVendor: boolean;
    webrtcLeak: boolean;
    audioFingerprint: boolean;
    timezone: boolean;
    language: boolean;
  };
  shadowbanIndicators: string[];
  recoverySteps: string[];
  trafficReadyRequirements: string[];
}

// Instagram Configuration - 21 days warming
export const INSTAGRAM_CONFIG: PlatformConfig = {
  id: 'instagram',
  name: 'Instagram',
  icon: '📸',
  color: '#E4405F',
  totalWarmingDays: 21,
  phases: [
    {
      name: 'Ghost',
      nameRu: 'Призрак',
      days: [1, 7],
      limits: {
        likes: { min: 5, max: 10 },
        follows: { min: 0, max: 0 },
        comments: { min: 0, max: 0 },
        posts: { min: 0, max: 0 },
        dm: { min: 0, max: 0 },
        stories: { min: 5, max: 7 },
        timeSpent: { min: 15, max: 20 },
      },
      description: 'Create viewing history without triggering spam filters',
      descriptionRu: 'Создать историю просмотров, не вызывая спам-фильтры',
      color: '#8A8A8A',
      icon: 'ghost',
      goals: [
        'Scroll feed 15-20 min/day in 2-3 sessions',
        'Watch 5-7 Stories daily',
        'Like only relevant content',
        'No follows, comments, or posts',
      ],
      warnings: [
        'Do not skip verification if requested',
        'Avoid any engagement that looks automated',
      ],
    },
    {
      name: 'Light Contact',
      nameRu: 'Лёгкий контакт',
      days: [8, 14],
      limits: {
        likes: { min: 10, max: 15 },
        follows: { min: 3, max: 5 },
        comments: { min: 1, max: 2 },
        posts: { min: 0, max: 1 },
        dm: { min: 0, max: 0 },
        stories: { min: 10, max: 15 },
        timeSpent: { min: 20, max: 30 },
      },
      description: 'Show algorithm your niche and interests',
      descriptionRu: 'Показать алгоритму свою нишу и интересы',
      color: '#FFB800',
      icon: 'hand',
      goals: [
        'Engage with niche content',
        'Meaningful comments (not emojis)',
        'Build interest profile',
      ],
      warnings: [
        'No identical hashtags on every post',
        'Max 5 hashtags per post',
        'No copied captions',
        'No TikTok watermarks',
      ],
    },
    {
      name: 'Activation',
      nameRu: 'Активация',
      days: [15, 21],
      limits: {
        likes: { min: 15, max: 25 },
        follows: { min: 5, max: 10 },
        comments: { min: 3, max: 5 },
        posts: { min: 1, max: 3 },
        dm: { min: 0, max: 0 },
        stories: { min: 10, max: 15 },
        timeSpent: { min: 30, max: 45 },
      },
      description: 'Prove you are a real user creating value',
      descriptionRu: 'Доказать, что вы реальный пользователь',
      color: '#00D26A',
      icon: 'rocket',
      goals: [
        'First post should be Reels (7-15 sec)',
        'Add Alt-text with keywords',
        'Include SEO keywords in caption',
        'No watermarks',
      ],
      warnings: [
        'First posts are critical for algorithm trust',
        'Maintain consistent posting schedule',
      ],
    },
    {
      name: 'Stable',
      nameRu: 'Стабильный',
      days: [22, 999],
      limits: {
        likes: { min: 50, max: 100 },
        follows: { min: 20, max: 40 },
        comments: { min: 10, max: 20 },
        posts: { min: 3, max: 5 },
        dm: { min: 10, max: 20 },
        stories: { min: 5, max: 10 },
        timeSpent: { min: 30, max: 60 },
      },
      description: 'Account ready for traffic pouring',
      descriptionRu: 'Аккаунт готов к заливу трафика',
      color: '#6C63FF',
      icon: 'check-circle',
      goals: [
        'Full activity without restrictions',
        'Ready for Bio link traffic',
        'Can handle DM marketing',
      ],
      warnings: [
        'Don\'t change Bio link more than once per day',
        'Avoid short links (bit.ly) - blacklisted',
        'Use Taplink or Shor.by for multiple links',
      ],
    },
  ],
  proxyRequirements: {
    types: ['mobile', 'residential'],
    recommended: 'mobile',
    warning: 'Datacenter proxies are noisy and lead to bans. Use mobile or residential only.',
  },
  fingerprintRequirements: {
    canvasHash: true,
    webglVendor: true,
    webrtcLeak: true,
    audioFingerprint: true,
    timezone: true,
    language: true,
  },
  shadowbanIndicators: [
    'Posts not appearing in hashtag search',
    'Sudden drop in reach',
    'Comments hidden from non-followers',
    'Explore page not showing your content',
  ],
  recoverySteps: [
    'Check Account Status in settings',
    'Stop all activity for 48-72 hours',
    'Remove banned hashtags',
    'Revoke suspicious app access',
    'Change password',
    'Contact support (without mentioning shadowban)',
    'Resume with 30% of normal limits',
  ],
  trafficReadyRequirements: [
    'Account age 21+ days',
    'Account Status all green',
    'No active restrictions',
    'Bio link configured',
    'Backup accounts ready',
  ],
};

// TikTok Configuration - 28 days (most strict)
export const TIKTOK_CONFIG: PlatformConfig = {
  id: 'tiktok',
  name: 'TikTok',
  icon: '🎵',
  color: '#000000',
  totalWarmingDays: 28,
  phases: [
    {
      name: 'Cold Warm',
      nameRu: 'Холодный прогрев',
      days: [1, 7],
      limits: {
        likes: { min: 10, max: 20 },
        follows: { min: 0, max: 2 },
        comments: { min: 0, max: 0 },
        posts: { min: 0, max: 0 },
        dm: { min: 0, max: 0 },
        timeSpent: { min: 20, max: 30 },
      },
      description: 'Build watch history - watch time is critical',
      descriptionRu: 'Набрать историю дочитывания видео',
      color: '#8A8A8A',
      icon: 'eye',
      goals: [
        'Watch 20-30 min/day - COMPLETE videos',
        'Like only after watching 70%+',
        'Let account rest 24h before first action',
      ],
      warnings: [
        'TikTok analyzes watch time - scrolling at 1 sec = trust minus',
        'Must watch at least 70% of videos',
        'This is the strictest platform',
      ],
    },
    {
      name: 'Soft Activity',
      nameRu: 'Мягкая активность',
      days: [8, 14],
      limits: {
        likes: { min: 30, max: 50 },
        follows: { min: 5, max: 10 },
        comments: { min: 0, max: 0 },
        posts: { min: 0, max: 2 },
        dm: { min: 0, max: 0 },
        timeSpent: { min: 30, max: 45 },
      },
      description: 'Start light engagement with neutral content',
      descriptionRu: 'Начать лёгкое вовлечение с нейтральным контентом',
      color: '#FFB800',
      icon: 'hand',
      goals: [
        'Post 1-2 neutral videos/week',
        'Content: memes, clips, polls in GEO language',
        '8-15 second videos',
        'No links or CTAs',
      ],
      warnings: [
        'No promotional content yet',
        'Focus on entertainment value',
      ],
    },
    {
      name: 'Growth',
      nameRu: 'Рост',
      days: [15, 28],
      limits: {
        likes: { min: 100, max: 200 },
        follows: { min: 15, max: 20 },
        comments: { min: 3, max: 5 },
        posts: { min: 1, max: 1 },
        dm: { min: 0, max: 0 },
        timeSpent: { min: 45, max: 60 },
      },
      description: 'Reach 1000 followers for Bio link unlock',
      descriptionRu: 'Достичь 1000 подписчиков для разблокировки ссылки',
      color: '#00D26A',
      icon: 'trending-up',
      goals: [
        'Post 1 video daily',
        'Use trending sounds',
        '3-5 relevant hashtags',
        'React to popular videos in niche',
      ],
      warnings: [
        'Goal is 1000 followers for clickable link',
        'Consistency is key',
      ],
    },
    {
      name: 'Traffic Ready',
      nameRu: 'Готов к трафику',
      days: [29, 999],
      limits: {
        likes: { min: 200, max: 300 },
        follows: { min: 20, max: 30 },
        comments: { min: 10, max: 20 },
        posts: { min: 1, max: 2 },
        dm: { min: 0, max: 5 },
        timeSpent: { min: 45, max: 60 },
      },
      description: 'Can add clickable link in Bio',
      descriptionRu: 'Можно добавить кликабельную ссылку в Bio',
      color: '#6C63FF',
      icon: 'check-circle',
      goals: [
        '1 promotional + 1 entertaining video daily',
        'CTA: "Link in profile"',
        'Use UTM tracking',
      ],
      warnings: [
        'Don\'t publish same link on all accounts',
        'Mask offers (filters, cuts, background changes)',
        'Avoid: crypto, dating, nutra (strictly controlled)',
      ],
    },
  ],
  proxyRequirements: {
    types: ['mobile', 'residential'],
    recommended: 'mobile',
    warning: 'TikTok is extremely sensitive. Use iPhone 11+ or ARM cloud phones with antidetect.',
  },
  fingerprintRequirements: {
    canvasHash: true,
    webglVendor: true,
    webrtcLeak: true,
    audioFingerprint: true,
    timezone: true,
    language: true,
  },
  shadowbanIndicators: [
    '0 views in first hours',
    'Videos not showing in For You',
    'FYP not personalized',
    'Shadowban is usually permanent - need new account',
  ],
  recoverySteps: [
    'Delete TikTok app',
    'Reset geolocation and network',
    'Re-download app',
    'Use fresh proxies',
    'Start warming from scratch',
  ],
  trafficReadyRequirements: [
    'Account age 28+ days',
    '1000+ followers',
    'Consistent views on recent videos',
    'No 0-view videos',
  ],
};

// Telegram Configuration - 21 days
export const TELEGRAM_CONFIG: PlatformConfig = {
  id: 'telegram',
  name: 'Telegram',
  icon: '✈️',
  color: '#0088cc',
  totalWarmingDays: 21,
  phases: [
    {
      name: 'Cold',
      nameRu: 'Холодный',
      days: [1, 5],
      limits: {
        likes: { min: 0, max: 0 },
        follows: { min: 2, max: 3 },
        comments: { min: 0, max: 0 },
        posts: { min: 0, max: 0 },
        dm: { min: 0, max: 0 },
        invites: { min: 0, max: 0 },
        timeSpent: { min: 15, max: 20 },
      },
      description: 'Create "alive" user history',
      descriptionRu: 'Создать историю "живого" пользователя',
      color: '#8A8A8A',
      icon: 'eye',
      goals: [
        'View channels/chats 15-20 min/day',
        'Join 2-3 open chats (news search)',
        'No messages or invites',
      ],
      warnings: [
        'Telegram looks at account age',
        'First 3-5 days = reading only',
      ],
    },
    {
      name: 'Waking',
      nameRu: 'Пробуждение',
      days: [6, 10],
      limits: {
        likes: { min: 0, max: 0 },
        follows: { min: 5, max: 10 },
        comments: { min: 1, max: 2 },
        posts: { min: 0, max: 0 },
        dm: { min: 0, max: 0 },
        invites: { min: 0, max: 0 },
        timeSpent: { min: 20, max: 30 },
      },
      description: 'Start meaningful interactions',
      descriptionRu: 'Начать осмысленные взаимодействия',
      color: '#FFB800',
      icon: 'message-circle',
      goals: [
        '1-2 meaningful messages in public chats',
        '3-5 reactions daily',
        'Add 5-10 contacts',
      ],
      warnings: [
        'No identical messages',
        'No links in first 10 days',
        'Don\'t join 50 groups in a day',
      ],
    },
    {
      name: 'Active Warming',
      nameRu: 'Активный прогрев',
      days: [11, 21],
      limits: {
        likes: { min: 0, max: 0 },
        follows: { min: 10, max: 20 },
        comments: { min: 5, max: 10 },
        posts: { min: 0, max: 1 },
        dm: { min: 5, max: 10 },
        invites: { min: 5, max: 10 },
        timeSpent: { min: 30, max: 45 },
      },
      description: 'Prepare for invite marketing',
      descriptionRu: 'Подготовка к инвайт-маркетингу',
      color: '#00D26A',
      icon: 'users',
      goals: [
        '5-10 invites/day',
        '20-60 sec delay between invites',
        'Max 20 invites/hour',
        'Parse only active users (posted in 30 days)',
      ],
      warnings: [
        'Use Telegram Expert for bulk work',
        'Booster module for cross-account dialogues',
        'Auto-restriction removal via @SpamBot',
      ],
    },
    {
      name: 'Traffic Ready',
      nameRu: 'Готов к трафику',
      days: [22, 999],
      limits: {
        likes: { min: 0, max: 0 },
        follows: { min: 20, max: 40 },
        comments: { min: 20, max: 30 },
        posts: { min: 1, max: 3 },
        dm: { min: 50, max: 100 },
        invites: { min: 20, max: 50 },
        timeSpent: { min: 30, max: 60 },
      },
      description: 'Ready for traffic pouring',
      descriptionRu: 'Готов к заливу трафика',
      color: '#6C63FF',
      icon: 'check-circle',
      goals: [
        '20-50 invites/day',
        '50-100 messages/day',
        '20-60 sec delays',
      ],
      warnings: [
        'If spam-block: use restriction removal module',
        'Reduce activity for 2-3 days',
        'Admin invites are safest (bot does the work)',
      ],
    },
  ],
  proxyRequirements: {
    types: ['residential', 'mobile'],
    recommended: 'residential',
    warning: 'Country IP must match phone number GEO. For bulk: Astro residential proxies.',
  },
  fingerprintRequirements: {
    canvasHash: true,
    webglVendor: false,
    webrtcLeak: true,
    audioFingerprint: false,
    timezone: true,
    language: true,
  },
  shadowbanIndicators: [
    'Messages not delivered',
    'Account not visible in search',
    'Spam-bot restrictions',
    'Cannot invite to groups',
  ],
  recoverySteps: [
    'Contact @SpamBot',
    'Stop all activity',
    'Wait for restriction to lift',
    'Reduce activity to 30%',
    'Use Telegram Expert restriction removal',
  ],
  trafficReadyRequirements: [
    'Account age 21+ days',
    'No active restrictions',
    '2FA enabled',
    'Profile complete',
  ],
};

// X (Twitter) Configuration - 14 days
export const X_CONFIG: PlatformConfig = {
  id: 'x',
  name: 'X (Twitter)',
  icon: '𝕏',
  color: '#000000',
  totalWarmingDays: 14,
  phases: [
    {
      name: 'Observer',
      nameRu: 'Наблюдатель',
      days: [1, 3],
      limits: {
        likes: { min: 5, max: 10 },
        follows: { min: 0, max: 0 },
        comments: { min: 0, max: 0 },
        posts: { min: 0, max: 0 },
        dm: { min: 0, max: 0 },
        retweets: { min: 5, max: 10 },
        timeSpent: { min: 15, max: 20 },
      },
      description: 'Only reading and reposts',
      descriptionRu: 'Только чтение и репосты',
      color: '#8A8A8A',
      icon: 'eye',
      goals: [
        '5-10 reposts/day',
        'Build interest profile',
        'No original content yet',
      ],
      warnings: [
        'X values speed and humor',
        'Threads work well',
      ],
    },
    {
      name: 'Engager',
      nameRu: 'Вовлекающий',
      days: [4, 7],
      limits: {
        likes: { min: 20, max: 50 },
        follows: { min: 5, max: 10 },
        comments: { min: 3, max: 5 },
        posts: { min: 0, max: 0 },
        dm: { min: 0, max: 0 },
        retweets: { min: 10, max: 20 },
        timeSpent: { min: 20, max: 30 },
      },
      description: 'Start commenting',
      descriptionRu: 'Начать комментировать',
      color: '#FFB800',
      icon: 'message-circle',
      goals: [
        '3-5 meaningful comments',
        'Start following relevant accounts',
        'No original tweets yet',
      ],
      warnings: [
        'No identical comments',
        'No mass-following',
      ],
    },
    {
      name: 'Creator',
      nameRu: 'Создатель',
      days: [8, 14],
      limits: {
        likes: { min: 50, max: 100 },
        follows: { min: 10, max: 20 },
        comments: { min: 5, max: 10 },
        posts: { min: 1, max: 2 },
        dm: { min: 0, max: 5 },
        retweets: { min: 10, max: 20 },
        timeSpent: { min: 30, max: 45 },
      },
      description: 'Start creating content',
      descriptionRu: 'Начать создавать контент',
      color: '#00D26A',
      icon: 'pen',
      goals: [
        '1-2 tweets/day',
        'Build engagement',
        'Threads for long content',
      ],
      warnings: [
        'Humor and speed are valued',
        'Don\'t automate friend requests',
      ],
    },
    {
      name: 'Established',
      nameRu: 'Установленный',
      days: [15, 999],
      limits: {
        likes: { min: 100, max: 200 },
        follows: { min: 30, max: 50 },
        comments: { min: 10, max: 20 },
        posts: { min: 3, max: 10 },
        dm: { min: 5, max: 20 },
        retweets: { min: 15, max: 30 },
        timeSpent: { min: 30, max: 60 },
      },
      description: 'Full activity, ready for marketing',
      descriptionRu: 'Полная активность, готов к маркетингу',
      color: '#6C63FF',
      icon: 'check-circle',
      goals: [
        'Up to 30 tweets/day',
        'Up to 200 likes/day',
        'Link in bio ready',
      ],
      warnings: [
        'Don\'t spam links in comments',
        'Build genuine engagement',
      ],
    },
  ],
  proxyRequirements: {
    types: ['residential', 'mobile'],
    recommended: 'residential',
    warning: 'X is strict about automation. Use antidetect with unique fingerprints.',
  },
  fingerprintRequirements: {
    canvasHash: true,
    webglVendor: true,
    webrtcLeak: true,
    audioFingerprint: true,
    timezone: true,
    language: true,
  },
  shadowbanIndicators: [
    'Tweets not showing in search',
    'Replies hidden',
    'Reduced engagement suddenly',
  ],
  recoverySteps: [
    'Check shadowban.eu',
    'Stop activity for 48h',
    'Remove suspicious apps',
    'Change password',
  ],
  trafficReadyRequirements: [
    'Account age 14+ days',
    'Consistent engagement',
    'Bio link set up',
  ],
};

// LinkedIn Configuration - B2B focused
export const LINKEDIN_CONFIG: PlatformConfig = {
  id: 'linkedin',
  name: 'LinkedIn',
  icon: '💼',
  color: '#0A66C2',
  totalWarmingDays: 14,
  phases: [
    {
      name: 'Profile Setup',
      nameRu: 'Настройка профиля',
      days: [1, 3],
      limits: {
        likes: { min: 0, max: 0 },
        follows: { min: 0, max: 0 },
        comments: { min: 0, max: 0 },
        posts: { min: 0, max: 0 },
        dm: { min: 0, max: 0 },
        timeSpent: { min: 20, max: 30 },
      },
      description: 'Complete profile setup',
      descriptionRu: 'Полная настройка профиля',
      color: '#8A8A8A',
      icon: 'user',
      goals: [
        'Add photo, headline, experience',
        'Add skills',
        'Set up profile completely',
      ],
      warnings: [
        'Incomplete profiles get less reach',
        'Professional photo matters',
      ],
    },
    {
      name: 'Networking',
      nameRu: 'Нетворкинг',
      days: [4, 7],
      limits: {
        likes: { min: 5, max: 10 },
        follows: { min: 10, max: 20 },
        comments: { min: 0, max: 0 },
        posts: { min: 0, max: 0 },
        dm: { min: 0, max: 0 },
        timeSpent: { min: 20, max: 30 },
      },
      description: 'Add known contacts from your industry',
      descriptionRu: 'Добавить знакомых из своей сферы',
      color: '#FFB800',
      icon: 'users',
      goals: [
        'Add 10-20 people from your industry',
        'Not random connections',
        'Like colleague content',
      ],
      warnings: [
        'Don\'t automate friend requests',
        'Only connect with relevant people',
      ],
    },
    {
      name: 'Engagement',
      nameRu: 'Вовлечение',
      days: [8, 14],
      limits: {
        likes: { min: 10, max: 20 },
        follows: { min: 5, max: 10 },
        comments: { min: 3, max: 5 },
        posts: { min: 0, max: 1 },
        dm: { min: 0, max: 5 },
        timeSpent: { min: 20, max: 30 },
      },
      description: 'Start engaging with content',
      descriptionRu: 'Начать вовлекаться в контент',
      color: '#00D26A',
      icon: 'message-circle',
      goals: [
        'Like and repost colleague content',
        'Meaningful comments',
        'Maybe first post',
      ],
      warnings: [
        'No link spam in comments',
        'Build professional reputation',
      ],
    },
    {
      name: 'Authority',
      nameRu: 'Авторитет',
      days: [15, 999],
      limits: {
        likes: { min: 20, max: 50 },
        follows: { min: 10, max: 20 },
        comments: { min: 5, max: 10 },
        posts: { min: 1, max: 3 },
        dm: { min: 5, max: 10 },
        timeSpent: { min: 30, max: 45 },
      },
      description: 'Publish long-form content with case studies',
      descriptionRu: 'Публикация лонгридов с кейсами',
      color: '#6C63FF',
      icon: 'check-circle',
      goals: [
        'Text + carousel posts',
        'Share expertise',
        'Build authority',
      ],
      warnings: [
        'Quality over quantity',
        'Professional tone only',
      ],
    },
  ],
  proxyRequirements: {
    types: ['residential', 'mobile'],
    recommended: 'residential',
    warning: 'LinkedIn is strict. Use professional-looking profiles with real photos.',
  },
  fingerprintRequirements: {
    canvasHash: true,
    webglVendor: true,
    webrtcLeak: true,
    audioFingerprint: false,
    timezone: true,
    language: true,
  },
  shadowbanIndicators: [
    'Posts not appearing in feed',
    'Connection requests ignored',
    'Profile not showing in search',
  ],
  recoverySteps: [
    'Complete profile',
    'Add more connections',
    'Engage more before posting',
  ],
  trafficReadyRequirements: [
    'Complete profile',
    '50+ connections',
    'Consistent engagement',
  ],
};

// Facebook Configuration - Meta strict risk control
export const FACEBOOK_CONFIG: PlatformConfig = {
  id: 'facebook',
  name: 'Facebook',
  icon: '📘',
  color: '#1877F2',
  totalWarmingDays: 21,
  phases: [
    {
      name: 'Setup',
      nameRu: 'Настройка',
      days: [1, 7],
      limits: {
        likes: { min: 0, max: 0 },
        follows: { min: 2, max: 3 },
        comments: { min: 0, max: 0 },
        posts: { min: 0, max: 0 },
        dm: { min: 0, max: 0 },
        timeSpent: { min: 15, max: 20 },
      },
      description: 'Fill profile, join interest groups',
      descriptionRu: 'Заполнить профиль, вступить в группы',
      color: '#8A8A8A',
      icon: 'user',
      goals: [
        'Complete profile',
        'Join 2-3 interest groups',
        'No activity yet',
      ],
      warnings: [
        'Meta links accounts from same IP/device',
        'Use antidetect for multiple accounts',
      ],
    },
    {
      name: 'Engagement',
      nameRu: 'Вовлечение',
      days: [8, 14],
      limits: {
        likes: { min: 5, max: 10 },
        follows: { min: 5, max: 10 },
        comments: { min: 3, max: 5 },
        posts: { min: 0, max: 0 },
        dm: { min: 0, max: 0 },
        timeSpent: { min: 20, max: 30 },
      },
      description: 'Start group engagement',
      descriptionRu: 'Начать активность в группах',
      color: '#FFB800',
      icon: 'message-circle',
      goals: [
        'Comment in groups',
        'Like friends\' posts',
        'Build trust',
      ],
      warnings: [
        'Meta has strict risk control',
        'Accounts get linked easily',
      ],
    },
    {
      name: 'Active',
      nameRu: 'Активный',
      days: [15, 21],
      limits: {
        likes: { min: 10, max: 20 },
        follows: { min: 10, max: 20 },
        comments: { min: 5, max: 10 },
        posts: { min: 1, max: 2 },
        dm: { min: 0, max: 5 },
        timeSpent: { min: 30, max: 45 },
      },
      description: 'Start posting content',
      descriptionRu: 'Начать публиковать контент',
      color: '#00D26A',
      icon: 'image',
      goals: [
        '1-2 posts/week',
        'Share relevant content',
        'Build engagement',
      ],
      warnings: [
        'Don\'t create multiple accounts from same device',
        'Meta will link them',
      ],
    },
    {
      name: 'Established',
      nameRu: 'Установленный',
      days: [22, 999],
      limits: {
        likes: { min: 20, max: 50 },
        follows: { min: 15, max: 30 },
        comments: { min: 10, max: 20 },
        posts: { min: 1, max: 3 },
        dm: { min: 5, max: 15 },
        timeSpent: { min: 30, max: 60 },
      },
      description: 'Ready for page/group marketing',
      descriptionRu: 'Готов к маркетингу страниц/групп',
      color: '#6C63FF',
      icon: 'check-circle',
      goals: [
        'Consistent posting',
        'Group engagement',
        'Can run ads',
      ],
      warnings: [
        'Ad accounts get flagged easily',
        'Warm ad accounts slowly too',
      ],
    },
  ],
  proxyRequirements: {
    types: ['residential', 'mobile'],
    recommended: 'residential',
    warning: 'Meta has the strictest risk control. Never use same fingerprint for multiple accounts.',
  },
  fingerprintRequirements: {
    canvasHash: true,
    webglVendor: true,
    webrtcLeak: true,
    audioFingerprint: true,
    timezone: true,
    language: true,
  },
  shadowbanIndicators: [
    'Posts not reaching audience',
    'Group posts hidden',
    'Reduced engagement',
  ],
  recoverySteps: [
    'Verify identity',
    'Complete security checkup',
    'Reduce posting frequency',
    'Engage more genuinely',
  ],
  trafficReadyRequirements: [
    'Account age 21+ days',
    'No recent restrictions',
    'Profile complete',
    'Some engagement history',
  ],
};

// Export all platform configs
export const PLATFORM_CONFIGS: Record<string, PlatformConfig> = {
  instagram: INSTAGRAM_CONFIG,
  tiktok: TIKTOK_CONFIG,
  telegram: TELEGRAM_CONFIG,
  x: X_CONFIG,
  linkedin: LINKEDIN_CONFIG,
  facebook: FACEBOOK_CONFIG,
};

// Get platform config by ID
export function getPlatformConfig(platformId: string): PlatformConfig | null {
  return PLATFORM_CONFIGS[platformId.toLowerCase()] || null;
}

// Get current phase for account
export function getCurrentPhase(
  platformId: string,
  day: number
): WarmingPhase | null {
  const config = getPlatformConfig(platformId);
  if (!config) return null;

  return (
    config.phases.find(
      (phase) => day >= phase.days[0] && day <= phase.days[1]
    ) || config.phases[config.phases.length - 1]
  );
}

// Get daily limits for account
export function getDailyLimits(
  platformId: string,
  day: number
): PhaseLimits | null {
  const phase = getCurrentPhase(platformId, day);
  return phase?.limits || null;
}

// Calculate progress percentage
export function calculateProgress(
  platformId: string,
  day: number
): number {
  const config = getPlatformConfig(platformId);
  if (!config) return 0;

  return Math.min(100, Math.round((day / config.totalWarmingDays) * 100));
}

// Check if account is traffic ready
export function isTrafficReady(
  platformId: string,
  day: number
): boolean {
  const config = getPlatformConfig(platformId);
  if (!config) return false;

  return day >= config.totalWarmingDays;
}
