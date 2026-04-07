"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useLocale, useTranslations } from "next-intl";

import { getApiBaseUrl } from "@/lib/http/api-base-url";
import type { TeamListItem } from "@/lib/server/teams.server";
import { fetchMorePublicTeamsAction } from "@/app/actions/teams";
import { updateMyTeamPinsAction } from "@/app/actions/teams";
import { addTeamFavoriteAction, removeTeamFavoriteAction } from "@/app/actions/teams";
import { TeamFavoriteButton } from "@repo/ui";

import {
    DndContext,
    type DragEndEvent,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    SortableContext,
    arrayMove,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function listBannerSrc(url: string | null | undefined): string | null {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `${getApiBaseUrl()}${url}`;
}

const MY_TEAMS_PAGE_SIZE = 5;
const PUBLIC_TEAMS_TAKE = 20;
const EMPTY_MY_TEAMS: TeamListItem[] = [];

function truncate(str: string, maxLen: number): string {
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen) + "…";
}

function TeamListCard({
    team,
    compact,
    isFavorite = false,
}: {
    team: TeamListItem;
    compact?: boolean;
    isFavorite?: boolean;
}) {
    const t = useTranslations("teams");
    const locale = useLocale();
    const bannerThumb = listBannerSrc(team.bannerUrl);
    const leaderLabel = team.createdBy?.name?.trim() || team.createdBy?.email || null;
    return (
        <li className={`group rounded-lg border border-stone-200/90 bg-white transition-all hover:border-stone-300 hover:shadow-sm ${compact ? "" : "hover:shadow-md"}`}>
            <div className={`flex items-start gap-3 sm:gap-4 ${compact ? "p-3 sm:p-3.5" : "p-4 sm:p-5"}`}>
                {/* 배너 썸네일 — 클릭 시 팀 이동 */}
                <Link href={`/teams/${team.id}`} tabIndex={-1} className="shrink-0">
                    {bannerThumb ? (
                        <span className="relative block h-14 w-28 overflow-hidden rounded-lg bg-stone-100 sm:h-16 sm:w-32">
                            <img
                                src={bannerThumb}
                                alt=""
                                className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
                            />
                        </span>
                    ) : (
                        <span className="relative block h-14 w-28 overflow-hidden rounded-lg bg-stone-100 sm:h-16 sm:w-32">
                            <span
                                className="flex h-full w-full items-center justify-center bg-gradient-to-br from-stone-200 via-stone-100 to-stone-200 text-stone-500 transition-colors group-hover:text-stone-600"
                                aria-hidden
                            >
                                <svg
                                    className="h-6 w-6 sm:h-7 sm:w-7"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.5}
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                                    />
                                </svg>
                            </span>
                        </span>
                    )}
                </Link>

                {/* 텍스트 영역 */}
                <Link href={`/teams/${team.id}`} className="min-w-0 flex-1 block">
                    <div className="flex min-w-0 items-center gap-1.5">
                        <h3
                            className={`min-w-0 truncate font-semibold text-stone-800 transition-colors group-hover:text-stone-900 ${
                                compact ? "text-sm sm:text-[15px]" : ""
                            }`}
                        >
                            {team.name || t("dashPlaceholder")}
                        </h3>
                        <TeamFavoriteButton
                            teamId={team.id}
                            initialIsFavorite={isFavorite}
                            size="md"
                            onAdd={() => addTeamFavoriteAction(team.id)}
                            onRemove={() => removeTeamFavoriteAction(team.id)}
                        />
                        {team.hiddenFromUsers ? (
                            <span className="shrink-0 rounded-md border border-stone-200 bg-stone-50 px-2 py-0.5 text-[11px] font-medium text-stone-600">
                                {t("cardHidden")}
                            </span>
                        ) : null}
                    </div>
                    <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                        <p
                            className={`text-stone-500 line-clamp-1 ${compact ? "text-xs sm:text-sm" : "text-sm"}`}
                            title={team.shortDescription ?? undefined}
                        >
                            {team.shortDescription
                                ? truncate(team.shortDescription, 50)
                                : t("dashPlaceholder")}
                        </p>
                        <div
                            className={`flex shrink-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-stone-500 sm:gap-x-4 ${
                                compact ? "text-[11px] sm:text-xs" : "text-xs"
                            }`}
                        >
                            <span>
                                {t("labelMembers")}{" "}
                                <span className="font-medium text-stone-600">
                                    {t("cardMembersCount", { count: team._count.members })}
                                </span>
                            </span>
                            {leaderLabel ? (
                                <>
                                    <span className="text-stone-300 sm:inline">|</span>
                                    <span>
                                        {t("cardLeader")}{" "}
                                        <span className="font-medium text-stone-600">{leaderLabel}</span>
                                    </span>
                                </>
                            ) : null}
                            <span className="text-stone-300 sm:inline">|</span>
                            <span>
                                {t("labelCreated")}{" "}
                                <span className="font-medium text-stone-600">
                                    {new Date(team.createdAt).toLocaleDateString(locale)}
                                </span>
                            </span>
                        </div>
                    </div>
                </Link>

                {/* 화살표 */}
                <Link href={`/teams/${team.id}`} tabIndex={-1} className="shrink-0 self-center text-stone-300 transition-transform group-hover:translate-x-0.5">
                    <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M8.25 4.5l7.5 7.5-7.5 7.5"
                        />
                    </svg>
                </Link>
            </div>
        </li>
    );
}

