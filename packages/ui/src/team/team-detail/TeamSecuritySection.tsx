"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import type { TeamDetail } from "../../types/team-detail";
import type { UpdateTeamFieldsFn } from "../../types/team-fields-actions";

export type TeamDeleteFn = (
    teamId: string,
    teamNameForConfirm: string,
) => Promise<{ ok: boolean; message?: string }>;

export function TeamSecuritySection({
    team,
    updateTeamFields,
    deleteTeam,
    onRefresh,
    navigateAfterDelete,
}: {
    team: TeamDetail;
    updateTeamFields: UpdateTeamFieldsFn;
    deleteTeam: TeamDeleteFn;
    onRefresh: () => void;
    navigateAfterDelete: () => void;
}) {
    const t = useTranslations("teams.detail");
    const isLeader = team.viewerRole === "LEADER";
    const [hiddenFromUsers, setHiddenFromUsers] = useState(team.hiddenFromUsers);
    const [hiddenError, setHiddenError] = useState<string | null>(null);
    const [hiddenPending, startHiddenSave] = useTransition();

    const [deleteNameModalOpen, setDeleteNameModalOpen] = useState(false);
    const [deleteConfirmModalOpen, setDeleteConfirmModalOpen] = useState(false);
    const [deleteNameInput, setDeleteNameInput] = useState("");
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [deletePending, startDelete] = useTransition();

    useEffect(() => {
        setHiddenFromUsers(team.hiddenFromUsers);
    }, [team.id, team.hiddenFromUsers]);

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
        if (trimmed !== team.name) {
            setDeleteError(t("errors.teamNameMismatch"));
            return;
        }
        setDeleteError(null);
        setDeleteNameModalOpen(false);
        setDeleteConfirmModalOpen(true);
    };

    return (
        <div className="space-y-10">
            <div>
                <h2 className="mb-1 text-base font-semibold text-stone-800">{t("security.hideTeam.title")}</h2>
                <p className="text-sm text-stone-500">{t("security.hideTeam.desc")}</p>
                {isLeader ? (
                    <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-stone-200 bg-stone-50/80 px-4 py-3">
                        <input
                            type="checkbox"
                            className="mt-0.5 h-4 w-4 shrink-0 rounded border-stone-300 text-stone-800 focus:ring-stone-400"
                            checked={hiddenFromUsers}
                            disabled={hiddenPending}
                            onChange={(e) => {
                                const next = e.target.checked;
                                setHiddenError(null);
                                setHiddenFromUsers(next);
                                startHiddenSave(async () => {
                                    const r = await updateTeamFields(team.id, {
                                        hiddenFromUsers: next,
                                    });
                                    if (!r.ok) {
                                        setHiddenFromUsers(!next);
                                        setHiddenError(r.message ?? t("errors.saveFailed"));
                                    } else {
                                        setHiddenFromUsers(r.hiddenFromUsers);
                                        onRefresh();
                                    }
                                });
                            }}
                        />
                        <span className="text-sm text-stone-800">{t("security.hideTeam.toggleLabel")}</span>
                    </label>
                ) : (
                    <p className="mt-4 rounded-lg border border-stone-100 bg-stone-50 px-3 py-2 text-sm text-stone-600">
                        {hiddenFromUsers
                            ? t("security.hideTeam.stateHidden")
                            : t("security.hideTeam.stateVisible")}
                        <span className="block text-stone-400">{t("security.hideTeam.leaderOnlyNote")}</span>
                    </p>
                )}
                {hiddenError ? <p className="mt-2 text-sm text-red-600">{hiddenError}</p> : null}
            </div>

            <div className="h-px bg-stone-100" />

            <div>
                <h2 className="mb-1 text-base font-semibold text-stone-800">{t("security.deleteTeam.title")}</h2>
                <p className="text-sm text-stone-500">{t("security.deleteTeam.desc")}</p>
                {isLeader ? (
                    <button
                        type="button"
                        onClick={openDeleteNameModal}
                        className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
                    >
                        {t("security.deleteTeam.button")}
                    </button>
                ) : (
                    <p className="mt-4 text-sm text-stone-400">{t("security.deleteTeam.leaderOnlyNote")}</p>
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
                        aria-labelledby="team-delete-name-title"
                    >
                        <h3 id="team-delete-name-title" className="text-base font-semibold text-stone-800">
                            {t("security.deleteTeam.modalName.title")}
                        </h3>
                        <p className="mt-2 text-sm text-stone-600">{t("security.deleteTeam.modalName.desc")}</p>
                        <p className="mt-1 font-mono text-sm font-medium text-stone-800">{team.name}</p>
                        <input
                            type="text"
                            value={deleteNameInput}
                            onChange={(e) => {
                                setDeleteNameInput(e.target.value);
                                setDeleteError(null);
                            }}
                            disabled={deletePending}
                            autoComplete="off"
                            placeholder={t("security.deleteTeam.modalName.placeholder")}
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
                                {t("common.cancel")}
                            </button>
                            <button
                                type="button"
                                onClick={proceedToDeleteConfirm}
                                disabled={deletePending}
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                            >
                                {t("common.delete")}
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
                        aria-labelledby="team-delete-confirm-title"
                    >
                        <h3 id="team-delete-confirm-title" className="text-base font-semibold text-stone-800">
                            {t("security.deleteTeam.modalConfirm.title")}
                        </h3>
                        <p className="mt-2 text-sm text-stone-600">{t("security.deleteTeam.modalConfirm.desc")}</p>
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
                                {t("common.back")}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setDeleteError(null);
                                    startDelete(async () => {
                                        const r = await deleteTeam(team.id, team.name);
                                        if (!r.ok) {
                                            setDeleteError(r.message ?? t("errors.deleteFailed"));
                                            setDeleteConfirmModalOpen(false);
                                            setDeleteNameModalOpen(true);
                                        } else {
                                            closeDeleteModals();
                                            navigateAfterDelete();
                                        }
                                    });
                                }}
                                disabled={deletePending}
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                            >
                                {deletePending ? t("common.deleting") : t("common.delete")}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
