/**
 * Telegram Bot Integration Library
 * Handles Telegram Bot API webhook events and bot interactions
 */

import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

// Telegram Bot API types
export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  channel_post?: TelegramMessage;
  edited_channel_post?: TelegramMessage;
  inline_query?: TelegramInlineQuery;
  chosen_inline_result?: TelegramChosenInlineResult;
  callback_query?: TelegramCallbackQuery;
  shipping_query?: TelegramShippingQuery;
  pre_checkout_query?: TelegramPreCheckoutQuery;
  poll?: TelegramPoll;
  poll_answer?: TelegramPollAnswer;
  my_chat_member?: TelegramChatMemberUpdated;
  chat_member?: TelegramChatMemberUpdated;
  chat_join_request?: TelegramChatJoinRequest;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  sender_chat?: TelegramChat;
  date: number;
  chat: TelegramChat;
  forward_from?: TelegramUser;
  forward_from_chat?: TelegramChat;
  forward_from_message_id?: number;
  forward_signature?: string;
  forward_sender_name?: string;
  forward_date?: number;
  is_automatic_forward?: boolean;
  reply_to_message?: TelegramMessage;
  via_bot?: TelegramUser;
  edit_date?: number;
  has_protected_content?: boolean;
  media_group_id?: string;
  author_signature?: string;
  text?: string;
  entities?: TelegramMessageEntity[];
  animation?: TelegramAnimation;
  audio?: TelegramAudio;
  document?: TelegramDocument;
  photo?: TelegramPhotoSize[];
  sticker?: TelegramSticker;
  video?: TelegramVideo;
  video_note?: TelegramVideoNote;
  voice?: TelegramVoice;
  caption?: string;
  caption_entities?: TelegramMessageEntity[];
  contact?: TelegramContact;
  dice?: TelegramDice;
  game?: TelegramGame;
  poll?: TelegramPoll;
  venue?: TelegramVenue;
  location?: TelegramLocation;
  new_chat_members?: TelegramUser[];
  left_chat_member?: TelegramUser;
  new_chat_title?: string;
  new_chat_photo?: TelegramPhotoSize[];
  delete_chat_photo?: boolean;
  group_chat_created?: boolean;
  supergroup_chat_created?: boolean;
  channel_chat_created?: boolean;
  message_auto_delete_timer_changed?: TelegramMessageAutoDeleteTimerChanged;
  migrate_to_chat_id?: number;
  migrate_from_chat_id?: number;
  pinned_message?: TelegramMessage;
  invoice?: TelegramInvoice;
  successful_payment?: TelegramSuccessfulPayment;
  connected_website?: string;
  write_access_allowed?: TelegramWriteAccessAllowed;
  passport_data?: TelegramPassportData;
  proximity_alert_triggered?: TelegramProximityAlertTriggered;
  forum_topic_created?: TelegramForumTopicCreated;
  forum_topic_edited?: TelegramForumTopicEdited;
  forum_topic_closed?: TelegramForumTopicClosed;
  forum_topic_reopened?: TelegramForumTopicReopened;
  general_forum_topic_hidden?: TelegramGeneralForumTopicHidden;
  general_forum_topic_unhidden?: TelegramGeneralForumTopicUnhidden;
  video_chat_scheduled?: TelegramVideoChatScheduled;
  video_chat_started?: TelegramVideoChatStarted;
  video_chat_ended?: TelegramVideoChatEnded;
  video_chat_participants_invited?: TelegramVideoChatParticipantsInvited;
  web_app_data?: TelegramWebAppData;
  reply_markup?: TelegramInlineKeyboardMarkup;
}

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  added_to_attachment_menu?: boolean;
  can_join_groups?: boolean;
  can_read_all_group_messages?: boolean;
  supports_inline_queries?: boolean;
}

export interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo?: TelegramChatPhoto;
  bio?: string;
  description?: string;
  invite_link?: string;
  pinned_message?: TelegramMessage;
  permissions?: TelegramChatPermissions;
  slow_mode_delay?: number;
  message_auto_delete_time?: number;
  has_protected_content?: boolean;
  sticker_set_name?: string;
  can_set_sticker_set?: boolean;
  linked_chat_id?: number;
  location?: TelegramChatLocation;
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  inline_message_id?: string;
  chat_instance: string;
  data?: string;
  game_short_name?: string;
}

export interface TelegramInlineQuery {
  id: string;
  from: TelegramUser;
  query: string;
  offset: string;
  chat_type?: string;
  location?: TelegramLocation;
}

export interface TelegramChosenInlineResult {
  result_id: string;
  from: TelegramUser;
  location?: TelegramLocation;
  inline_message_id?: string;
  query: string;
}

export interface TelegramChatMemberUpdated {
  chat: TelegramChat;
  from: TelegramUser;
  date: number;
  old_chat_member: TelegramChatMember;
  new_chat_member: TelegramChatMember;
  invite_link?: TelegramChatInviteLink;
  via_chat_folder_invite_link?: boolean;
}

export interface TelegramChatMember {
  user: TelegramUser;
  status: string;
  custom_title?: string;
  is_anonymous?: boolean;
  can_be_edited?: boolean;
  can_manage_chat?: boolean;
  can_change_info?: boolean;
  can_post_messages?: boolean;
  can_edit_messages?: boolean;
  can_delete_messages?: boolean;
  can_invite_users?: boolean;
  can_restrict_members?: boolean;
  can_pin_messages?: boolean;
  can_manage_topics?: boolean;
  can_promote_members?: boolean;
  can_manage_video_chats?: boolean;
  can_manage_voice_chats?: boolean;
  is_member?: boolean;
  can_send_messages?: boolean;
  can_send_audios?: boolean;
  can_send_documents?: boolean;
  can_send_photos?: boolean;
  can_send_videos?: boolean;
  can_send_video_notes?: boolean;
  can_send_voice_notes?: boolean;
  can_send_polls?: boolean;
  can_send_other_messages?: boolean;
  can_add_web_page_previews?: boolean;
  until_date?: number;
}

export interface TelegramChatInviteLink {
  invite_link: string;
  creator: TelegramUser;
  creates_join_request?: boolean;
  is_primary?: boolean;
  is_revoked?: boolean;
  name?: string;
  expire_date?: number;
  member_limit?: number;
  pending_join_request_count?: number;
}

export interface TelegramChatJoinRequest {
  chat: TelegramChat;
  from: TelegramUser;
  date: number;
  bio?: string;
  invite_link?: TelegramChatInviteLink;
}

export interface TelegramMessageEntity {
  type: string;
  offset: number;
  length: number;
  url?: string;
  user?: TelegramUser;
  language?: string;
  custom_emoji_id?: string;
}

export interface TelegramLocation {
  longitude: number;
  latitude: number;
  horizontal_accuracy?: number;
  live_period?: number;
  heading?: number;
  proximity_alert_radius?: number;
}

