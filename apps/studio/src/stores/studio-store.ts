import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export interface CanvasComponent {
  id: string;
  type: string;
  props: Record<string, unknown>;
  children?: CanvasComponent[];
  styles?: Record<string, string>;
}

interface HistoryEntry {
  components: CanvasComponent[];
  timestamp: Date;
}

interface StudioState {
  // Project
  projectId: string | null;
  projectName: string;
  isDirty: boolean;
  lastSaved: Date | null;

  // Canvas
  components: CanvasComponent[];
  selectedComponentId: string | null;
  device: 'desktop' | 'tablet' | 'mobile';
  zoom: number;

  // History
  history: HistoryEntry[];
  historyIndex: number;

  // Sidebar
  activeSidebarTab: 'chat' | 'library' | 'adopt' | 'zara';

  // Chat
  chatMessages: ChatMessage[];
  isAgentTyping: boolean;

  // Modals
  showPublishWizard: boolean;
  showMySites: boolean;
  showLibrary: boolean;
  showSettings: boolean;

  // Actions
  setProjectId: (id: string | null) => void;
  setProjectName: (name: string) => void;
  setDevice: (device: 'desktop' | 'tablet' | 'mobile') => void;
  setZoom: (zoom: number) => void;
  setActiveSidebarTab: (tab: 'chat' | 'library' | 'adopt' | 'zara') => void;
  setSelectedComponent: (id: string | null) => void;
  
  addComponent: (component: CanvasComponent, parentId?: string) => void;
  updateComponent: (id: string, updates: Partial<CanvasComponent>) => void;
  deleteComponent: (id: string) => void;
  moveComponent: (id: string, newParentId: string | null, index: number) => void;
  
  undo: () => void;
  redo: () => void;
  saveHistory: () => void;

  addChatMessage: (message: ChatMessage) => void;
  setAgentTyping: (typing: boolean) => void;

  setShowPublishWizard: (show: boolean) => void;
  setShowMySites: (show: boolean) => void;
  setShowLibrary: (show: boolean) => void;
  setShowSettings: (show: boolean) => void;

  markDirty: () => void;
  markSaved: () => void;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  agentName?: string;
}

export const useStudioStore = create<StudioState>()(
  immer((set, get) => ({
    // Initial state
    projectId: null,
    projectName: 'Untitled Project',
    isDirty: false,
    lastSaved: null,
    components: [],
    selectedComponentId: null,
    device: 'desktop',
    zoom: 100,
    history: [],
    historyIndex: -1,
    activeSidebarTab: 'chat',
    chatMessages: [
      {
        id: '1',
        role: 'assistant',
        content: 'Hi! I\'m your AI assistant. Tell me what you want to build, and I\'ll help you create it. You can say things like "Add a hero section" or "Change the background color to blue".',
        timestamp: new Date(),
        agentName: 'Zara',
      },
    ],
    isAgentTyping: false,
    showPublishWizard: false,
    showMySites: false,
    showLibrary: false,
    showSettings: false,

    // Actions
    setProjectId: (id) => set({ projectId: id }),
    setProjectName: (name) => set({ projectName: name, isDirty: true }),
    setDevice: (device) => set({ device }),
    setZoom: (zoom) => set({ zoom: Math.max(25, Math.min(200, zoom)) }),
    setActiveSidebarTab: (tab) => set({ activeSidebarTab: tab }),
    setSelectedComponent: (id) => set({ selectedComponentId: id }),

    addComponent: (component, parentId) =>
      set((state) => {
        if (parentId) {
          const addToParent = (components: CanvasComponent[]): boolean => {
            for (const comp of components) {
              if (comp.id === parentId) {
                comp.children = comp.children || [];
                comp.children.push(component);
                return true;
              }
              if (comp.children && addToParent(comp.children)) {
                return true;
              }
            }
            return false;
          };
          addToParent(state.components);
        } else {
          state.components.push(component);
        }
        state.isDirty = true;
      }),

    updateComponent: (id, updates) =>
      set((state) => {
        const update = (components: CanvasComponent[]): boolean => {
          for (let i = 0; i < components.length; i++) {
            if (components[i]!.id === id) {
              components[i] = { ...components[i]!, ...updates };
              return true;
            }
            if (components[i]!.children && update(components[i]!.children!)) {
              return true;
            }
          }
          return false;
        };
        update(state.components);
        state.isDirty = true;
      }),

    deleteComponent: (id) =>
      set((state) => {
        const remove = (components: CanvasComponent[]): boolean => {
          const index = components.findIndex((c) => c.id === id);
          if (index !== -1) {
            components.splice(index, 1);
            return true;
          }
          for (const comp of components) {
            if (comp.children && remove(comp.children)) {
              return true;
            }
          }
          return false;
        };
        remove(state.components);
        if (state.selectedComponentId === id) {
          state.selectedComponentId = null;
        }
        state.isDirty = true;
      }),

    moveComponent: (id, newParentId, index) =>
      set((state) => {
        let component: CanvasComponent | null = null;
        
        // Find and remove component
        const findAndRemove = (components: CanvasComponent[]): boolean => {
          const idx = components.findIndex((c) => c.id === id);
          if (idx !== -1) {
            component = components.splice(idx, 1)[0]!;
            return true;
          }
          for (const comp of components) {
            if (comp.children && findAndRemove(comp.children)) {
              return true;
            }
          }
          return false;
        };
        findAndRemove(state.components);

        if (!component) return;

        // Add to new location
        if (newParentId) {
          const addToParent = (components: CanvasComponent[]): boolean => {
            for (const comp of components) {
              if (comp.id === newParentId) {
                comp.children = comp.children || [];
                comp.children.splice(index, 0, component!);
                return true;
              }
              if (comp.children && addToParent(comp.children)) {
                return true;
              }
            }
            return false;
          };
          addToParent(state.components);
        } else {
          state.components.splice(index, 0, component);
        }
        state.isDirty = true;
      }),

    undo: () =>
      set((state) => {
        if (state.historyIndex > 0) {
          state.historyIndex--;
          state.components = JSON.parse(
            JSON.stringify(state.history[state.historyIndex]!.components)
          );
        }
      }),

    redo: () =>
      set((state) => {
        if (state.historyIndex < state.history.length - 1) {
          state.historyIndex++;
          state.components = JSON.parse(
            JSON.stringify(state.history[state.historyIndex]!.components)
          );
        }
      }),

    saveHistory: () =>
      set((state) => {
        // Remove any future history if we're not at the end
        if (state.historyIndex < state.history.length - 1) {
          state.history = state.history.slice(0, state.historyIndex + 1);
        }
        // Add current state to history
        state.history.push({
          components: JSON.parse(JSON.stringify(state.components)),
          timestamp: new Date(),
        });
        state.historyIndex = state.history.length - 1;
        // Limit history size
        if (state.history.length > 50) {
          state.history = state.history.slice(-50);
          state.historyIndex = state.history.length - 1;
        }
      }),

    addChatMessage: (message) =>
      set((state) => {
        state.chatMessages.push(message);
      }),

    setAgentTyping: (typing) => set({ isAgentTyping: typing }),

    setShowPublishWizard: (show) => set({ showPublishWizard: show }),
    setShowMySites: (show) => set({ showMySites: show }),
    setShowLibrary: (show) => set({ showLibrary: show }),
    setShowSettings: (show) => set({ showSettings: show }),

    markDirty: () => set({ isDirty: true }),
    markSaved: () => set({ isDirty: false, lastSaved: new Date() }),
  }))
);
