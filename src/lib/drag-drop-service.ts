// Drag and Drop System - Система перетаскивания
// Для постов, изображений, кампаний, видео

import { EventEmitter } from 'events';

// ==================== ТИПЫ ====================

export type DraggableType = 
  | 'post'
  | 'image'
  | 'video'
  | 'campaign'
  | 'account'
  | 'template'
  | 'influencer';

export type DropTargetType =
  | 'calendar'
  | 'account-avatar'
  | 'platform-telegram'
  | 'platform-instagram'
  | 'platform-tiktok'
  | 'folder'
  | 'campaign'
  | 'schedule'
  | 'trash';

export interface DraggableItem {
  id: string;
  type: DraggableType;
  data: Record<string, any>;
  metadata: {
    title?: string;
    thumbnail?: string;
    status?: string;
    platform?: string;
  };
}

export interface DropTarget {
  id: string;
  type: DropTargetType;
  accepts: DraggableType[];
  data: Record<string, any>;
}

export interface DragOperation {
  id: string;
  item: DraggableItem;
  source: DropTarget;
  target: DropTarget;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  timestamp: number;
}

export interface DragDropConfig {
  enableAnimations: boolean;
  animationDuration: number; // ms
  enablePreview: boolean;
  enableUndo: boolean;
  maxUndoSteps: number;
  enableSounds: boolean;
}

// ==================== КОНФИГУРАЦИЯ ====================

const DEFAULT_CONFIG: DragDropConfig = {
  enableAnimations: true,
  animationDuration: 300,
  enablePreview: true,
  enableUndo: true,
  maxUndoSteps: 50,
  enableSounds: false,
};

// ==================== DRAG AND DROP SERVICE ====================

class DragDropService extends EventEmitter {
  private config: DragDropConfig;
  private activeDrag: DraggableItem | null = null;
  private dropTargets: Map<string, DropTarget> = new Map();
  private operations: DragOperation[] = [];
  private undoStack: DragOperation[] = [];
  private handlers: Map<string, (operation: DragOperation) => Promise<any>> = new Map();

  constructor(config: Partial<DragDropConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.registerDefaultHandlers();
  }

  // Регистрация стандартных обработчиков
  private registerDefaultHandlers(): void {
    // Пост -> Календарь (планирование)
    this.registerHandler('post:calendar', async (operation) => {
      const { item, target } = operation;
      const scheduledDate = target.data.date;
      
      console.log(`[DragDrop] Scheduling post ${item.id} for ${scheduledDate}`);
      
      return {
        success: true,
        action: 'schedule',
        postId: item.id,
        scheduledDate,
      };
    });

    // Изображение -> Аватарка аккаунта
    this.registerHandler('image:account-avatar', async (operation) => {
      const { item, target } = operation;
      
      console.log(`[DragDrop] Setting avatar for account ${target.id}`);
      
      return {
        success: true,
        action: 'set_avatar',
        accountId: target.id,
        imageId: item.id,
      };
    });

    // Видео -> Платформа
    this.registerHandler('video:platform', async (operation) => {
      const { item, target } = operation;
      const platform = target.type.replace('platform-', '');
      
      console.log(`[DragDrop] Publishing video ${item.id} to ${platform}`);
      
      return {
        success: true,
        action: 'publish',
        videoId: item.id,
        platform,
      };
    });

    // Пост -> Платформа
    this.registerHandler('post:platform', async (operation) => {
      const { item, target } = operation;
      const platform = target.type.replace('platform-', '');
      
      console.log(`[DragDrop] Publishing post ${item.id} to ${platform}`);
      
      return {
        success: true,
        action: 'publish',
        postId: item.id,
        platform,
      };
    });

    // Кампания -> Папка
    this.registerHandler('campaign:folder', async (operation) => {
      const { item, target } = operation;
      
      console.log(`[DragDrop] Moving campaign ${item.id} to folder ${target.id}`);
      
      return {
        success: true,
        action: 'move',
        campaignId: item.id,
        folderId: target.id,
      };
    });

    // Любой элемент -> Корзина
    this.registerHandler('*:trash', async (operation) => {
      const { item } = operation;
      
      console.log(`[DragDrop] Deleting ${item.type} ${item.id}`);
      
      return {
        success: true,
        action: 'delete',
        type: item.type,
        id: item.id,
      };
    });

    // Аккаунт -> Кампания
    this.registerHandler('account:campaign', async (operation) => {
      const { item, target } = operation;
      
      console.log(`[DragDrop] Adding account ${item.id} to campaign ${target.id}`);
      
      return {
        success: true,
        action: 'add_to_campaign',
        accountId: item.id,
        campaignId: target.id,
      };
    });

    // Инфлюенсер -> Папка
    this.registerHandler('influencer:folder', async (operation) => {
      const { item, target } = operation;
      
      console.log(`[DragDrop] Moving influencer ${item.id} to folder ${target.id}`);
      
      return {
        success: true,
        action: 'move',
        influencerId: item.id,
        folderId: target.id,
      };
    });
  }

  // Регистрация кастомного обработчика
  registerHandler(
    pattern: string, // формат "itemType:targetType" или "*:targetType"
    handler: (operation: DragOperation) => Promise<any>
  ): void {
    this.handlers.set(pattern, handler);
  }

  // Начало перетаскивания
  startDrag(item: DraggableItem): void {
    this.activeDrag = item;
    this.emit('drag:started', { item });
    console.log(`[DragDrop] Started dragging: ${item.type} (${item.id})`);
  }