// Additional types for completeness
export interface TelegramPhotoSize { file_id: string; file_unique_id: string; width: number; height: number; file_size?: number; }
export interface TelegramAnimation { file_id: string; file_unique_id: string; width: number; height: number; duration: number; }
export interface TelegramAudio { file_id: string; file_unique_id: string; duration: number; }
export interface TelegramDocument { file_id: string; file_unique_id: string; }
export interface TelegramVideo { file_id: string; file_unique_id: string; width: number; height: number; duration: number; }
export interface TelegramVideoNote { file_id: string; file_unique_id: string; length: number; duration: number; }
export interface TelegramVoice { file_id: string; file_unique_id: string; duration: number; }
export interface TelegramSticker { file_id: string; file_unique_id: string; width: number; height: number; is_animated?: boolean; is_video?: boolean; }
export interface TelegramContact { phone_number: string; first_name: string; last_name?: string; user_id?: number; }
export interface TelegramDice { emoji: string; value: number; }
export interface TelegramGame { title: string; description: string; }
export interface TelegramPoll { id: string; question: string; options: TelegramPollOption[]; total_voter_count: number; }
export interface TelegramPollOption { text: string; voter_count: number; }
export interface TelegramPollAnswer { poll_id: string; user: TelegramUser; option_ids: number[]; }
export interface TelegramVenue { location: TelegramLocation; title: string; address: string; }
export interface TelegramChatPhoto { small_file_id: string; big_file_id: string; }
export interface TelegramChatPermissions { can_send_messages?: boolean; can_send_audios?: boolean; can_send_documents?: boolean; can_send_photos?: boolean; can_send_videos?: boolean; can_send_video_notes?: boolean; can_send_voice_notes?: boolean; can_send_polls?: boolean; can_send_other_messages?: boolean; can_add_web_page_previews?: boolean; can_change_info?: boolean; can_invite_users?: boolean; can_pin_messages?: boolean; can_manage_topics?: boolean; }
export interface TelegramChatLocation { location: TelegramLocation; address: string; }
export interface TelegramMessageAutoDeleteTimerChanged { message_auto_delete_time: number; }
export interface TelegramInvoice { title: string; description: string; start_parameter: string; currency: string; total_amount: number; }
export interface TelegramSuccessfulPayment { currency: string; total_amount: number; invoice_payload: string; }
export interface TelegramWriteAccessAllowed { from_request?: boolean; web_app_name?: string; }
export interface TelegramPassportData { data: TelegramEncryptedPassportElement[]; credentials: TelegramEncryptedCredentials; }
export interface TelegramEncryptedPassportElement { type: string; }
export interface TelegramEncryptedCredentials { data: string; hash: string; secret: string; }
export interface TelegramProximityAlertTriggered { traveler: TelegramUser; watcher: TelegramUser; distance: number; }
export interface TelegramForumTopicCreated { name: string; icon_color: number; icon_custom_emoji_id?: string; }
export interface TelegramForumTopicEdited { name?: string; icon_custom_emoji_id?: string; }
export interface TelegramForumTopicClosed { readonly _type?: 'forum_topic_closed' }
export interface TelegramForumTopicReopened { readonly _type?: 'forum_topic_reopened' }
export interface TelegramGeneralForumTopicHidden { readonly _type?: 'general_forum_topic_hidden' }
export interface TelegramGeneralForumTopicUnhidden { readonly _type?: 'general_forum_topic_unhidden' }
export interface TelegramVideoChatScheduled { start_date: number; }
export interface TelegramVideoChatStarted { readonly _type?: 'video_chat_started' }
export interface TelegramVideoChatEnded { duration: number; }
export interface TelegramVideoChatParticipantsInvited { users: TelegramUser[]; }
export interface TelegramWebAppData { data: string; button_text: string; }
export interface TelegramInlineKeyboardMarkup { inline_keyboard: TelegramInlineKeyboardButton[][]; }
export interface TelegramInlineKeyboardButton { text: string; url?: string; callback_data?: string; }
export interface TelegramShippingQuery { id: string; from: TelegramUser; invoice_payload: string; shipping_address: TelegramShippingAddress; }
export interface TelegramShippingAddress { country_code: string; state: string; city: string; street_line1: string; street_line2: string; post_code: string; }
export interface TelegramPreCheckoutQuery { id: string; from: TelegramUser; currency: string; total_amount: number; invoice_payload: string; }

/**
 * Telegram Bot Handler Class
 */
export class TelegramBotHandler {
  private botToken: string;
  private apiBaseUrl: string;

