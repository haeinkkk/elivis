const STORAGE_KEY = "elivis-projects";

export type ProjectUser = {
  id: string;
  name: string;
  userId: string;
};

export type ProjectTeam = {
  id: string;
  name: string;
  teamId: string;
};

export type ProjectType = "personal" | "team";

export type Project = {
  id: string;
  name: string;
  description: string;
  projectUrl: string;
  startDate: string;
  endDate: string;
  noEndDate: boolean;
  projectType: ProjectType;
  isPublic: boolean;
  participants: ProjectUser[];
  teams: ProjectTeam[];
  createdAt: number;
};

function normalizeProject(p: Partial<Project> & { id: string; name: string; createdAt: number }): Project {
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? "",
    projectUrl: p.projectUrl ?? "",
    startDate: p.startDate ?? "",
    endDate: p.endDate ?? "",
    noEndDate: p.noEndDate ?? false,
    projectType: p.projectType === "team" ? "team" : "personal",
    isPublic: p.isPublic !== false,
    participants: Array.isArray(p.participants) ? p.participants : [],
    teams: Array.isArray(p.teams) ? p.teams : [],
    createdAt: p.createdAt,
  };
}

export function getProjects(): Project[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as (Partial<Project> & { id: string; name: string; createdAt: number })[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeProject).sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export function getProject(projectId: string): Project | null {
  const list = getProjects();
  return list.find((p) => p.id === projectId) ?? null;
}

export function addProject(project: Omit<Project, "id" | "createdAt">): Project {
  const list = getProjects();
  const newProject: Project = {
    ...project,
    id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: Date.now(),
  };
  list.unshift(newProject);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
  return newProject;
}