  // Окончание перетаскивания (отмена)
  endDrag(): void {
    if (this.activeDrag) {
      this.emit('drag:ended', { item: this.activeDrag, dropped: false });
      this.activeDrag = null;
    }
  }

  // Регистрация цели для сброса
  registerDropTarget(target: DropTarget): void {
    this.dropTargets.set(target.id, target);
  }

  // Удаление цели для сброса
  unregisterDropTarget(targetId: string): void {
    this.dropTargets.delete(targetId);
  }

  // Проверка возможности сброса
  canDrop(item: DraggableItem, target: DropTarget): boolean {
    return target.accepts.includes(item.type) || target.accepts.includes('*' as DraggableType);
  }

  // Получение допустимых целей
  getValidTargets(item: DraggableItem): DropTarget[] {
    return Array.from(this.dropTargets.values()).filter(target => 
      this.canDrop(item, target)
    );
  }

  // Выполнение сброса
  async drop(targetId: string): Promise<DragOperation | null> {
    if (!this.activeDrag) {
      console.warn('[DragDrop] No active drag operation');
      return null;
    }

    const target = this.dropTargets.get(targetId);
    if (!target) {
      console.warn(`[DragDrop] Drop target not found: ${targetId}`);
      this.endDrag();
      return null;
    }

    if (!this.canDrop(this.activeDrag, target)) {
      console.warn(`[DragDrop] Invalid drop: ${this.activeDrag.type} -> ${target.type}`);
      this.emit('drop:invalid', { item: this.activeDrag, target });
      this.endDrag();
      return null;
    }

    const operation: DragOperation = {
      id: `op-${Date.now()}`,
      item: this.activeDrag,
      source: { id: 'source', type: 'folder', accepts: [], data: {} }, // TODO: track source
      target,
      status: 'processing',
      timestamp: Date.now(),
    };

    this.operations.push(operation);
    this.emit('drop:started', { operation });

    try {
      // Ищем подходящий обработчик
      const handlerKey = `${this.activeDrag.type}:${target.type}`;
      const wildcardKey = `*:${target.type}`;
      
      const handler = this.handlers.get(handlerKey) || this.handlers.get(wildcardKey);
      
      if (!handler) {
        throw new Error(`No handler for ${handlerKey}`);
      }

      const result = await handler(operation);
      
      operation.status = 'completed';
      operation.result = result;
      
      // Добавляем в стек отмены
      if (this.config.enableUndo) {
        this.undoStack.push(operation);
        if (this.undoStack.length > this.config.maxUndoSteps) {
          this.undoStack.shift();
        }
      }
      
      this.emit('drop:completed', { operation, result });
      console.log(`[DragDrop] Drop completed: ${this.activeDrag.type} -> ${target.type}`);
    } catch (error) {
      operation.status = 'failed';
      operation.error = error instanceof Error ? error.message : String(error);
      
      this.emit('drop:failed', { operation, error });
      console.error(`[DragDrop] Drop failed:`, operation.error);
    }

    this.activeDrag = null;
    return operation;
  }

  // Отмена последней операции
  async undo(): Promise<DragOperation | null> {
    if (!this.config.enableUndo || this.undoStack.length === 0) {
      return null;
    }

    const operation = this.undoStack.pop()!;
    
    console.log(`[DragDrop] Undoing operation: ${operation.id}`);
    this.emit('undo:started', { operation });

    try {
      // Выполняем обратную операцию
      if (operation.result?.action === 'delete') {
        // Восстановление удалённого элемента
        this.emit('undo:restored', { operation });
      } else if (operation.result?.action === 'move') {
        // Возврат на прежнее место
        this.emit('undo:moved', { operation });
      } else {
        // Общая отмена
        this.emit('undo:generic', { operation });
      }

      this.emit('undo:completed', { operation });
      return operation;
    } catch (error) {
      this.emit('undo:failed', { operation, error });
      return null;
    }
  }

  // Получение активного перетаскивания
  getActiveDrag(): DraggableItem | null {
    return this.activeDrag;
  }

  // Получение истории операций
  getOperations(limit: number = 100): DragOperation[] {
    return this.operations.slice(-limit);
  }

  // Получение статистики
  getStats(): {
    totalOperations: number;
    completedOperations: number;
    failedOperations: number;
    undoStackSize: number;
  } {
    return {
      totalOperations: this.operations.length,
      completedOperations: this.operations.filter(o => o.status === 'completed').length,
      failedOperations: this.operations.filter(o => o.status === 'failed').length,
      undoStackSize: this.undoStack.length,
    };
  }

  // Очистка истории
  clearHistory(): void {
    this.operations = [];
    this.undoStack = [];
    this.emit('history:cleared');
  }
}

// ==================== SINGLETON ====================

let dragDropInstance: DragDropService | null = null;

export function getDragDropService(config?: Partial<DragDropConfig>): DragDropService {
  if (!dragDropInstance) {
    dragDropInstance = new DragDropService(config);
  }
  return dragDropInstance;
}

export const dragDropService = {
  startDrag: (item: DraggableItem) => getDragDropService().startDrag(item),
  endDrag: () => getDragDropService().endDrag(),
  drop: (targetId: string) => getDragDropService().drop(targetId),
  canDrop: (item: DraggableItem, target: DropTarget) => getDragDropService().canDrop(item, target),
  getValidTargets: (item: DraggableItem) => getDragDropService().getValidTargets(item),
  registerDropTarget: (target: DropTarget) => getDragDropService().registerDropTarget(target),
  unregisterDropTarget: (id: string) => getDragDropService().unregisterDropTarget(id),
  undo: () => getDragDropService().undo(),
  getStats: () => getDragDropService().getStats(),
};
