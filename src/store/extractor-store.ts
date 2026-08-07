import { create } from "zustand";
import type {
  AppView,
  Project,
  Reference,
  ExtractedComponent,
  DesignToken,
  ProjectStatus,
  PipelineStep,
  PIPELINE_STEPS,
} from "@/types/extractor";
import { toast } from "sonner";

interface ExtractorState {
  // Navigation
  currentView: AppView;
  selectedProjectId: string | null;
  sidebarOpen: boolean;

  // Data
  projects: Project[];
  currentProject: Project | null;
  references: Reference[];

  // Pipeline
  pipelineSteps: PipelineStep[];
  isProcessing: boolean;

  // Actions - Navigation
  setView: (view: AppView) => void;
  selectProject: (id: string) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // Actions - Data
  setProjects: (projects: Project[]) => void;
  setCurrentProject: (project: Project | null) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  setReferences: (refs: Reference[]) => void;
  addReference: (ref: Reference) => void;
  removeReference: (id: string) => void;
  removeProject: (id: string) => void;

  // Actions - Pipeline
  setPipelineSteps: (steps: PipelineStep[]) => void;
  updatePipelineStep: (stepId: string, status: PipelineStep["status"]) => void;
  setProcessing: (processing: boolean) => void;
}

export const useExtractorStore = create<ExtractorState>((set, get) => ({
  // Navigation
  currentView: "dashboard",
  selectedProjectId: null,
  sidebarOpen: true,

  // Data
  projects: [],
  currentProject: null,
  references: [],

  // Pipeline
  pipelineSteps: [
    {
      id: "extract",
      label: "Extract",
      description: "Fetch and parse page HTML",
      status: "pending",
    },
    {
      id: "analyze",
      label: "Analyze",
      description: "Identify components and design tokens",
      status: "pending",
    },
    {
      id: "spec",
      label: "Spec",
      description: "Generate component specifications",
      status: "pending",
    },
    {
      id: "generate",
      label: "Generate",
      description: "Produce reusable HTML component",
      status: "pending",
    },
  ],
  isProcessing: false,

  // Actions - Navigation
  setView: (view) =>
    set({
      currentView: view,
      selectedProjectId: view === "project" ? get().selectedProjectId : null,
    }),
  selectProject: (id) => set({ selectedProjectId: id, currentView: "project" }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // Actions - Data
  setProjects: (projects) => set({ projects }),
  setCurrentProject: (project) => set({ currentProject: project }),
  addProject: (project) =>
    set((s) => {
      const idx = s.projects.findIndex((p) => p.id === project.id);
      return {
        projects:
          idx >= 0
            ? s.projects.map((p) => (p.id === project.id ? { ...p, ...project } : p))
            : [project, ...s.projects],
      };
    }),
  updateProject: (id, updates) =>
    set((s) => ({
      projects: s.projects.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      currentProject:
        s.currentProject?.id === id ? { ...s.currentProject, ...updates } : s.currentProject,
    })),
  setReferences: (refs) => set({ references: refs }),
  addReference: (ref) => set((s) => ({ references: [ref, ...s.references] })),
  removeReference: (id) => set((s) => ({ references: s.references.filter((r) => r.id !== id) })),
  removeProject: (id) =>
    set((s) => ({
      projects: s.projects.filter((p) => p.id !== id),
      currentProject: s.currentProject?.id === id ? null : s.currentProject,
      selectedProjectId: s.selectedProjectId === id ? null : s.selectedProjectId,
      currentView: s.currentProject?.id === id ? ("dashboard" as AppView) : s.currentView,
    })),

  // Actions - Pipeline
  setPipelineSteps: (steps) => set({ pipelineSteps: steps }),
  updatePipelineStep: (stepId, status) =>
    set((s) => ({
      pipelineSteps: s.pipelineSteps.map((step) =>
        step.id === stepId ? { ...step, status } : step,
      ),
    })),
  setProcessing: (processing) => set({ isProcessing: processing }),
}));
