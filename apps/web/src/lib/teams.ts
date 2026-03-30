const STORAGE_KEY = "elivis-teams";

export type TeamMember = {
  id: string;
  name: string;
  userId: string;
};

export type Team = {
  id: string;
  name: string;
  teamId: string;
  description: string;
  members: TeamMember[];
  createdAt: number;
};

function normalizeTeam(
  t: Partial<Team> & { id: string; name: string; createdAt: number }
): Team {
  return {
    id: t.id,
    name: t.name,
    teamId: t.teamId ?? t.id,
    description: t.description ?? "",
    members: Array.isArray(t.members) ? t.members : [],
    createdAt: t.createdAt,
  };
}

export function getTeams(): Team[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as (Partial<Team> & {
      id: string;
      name: string;
      createdAt: number;
    })[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeTeam)
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export function addTeam(
  team: Omit<Team, "id" | "createdAt">
): Team {
  const list = getTeams();
  const newTeam: Team = {
    ...team,
    id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: Date.now(),
  };
  list.unshift(newTeam);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
  return newTeam;
}
