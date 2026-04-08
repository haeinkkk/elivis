/** 팀 가입 신청 알림(팀장 수신) — `t()` 점 경로 조회 없이 번들에 문자열이 포함되도록 분리 */

type NotifyLocale = "ko" | "en" | "ja";

const COPY: Record<NotifyLocale, { titleSuffix: string; messageSuffix: string }> = {
    ko: {
        titleSuffix: "새 팀 가입 신청",
        messageSuffix:
            "님이 팀 가입을 신청했습니다. 팀원 탭에서 «가입 신청 목록»을 눌러 수락하거나 거절할 수 있습니다.",
    },
    en: {
        titleSuffix: "New join request",
        messageSuffix:
            " requested to join. Open Members → Join requests to accept or decline in the modal.",
    },
    ja: {
        titleSuffix: "新しい参加申請",
        messageSuffix:
            "さんがチーム参加を申請しました。メンバータブの「参加申請一覧」からモーダルで承認または却下できます。",
    },
};

function notifyLocale(lang: string): NotifyLocale {
    if (lang === "ja") return "ja";
    if (lang === "en") return "en";
    return "ko";
}

/** 신청자 언어(`request.lang`) 기준으로 팀장 알림 제목·본문 */
export function teamJoinRequestLeaderNotification(
    lang: string,
    teamName: string,
    applicantName: string,
): { title: string; message: string } {
    const c = COPY[notifyLocale(lang)];
    return {
        title: `[${teamName}] ${c.titleSuffix}`,
        message: `${applicantName}${c.messageSuffix}`,
    };
}

/** 신청자에게 보내는 수락·거절 알림 (`lang`은 요청 처리 시 API의 request.lang) */
const APPLICANT_RESULT: Record<
    NotifyLocale,
    { accept: { title: string; message: string }; reject: { title: string; message: string } }
> = {
    ko: {
        accept: {
            title: "팀 가입이 승인되었습니다",
            message: "팀장이 가입 신청을 수락했습니다. 팀 목록에서 확인해 보세요.",
        },
        reject: {
            title: "팀 가입 신청이 거절되었습니다",
            message: "팀장이 가입 신청을 거절했습니다. 필요하면 다시 신청할 수 있습니다.",
        },
    },
    en: {
        accept: {
            title: "You joined the team",
            message: "A team leader approved your join request. Check your team list.",
        },
        reject: {
            title: "Join request declined",
            message: "A team leader declined your join request. You can apply again if you want.",
        },
    },
    ja: {
        accept: {
            title: "チーム参加が承認されました",
            message: "リーダーが参加申請を承認しました。チーム一覧でご確認ください。",
        },
        reject: {
            title: "参加申請が却下されました",
            message: "リーダーが参加申請を却下しました。必要なら再度申請できます。",
        },
    },
};

export function teamJoinRequestResultForApplicant(
    lang: string,
    teamName: string,
    result: "accept" | "reject",
): { title: string; message: string } {
    const r = APPLICANT_RESULT[notifyLocale(lang)][result];
    return {
        title: `[${teamName}] ${r.title}`,
        message: r.message,
    };
}