function SortablePinRow({
    id,
    name,
    subtitle,
}: {
    id: string;
    name: string;
    subtitle: string;
}) {
    const t = useTranslations("teams");
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id,
    });
    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.85 : 1,
    };
    return (
        <div
            ref={setNodeRef}
            style={style}
            className="flex items-center gap-3 rounded-lg border border-stone-200 bg-white px-3 py-2"
        >
            <button
                type="button"
                className="flex h-9 w-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg border border-dashed border-stone-300 bg-stone-50 text-stone-500 active:cursor-grabbing"
                aria-label={t("pinModal.dragAria")}
                {...attributes}
                {...listeners}
            >
                <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8.25 15.75h7.5M8.25 12h7.5m-7.5-3.75h7.5"
                    />
                </svg>
            </button>
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-stone-800">{name}</p>
                <p className="truncate text-xs text-stone-500">{subtitle}</p>
            </div>
        </div>
    );
}

export function TeamsPageClient({
    myTeams: myTeamsProp,
    publicTeams: publicTeamsProp,
    searchQuery,
    favoriteTeamIds: favoriteTeamIdsProp,
}: {
    myTeams: TeamListItem[] | undefined;
    publicTeams: TeamListItem[] | undefined;
    searchQuery: string;
    favoriteTeamIds?: Set<string>;
}) {
    const t = useTranslations("teams");
    const tCommon = useTranslations("common");

    const myTeams = myTeamsProp ?? EMPTY_MY_TEAMS;
    const [publicTeams, setPublicTeams] = useState<TeamListItem[]>(publicTeamsProp ?? []);
    const favoriteTeamIds = favoriteTeamIdsProp ?? new Set<string>();
    const [publicLoadingMore, setPublicLoadingMore] = useState(false);
    const [publicHasMore, setPublicHasMore] = useState(true);
    const publicSentinelRef = useRef<HTMLDivElement | null>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [pinModalOpen, setPinModalOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [saving, startSaving] = useTransition();
    const [pinError, setPinError] = useState<string | null>(null);
    const [pinDraftIds, setPinDraftIds] = useState<string[]>([]);

    useEffect(() => setMounted(true), []);
    useEffect(() => {
        // 서버 렌더 결과(검색 조건 변경 포함)로 초기화
        setPublicTeams(publicTeamsProp ?? []);
        setPublicLoadingMore(false);
        setPublicHasMore(true);
    }, [publicTeamsProp, searchQuery]);

    useEffect(() => {
        const el = publicSentinelRef.current;
        if (!el) return;

        const io = new IntersectionObserver(
            (entries) => {
                const hit = entries.some((e) => e.isIntersecting);
                if (!hit) return;
                if (publicLoadingMore) return;
                if (!publicHasMore) return;

                setPublicLoadingMore(true);
                startSaving(async () => {
                    const r = await fetchMorePublicTeamsAction({
                        q: searchQuery || undefined,
                        take: PUBLIC_TEAMS_TAKE,
                        skip: publicTeams.length,
                    });
                    if (r.ok) {
                        const next = r.publicTeams;
                        if (!next.length) {
                            setPublicHasMore(false);
                        } else {
                            setPublicTeams((prev) => [...prev, ...next]);
                        }
                    } else {
                        // 실패 시 재시도 가능하도록 로딩만 해제
                    }
                    setPublicLoadingMore(false);
                });
            },
            { root: null, rootMargin: "600px 0px", threshold: 0 },
        );

        io.observe(el);
        return () => io.disconnect();
    }, [publicTeams.length, publicHasMore, publicLoadingMore, searchQuery, startSaving]);
    useEffect(() => {
        if (!pinModalOpen) return;
        setPinError(null);
        setPinDraftIds(myTeams.map((t) => t.id));
    }, [pinModalOpen, myTeams]);

    const pinTeamsById = new Map(myTeams.map((t) => [t.id, t] as const));

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    function onPinDragEnd(e: DragEndEvent) {
        const { active, over } = e;
        if (!over || active.id === over.id) return;
        setPinDraftIds((prev) => {
            const oldIndex = prev.indexOf(String(active.id));
            const newIndex = prev.indexOf(String(over.id));
            if (oldIndex < 0 || newIndex < 0) return prev;
            return arrayMove(prev, oldIndex, newIndex);
        });
    }

    const totalPages = Math.max(1, Math.ceil(myTeams.length / MY_TEAMS_PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);
    const start = (safePage - 1) * MY_TEAMS_PAGE_SIZE;
    const pageList = myTeams.slice(start, start + MY_TEAMS_PAGE_SIZE);

    const bothEmpty = myTeams.length === 0 && publicTeams.length === 0;

    return (
        <div className="w-full p-4 text-left sm:p-5 md:p-6 lg:p-8">
            <div className="w-full max-w-full">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h2 className="text-2xl font-semibold text-stone-800 sm:text-3xl">
                            {t("title")}
                        </h2>
                        <p className="mt-2 text-stone-600">{t("subtitle")}</p>
                    </div>
                    <Link
                        href="/teams/new"
                        className="inline-flex items-center gap-2 self-end sm:self-auto rounded-lg bg-stone-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2"
                    >
                        <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2.5}
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M12 5v14M5 12h14" />
                        </svg>
                        {t("create")}
                    </Link>
                </div>

                <form
                    action="/teams"
                    method="get"
                    className="mt-6 flex max-w-xl flex-row items-center gap-2"
                >
                    <input
                        type="search"
                        name="q"
                        defaultValue={searchQuery}
                        placeholder={t("searchPlaceholder")}
                        className="min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400"
                    />
                    <div className="flex shrink-0 items-center gap-2">
                        <button
                            type="submit"
                            className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-700"
                        >
                            {tCommon("search")}
                        </button>
                        {searchQuery ? (
                            <Link
                                href="/teams"
                                className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
                            >
                                {t("reset")}
                            </Link>
                        ) : null}
                    </div>
                </form>

                {bothEmpty ? (
                    <div className="mt-12 flex flex-col items-center justify-center py-16 text-center sm:mt-16 sm:py-24">
                        <span className="flex h-20 w-20 items-center justify-center sm:h-24 sm:w-24">
                            <svg
                                className="h-14 w-14 text-stone-800 sm:h-16 sm:w-16"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                                />
                            </svg>
                        </span>
                        <p className="mt-4 text-xl font-medium text-stone-800 sm:text-2xl">
                            {searchQuery ? t("emptySearch") : t("emptyNone")}{" "}
                            <span className="inline-block">😢</span>
                        </p>
                        {!searchQuery ? (
                            <Link
                                href="/teams/new"
                                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-stone-800 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-700"
                            >
                                {t("createCta")}
                            </Link>
                        ) : null}
                    </div>
                ) : (
                    <>
                        <section className="mt-8 sm:mt-10" aria-labelledby="teams-mine-heading">
                            <div className="flex items-end justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex min-w-0 items-end gap-2">
                                        <h3
                                            id="teams-mine-heading"
                                            className="text-base font-semibold text-stone-900 sm:text-lg"
                                        >
                                            {t("myTeamsTitle")}
                                        </h3>
                                        {myTeams.length > 1 ? (
                                            <button
                                                type="button"
                                                onClick={() => setPinModalOpen(true)}
                                                className="inline-flex h-7 items-center rounded-md border border-stone-200 bg-white px-2.5 text-xs font-medium text-stone-700 shadow-sm transition-colors hover:bg-stone-50"
                                            >
                                                {t("pinOrderButton")}
                                            </button>
                                        ) : null}
                                    </div>
                                    <p className="mt-1 text-xs text-stone-500">
                                        {t("maxVisibleNote", { max: MY_TEAMS_PAGE_SIZE })}
                                    </p>
                                </div>
                                {myTeams.length > MY_TEAMS_PAGE_SIZE ? (
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs tabular-nums text-stone-400">
                                            {safePage}/{totalPages}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                            disabled={safePage <= 1}
                                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-600 transition-colors hover:bg-stone-50 disabled:pointer-events-none disabled:opacity-50"
                                            aria-label={t("pagePrev")}
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
                                                    d="M15.75 19.5 8.25 12l7.5-7.5"
                                                />
                                            </svg>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setCurrentPage((p) => Math.min(totalPages, p + 1))
                                            }
                                            disabled={safePage >= totalPages}
                                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-600 transition-colors hover:bg-stone-50 disabled:pointer-events-none disabled:opacity-50"
                                            aria-label={t("pageNext")}
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
                                                    d="M8.25 4.5 15.75 12l-7.5 7.5"
                                                />
                                            </svg>
                                        </button>
                                    </div>
                                ) : null}
                            </div>
                            {myTeams.length === 0 ? (
                                <p className="mt-3 text-sm text-stone-500">
                                    {searchQuery ? t("myTeamsEmptySearch") : t("myTeamsEmptyNone")}
                                </p>
                            ) : (
                                <>
                                    <ul className="mt-4 space-y-3">
                                        {pageList.map((team) => (
                                            <TeamListCard
                                                key={team.id}
                                                team={team}
                                                isFavorite={favoriteTeamIds.has(team.id)}
                                            />
                                        ))}
                                    </ul>
                                </>
                            )}
                        </section>

                        {publicTeams.length > 0 ? (
                            <section
                                className="mt-10 border-t border-stone-200/80 pt-8 sm:mt-12 sm:pt-10"
                                aria-labelledby="teams-public-heading"
                            >
                                <h3
                                    id="teams-public-heading"
                                    className="text-base font-semibold text-stone-900 sm:text-lg"
                                >
                                    {t("publicTitle")}
                                </h3>
                                <p className="mt-1 text-xs text-stone-500">
                                    {t("publicNote")}
                                </p>
                                <ul className="mt-3 space-y-2">
                                    {publicTeams.map((team) => (
                                        <TeamListCard
                                            key={team.id}
                                            team={team}
                                            compact
                                            isFavorite={favoriteTeamIds.has(team.id)}
                                        />
                                    ))}
                                </ul>
                                <div ref={publicSentinelRef} className="h-10" aria-hidden />
                                {publicLoadingMore ? (
                                    <p className="mt-2 text-xs text-stone-500">{t("loadingMorePublic")}</p>
                                ) : null}
                            </section>
                        ) : null}
                    </>
                )}
            </div>
            {mounted && pinModalOpen ? (
                createPortal(
                    <>
                              <div
                                  className="fixed inset-0 z-[70] bg-stone-900/40"
                                  aria-hidden
                                  onClick={() => setPinModalOpen(false)}
                              />
                              <aside
                                  className="fixed left-1/2 top-1/2 z-[71] w-[min(92vw,520px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-stone-200 bg-white shadow-xl"
                                  role="dialog"
                                  aria-modal="true"
                              >
                                  <div className="flex items-center justify-between gap-3 border-b border-stone-100 px-4 py-3">
                                      <div className="min-w-0">
                                          <h2 className="truncate text-sm font-semibold text-stone-900">
                                              {t("pinModal.title")}
                                          </h2>
                                          <p className="mt-0.5 text-xs text-stone-500">
                                              {t("pinModal.desc")}
                                          </p>
                                      </div>
                                      <button
                                          type="button"
                                          onClick={() => setPinModalOpen(false)}
                                          className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-700"
                                          aria-label={t("pinModal.close")}
                                      >
                                          <svg
                                              className="h-5 w-5"
                                              fill="none"
                                              viewBox="0 0 24 24"
                                              strokeWidth={1.5}
                                              stroke="currentColor"
                                          >
                                              <path
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                  d="M6 18 18 6M6 6l12 12"
                                              />
                                          </svg>
                                      </button>
                                  </div>

                                  <div className="max-h-[60vh] overflow-y-auto px-4 py-4">
                                      <DndContext
                                          sensors={sensors}
                                          collisionDetection={closestCenter}
                                          onDragEnd={onPinDragEnd}
                                      >
                                          <SortableContext
                                              items={pinDraftIds}
                                              strategy={verticalListSortingStrategy}
                                          >
                                              <div className="space-y-2">
                                                  {pinDraftIds.map((id) => {
                                                      const t = pinTeamsById.get(id);
                                                      if (!t) return null;
                                                      return (
                                                          <SortablePinRow
                                                              key={id}
                                                              id={id}
                                                              name={t.name || "—"}
                                                              subtitle={
                                                                  t.shortDescription?.trim() ||
                                                                  "—"
                                                              }
                                                          />
                                                      );
                                                  })}
                                              </div>
                                          </SortableContext>
                                      </DndContext>
                                      {pinError ? (
                                          <p className="mt-3 text-sm text-red-600">{pinError}</p>
                                      ) : null}
                                  </div>

                                  <div className="flex items-center justify-end gap-2 border-t border-stone-100 px-4 py-3">
                                      <button
                                          type="button"
                                          disabled={saving}
                                          onClick={() => setPinModalOpen(false)}
                                          className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60"
                                      >
                                          {t("pinModal.cancel")}
                                      </button>
                                      <button
                                          type="button"
                                          disabled={saving}
                                          onClick={() => {
                                              setPinError(null);
                                              startSaving(async () => {
                                                  const r = await updateMyTeamPinsAction(
                                                      pinDraftIds,
                                                  );
                                                  if (!r.ok) {
                                                      setPinError(
                                                          r.message ?? t("pinModal.saveFailed"),
                                                      );
                                                      return;
                                                  }
                                                  setPinModalOpen(false);
                                              });
                                          }}
                                          className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-60"
                                      >
                                          {saving ? t("pinModal.saving") : t("pinModal.save")}
                                      </button>
                                  </div>
                              </aside>
                    </>,
                    document.body,
                )
            ) : null}
        </div>
    );
}
