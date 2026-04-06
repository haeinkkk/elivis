"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { deleteProjectAction, updateProjectAction } from "@/app/actions/projects";
import type { Project } from "@/lib/projects";

import { ProjectAddMemberModal } from "./ProjectAddMemberModal";

function parseDateInputValue(s: string): number | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
    if (!m) return null;
    const t = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
    return Number.isNaN(t) ? null : t;
}

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

const inputClass =
    "w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800 outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-100 disabled:opacity-60";

export function ProjectSettingsProjectTab({
    project,
    onUpdated,
}: {
    project: Project;
    onUpdated: (p: Project) => void;
}) {
    const isLeader = project.viewerRole === "LEADER";
    const [name, setName] = useState(project.name);
    const [description, setDescription] = useState(project.description);
    const [isPublic, setIsPublic] = useState(project.isPublic);
    const [startDate, setStartDate] = useState(project.startDate);
    const [endDate, setEndDate] = useState(project.endDate);
    const [noEndDate, setNoEndDate] = useState(project.noEndDate);
    const [error, setError] = useState<string | null>(null);
    const [pending, startSave] = useTransition();
    const [inviteOpen, setInviteOpen] = useState(false);

    useEffect(() => {
        setName(project.name);
        setDescription(project.description);
        setIsPublic(project.isPublic);
        setStartDate(project.startDate);
        setEndDate(project.endDate);
        setNoEndDate(project.noEndDate);
        setError(null);
    }, [
        project.id,
        project.name,
        project.description,
        project.isPublic,
        project.startDate,
        project.endDate,
        project.noEndDate,
    ]);

    const handleSave = () => {
        const trimmed = name.trim();
        if (!trimmed) {
            setError("프로젝트 명을 입력해 주세요.");
            return;
        }
        const periodErr = validatePeriodRequired(startDate, endDate, noEndDate);
        if (periodErr) {
            setError(periodErr);
            return;
        }
        setError(null);
        startSave(async () => {
            const r = await updateProjectAction(project.id, {
                name: trimmed,
                description: description.trim() || null,
                isPublic,
                startDate: startDate.trim(),
                endDate: noEndDate ? undefined : endDate.trim() || undefined,
                noEndDate,
            });
            if (!r.ok) {
                setError(r.message);
                return;
            }
            onUpdated(r.project);
        });
    };

    if (!isLeader) {
        return (
            <div className="space-y-8">
                <div>
                    <h2 className="mb-1 text-base font-semibold text-stone-800">프로젝트 정보</h2>
                    <p className="text-sm text-stone-500">
                        이름·기간·공개 여부는 프로젝트 리더만 수정할 수 있습니다.
                    </p>
                    <div className="mt-4 space-y-3 rounded-lg border border-stone-100 bg-stone-50/50 px-4 py-3 text-sm text-stone-700">
                        <p>
                            <span className="text-stone-500">이름</span>{" "}
                            <span className="font-medium text-stone-800">{project.name}</span>
                        </p>
                        <p className="border-t border-stone-100 pt-3">
                            <span className="text-stone-500">설명</span>
                            <span className="mt-1 block whitespace-pre-wrap text-stone-800">
                                {project.description?.trim() || "—"}
                            </span>
                        </p>
                        <p className="border-t border-stone-100 pt-3">
                            <span className="text-stone-500">공개</span>{" "}
                            <span className="font-medium text-stone-800">
                                {project.isPublic ? "공개" : "비공개"}
                            </span>
                        </p>
                        <p className="border-t border-stone-100 pt-3">
                            <span className="text-stone-500">기간</span>
                            <span className="mt-1 block text-stone-800">
                                {project.startDate}
                                {project.noEndDate
                                    ? " ~ 종료일 미정"
                                    : project.endDate
                                      ? ` ~ ${project.endDate}`
                                      : ""}
                            </span>
                        </p>
                    </div>
                </div>

                <div className="h-px bg-stone-100" />

                <div>
                    <h2 className="mb-1 text-base font-semibold text-stone-800">멤버</h2>
                    <p className="text-sm text-stone-500">
                        프로젝트 리더만 새 멤버를 초대할 수 있습니다.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h2 className="mb-1 text-base font-semibold text-stone-800">프로젝트 정보</h2>
                <p className="text-sm text-stone-500">
                    프로젝트 리더(생성자)가 이름·설명·기간·공개 여부를 수정합니다.
                </p>

                <div className="mt-4 space-y-4">
                    <div>
                        <label htmlFor="proj-edit-name" className="block text-sm font-medium text-stone-700">
                            프로젝트 이름
                        </label>
                        <input
                            id="proj-edit-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={pending}
                            className={`mt-1.5 ${inputClass}`}
                        />
                    </div>
                    <div>
                        <label htmlFor="proj-edit-desc" className="block text-sm font-medium text-stone-700">
                            설명
                        </label>
                        <textarea
                            id="proj-edit-desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={pending}
                            rows={4}
                            className={`mt-1.5 resize-y ${inputClass}`}
                        />
                    </div>
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-stone-200 bg-stone-50/80 px-4 py-3">
                        <input
                            type="checkbox"
                            className="mt-0.5 h-4 w-4 shrink-0 rounded border-stone-300 text-stone-800 focus:ring-stone-400"
                            checked={isPublic}
                            disabled={pending}
                            onChange={(e) => setIsPublic(e.target.checked)}
                        />
                        <span className="text-sm text-stone-800">목록 등에 공개</span>
                    </label>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="proj-edit-start" className="block text-sm font-medium text-stone-700">
                                시작일
                            </label>
                            <input
                                id="proj-edit-start"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                disabled={pending}
                                className={`mt-1.5 ${inputClass}`}
                            />
                        </div>
                        <div>
                            <label htmlFor="proj-edit-end" className="block text-sm font-medium text-stone-700">
                                종료일
                            </label>
                            <input
                                id="proj-edit-end"
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                disabled={pending || noEndDate}
                                className={`mt-1.5 ${inputClass}`}
                            />
                        </div>
                    </div>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-700">
                        <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-stone-300 text-stone-800 focus:ring-stone-400"
                            checked={noEndDate}
                            disabled={pending}
                            onChange={(e) => {
                                const v = e.target.checked;
                                setNoEndDate(v);
                                if (v) setEndDate("");
                            }}
                        />
                        종료일 미정
                    </label>
                </div>

                {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

                <div className="mt-5">
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={pending}
                        className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {pending ? "저장 중…" : "저장"}
                    </button>
                </div>
            </div>

            <div className="h-px bg-stone-100" />

            <div>
                <h2 className="mb-1 text-base font-semibold text-stone-800">멤버</h2>
                <p className="text-sm text-stone-500">
                    사용자를 검색해 프로젝트에 초대합니다. 초대된 사용자는 멤버로 등록되고 개인
                    워크스페이스가 생성됩니다.
                </p>
                <p className="mt-2 text-sm text-stone-600">
                    현재 <span className="font-semibold text-stone-800">{project.participants.length}</span>
                    명 참여 중
                </p>
                <div className="mt-4">
                    <button
                        type="button"
                        onClick={() => setInviteOpen(true)}
                        className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 transition hover:bg-stone-50"
                    >
                        멤버 초대
                    </button>
                </div>
                <ProjectAddMemberModal
                    open={inviteOpen}
                    onClose={() => setInviteOpen(false)}
                    projectId={project.id}
                    existingUserIds={project.participants.map((p) => p.id)}
                    onSuccess={onUpdated}
                />
            </div>
        </div>
    );
}

export function ProjectSettingsSecurityTab({ project }: { project: Project }) {
    const router = useRouter();
    const isLeader = project.viewerRole === "LEADER";

    const [deleteNameModalOpen, setDeleteNameModalOpen] = useState(false);
    const [deleteConfirmModalOpen, setDeleteConfirmModalOpen] = useState(false);
    const [deleteNameInput, setDeleteNameInput] = useState("");
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [deletePending, startDelete] = useTransition();

    const closeDeleteModals = () => {
        setDeleteNameModalOpen(false);
        setDeleteConfirmModalOpen(false);
        setDeleteNameInput("");
        setDeleteError(null);
    };

    const openDeleteNameModal = () => {
        setDeleteError(null);
        setDeleteNameInput("");
        setDeleteNameModalOpen(true);
    };

    const proceedToDeleteConfirm = () => {
        const trimmed = deleteNameInput.trim();
        if (trimmed !== project.name) {
            setDeleteError("프로젝트 이름이 일치하지 않습니다.");
            return;
        }
        setDeleteError(null);
        setDeleteNameModalOpen(false);
        setDeleteConfirmModalOpen(true);
    };

    return (
        <div className="space-y-10">
            <div>
                <h2 className="mb-1 text-base font-semibold text-stone-800">커스텀 필드</h2>
                <p className="text-sm text-stone-500">업무에 쓸 추가 필드를 정의합니다.</p>
                <div className="mt-4">
                    <div className="flex items-center gap-2 rounded-lg border border-stone-100 bg-stone-50/50 px-4 py-3 text-sm text-stone-600">
                        커스텀 필드 (데모)
                    </div>
                </div>
            </div>

            <div className="h-px bg-stone-100" />

            <div>
                <h2 className="mb-1 text-base font-semibold text-stone-800">자동화 규칙</h2>
                <p className="text-sm text-stone-500">조건에 따라 알림·상태 변경을 실행합니다.</p>
                <div className="mt-4">
                    <div className="flex items-center gap-2 rounded-lg border border-stone-100 bg-stone-50/50 px-4 py-3 text-sm text-stone-600">
                        자동화 규칙 (데모)
                    </div>
                </div>
            </div>

            <div className="h-px bg-stone-100" />

            <div>
                <h2 className="mb-1 text-base font-semibold text-stone-800">프로젝트 삭제</h2>
                <p className="text-sm text-stone-500">
                    삭제하면 복구할 수 없습니다. 프로젝트에 연결된 업무 등이 함께 삭제됩니다.
                </p>
                {isLeader ? (
                    <button
                        type="button"
                        onClick={openDeleteNameModal}
                        className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
                    >
                        프로젝트 삭제…
                    </button>
                ) : (
                    <p className="mt-4 text-sm text-stone-400">프로젝트 리더만 삭제할 수 있습니다.</p>
                )}
            </div>

            {deleteNameModalOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40 bg-stone-900/40"
                        aria-hidden
                        onClick={() => !deletePending && closeDeleteModals()}
                    />
                    <div
                        className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-stone-200 bg-white p-6 shadow-xl"
                        role="dialog"
                        aria-modal
                        aria-labelledby="project-delete-name-title"
                    >
                        <h3
                            id="project-delete-name-title"
                            className="text-base font-semibold text-stone-800"
                        >
                            프로젝트 삭제
                        </h3>
                        <p className="mt-2 text-sm text-stone-600">
                            계속하려면 아래와 동일한 프로젝트 이름을 입력하세요.
                        </p>
                        <p className="mt-1 font-mono text-sm font-medium text-stone-800">{project.name}</p>
                        <input
                            type="text"
                            value={deleteNameInput}
                            onChange={(e) => {
                                setDeleteNameInput(e.target.value);
                                setDeleteError(null);
                            }}
                            disabled={deletePending}
                            autoComplete="off"
                            placeholder="프로젝트 이름"
                            className="mt-4 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800 outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-100 disabled:opacity-60"
                        />
                        {deleteError ? <p className="mt-2 text-sm text-red-600">{deleteError}</p> : null}
                        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={closeDeleteModals}
                                disabled={deletePending}
                                className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60"
                            >
                                취소
                            </button>
                            <button
                                type="button"
                                onClick={proceedToDeleteConfirm}
                                disabled={deletePending}
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                            >
                                다음
                            </button>
                        </div>
                    </div>
                </>
            )}

            {deleteConfirmModalOpen && (
                <>
                    <div
                        className="fixed inset-0 z-[45] bg-stone-900/50"
                        aria-hidden
                        onClick={() => !deletePending && setDeleteConfirmModalOpen(false)}
                    />
                    <div
                        className="fixed left-1/2 top-1/2 z-[55] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-stone-200 bg-white p-6 shadow-xl"
                        role="dialog"
                        aria-modal
                        aria-labelledby="project-delete-confirm-title"
                    >
                        <h3
                            id="project-delete-confirm-title"
                            className="text-base font-semibold text-stone-800"
                        >
                            정말 삭제할까요?
                        </h3>
                        <p className="mt-2 text-sm text-stone-600">
                            이 작업은 되돌릴 수 없습니다. 프로젝트와 관련 데이터가 모두 삭제됩니다.
                        </p>
                        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => {
                                    setDeleteConfirmModalOpen(false);
                                    setDeleteNameModalOpen(true);
                                }}
                                disabled={deletePending}
                                className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60"
                            >
                                뒤로
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setDeleteError(null);
                                    startDelete(async () => {
                                        const r = await deleteProjectAction(project.id, project.name);
                                        if (!r.ok) {
                                            setDeleteError(r.message ?? "삭제에 실패했습니다.");
                                            setDeleteConfirmModalOpen(false);
                                            setDeleteNameModalOpen(true);
                                        } else {
                                            closeDeleteModals();
                                            router.push("/projects");
                                        }
                                    });
                                }}
                                disabled={deletePending}
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                            >
                                {deletePending ? "삭제 중…" : "삭제"}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
