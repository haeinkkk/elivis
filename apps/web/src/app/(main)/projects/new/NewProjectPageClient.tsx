"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import {
    fetchMyTeamsForProjectAction,
    fetchTeamBriefForProjectAction,
    searchUsersForTeamAction,
    type ProjectTeamOption,
    type SearchableUser,
} from "@/app/actions/teams";
import { createProjectAction } from "@/app/actions/projects";
import { getApiBaseUrl } from "@/lib/api";
import type { UserProfile } from "@/lib/user-types";

type SelectedParticipant = {
    id: string;
    name: string;
    userId: string;
};

function teamOptionSubtitle(t: ProjectTeamOption): string {
    const s = t.shortDescription?.trim();
    if (s) return s;
    if (t.memberCount > 0) return `멤버 ${t.memberCount}명`;
    return t.id;
}

function creatorAvatarSrc(url: string | null | undefined): string | null {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `${getApiBaseUrl()}${url}`;
}

type FieldKey = "name" | "period" | "team" | "participants" | "general";

type FieldErrors = Partial<Record<FieldKey, string>>;

function FieldError({ id, message }: { id?: string; message?: string }) {
    if (!message) return null;
    return (
        <p id={id} className="mt-1.5 text-sm text-red-600" role="alert">
            {message}
        </p>
    );
}

/** YYYY-MM-DD — 로컬 달력 기준 비교 */
function parseDateInputValue(s: string): number | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
    if (!m) return null;
    const t = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
    return Number.isNaN(t) ? null : t;
}

/** 시작일 필수. 종료일은 `noEnd`가 아니면 필수. */
function validatePeriodRequired(start: string, end: string, noEnd: boolean): string | undefined {
    const s = start.trim();
    if (!s) {
        return "시작일을 선택해 주세요.";
    }
    if (!noEnd) {
        const e = end.trim();
        if (!e) {
            return "종료일을 선택하거나 종료일 미정을 체크해 주세요.";
        }
        const ts = parseDateInputValue(s);
        const te = parseDateInputValue(e);
        if (ts != null && te != null && te < ts) {
            return "종료일은 시작일 이후여야 합니다.";
        }
    }
    return undefined;
}

/** 서버/네트워크 메시지를 필드에 분배 (언어별 문자열 휴리스틱) */
function mapServerMessageToFields(message: string): FieldErrors {
    const m = message.trim();
    if (!m) return { general: "요청을 처리하지 못했습니다." };

    if (/네트워크|network/i.test(m)) {
        return { general: m };
    }

    if (/참여자|participant/i.test(m)) {
        return { participants: m };
    }

    if (/팀.*멤버|team.*member|해당 팀의 멤버|연결할 수|팀장/i.test(m)) {
        return { team: m };
    }

    if (/^name\s*필드|name\s*is\s*required|프로젝트.*명.*필수|Project name is required/i.test(m)) {
        return { name: m };
    }

    if (
        /시작일|종료일|날짜|기간|end date|start date|invalid.*date|date.*invalid|終了日|開始日/i.test(
            m,
        )
    ) {
        return { period: m };
    }

    if (/필수|required/i.test(m) && /프로젝트|project|이름|name/i.test(m)) {
        return { name: m };
    }

    return { general: m };
}

const inputErrorClass = "border-red-300 focus:border-red-500 focus:ring-red-500/30";
const inputNormalClass = "border-stone-200 focus:border-stone-400 focus:ring-stone-400";

/** `?teamIds=id` 또는 `?teamIds=a&teamIds=b`, 쉼표 구분 병행 가능 */
function parsePresetTeamIds(searchParams: URLSearchParams): string[] {
    const raw = searchParams.getAll("teamIds");
    const ids = raw.flatMap((s) =>
        s
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean),
    );
    return [...new Set(ids)];
}

