/**
 * 과거에 팀원만 추가되어 워크스페이스가 없는 경우를 보정합니다.
 * 모든 TeamMember (또는 --team <id> 로 한 팀만)에 대해 ensureWorkspacesForNewTeamMember 를 실행합니다.
 *
 * 실행 (저장소 루트 또는 api-server 디렉터리에서):
 *   pnpm --filter @repo/api-server run backfill:team-member-workspaces
 *   pnpm --filter @repo/api-server run backfill:team-member-workspaces -- --team abc12345
 */
import "dotenv/config";

import { prisma } from "@repo/database";

import { ensureWorkspacesForNewTeamMember } from "../utils/ensure-workspaces-for-team-member";

function parseArgs(): { teamId: string | null } {
    const args = process.argv.slice(2);
    let teamId: string | null = null;
    for (let i = 0; i < args.length; i++) {
        if (args[i] === "--team" && args[i + 1]) {
            teamId = args[i + 1]!.trim() || null;
            i++;
        }
    }
    return { teamId };
}

async function main() {
    const { teamId: teamIdFilter } = parseArgs();

    const members = await prisma.teamMember.findMany({
        where: teamIdFilter ? { teamId: teamIdFilter } : undefined,
        select: { teamId: true, userId: true },
    });

    if (members.length === 0) {
        console.log(
            teamIdFilter
                ? `팀 ${teamIdFilter} 에 해당하는 팀원이 없습니다.`
                : "처리할 팀원이 없습니다.",
        );
        return;
    }

    console.log(
        teamIdFilter
            ? `팀 ${teamIdFilter} 팀원 ${members.length}명 백필 시작…`
            : `전체 팀원 ${members.length}명 백필 시작…`,
    );

    let i = 0;
    for (const { teamId, userId } of members) {
        await ensureWorkspacesForNewTeamMember(prisma, teamId, userId);
        i++;
        if (i % 100 === 0 || i === members.length) {
            console.log(`  진행: ${i}/${members.length}`);
        }
    }

    console.log("백필 완료.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
