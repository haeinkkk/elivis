import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: { db: { url: "postgresql://elivis:elivis@localhost:5432/elivis" } },
});

const projectId = "prj-yJNe2KOF";

async function main() {
  // 1. ProjectMember 직접 등록 멤버
  const members = await prisma.projectMember.findMany({
    where: { projectId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { joinedAt: "asc" },
  });

  console.log("\n=== ProjectMember (직접 등록) ===");
  if (members.length === 0) {
    console.log("  없음");
  } else {
    for (const m of members) {
      console.log(`  [${m.role}] ${m.user.name ?? "(이름없음)"} <${m.user.email}>  id=${m.user.id}  joined=${m.joinedAt.toISOString()}`);
    }
  }

  // 2. 연결된 팀 정보
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      team: { include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } } },
      projectTeams: {
        include: {
          team: { include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } } },
        },
      },
    },
  });

  if (!project) {
    console.log("\n프로젝트를 찾을 수 없습니다:", projectId);
    return;
  }

  console.log(`\n=== 프로젝트 정보 ===`);
  console.log(`  name:     ${project.name}`);
  console.log(`  isPublic: ${project.isPublic}`);
  console.log(`  teamId:   ${project.teamId ?? "없음 (개인)"}`);

  const allTeams = [
    ...(project.team ? [{ ...project.team, _source: "teamId" }] : []),
    ...project.projectTeams.map((pt) => ({ ...pt.team, _source: "projectTeams" })),
  ];

  if (allTeams.length === 0) {
    console.log("\n연결된 팀: 없음 → 개인 프로젝트");
  } else {
    for (const team of allTeams) {
      console.log(`\n=== 팀: ${team.name} (${team._source}) ===`);
      for (const tm of team.members) {
        console.log(`  [${tm.role}] ${tm.user.name ?? "(이름없음)"} <${tm.user.email}>  id=${tm.user.id}`);
      }
    }
  }

  // 3. Workspace 목록 (워크스페이스가 생성된 사용자)
  const workspaces = await prisma.workspace.findMany({
    where: { projectId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });

  console.log(`\n=== Workspace 보유 사용자 (${workspaces.length}명) ===`);
  if (workspaces.length === 0) {
    console.log("  없음");
  } else {
    for (const ws of workspaces) {
      console.log(`  ws=${ws.id}  ${ws.user.name ?? "(이름없음)"} <${ws.user.email}>`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