  constructor(botToken?: string) {
    this.botToken = botToken || process.env.TELEGRAM_BOT_TOKEN || '';
    this.apiBaseUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  /**
   * Verify webhook request signature
   */
  verifyWebhookSignature(body: string, signature: string): boolean {
    if (!this.botToken) {
      logger.warn('Telegram bot token not configured, skipping signature verification');
      return true; // Skip verification if no token configured
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.botToken)
      .update(body)
      .digest('hex');

    return signature === expectedSignature;
  }

  /**
   * Process incoming webhook update
   */
  async processUpdate(update: TelegramUpdate): Promise<{
    success: boolean;
    eventType: string;
    data: Record<string, unknown>;
  }> {
    try {
      // Determine event type
      const eventType = this.determineEventType(update);
      logger.info('Processing Telegram update', { updateId: update.update_id, eventType });

      // Store event in database
      const event = await this.storeEvent(update, eventType);

      // Process based on event type
      switch (eventType) {
        case 'new_chat_member':
          return await this.handleNewChatMember(update, event);
        case 'left_chat_member':
          return await this.handleLeftChatMember(update, event);
        case 'channel_post':
          return await this.handleChannelPost(update, event);
        case 'edited_channel_post':
          return await this.handleEditedChannelPost(update, event);
        case 'callback_query':
          return await this.handleCallbackQuery(update, event);
        case 'my_chat_member':
          return await this.handleChatMemberUpdate(update, event);
        default:
          return await this.handleGenericEvent(update, event, eventType);
      }
    } catch (error) {
      logger.error('Failed to process Telegram update', error as Error, { updateId: update.update_id });
      return {
        success: false,
        eventType: 'error',
        data: { error: (error as Error).message }
      };
    }
  }

  /**
   * Determine the event type from update
   */
  private determineEventType(update: TelegramUpdate): string {
    if (update.message?.new_chat_members?.length) return 'new_chat_member';
    if (update.message?.left_chat_member) return 'left_chat_member';
    if (update.channel_post) return 'channel_post';
    if (update.edited_channel_post) return 'edited_channel_post';
    if (update.callback_query) return 'callback_query';
    if (update.my_chat_member) return 'my_chat_member';
    if (update.chat_member) return 'chat_member';
    if (update.inline_query) return 'inline_query';
    if (update.chosen_inline_result) return 'chosen_inline_result';
    if (update.poll) return 'poll';
    if (update.poll_answer) return 'poll_answer';
    if (update.chat_join_request) return 'chat_join_request';
    return 'unknown';
  }

  /**
   * Store event in database
   */
  private async storeEvent(update: TelegramUpdate, eventType: string) {
    const message = update.message || update.channel_post || update.edited_channel_post ||
                    update.callback_query?.message;
    const chat = message?.chat;
    const user = message?.from || update.callback_query?.from || update.my_chat_member?.from;
    const callbackData = update.callback_query?.data;

    return db.telegramBotEvent.create({
      data: {
        eventType,
        rawData: JSON.stringify(update),
        chatId: chat?.id?.toString(),
        chatTitle: chat?.title,
        userId: user?.id?.toString(),
        username: user?.username,
        messageId: message?.message_id,
        text: message?.text || callbackData,
        processed: false,
      }
    });
  }

  /**
   * Handle new chat member event
   */
  private async handleNewChatMember(update: TelegramUpdate, event: { id: string }) {
    const message = update.message!;
    const newMembers = message.new_chat_members!;
    const chat = message.chat;

    // Check if any new member matches our tracked accounts
    for (const member of newMembers) {
      const account = await db.account.findFirst({
        where: {
          platform: 'telegram',
          username: member.username?.toLowerCase(),
        }
      });

      if (account) {
        // Update account status
        await db.account.update({
          where: { id: account.id },
          data: {
            status: 'active',
            lastUsedAt: new Date(),
          }
        });

        // Create notification
        await this.createNotification(
          account.userId,
          'account_joined',
          'Аккаунт добавлен в канал',
          `Аккаунт @${account.username} добавлен в канал "${chat.title || chat.id}"`,
          'account',
          account.id
        );
      }
    }

    // Mark event as processed
    await db.telegramBotEvent.update({
      where: { id: event.id },
      data: {
        processed: true,
        processedAt: new Date(),
        notificationSent: true,
      }
    });

    return {
      success: true,
      eventType: 'new_chat_member',
      data: {
        chatId: chat.id,
        chatTitle: chat.title,
        newMembersCount: newMembers.length,
        newMembers: newMembers.map(m => ({ id: m.id, username: m.username })),
      }
    };
  }

  /**
   * Handle left chat member event
   */
  private async handleLeftChatMember(update: TelegramUpdate, event: { id: string }) {
    const message = update.message!;
    const leftMember = message.left_chat_member!;
    const chat = message.chat;

    // Check if left member matches our tracked accounts
    const account = await db.account.findFirst({
      where: {
        platform: 'telegram',
        username: leftMember.username?.toLowerCase(),
      }
    });

    if (account) {
      // Update account status
      await db.account.update({
        where: { id: account.id },
        data: {
          status: 'limited',
          updatedAt: new Date(),
        }
      });

      // Create notification
      await this.createNotification(
        account.userId,
        'warning',
        'Аккаунт покинул канал',
        `Аккаунт @${account.username} покинул канал "${chat.title || chat.id}"`,
        'account',
        account.id
      );

      // Mark event with account link
      await db.telegramBotEvent.update({
        where: { id: event.id },
        data: { accountId: account.id }
      });
    }

    // Mark event as processed
    await db.telegramBotEvent.update({
      where: { id: event.id },
      data: {
        processed: true,
        processedAt: new Date(),
        notificationSent: !!account,
      }
    });

    return {
      success: true,
      eventType: 'left_chat_member',
      data: {
        chatId: chat.id,
        chatTitle: chat.title,
        leftMember: { id: leftMember.id, username: leftMember.username },
        accountLinked: !!account,
      }
    };
  }

  /**
   * Handle channel post event
   */
  private async handleChannelPost(update: TelegramUpdate, event: { id: string }) {
    const post = update.channel_post!;
    const chat = post.chat;

    // Store for potential comment targeting
    await db.telegramBotEvent.update({
      where: { id: event.id },
      data: {
        processed: true,
        processedAt: new Date(),
      }
    });

    return {
      success: true,
      eventType: 'channel_post',
      data: {
        chatId: chat.id,
        chatTitle: chat.title,
        messageId: post.message_id,
        text: post.text,
        date: post.date,
      }
    };
  }

  /**
   * Handle edited channel post event
   */
  private async handleEditedChannelPost(update: TelegramUpdate, event: { id: string }) {
    const post = update.edited_channel_post!;
    const chat = post.chat;

    await db.telegramBotEvent.update({
      where: { id: event.id },
      data: {
        processed: true,
        processedAt: new Date(),
      }
    });

    return {
      success: true,
      eventType: 'edited_channel_post',
      data: {
        chatId: chat.id,
        chatTitle: chat.title,
        messageId: post.message_id,
        text: post.text,
        editDate: post.edit_date,
      }
    };
  }

  /**
   * Handle callback query event
   */
  private async handleCallbackQuery(update: TelegramUpdate, event: { id: string }) {
    const callback = update.callback_query!;
    const data = callback.data;

    // Parse callback data (format: action:target:additional)
    const parts = data?.split(':') || [];
    const action = parts[0];
    const target = parts[1];

    let responseText = '';
    let showAlert = false;

    // Handle different callback actions
    switch (action) {
      case 'campaign':
        responseText = await this.handleCampaignCallback(target, parts[2]);
        break;
      case 'account':
        responseText = await this.handleAccountCallback(target, parts[2]);
        showAlert = true;
        break;
      case 'stats':
        responseText = await this.handleStatsCallback(target);
        break;
      default:
        responseText = `Неизвестное действие: ${action}`;
    }

    // Answer callback query
    if (this.botToken && callback.id) {
      await this.answerCallbackQuery(callback.id, responseText, showAlert);
    }

    await db.telegramBotEvent.update({
      where: { id: event.id },
      data: {
        processed: true,
        processedAt: new Date(),
      }
    });

    return {
      success: true,
      eventType: 'callback_query',
      data: {
        callbackId: callback.id,
        from: { id: callback.from.id, username: callback.from.username },
        data: callback.data,
        response: responseText,
      }
    };
  }

  /**
   * Handle chat member update (bot added/removed from chat)
   */
  private async handleChatMemberUpdate(update: TelegramUpdate, event: { id: string }) {
    const memberUpdate = update.my_chat_member!;
    const chat = memberUpdate.chat;
    const oldStatus = memberUpdate.old_chat_member.status;
    const newStatus = memberUpdate.new_chat_member.status;

    // Bot was added to a chat
    if (oldStatus === 'left' && newStatus === 'member') {
      await this.createNotification(
        'system',
        'success',
        'Бот добавлен в чат',
        `Бот добавлен в "${chat.title || chat.id}"`,
        'chat',
        chat.id.toString()
      );
    }

    // Bot was removed from chat
    if (oldStatus === 'member' && newStatus === 'left') {
      await this.createNotification(
        'system',
        'warning',
        'Бот удалён из чата',
        `Бот удалён из "${chat.title || chat.id}"`,
        'chat',
        chat.id.toString()
      );
    }

    await db.telegramBotEvent.update({
      where: { id: event.id },
      data: {
        processed: true,
        processedAt: new Date(),
      }
    });

    return {
      success: true,
      eventType: 'my_chat_member',
      data: {
        chatId: chat.id,
        chatTitle: chat.title,
        oldStatus,
        newStatus,
      }
    };
  }

  /**
   * Handle generic event
   */
  private async handleGenericEvent(
    update: TelegramUpdate,
    event: { id: string },
    eventType: string
  ) {
    await db.telegramBotEvent.update({
      where: { id: event.id },
      data: {
        processed: true,
        processedAt: new Date(),
      }
    });

    return {
      success: true,
      eventType,
      data: { updateId: update.update_id }
    };
  }

  /**
   * Handle campaign callback
   */
  private async handleCampaignCallback(campaignId: string, action: string): Promise<string> {
    if (!campaignId) return 'ID кампании не указан';

    try {
      const campaign = await db.campaign.findUnique({
        where: { id: campaignId }
      });

      if (!campaign) return 'Кампания не найдена';

      switch (action) {
        case 'pause':
          await db.campaign.update({
            where: { id: campaignId },
            data: { status: 'paused' }
          });
          return `Кампания "${campaign.name}" приостановлена`;

        case 'resume':
          await db.campaign.update({
            where: { id: campaignId },
            data: { status: 'active' }
          });
          return `Кампания "${campaign.name}" возобновлена`;

        case 'stats':
          return `📊 ${campaign.name}\nЛиды: ${campaign.leadsCount}\nКонверсии: ${campaign.conversions}\nДоход: ${campaign.revenue} ${campaign.currency}`;

        default:
          return `Статус: ${campaign.status}`;
      }
    } catch (error) {
      return `Ошибка: ${(error as Error).message}`;
    }
  }

  /**
   * Handle account callback
   */
  private async handleAccountCallback(accountId: string, action: string): Promise<string> {
    if (!accountId) return 'ID аккаунта не указан';

    try {
      const account = await db.account.findUnique({
        where: { id: accountId }
      });

      if (!account) return 'Аккаунт не найден';

      switch (action) {
        case 'warm':
          await db.account.update({
            where: { id: accountId },
            data: { status: 'warming', warmingStartedAt: new Date() }
          });
          return `Прогрев аккаунта @${account.username} запущен`;

        case 'status':
          return `@${account.username}\nСтатус: ${account.status}\nРиск бана: ${account.banRisk}%`;

        default:
          return `Статус: ${account.status}`;
      }
    } catch (error) {
      return `Ошибка: ${(error as Error).message}`;
    }
  }

  /**
   * Handle stats callback
   */
  private async handleStatsCallback(target: string): Promise<string> {
    try {
      switch (target) {
        case 'accounts':
          const accounts = await db.account.count();
          const active = await db.account.count({ where: { status: 'active' } });
          const banned = await db.account.count({ where: { status: 'banned' } });
          return `📊 Аккаунты\nВсего: ${accounts}\nАктивных: ${active}\nЗабанено: ${banned}`;

        case 'campaigns':
          const campaigns = await db.campaign.count();
          const activeCampaigns = await db.campaign.count({ where: { status: 'active' } });
          return `📊 Кампании\nВсего: ${campaigns}\nАктивных: ${activeCampaigns}`;

        case 'leads':
          const leads = await db.influencer.aggregate({
            _sum: { leadsCount: true }
          });
          return `📊 Лиды\nВсего: ${leads._sum.leadsCount || 0}`;

        default:
          return 'Выберите тип статистики';
      }
    } catch (error) {
      return `Ошибка: ${(error as Error).message}`;
    }
  }

  /**
   * Create notification
   */
  private async createNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    entityType?: string,
    entityId?: string
  ) {
    try {
      await db.notification.create({
        data: {
          userId,
          type,
          title,
          message,
          entityType,
          entityId,
        }
      });
    } catch (error) {
      logger.error('Failed to create notification', error as Error);
    }
  }

