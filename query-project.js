const { PrismaClient } = require("./packages/database/node_modules/@prisma/client");
const prisma = new PrismaClient({
  datasources: { db: { url: "postgresql://elivis:elivis@localhost:5432/elivis" } },
});
const projectId = "prj-yJNe2KOF";

async function main() {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      team: { select: { id: true, name: true } },
      projectTeams: { include: { team: { select: { id: true, name: true } } } },
    },
  });

  if (!project) {
    console.log("프로젝트 없음:", projectId);
    return;
  }

  console.log("\n=== 프로젝트 정보 ===");
  console.log("  name    :", project.name);
  console.log("  isPublic:", project.isPublic);
  console.log("  teamId  :", project.teamId || "없음 (개인)");
  console.log("  주 팀   :", project.team ? project.team.name : "없음");
  console.log("  추가 팀 :", project.projectTeams.map((pt) => pt.team.name).join(", ") || "없음");

  const members = await prisma.projectMember.findMany({
    where: { projectId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { joinedAt: "asc" },
  });

  console.log("\n=== ProjectMember (" + members.length + "명) ===");
  for (const m of members) {
    console.log("  [" + m.role + "] " + (m.user.name || "(이름없음)") + " <" + m.user.email + ">  id=" + m.user.id);
  }

  const workspaces = await prisma.workspace.findMany({
    where: { projectId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });

  console.log("\n=== Workspace 보유자 (" + workspaces.length + "명) ===");
  for (const ws of workspaces) {
    const isMember = members.some((m) => m.user.id === ws.user.id);
    console.log("  ws=" + ws.id + "  " + (ws.user.name || "(이름없음)") + " <" + ws.user.email + ">  ProjectMember=" + isMember);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