export function NewProjectPageClient({ currentUser }: { currentUser: UserProfile }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const presetTeamIds = useMemo(() => parsePresetTeamIds(searchParams), [searchParams]);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [projectType, setProjectType] = useState<"personal" | "team">("personal");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [noEndDate, setNoEndDate] = useState(false);
    const [participants, setParticipants] = useState<SelectedParticipant[]>([]);
    const [participantModalOpen, setParticipantModalOpen] = useState(false);
    const [userSearchQuery, setUserSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SearchableUser[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [teams, setTeams] = useState<ProjectTeamOption[]>([]);
    const [teamModalOpen, setTeamModalOpen] = useState(false);
    const [teamSearchQuery, setTeamSearchQuery] = useState("");
    const [teamSearchResults, setTeamSearchResults] = useState<ProjectTeamOption[]>([]);
    const [teamSearchLoading, setTeamSearchLoading] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [pending, startSubmit] = useTransition();

    const clearError = (key: FieldKey) => {
        setFieldErrors((prev) => {
            if (!prev[key]) return prev;
            const next = { ...prev };
            delete next[key];
            return next;
        });
    };

    const creatorName =
        currentUser.name?.trim() || currentUser.email.split("@")[0] || currentUser.email;
    const creatorEmail = currentUser.email;

    useEffect(() => {
        if (presetTeamIds.length === 0) return;
        setProjectType("team");
        let cancelled = false;
        (async () => {
            const results = await Promise.all(
                presetTeamIds.map((id) => fetchTeamBriefForProjectAction(id)),
            );
            if (cancelled) return;
            const next: ProjectTeamOption[] = presetTeamIds.map((id, i) => {
                const r = results[i]!;
                if (r.ok) return r.team;
                return {
                    id,
                    name: id,
                    shortDescription: null,
                    memberCount: 0,
                };
            });
            setTeams(next);
        })();
        return () => {
            cancelled = true;
        };
    }, [presetTeamIds]);

    useEffect(() => {
        if (!participantModalOpen) return;
        const q = userSearchQuery.trim();
        if (q.length < 1) {
            setSearchResults([]);
            return;
        }
        setSearchLoading(true);
        const timer = window.setTimeout(async () => {
            const r = await searchUsersForTeamAction(q);
            setSearchLoading(false);
            if (r.ok) setSearchResults(r.users);
            else setSearchResults([]);
        }, 350);
        return () => window.clearTimeout(timer);
    }, [userSearchQuery, participantModalOpen]);

    useEffect(() => {
        if (!teamModalOpen) return;

        const q = teamSearchQuery.trim();
        setTeamSearchLoading(true);
        const delay = q.length > 0 ? 320 : 0;
        const timer = window.setTimeout(async () => {
            const r = await fetchMyTeamsForProjectAction({
                q: q || undefined,
                take: 80,
                skip: 0,
            });
            setTeamSearchLoading(false);
            if (r.ok) setTeamSearchResults(r.teams);
            else setTeamSearchResults([]);
        }, delay);

        return () => window.clearTimeout(timer);
    }, [teamSearchQuery, teamModalOpen]);

    const addParticipant = (user: SearchableUser) => {
        if (participants.some((p) => p.id === user.id)) return;
        const displayName = user.name?.trim() || user.email.split("@")[0] || user.email;
        setParticipants((prev) => [
            ...prev,
            { id: user.id, name: displayName, userId: user.email },
        ]);
        clearError("participants");
        setParticipantModalOpen(false);
        setUserSearchQuery("");
        setSearchResults([]);
    };

    const removeParticipant = (index: number) => {
        setParticipants((prev) => prev.filter((_, i) => i !== index));
        clearError("participants");
    };

    const addTeam = (team: ProjectTeamOption) => {
        setTeams((prev) => (prev.some((t) => t.id === team.id) ? prev : [...prev, team]));
        clearError("team");
        setTeamModalOpen(false);
        setTeamSearchQuery("");
        setTeamSearchResults([]);
    };

    const removeTeam = (index: number) => {
        setTeams((prev) => prev.filter((_, i) => i !== index));
        clearError("team");
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = name.trim();

        const nextErrors: FieldErrors = {};

        if (!trimmedName) {
            nextErrors.name = "프로젝트 명을 입력해 주세요.";
        }

        const periodErr = validatePeriodRequired(startDate, endDate, noEndDate);
        if (periodErr) {
            nextErrors.period = periodErr;
        }

        if (projectType === "team" && teams.length === 0) {
            nextErrors.team = "연결할 팀을 한 개 이상 선택해 주세요.";
        }

        if (Object.keys(nextErrors).length > 0) {
            setFieldErrors(nextErrors);
            return;
        }

        setFieldErrors({});

        startSubmit(async () => {
            const teamIds =
                projectType === "team" ? [...new Set(teams.map((t) => t.id))] : undefined;

            const r = await createProjectAction({
                name: trimmedName,
                description,
                ...(teamIds?.length ? { teamIds } : {}),
                startDate: startDate.trim(),
                endDate: noEndDate ? undefined : endDate.trim() || undefined,
                noEndDate,
                participantUserIds: participants.map((p) => p.id),
            });

            if (!r.ok) {
                setFieldErrors(mapServerMessageToFields(r.message));
                return;
            }

            router.push(`/projects/${r.projectId}`);
        });
    };

    const avatarSrc = creatorAvatarSrc(currentUser.avatarUrl);

    return (
        <div className="w-full p-4 text-left sm:p-5 md:p-6 lg:p-8">
            <div className="w-full max-w-full">
                <Link
                    href="/projects"
                    className="inline-flex items-center gap-1.5 text-sm text-stone-500 transition-colors hover:text-stone-700"
                >
                    <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    프로젝트 목록
                </Link>
                <div className="mt-4">
                    <h2 className="text-2xl font-semibold text-stone-800 sm:text-3xl">
                        프로젝트 생성
                    </h2>
                    <p className="mt-2 text-stone-600">프로젝트 정보를 입력한 뒤 생성하세요.</p>
                </div>

                <form onSubmit={handleSubmit} className="mt-6 max-w-2xl space-y-6 sm:mt-8">
                    <div>
                        <label className="block text-sm font-medium text-stone-700">
                            프로젝트 생성자
                        </label>
                        <div
                            className="mt-1.5 flex items-center gap-3 rounded-lg border border-stone-200 bg-stone-50/80 px-3 py-2.5"
                            aria-readonly
                        >
                            {avatarSrc ? (
                                <img
                                    src={avatarSrc}
                                    alt=""
                                    width={36}
                                    height={36}
                                    className="h-9 w-9 shrink-0 rounded-full object-cover"
                                />
                            ) : (
                                <span className="flex h-9 w-9 shrink-0 rounded-full bg-stone-300" />
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-stone-800 truncate">
                                    {creatorName}
                                </p>
                                <p className="text-xs text-stone-500 truncate">{creatorEmail}</p>
                            </div>
                        </div>
                        <p className="mt-1 text-xs text-stone-400">
                            프로젝트 생성자는 로그인한 본인으로 등록됩니다.
                        </p>
                    </div>

                    <div
                        className={
                            fieldErrors.name
                                ? "rounded-xl border border-red-200 bg-red-50/40 p-3"
                                : ""
                        }
                    >
                        <label
                            htmlFor="project-name"
                            className="block text-sm font-medium text-stone-700"
                        >
                            프로젝트 명{" "}
                            <span className="text-red-600" aria-hidden>
                                *
                            </span>
                        </label>
                        <input
                            id="project-name"
                            type="text"
                            value={name}
                            aria-required
                            onChange={(e) => {
                                setName(e.target.value);
                                clearError("name");
                            }}
                            placeholder="예: Elivis 웹 앱"
                            aria-invalid={!!fieldErrors.name}
                            aria-describedby={fieldErrors.name ? "project-name-error" : undefined}
                            className={`mt-1.5 w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-1 ${
                                fieldErrors.name ? inputErrorClass : inputNormalClass
                            }`}
                        />
                        <FieldError id="project-name-error" message={fieldErrors.name} />
                    </div>

                    <div>
                        <label
                            htmlFor="project-desc"
                            className="block text-sm font-medium text-stone-700"
                        >
                            프로젝트 설명
                        </label>
                        <textarea
                            id="project-desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="프로젝트에 대한 간단한 설명을 입력하세요."
                            rows={3}
                            className="mt-1.5 w-full resize-y rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 focus:border-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400"
                        />
                    </div>

                    <div
                        className={`space-y-3 ${
                            fieldErrors.period
                                ? "rounded-xl border border-red-200 bg-red-50/40 p-3"
                                : ""
                        }`}
                    >
                        <p id="project-period-label" className="text-sm font-medium text-stone-700">
                            프로젝트 기간{" "}
                            <span className="text-red-600" aria-hidden>
                                *
                            </span>
                        </p>
                        <p className="text-xs text-stone-500">
                            시작일은 필수입니다. 종료일이 없으면「아직 안정해졌어요」를 선택하세요.
                        </p>
                        <div
                            className="flex flex-wrap items-center gap-4"
                            aria-labelledby="project-period-label"
                        >
                            <div className="flex items-center gap-2">
                                <label htmlFor="start-date" className="text-sm text-stone-600">
                                    시작:
                                </label>
                                <input
                                    id="start-date"
                                    type="date"
                                    value={startDate}
                                    aria-required
                                    onChange={(e) => {
                                        setStartDate(e.target.value);
                                        clearError("period");
                                    }}
                                    placeholder="연도-월-일"
                                    aria-invalid={!!fieldErrors.period}
                                    aria-describedby={
                                        fieldErrors.period ? "project-period-error" : undefined
                                    }
                                    className={`rounded-lg border bg-white px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-1 ${
                                        fieldErrors.period ? inputErrorClass : inputNormalClass
                                    }`}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <label htmlFor="end-date" className="text-sm text-stone-600">
                                    종료:
                                </label>
                                <input
                                    id="end-date"
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => {
                                        setEndDate(e.target.value);
                                        clearError("period");
                                    }}
                                    disabled={noEndDate}
                                    aria-required={!noEndDate}
                                    placeholder="연도-월-일"
                                    aria-invalid={!!fieldErrors.period}
                                    aria-describedby={
                                        fieldErrors.period ? "project-period-error" : undefined
                                    }
                                    className={`rounded-lg border bg-white px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-1 disabled:bg-stone-50 disabled:text-stone-400 ${
                                        fieldErrors.period ? inputErrorClass : inputNormalClass
                                    }`}
                                />
                            </div>
                            <label className="flex cursor-pointer items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={noEndDate}
                                    onChange={(e) => {
                                        const checked = e.target.checked;
                                        setNoEndDate(checked);
                                        if (checked) setEndDate("");
                                        clearError("period");
                                    }}
                                    className="h-4 w-4 rounded border-stone-300 text-stone-700 focus:ring-stone-400"
                                />
                                <span className="text-sm text-stone-600">아직 안정해졌어요</span>
                            </label>
                        </div>
                        <FieldError id="project-period-error" message={fieldErrors.period} />
                        {noEndDate && (
                            <p className="text-xs text-stone-400">
                                체크 시 프로젝트 종료 기간 없음
                            </p>
                        )}
                    </div>

                    <div>
                        <p className="text-sm font-medium text-stone-700">프로젝트 구분</p>
                        <div className="mt-2 flex gap-4">
                            <label className="flex cursor-pointer items-center gap-2">
                                <input
                                    type="radio"
                                    name="projectType"
                                    checked={projectType === "personal"}
                                    disabled={presetTeamIds.length > 0}
                                    onChange={() => {
                                        setProjectType("personal");
                                        setTeams([]);
                                        clearError("team");
                                    }}
                                    className="h-4 w-4 border-stone-300 text-stone-700 focus:ring-stone-400"
                                />
                                <span className="text-sm text-stone-700">개인</span>
                            </label>
                            <label className="flex cursor-pointer items-center gap-2">
                                <input
                                    type="radio"
                                    name="projectType"
                                    checked={projectType === "team"}
                                    disabled={presetTeamIds.length > 0}
                                    onChange={() => {
                                        setProjectType("team");
                                        clearError("team");
                                    }}
                                    className="h-4 w-4 border-stone-300 text-stone-700 focus:ring-stone-400"
                                />
                                <span className="text-sm text-stone-700">팀</span>
                            </label>
                        </div>
                    </div>

                    {projectType === "team" && (
                        <div
                            className={
                                fieldErrors.team
                                    ? "rounded-xl border border-red-200 bg-red-50/40 p-3"
                                    : ""
                            }
                        >
                            <p
                                id="project-team-label"
                                className="text-sm font-medium text-stone-700"
                            >
                                내 팀
                            </p>
                            <p className="mt-0.5 text-xs text-stone-400">
                                본인이 팀장인 팀만 연결 가능합니다. 그 외 팀은 프로젝트 생성 후 초대
                                기능을 이용해 주세요.
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {teams.map((t, i) => (
                                    <span
                                        key={t.id}
                                        className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50/80 py-1.5 pl-1.5 pr-2"
                                    >
                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-200 text-xs font-medium text-stone-600">
                                            팀
                                        </span>
                                        <span className="flex flex-col items-start">
                                            <span className="text-sm font-medium text-stone-800 leading-tight">
                                                {t.name}
                                            </span>
                                            <span className="text-xs text-stone-500 leading-tight max-w-[220px] truncate">
                                                {teamOptionSubtitle(t)}
                                            </span>
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => removeTeam(i)}
                                            disabled={presetTeamIds.includes(t.id)}
                                            className="shrink-0 rounded-full p-0.5 text-stone-400 hover:bg-stone-200 hover:text-stone-600 disabled:cursor-default disabled:opacity-50"
                                            aria-label="제거"
                                            title={
                                                presetTeamIds.includes(t.id)
                                                    ? "이 페이지에서 지정한 팀은 해제할 수 없습니다"
                                                    : undefined
                                            }
                                        >
                                            <svg
                                                className="h-3.5 w-3.5"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                strokeWidth={2}
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M6 18L18 6M6 6l12 12"
                                                />
                                            </svg>
                                        </button>
                                    </span>
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setTeamSearchQuery("");
                                    setTeamModalOpen(true);
                                }}
                                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:border-stone-300 hover:bg-stone-50"
                            >
                                <svg
                                    className="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={2}
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M12 4.5v15m7.5-7.5h-15"
                                    />
                                </svg>
                                {teams.length > 0 ? "내 팀 추가" : "내 팀 선택"}
                            </button>
                            <FieldError id="project-team-error" message={fieldErrors.team} />
                        </div>
                    )}

                    <div
                        className={
                            fieldErrors.participants
                                ? "rounded-xl border border-red-200 bg-red-50/40 p-3"
                                : ""
                        }
                    >
                        <p className="text-sm font-medium text-stone-700">추가 참여자</p>
                        <p className="mt-0.5 text-xs text-stone-400">
                            추가 버튼으로 사용자를 선택하세요.
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {participants.map((p, i) => (
                                <span
                                    key={p.id}
                                    className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50/80 py-1.5 pl-1.5 pr-2"
                                >
                                    <span className="flex h-7 w-7 shrink-0 rounded-full bg-stone-300" />
                                    <span className="flex flex-col items-start">
                                        <span className="text-sm font-medium text-stone-800 leading-tight">
                                            {p.name}
                                        </span>
                                        <span className="text-xs text-stone-500 leading-tight">
                                            {p.userId}
                                        </span>
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => removeParticipant(i)}
                                        className="shrink-0 rounded-full p-0.5 text-stone-400 hover:bg-stone-200 hover:text-stone-600"
                                        aria-label="제거"
                                    >
                                        <svg
                                            className="h-3.5 w-3.5"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            strokeWidth={2}
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M6 18L18 6M6 6l12 12"
                                            />
                                        </svg>
                                    </button>
                                </span>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={() => setParticipantModalOpen(true)}
                            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:border-stone-300 hover:bg-stone-50"
                        >
                            <svg
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2}
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 4.5v15m7.5-7.5h-15"
                                />
                            </svg>
                            추가
                        </button>
                        <FieldError
                            id="project-participants-error"
                            message={fieldErrors.participants}
                        />
                    </div>

                    {participantModalOpen && (
                        <>
                            <div
                                className="fixed inset-0 z-40 bg-stone-900/40"
                                aria-hidden
                                onClick={() => {
                                    setParticipantModalOpen(false);
                                    setUserSearchQuery("");
                                    setSearchResults([]);
                                }}
                            />
                            <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl">
                                <div className="border-b border-stone-100 px-4 py-3">
                                    <h3 className="text-base font-semibold text-stone-800">
                                        추가 참여자
                                    </h3>
                                    <div className="mt-3 flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50/50 px-3 py-2">
                                        <svg
                                            className="h-4 w-4 shrink-0 text-stone-400"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            strokeWidth={1.5}
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                                            />
                                        </svg>
                                        <input
                                            type="search"
                                            value={userSearchQuery}
                                            onChange={(e) => setUserSearchQuery(e.target.value)}
                                            placeholder="이름 또는 이메일로 검색"
                                            className="min-w-0 flex-1 bg-transparent text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none"
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <ul className="max-h-64 overflow-y-auto py-2">
                                    {userSearchQuery.trim().length < 1 ? (
                                        <li className="px-4 py-6 text-center text-sm text-stone-500">
                                            검색어를 입력하세요.
                                        </li>
                                    ) : searchLoading ? (
                                        <li className="px-4 py-6 text-center text-sm text-stone-500">
                                            검색 중…
                                        </li>
                                    ) : searchResults.length === 0 ? (
                                        <li className="px-4 py-6 text-center text-sm text-stone-500">
                                            검색 결과가 없습니다.
                                        </li>
                                    ) : (
                                        searchResults.map((user) => {
                                            const isAdded = participants.some(
                                                (p) => p.id === user.id,
                                            );
                                            const label =
                                                user.name?.trim() ||
                                                user.email.split("@")[0] ||
                                                user.email;
                                            return (
                                                <li key={user.id}>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            !isAdded && addParticipant(user)
                                                        }
                                                        disabled={isAdded}
                                                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                                                            isAdded
                                                                ? "cursor-default opacity-50"
                                                                : "hover:bg-stone-50"
                                                        }`}
                                                    >
                                                        <span className="h-9 w-9 shrink-0 rounded-full bg-stone-300" />
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-medium text-stone-800">
                                                                {label}
                                                            </p>
                                                            <p className="text-xs text-stone-500">
                                                                {user.email}
                                                            </p>
                                                        </div>
                                                        {isAdded && (
                                                            <span className="text-xs text-stone-400">
                                                                추가됨
                                                            </span>
                                                        )}
                                                    </button>
                                                </li>
                                            );
                                        })
                                    )}
                                </ul>
                                <div className="border-t border-stone-100 px-4 py-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setParticipantModalOpen(false);
                                            setUserSearchQuery("");
                                            setSearchResults([]);
                                        }}
                                        className="w-full rounded-lg border border-stone-200 bg-white py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                                    >
                                        닫기
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    {teamModalOpen && (
                        <>
                            <div
                                className="fixed inset-0 z-40 bg-stone-900/40"
                                aria-hidden
                                onClick={() => {
                                    setTeamModalOpen(false);
                                    setTeamSearchQuery("");
                                    setTeamSearchResults([]);
                                }}
                            />
                            <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl">
                                <div className="border-b border-stone-100 px-4 py-3">
                                    <h3 className="text-base font-semibold text-stone-800">
                                        내 팀 선택
                                    </h3>
                                    <p className="mt-1 text-xs text-stone-500">
                                        내가 팀장으로 있는 팀만 표시됩니다.
                                    </p>
                                    <div className="mt-3 flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50/50 px-3 py-2">
                                        <svg
                                            className="h-4 w-4 shrink-0 text-stone-400"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            strokeWidth={1.5}
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                                            />
                                        </svg>
                                        <input
                                            type="search"
                                            value={teamSearchQuery}
                                            onChange={(e) => setTeamSearchQuery(e.target.value)}
                                            placeholder="팀 이름·설명으로 검색"
                                            className="min-w-0 flex-1 bg-transparent text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none"
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <ul className="max-h-64 overflow-y-auto py-2">
                                    {teamSearchLoading ? (
                                        <li className="px-4 py-6 text-center text-sm text-stone-500">
                                            불러오는 중…
                                        </li>
                                    ) : teamSearchResults.length === 0 ? (
                                        <li className="px-4 py-6 text-center text-sm text-stone-500">
                                            {teamSearchQuery.trim()
                                                ? "검색 결과가 없습니다."
                                                : "팀장으로 있는 팀이 없습니다."}
                                        </li>
                                    ) : (
                                        teamSearchResults.map((team) => {
                                            const isCurrent = teams[0]?.id === team.id;
                                            return (
                                                <li key={team.id}>
                                                    <button
                                                        type="button"
                                                        onClick={() => addTeam(team)}
                                                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-stone-50"
                                                    >
                                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-200 text-xs font-medium text-stone-600">
                                                            팀
                                                        </span>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-medium text-stone-800">
                                                                {team.name}
                                                            </p>
                                                            <p className="text-xs text-stone-500 truncate">
                                                                {teamOptionSubtitle(team)}
                                                            </p>
                                                        </div>
                                                        {isCurrent && (
                                                            <span className="text-xs text-stone-400">
                                                                선택됨
                                                            </span>
                                                        )}
                                                    </button>
                                                </li>
                                            );
                                        })
                                    )}
                                </ul>
                                <div className="border-t border-stone-100 px-4 py-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setTeamModalOpen(false);
                                            setTeamSearchQuery("");
                                            setTeamSearchResults([]);
                                        }}
                                        className="w-full rounded-lg border border-stone-200 bg-white py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                                    >
                                        닫기
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    {fieldErrors.general ? (
                        <div
                            className="rounded-lg border border-red-200 bg-red-50/80 px-3 py-2.5"
                            role="alert"
                        >
                            <p className="text-sm text-red-700">{fieldErrors.general}</p>
                        </div>
                    ) : null}

                    <div className="flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end">
                        <Link
                            href="/projects"
                            className="inline-flex justify-center rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
                        >
                            취소
                        </Link>
                        <button
                            type="submit"
                            disabled={pending}
                            className="inline-flex justify-center rounded-lg bg-stone-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2"
                        >
                            프로젝트 생성
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
