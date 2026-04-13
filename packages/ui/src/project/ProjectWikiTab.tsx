"use client";

import type { CSSProperties, Dispatch, SetStateAction } from "react";
import { useEffect, useRef, useState, useTransition, type ChangeEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { closestCenter, DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { ConfirmModal } from "../ConfirmModal";
import { MarkdownContent } from "../MarkdownContent";
import { TeamIntroRichEditor } from "../team/TeamIntroRichEditor";
import { UserAvatar } from "../UserAvatar";
import type {
    ApiProjectWikiListItem,
    ApiProjectWikiPageDetail,
    ProjectWikiDeleteResult,
    ProjectWikiListResult,
    ProjectWikiPageResult,
    ProjectWikiReorderResult,
} from "../types/project-wiki-api";

const CLIENT_SLUG_RE = /^[a-z0-9][a-z0-9-]{0,62}$/;

type WikiConfirmDialog =
    | null
    | { type: "delete" }
    | { type: "switchPage"; slug: string; fromMode: "edit" | "new" };

export type ProjectWikiMediaUploadFn = (
    file: File,
) => Promise<
    | { ok: true; url: string; mimeType: string }
    | { ok: false; message: string }
>;

type ProjectWikiTabProps = {
    projectId: string;
    canEdit: boolean;
    /** `/uploads/...` 미디어 표시 시 API 베이스 URL 접두 */
    wikiAssetBaseUrl?: string;
    /** 편집 권한이 있을 때만 넘기면 미디어·YouTube 삽입 UI가 켜집니다 */
    wikiMediaUpload?: ProjectWikiMediaUploadFn;
    listPages: () => Promise<ProjectWikiListResult>;
    getPage: (slug: string) => Promise<ProjectWikiPageResult>;
    createPage: (input: {
        slug: string;
        title: string;
        contentMd: string;
    }) => Promise<ProjectWikiPageResult>;
    updatePage: (
        slug: string,
        input: { title: string; contentMd: string },
    ) => Promise<ProjectWikiPageResult>;
    deletePage: (slug: string) => Promise<ProjectWikiDeleteResult>;
    reorderPages: (slugs: string[]) => Promise<ProjectWikiReorderResult>;
};

function formatWikiDate(iso: string, locale: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(d);
}

function SortableWikiPageRow({
    page,
    active,
    onSelect,
    dragLabel,
}: {
    page: ApiProjectWikiListItem;
    active: boolean;
    onSelect: () => void;
    dragLabel: string;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: page.slug,
    });
    const style: CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <li
            ref={setNodeRef}
            style={style}
            className={isDragging ? "z-10 opacity-70" : undefined}
        >
            <div className="flex items-center gap-0.5 rounded-lg">
                <button
                    type="button"
                    className="touch-none flex shrink-0 cursor-grab items-center rounded-l-lg border border-transparent px-0.5 py-1.5 text-stone-400 dark:text-elivis-ink-secondary hover:bg-stone-100 dark:hover:bg-elivis-surface-elevated active:cursor-grabbing"
                    aria-label={dragLabel}
                    {...attributes}
                    {...listeners}
                >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                        <circle cx="7" cy="5" r="1.25" />
                        <circle cx="13" cy="5" r="1.25" />
                        <circle cx="7" cy="10" r="1.25" />
                        <circle cx="13" cy="10" r="1.25" />
                        <circle cx="7" cy="15" r="1.25" />
                        <circle cx="13" cy="15" r="1.25" />
                    </svg>
                </button>
                <button
                    type="button"
                    onClick={onSelect}
                    className={[
                        "flex min-w-0 flex-1 items-center gap-1.5 rounded-r-lg px-1.5 py-1.5 text-left text-sm transition-colors",
                        active
                            ? "bg-stone-200 font-medium text-stone-900 dark:bg-elivis-surface dark:text-elivis-ink dark:ring-1 dark:ring-inset dark:ring-elivis-line"
                            : "text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-elivis-ink-secondary dark:hover:bg-elivis-surface/60 dark:hover:text-elivis-ink",
                    ].join(" ")}
                >
                    <span className="min-w-0 flex-1 truncate">{page.title}</span>
                    <span className="shrink-0 text-[10px] text-stone-400 dark:text-elivis-ink-secondary" aria-hidden>
                        ·
                    </span>
                    <span className="max-w-[5rem] shrink-0 truncate font-mono text-[10px] text-stone-400 dark:text-elivis-ink-secondary sm:max-w-[6.5rem]">
                        {page.slug}
                    </span>
                </button>
            </div>
        </li>
    );
}

