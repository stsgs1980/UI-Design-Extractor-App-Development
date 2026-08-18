import { create } from 'zustand';
import type { AppView, Project, Reference, PipelineStep } from '@/types/extractor';
import { PIPELINE_STEPS } from '@/types/extractor';

interface ExtractorState {
  currentView: AppView;
  selectedProjectId: string | null;
  sidebarOpen: boolean;
  projects: Project[];
  currentProject: Project | null;
  references: Reference[];
  pipelineSteps: PipelineStep[];
  isProcessing: boolean;

  setView: (view: AppView) => void;
  selectProject: (id: string) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setProjects: (projects: Project[]) => void;
  setCurrentProject: (project: Project | null) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  setReferences: (refs: Reference[]) => void;
  addReference: (ref: Reference) => void;
  removeReference: (id: string) => void;
  setPipelineSteps: (steps: PipelineStep[]) => void;
  updatePipelineStep: (stepId: string, status: PipelineStep['status']) => void;
  setProcessing: (processing: boolean) => void;
}

const INITIAL_STEPS = PIPELINE_STEPS.map((s) => ({ ...s, status: 'pending' as const }));

export const useExtractorStore = create<ExtractorState>((set, get) => ({
  currentView: 'dashboard',
  selectedProjectId: null,
  sidebarOpen: true,
  projects: [],
  currentProject: null,
  references: [],
  pipelineSteps: INITIAL_STEPS,
  isProcessing: false,

  setView: (view) => set({ currentView: view, selectedProjectId: view === 'project' ? get().selectedProjectId : null }),
  selectProject: (id) => set({ selectedProjectId: id, currentView: 'project' }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  setProjects: (projects) => set({ projects }),
  setCurrentProject: (project) => set({ currentProject: project }),
  addProject: (project) => set((s) => ({ projects: [project, ...s.projects] })),
  updateProject: (id, updates) =>
    set((s) => {
      const projects = s.projects.map((p) => (p.id === id ? { ...p, ...updates } : p));
      const currentProject =
        s.currentProject?.id === id
          ? { ...s.currentProject, ...updates }
          : s.currentProject;
      return { projects, currentProject };
    }),
  setReferences: (refs) => set({ references: refs }),
  addReference: (ref) => set((s) => ({ references: [ref, ...s.references] })),
  removeReference: (id) => set((s) => ({ references: s.references.filter((r) => r.id !== id) })),

  setPipelineSteps: (steps) => set({ pipelineSteps: steps }),
  updatePipelineStep: (stepId, status) =>
    set((s) => ({
      pipelineSteps: s.pipelineSteps.map((step) => (step.id === stepId ? { ...step, status } : step)),
    })),
  setProcessing: (processing) => set({ isProcessing: processing }),
}));