  /**
   * Answer callback query via Telegram API
   */
  private async answerCallbackQuery(
    callbackQueryId: string,
    text: string,
    showAlert: boolean = false
  ): Promise<void> {
    if (!this.botToken) return;

    try {
      await fetch(`${this.apiBaseUrl}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: callbackQueryId,
          text: text.substring(0, 200), // Max 200 chars
          show_alert: showAlert,
        })
      });
    } catch (error) {
      logger.error('Failed to answer callback query', error as Error);
    }
  }

  /**
   * Send message via Telegram API
   */
  async sendMessage(
    chatId: string | number,
    text: string,
    options?: {
      parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
      disable_notification?: boolean;
      reply_markup?: TelegramInlineKeyboardMarkup;
    }
  ): Promise<boolean> {
    if (!this.botToken) {
      logger.warn('Telegram bot token not configured');
      return false;
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: options?.parse_mode,
          disable_notification: options?.disable_notification,
          reply_markup: options?.reply_markup,
        })
      });

      const result = await response.json();
      return result.ok === true;
    } catch (error) {
      logger.error('Failed to send Telegram message', error as Error);
      return false;
    }
  }

  /**
   * Set webhook URL
   */
  async setWebhook(webhookUrl: string): Promise<{ ok: boolean; description?: string }> {
    if (!this.botToken) {
      return { ok: false, description: 'Bot token not configured' };
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl })
      });

      return response.json();
    } catch (error) {
      return { ok: false, description: (error as Error).message };
    }
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(): Promise<{ ok: boolean; description?: string }> {
    if (!this.botToken) {
      return { ok: false, description: 'Bot token not configured' };
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/deleteWebhook`, {
        method: 'POST'
      });

      return response.json();
    } catch (error) {
      return { ok: false, description: (error as Error).message };
    }
  }

  /**
   * Get webhook info
   */
  async getWebhookInfo(): Promise<{
    ok: boolean;
    result?: {
      url: string;
      has_custom_certificate: boolean;
      pending_update_count: number;
      last_error_date?: number;
      last_error_message?: string;
    };
  }> {
    if (!this.botToken) {
      return { ok: false };
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/getWebhookInfo`);
      return response.json();
    } catch (error) {
      return { ok: false };
    }
  }
}

// Export singleton instance
export const telegramBot = new TelegramBotHandler();

// Export supported event types
export const TELEGRAM_EVENT_TYPES = [
  { value: 'new_chat_member', label: 'Новый участник' },
  { value: 'left_chat_member', label: 'Участник покинул чат' },
  { value: 'channel_post', label: 'Пост в канале' },
  { value: 'edited_channel_post', label: 'Изменённый пост' },
  { value: 'callback_query', label: 'Callback запрос' },
  { value: 'my_chat_member', label: 'Изменение статуса бота' },
  { value: 'chat_member', label: 'Изменение статуса участника' },
  { value: 'inline_query', label: 'Inline запрос' },
  { value: 'chat_join_request', label: 'Запрос на вступление' },
] as const;