function WikiMarkdownDraftArea({
    liveMd,
    setLiveMd,
    subView,
    setSubView,
    onWikiLink,
    embedded = false,
    hideSubTabs = false,
    wikiAssetBaseUrl,
    wikiMediaUpload,
}: {
    liveMd: string;
    setLiveMd: Dispatch<SetStateAction<string>>;
    subView: "edit" | "preview";
    setSubView: (v: "edit" | "preview") => void;
    onWikiLink: (slug: string) => void;
    /** 읽기 본문과 같은 열에 맞춤 — 카드 테두리 완화 */
    embedded?: boolean;
    /** true면 편집/미리보기 탭은 부모(헤더)에서 렌더링 */
    hideSubTabs?: boolean;
    wikiAssetBaseUrl?: string;
    wikiMediaUpload?: ProjectWikiMediaUploadFn;
}) {
    const t = useTranslations("projects.detail.wiki");
    const taRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [mediaBusy, setMediaBusy] = useState(false);
    const [mediaErr, setMediaErr] = useState<string | null>(null);

    function insertAtCursor(snippet: string) {
        const ta = taRef.current;
        if (!ta) return;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        setLiveMd((prev) => prev.slice(0, start) + snippet + prev.slice(end));
        window.setTimeout(() => {
            ta.focus();
            const pos = start + snippet.length;
            ta.setSelectionRange(pos, pos);
        }, 0);
    }

    async function onPickWikiMedia(ev: ChangeEvent<HTMLInputElement>) {
        const file = ev.target.files?.[0];
        ev.target.value = "";
        if (!file || !wikiMediaUpload) return;
        setMediaErr(null);
        setMediaBusy(true);
        try {
            const r = await wikiMediaUpload(file);
            if (!r.ok) {
                setMediaErr(r.message);
                return;
            }
            if (r.mimeType.startsWith("image/")) {
                insertAtCursor(`\n\n![](${r.url})\n\n`);
            } else {
                insertAtCursor(`\n\n[${t("videoLinkLabel")}](${r.url})\n\n`);
            }
        } finally {
            setMediaBusy(false);
        }
    }

    function insertYoutubeLine() {
        const raw = window.prompt(t("youtubePrompt"), "")?.trim() ?? "";
        if (!raw) return;
        if (!/^https?:\/\//i.test(raw)) {
            window.alert(t("youtubeUrlInvalid"));
            return;
        }
        setMediaErr(null);
        insertAtCursor(`\n\n[YouTube](${raw})\n\n`);
    }
    const tabBarClass = embedded ? "mb-3" : "mb-2";
    const editAreaClass = embedded
        ? "min-h-[min(62vh,720px)] w-full resize-y border-0 bg-transparent px-0 py-1 font-mono text-sm leading-relaxed text-stone-800 outline-none ring-0 placeholder:text-stone-400 focus:ring-0 dark:text-elivis-ink dark:placeholder:text-elivis-ink-muted"
        : "min-h-[min(72vh,800px)] w-full resize-y rounded-xl border border-stone-200 bg-white px-4 py-3 font-mono text-sm leading-relaxed text-stone-800 shadow-inner outline-none placeholder:text-stone-400 focus:border-stone-400 focus:ring-1 focus:ring-stone-300 dark:border-elivis-line dark:bg-elivis-surface dark:text-elivis-ink dark:placeholder:text-elivis-ink-muted dark:focus:border-elivis-line dark:focus:ring-elivis-line";
    const previewWrapClass = embedded
        ? "min-h-[min(62vh,720px)] w-full overflow-y-auto border-0 bg-transparent px-0 py-1"
        : "min-h-[min(72vh,800px)] w-full overflow-y-auto rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-inner dark:border-elivis-line dark:bg-elivis-surface";
    return (
        <>
            {!hideSubTabs && (
                <div
                    className={`${tabBarClass} inline-flex rounded-lg border border-stone-200 bg-stone-100/80 p-0.5 dark:border-elivis-line dark:bg-elivis-surface-elevated/80`}
                    role="tablist"
                    aria-label={t("ariaMarkdownSubView")}
                >
                    <button
                        type="button"
                        role="tab"
                        aria-selected={subView === "edit"}
                        onClick={() => setSubView("edit")}
                        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                            subView === "edit"
                                ? "bg-white text-stone-900 shadow-sm dark:bg-elivis-surface dark:text-elivis-ink"
                                : "text-stone-500 hover:text-stone-800 dark:text-elivis-ink-secondary dark:hover:text-elivis-ink"
                        }`}
                    >
                        {t("markdownEditTab")}
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={subView === "preview"}
                        onClick={() => setSubView("preview")}
                        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                            subView === "preview"
                                ? "bg-white text-stone-900 shadow-sm dark:bg-elivis-surface dark:text-elivis-ink"
                                : "text-stone-500 hover:text-stone-800 dark:text-elivis-ink-secondary dark:hover:text-elivis-ink"
                        }`}
                    >
                        {t("markdownPreviewTab")}
                    </button>
                </div>
            )}
            {wikiMediaUpload && subView === "edit" && (
                <div className="mb-2 flex flex-wrap items-center gap-2">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
                        className="hidden"
                        onChange={onPickWikiMedia}
                    />
                    <button
                        type="button"
                        disabled={mediaBusy}
                        title={t("uploadMediaTitle")}
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-md border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface px-2.5 py-1.5 text-xs font-medium text-stone-700 dark:text-elivis-ink hover:bg-stone-50 dark:hover:bg-elivis-surface-elevated disabled:opacity-50"
                    >
                        {t("uploadMediaLabel")}
                    </button>
                    <button
                        type="button"
                        title={t("insertYoutubeTitle")}
                        onClick={insertYoutubeLine}
                        className="rounded-md border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface px-2.5 py-1.5 text-xs font-medium text-stone-700 dark:text-elivis-ink hover:bg-stone-50 dark:hover:bg-elivis-surface-elevated"
                    >
                        {t("insertYoutubeLabel")}
                    </button>
                    {mediaErr ? (
                        <span className="text-xs text-red-600 dark:text-red-400" role="alert">
                            {mediaErr}
                        </span>
                    ) : null}
                </div>
            )}
            {subView === "edit" ? (
                <textarea
                    ref={taRef}
                    value={liveMd}
                    onChange={(e) => setLiveMd(e.target.value)}
                    spellCheck={false}
                    placeholder={t("markdownPlaceholder")}
                    className={editAreaClass}
                />
            ) : (
                <div className={previewWrapClass}>
                    {liveMd.trim() ? (
                        <MarkdownContent
                            markdown={liveMd}
                            assetBaseUrl={wikiAssetBaseUrl}
                            onWikiLink={onWikiLink}
                            className="w-full max-w-none"
                        />
                    ) : (
                        <p className="text-sm text-stone-400 dark:text-elivis-ink-secondary">{t("markdownPreviewEmpty")}</p>
                    )}
                </div>
            )}
        </>
    );
}

