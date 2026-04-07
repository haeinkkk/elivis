import type { Editor } from "@tiptap/core";

type FontSizeChain = {
    setFontSize: (size: string) => { run: () => boolean };
    unsetFontSize: () => { run: () => boolean };
};

/** `TaskDetailFontSize`가 체인에 붙인 커스텀 명령 실행 (Editor 타입에 미포함) */
export function applyTaskDetailFontSize(editor: Editor, pxOrEmpty: string): void {
    const ch = editor.chain().focus() as unknown as FontSizeChain;
    if (pxOrEmpty === "") {
        ch.unsetFontSize().run();
    } else {
        ch.setFontSize(pxOrEmpty).run();
    }
}