export function ProjectWikiTab({
    projectId,
    canEdit,
    wikiAssetBaseUrl,
    wikiMediaUpload,
    listPages,
    getPage,
    createPage,
    updatePage,
    deletePage,
    reorderPages,
}: ProjectWikiTabProps) {
    const t = useTranslations("projects.detail.wiki");
    const locale = useLocale();
    const [mode, setMode] = useState<"read" | "edit" | "new">("read");
    const [pages, setPages] = useState<ApiProjectWikiListItem[]>([]);
    const [selectedSlug, setSelectedSlug] = useState<string>("home");
    const [pageDetail, setPageDetail] = useState<ApiProjectWikiPageDetail | null>(null);
    const [draftTitle, setDraftTitle] = useState("");
    const [liveMd, setLiveMd] = useState("");
    const [newSlug, setNewSlug] = useState("");
    const [newTitle, setNewTitle] = useState("");
    const [editorKey, setEditorKey] = useState(0);
    const [draftEditorMode, setDraftEditorMode] = useState<"rich" | "markdown">("markdown");
    const [markdownSubView, setMarkdownSubView] = useState<"edit" | "preview">("edit");
    const draftEditorModeRef = useRef<"rich" | "markdown">("markdown");

    const [listLoading, setListLoading] = useState(true);
    const [pageLoading, setPageLoading] = useState(false);
    const [listError, setListError] = useState<string | null>(null);
    const [pageError, setPageError] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const [confirmDialog, setConfirmDialog] = useState<WikiConfirmDialog>(null);

    const listPagesRef = useRef(listPages);
    const getPageRef = useRef(getPage);
    const createPageRef = useRef(createPage);
    const updatePageRef = useRef(updatePage);
    const deletePageRef = useRef(deletePage);
    const reorderPagesRef = useRef(reorderPages);
    const pagesRef = useRef(pages);
    useEffect(() => {
        listPagesRef.current = listPages;
        getPageRef.current = getPage;
        createPageRef.current = createPage;
        updatePageRef.current = updatePage;
        deletePageRef.current = deletePage;
        reorderPagesRef.current = reorderPages;
    }, [listPages, getPage, createPage, updatePage, deletePage, reorderPages]);
    useEffect(() => {
        pagesRef.current = pages;
    }, [pages]);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

    useEffect(() => {
        draftEditorModeRef.current = draftEditorMode;
    }, [draftEditorMode]);

    function selectDraftEditorMode(m: "rich" | "markdown") {
        if (m === "markdown") {
            setDraftEditorMode("markdown");
            setMarkdownSubView("edit");
            return;
        }
        const wasMarkdown = draftEditorModeRef.current === "markdown";
        setDraftEditorMode("rich");
        if (wasMarkdown) {
            setEditorKey((k) => k + 1);
        }
    }

    async function loadList(): Promise<ApiProjectWikiListItem[] | null> {
        const res = await listPagesRef.current();
        if (!res.ok) {
            setListError(res.message);
            return null;
        }
        setListError(null);
        setPages(res.data.pages);
        return res.data.pages;
    }

    function onWikiDragEnd(event: DragEndEvent) {
        if (!canEdit) return;
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const current = pagesRef.current;
        const oldIndex = current.findIndex((p) => p.slug === active.id);
        const newIndex = current.findIndex((p) => p.slug === over.id);
        if (oldIndex < 0 || newIndex < 0) return;
        const next = arrayMove(current, oldIndex, newIndex);
        const prev = [...current];
        setPages(next);
        pagesRef.current = next;
        const slugs = next.map((p) => p.slug);
        startTransition(async () => {
            const res = await reorderPagesRef.current(slugs);
            if (!res.ok) {
                setPages(prev);
                pagesRef.current = prev;
                setListError(res.message);
                await loadList();
            }
        });
    }

    async function loadPage(slug: string) {
        setPageLoading(true);
        setPageError(null);
        const res = await getPageRef.current(slug);
        setPageLoading(false);
        if (!res.ok) {
            setPageDetail(null);
            setPageError(res.message);
            return;
        }
        setSelectedSlug(slug);
        setPageDetail(res.data);
        setDraftTitle(res.data.title);
        setLiveMd(res.data.contentMd);
        setEditorKey((k) => k + 1);
    }

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setListLoading(true);
            setListError(null);
            const list = await listPagesRef.current();
            if (cancelled) return;
            setListLoading(false);
            if (!list.ok) {
                setListError(list.message);
                return;
            }
            const nextPages = list.data.pages;
            setPages(nextPages);
            const prefer = nextPages.some((p) => p.slug === "home")
                ? "home"
                : (nextPages[0]?.slug ?? "home");
            await loadPage(prefer);
            if (cancelled) return;
            setMode("read");
        })();
        return () => {
            cancelled = true;
        };
    }, [projectId, loadPage]);

    function goRead() {
        setMode("read");
        setSaveError(null);
    }

    async function selectPage(slug: string) {
        if (slug === selectedSlug && mode === "read" && pageDetail?.slug === slug) return;
        if (slug === selectedSlug && mode !== "read") return;

        if (mode === "edit" && pageDetail) {
            const dirty =
                draftTitle.trim() !== pageDetail.title.trim() || liveMd !== pageDetail.contentMd;
            if (dirty) {
                setConfirmDialog({ type: "switchPage", slug, fromMode: "edit" });
                return;
            }
            await loadPage(slug);
            return;
        }

        if (mode === "new") {
            const dirty =
                newSlug.trim() !== "" || newTitle.trim() !== "" || liveMd.trim() !== "";
            if (dirty) {
                setConfirmDialog({ type: "switchPage", slug, fromMode: "new" });
                return;
            }
            goRead();
            await loadPage(slug);
            return;
        }

        goRead();
        await loadPage(slug);
    }

    function onWikiNavigate(slug: string) {
        void selectPage(slug);
    }

    function openEdit() {
        if (!pageDetail || !canEdit) return;
        setDraftTitle(pageDetail.title);
        setLiveMd(pageDetail.contentMd);
        setDraftEditorMode("markdown");
        setMarkdownSubView("edit");
        setEditorKey((k) => k + 1);
        setSaveError(null);
        setMode("edit");
    }

    function cancelEditor() {
        setSaveError(null);
        setDraftEditorMode("markdown");
        setMarkdownSubView("edit");
        setNewSlug("");
        setNewTitle("");
        if (mode === "new") {
            void loadPage(selectedSlug);
        } else if (pageDetail) {
            setDraftTitle(pageDetail.title);
            setLiveMd(pageDetail.contentMd);
            setEditorKey((k) => k + 1);
        }
        setMode("read");
    }

    function openNew() {
        if (!canEdit) return;
        setNewSlug("");
        setNewTitle("");
        setLiveMd("");
        setDraftEditorMode("markdown");
        setMarkdownSubView("edit");
        setEditorKey((k) => k + 1);
        setSaveError(null);
        setMode("new");
    }

    function saveEdit() {
        if (!pageDetail || !canEdit) return;
        const title = draftTitle.trim();
        if (!title) {
            setSaveError(t("titleRequired"));
            return;
        }
        setSaveError(null);
        startTransition(async () => {
            const res = await updatePageRef.current(selectedSlug, { title, contentMd: liveMd });
            if (!res.ok) {
                setSaveError(res.message);
                return;
            }
            await loadList();
            setPageDetail(res.data);
            setDraftTitle(res.data.title);
            setLiveMd(res.data.contentMd);
            setEditorKey((k) => k + 1);
            goRead();
        });
    }

    function saveNew() {
        if (!canEdit) return;
        const slug = newSlug.trim().toLowerCase();
        const title = newTitle.trim();
        if (!CLIENT_SLUG_RE.test(slug)) {
            setSaveError(t("slugInvalid"));
            return;
        }
        if (!title) {
            setSaveError(t("titleRequired"));
            return;
        }
        setSaveError(null);
        startTransition(async () => {
            const res = await createPageRef.current({ slug, title, contentMd: liveMd });
            if (!res.ok) {
                setSaveError(res.message);
                return;
            }
            await loadList();
            await loadPage(res.data.slug);
            setNewSlug("");
            setNewTitle("");
            goRead();
        });
    }

    function tryDelete() {
        if (!canEdit || !pageDetail || pages.length <= 1) return;
        setConfirmDialog({ type: "delete" });
    }

    function executeWikiConfirm() {
        if (!confirmDialog) return;
        if (confirmDialog.type === "delete") {
            setConfirmDialog(null);
            startTransition(async () => {
                const res = await deletePageRef.current(selectedSlug);
                if (!res.ok) {
                    setSaveError(res.message);
                    return;
                }
                const next = await loadList();
                if (!next || next.length === 0) return;
                const nextSlug = next.some((p) => p.slug === "home") ? "home" : next[0].slug;
                await loadPage(nextSlug);
                goRead();
            });
            return;
        }
        const { slug, fromMode } = confirmDialog;
        setConfirmDialog(null);
        if (fromMode === "new") goRead();
        void loadPage(slug);
    }

    /** 편집·새 문서일 때만 사이드바에서 목록 재정렬·새 문서 등 편집 UI 표시 */
    const sidebarIsEditorChrome = canEdit && (mode === "edit" || mode === "new");

    return (
        <div className="flex min-h-0 w-full max-w-none flex-1 flex-col">
            {listError && (
                <p className="border-b border-red-100 bg-red-50 dark:bg-red-950/30 px-6 py-3 text-sm text-red-700 dark:text-red-300 sm:px-8">
                    {listError}
                </p>
            )}

            <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col lg:flex-row">
                <aside className="flex min-h-0 w-full flex-[1_1_28%] flex-col overflow-hidden border-b border-stone-200 bg-stone-50/90 px-4 py-4 dark:border-elivis-line dark:bg-elivis-surface-elevated lg:w-52 lg:flex-none lg:self-stretch lg:border-b-0 lg:border-r lg:px-3 lg:py-5 xl:w-56">
                    <h3
                        id="wiki-sidebar-page-list"
                        className="mb-3 shrink-0 text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-elivis-ink-secondary"
                    >
                        {t("pageList")}
                    </h3>
                    {sidebarIsEditorChrome && !listLoading && pages.length > 1 && (
                        <p className="mb-2 shrink-0 text-[11px] leading-snug text-stone-400 dark:text-elivis-ink-secondary">
                            {t("reorderHint")}
                        </p>
                    )}
                    {listLoading ? (
                        <div className="h-24 shrink-0 animate-pulse rounded-lg bg-stone-100 dark:bg-elivis-surface-elevated" aria-hidden />
                    ) : (
                        <div
                            role="region"
                            aria-labelledby="wiki-sidebar-page-list"
                            className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain [scrollbar-gutter:stable]"
                        >
                            {sidebarIsEditorChrome ? (
                                <DndContext
                                    id={`project-wiki-pages-${projectId}`}
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={onWikiDragEnd}
                                >
                                    <SortableContext
                                        items={pages.map((p) => p.slug)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <ul className="space-y-0.5">
                                            {pages.map((p) => {
                                                const active = p.slug === selectedSlug && mode !== "new";
                                                return (
                                                    <SortableWikiPageRow
                                                        key={p.slug}
                                                        page={p}
                                                        active={active}
                                                        dragLabel={t("dragReorderAria")}
                                                        onSelect={() => void selectPage(p.slug)}
                                                    />
                                                );
                                            })}
                                        </ul>
                                    </SortableContext>
                                </DndContext>
                            ) : (
                                <ul className="space-y-0.5">
                                    {pages.map((p) => {
                                        const active = p.slug === selectedSlug && mode !== "new";
                                        return (
                                            <li key={p.slug}>
                                                <button
                                                    type="button"
                                                    onClick={() => void selectPage(p.slug)}
                                                    className={[
                                                        "flex w-full min-w-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors",
                                                        active
                                                            ? "bg-stone-200 font-medium text-stone-900 dark:bg-elivis-surface dark:text-elivis-ink dark:ring-1 dark:ring-inset dark:ring-elivis-line"
                                                            : "text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-elivis-ink-secondary dark:hover:bg-elivis-surface/60 dark:hover:text-elivis-ink",
                                                    ].join(" ")}
                                                >
                                                    <span className="min-w-0 flex-1 truncate">{p.title}</span>
                                                    <span
                                                        className="shrink-0 text-[10px] text-stone-400 dark:text-elivis-ink-secondary"
                                                        aria-hidden
                                                    >
                                                        ·
                                                    </span>
                                                    <span className="max-w-[5rem] shrink-0 truncate font-mono text-[10px] text-stone-400 dark:text-elivis-ink-secondary sm:max-w-[6.5rem]">
                                                        {p.slug}
                                                    </span>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    )}
                    {sidebarIsEditorChrome && !listLoading && (
                        <button
                            type="button"
                            onClick={openNew}
                            className="mt-3 w-full shrink-0 rounded-lg border border-dashed border-stone-300 dark:border-elivis-line py-2 text-sm font-medium text-stone-600 dark:text-elivis-ink-secondary hover:border-stone-400 hover:bg-stone-50 dark:hover:bg-elivis-surface-elevated"
                        >
                            {t("newPage")}
                        </button>
                    )}
                </aside>

                <section className="flex min-h-0 min-w-0 flex-[1_1_72%] flex-col overflow-hidden bg-white dark:bg-elivis-surface lg:flex-1 lg:basis-0">
                    {pageError && (
                        <p className="border-b border-red-100 bg-red-50 dark:bg-red-950/30 px-6 py-3 text-sm text-red-700 dark:text-red-300 sm:px-8">
                            {pageError}
                        </p>
                    )}
                    {saveError && (
                        <p className="border-b border-red-100 bg-red-50 dark:bg-red-950/30 px-6 py-3 text-sm text-red-700 dark:text-red-300 sm:px-8">
                            {saveError}
                        </p>
                    )}

                    {(mode === "new" && canEdit) || (mode === "edit" && canEdit && pageDetail) ? (
                        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                            <div className="shrink-0 border-b border-stone-200 dark:border-elivis-line px-6 py-3 sm:px-8">
                                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-2 sm:gap-x-3">
                                    {mode === "new" ? (
                                        <>
                                            <span className="shrink-0 rounded bg-stone-100 dark:bg-elivis-surface-elevated px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-stone-500 dark:text-elivis-ink-secondary">
                                                {t("newPage")}
                                            </span>
                                            <input
                                                type="text"
                                                value={newSlug}
                                                onChange={(e) => setNewSlug(e.target.value)}
                                                placeholder={t("slugPlaceholder")}
                                                title={t("slugHelp")}
                                                autoComplete="off"
                                                aria-label={t("slugLabel")}
                                                className="w-[min(100%,10rem)] shrink-0 rounded-md border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface px-2 py-1 font-mono text-sm text-stone-800 dark:text-elivis-ink outline-none focus:border-stone-400 sm:w-44"
                                            />
                                            <span className="shrink-0 text-stone-300" aria-hidden>
                                                /
                                            </span>
                                            <input
                                                type="text"
                                                value={newTitle}
                                                onChange={(e) => setNewTitle(e.target.value)}
                                                placeholder={t("titlePlaceholder")}
                                                className="min-w-0 flex-1 border-0 border-b border-dashed border-transparent bg-transparent text-lg font-semibold text-stone-900 dark:text-elivis-ink outline-none placeholder:text-stone-300 focus:border-stone-300 sm:text-xl"
                                            />
                                        </>
                                    ) : (
                                        <>
                                            <span
                                                className="shrink-0 font-mono text-sm text-stone-500 dark:text-elivis-ink-secondary"
                                                title={t("slugLabel")}
                                            >
                                                {pageDetail!.slug}
                                            </span>
                                            <span className="shrink-0 text-stone-300" aria-hidden>
                                                /
                                            </span>
                                            <input
                                                type="text"
                                                value={draftTitle}
                                                onChange={(e) => setDraftTitle(e.target.value)}
                                                className="min-w-0 flex-1 border-0 border-b border-dashed border-transparent bg-transparent text-lg font-semibold text-stone-900 dark:text-elivis-ink outline-none focus:border-stone-300 sm:text-xl"
                                                aria-label={t("titleLabel")}
                                            />
                                        </>
                                    )}
                                </div>
                                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                                        <div
                                            className="inline-flex rounded-lg border border-stone-200 dark:border-elivis-line bg-stone-100/80 dark:bg-elivis-surface-elevated/80 p-0.5"
                                            role="tablist"
                                            aria-label={t("ariaEditorMode")}
                                        >
                                            <button
                                                type="button"
                                                role="tab"
                                                aria-selected={draftEditorMode === "rich"}
                                                onClick={() => selectDraftEditorMode("rich")}
                                                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                                                    draftEditorMode === "rich"
                                                        ? "bg-white text-stone-900 shadow-sm dark:bg-elivis-surface dark:text-elivis-ink"
                                                        : "text-stone-500 hover:text-stone-800 dark:text-elivis-ink-secondary dark:hover:text-elivis-ink"
                                                }`}
                                            >
                                                {t("editorRich")}
                                            </button>
                                            <button
                                                type="button"
                                                role="tab"
                                                aria-selected={draftEditorMode === "markdown"}
                                                onClick={() => selectDraftEditorMode("markdown")}
                                                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                                                    draftEditorMode === "markdown"
                                                        ? "bg-white text-stone-900 shadow-sm dark:bg-elivis-surface dark:text-elivis-ink"
                                                        : "text-stone-500 hover:text-stone-800 dark:text-elivis-ink-secondary dark:hover:text-elivis-ink"
                                                }`}
                                            >
                                                {t("editorMarkdown")}
                                            </button>
                                        </div>
                                        {draftEditorMode === "markdown" && (
                                            <>
                                                <span
                                                    className="hidden h-5 w-px shrink-0 bg-stone-200 dark:bg-elivis-surface-elevated sm:block"
                                                    aria-hidden
                                                />
                                                <div
                                                    className="inline-flex rounded-lg border border-stone-200 dark:border-elivis-line bg-stone-100/80 dark:bg-elivis-surface-elevated/80 p-0.5"
                                                    role="tablist"
                                                    aria-label={t("ariaMarkdownSubView")}
                                                >
                                                    <button
                                                        type="button"
                                                        role="tab"
                                                        aria-selected={markdownSubView === "edit"}
                                                        onClick={() => setMarkdownSubView("edit")}
                                                        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                                                            markdownSubView === "edit"
                                                                ? "bg-white text-stone-900 shadow-sm dark:bg-elivis-surface dark:text-elivis-ink"
                                                                : "text-stone-500 hover:text-stone-800 dark:text-elivis-ink-secondary dark:hover:text-elivis-ink"
                                                        }`}
                                                    >
                                                        {t("markdownEditTab")}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        role="tab"
                                                        aria-selected={markdownSubView === "preview"}
                                                        onClick={() => setMarkdownSubView("preview")}
                                                        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                                                            markdownSubView === "preview"
                                                                ? "bg-white text-stone-900 shadow-sm dark:bg-elivis-surface dark:text-elivis-ink"
                                                                : "text-stone-500 hover:text-stone-800 dark:text-elivis-ink-secondary dark:hover:text-elivis-ink"
                                                        }`}
                                                    >
                                                        {t("markdownPreviewTab")}
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {mode === "new" ? (
                                            <button
                                                type="button"
                                                onClick={saveNew}
                                                disabled={isPending}
                                                className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-40"
                                            >
                                                {isPending ? t("saving") : t("createPage")}
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={saveEdit}
                                                disabled={isPending}
                                                className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-40"
                                            >
                                                {isPending ? t("saving") : t("save")}
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={cancelEditor}
                                            disabled={isPending}
                                            className="rounded-lg border border-stone-200 dark:border-elivis-line px-4 py-2 text-sm font-medium text-stone-700 dark:text-elivis-ink hover:bg-stone-50 dark:hover:bg-elivis-surface-elevated"
                                        >
                                            {t("cancel")}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="wiki-read-body min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-auto px-6 py-4 sm:px-8">
                                <div className="min-h-0 flex-1">
                                    {draftEditorMode === "markdown" ? (
                                        <WikiMarkdownDraftArea
                                            liveMd={liveMd}
                                            setLiveMd={setLiveMd}
                                            subView={markdownSubView}
                                            setSubView={setMarkdownSubView}
                                            onWikiLink={onWikiNavigate}
                                            embedded
                                            hideSubTabs
                                            wikiAssetBaseUrl={wikiAssetBaseUrl}
                                            wikiMediaUpload={canEdit ? wikiMediaUpload : undefined}
                                        />
                                    ) : (
                                        <TeamIntroRichEditor
                                            key={editorKey}
                                            initialMarkdown={liveMd}
                                            onChangeMarkdown={setLiveMd}
                                            size="large"
                                            embedded
                                            wikiMediaUpload={canEdit ? wikiMediaUpload : undefined}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : pageLoading || listLoading ? (
                        <div
                            className="min-h-0 w-full flex-1 animate-pulse bg-stone-50/80 dark:bg-elivis-surface/80"
                            aria-busy
                            aria-label={t("loading")}
                        />
                    ) : pageDetail ? (
                        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-stone-200 dark:border-elivis-line px-6 py-4 sm:px-8">
                                <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                                    <h1 className="min-w-0 shrink-0 text-xl font-semibold tracking-tight text-stone-900 dark:text-elivis-ink sm:text-2xl">
                                        {pageDetail.title}
                                    </h1>
                                    <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-elivis-ink-secondary">
                                        <span className="hidden h-3 w-px shrink-0 bg-stone-200 dark:bg-elivis-surface-elevated sm:block" aria-hidden />
                                        <span className="font-medium text-stone-500 dark:text-elivis-ink-secondary">{t("lastEdited")}</span>
                                        <UserAvatar
                                            userId={pageDetail.updatedBy.id}
                                            label={pageDetail.updatedBy.name ?? pageDetail.updatedBy.email}
                                            avatarUrl={pageDetail.updatedBy.avatarUrl}
                                            sizeClass="h-6 w-6 text-[10px]"
                                            ringClass="ring-0"
                                        />
                                        <span className="font-medium text-stone-700 dark:text-elivis-ink">
                                            {pageDetail.updatedBy.name?.trim() || pageDetail.updatedBy.email}
                                        </span>
                                        <span className="text-stone-400 dark:text-elivis-ink-secondary">
                                            {formatWikiDate(pageDetail.updatedAt, locale)}
                                        </span>
                                    </div>
                                </div>
                                {canEdit && (
                                    <div className="flex shrink-0 flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={openEdit}
                                            className="rounded-lg bg-stone-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-700"
                                        >
                                            {t("edit")}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={openNew}
                                            className="rounded-lg border border-stone-200 dark:border-elivis-line px-3 py-1.5 text-sm font-medium text-stone-700 dark:text-elivis-ink hover:bg-stone-50 dark:hover:bg-elivis-surface-elevated"
                                        >
                                            {t("newPage")}
                                        </button>
                                        {pages.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={tryDelete}
                                                disabled={isPending}
                                                className="rounded-lg border border-red-200 dark:border-red-900/50 px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-40"
                                            >
                                                {t("deletePage")}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="wiki-read-body min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-auto px-6 py-4 sm:px-8">
                                {pageDetail.contentMd.trim() ? (
                                    <MarkdownContent
                                        markdown={pageDetail.contentMd}
                                        assetBaseUrl={wikiAssetBaseUrl}
                                        onWikiLink={onWikiNavigate}
                                        className="w-full max-w-none p-0 m-0"
                                    />
                                ) : (
                                    <p className="py-8 text-sm text-stone-400 dark:text-elivis-ink-secondary">
                                        {t("emptyPageBody")}
                                    </p>
                                )}
                            </div>
                        </div>
                    ) : null}
                </section>
            </div>

            <ConfirmModal
                open={confirmDialog !== null}
                title={
                    confirmDialog?.type === "delete"
                        ? t("deletePage")
                        : confirmDialog?.type === "switchPage"
                          ? t("confirmSwitchTitle")
                          : ""
                }
                description={
                    confirmDialog?.type === "delete"
                        ? t("confirmDelete")
                        : confirmDialog?.type === "switchPage"
                          ? t("confirmSwitchPage")
                          : ""
                }
                confirmLabel={
                    confirmDialog?.type === "delete" ? t("deletePage") : t("switchPageConfirm")
                }
                cancelLabel={t("cancel")}
                variant={confirmDialog?.type === "delete" ? "danger" : "default"}
                onClose={() => setConfirmDialog(null)}
                onConfirm={executeWikiConfirm}
            />
        </div>
    );
}
