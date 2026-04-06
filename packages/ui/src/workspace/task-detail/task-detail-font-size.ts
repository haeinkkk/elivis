// eslint-disable-next-line import/no-extraneous-dependencies
import { Extension } from "@tiptap/core";

/** 글자 크기 커스텀 확장 */
export const TaskDetailFontSize = Extension.create({
    name: "fontSize",
    addOptions() {
        return { types: ["textStyle"] };
    },
    addGlobalAttributes() {
        return [
            {
                types: this.options.types,
                attributes: {
                    fontSize: {
                        default: null,
                        parseHTML: (el: HTMLElement) => el.style.fontSize?.replace("px", "") || null,
                        renderHTML: (attrs: Record<string, unknown>) =>
                            attrs.fontSize ? { style: `font-size: ${attrs.fontSize}px` } : {},
                    },
                },
            },
        ];
    },
    addCommands() {
        return {
            setFontSize:
                (size: string) =>
                ({ chain }: { chain: () => any }) =>
                    chain().setMark("textStyle", { fontSize: size }).run(),
            unsetFontSize:
                () =>
                ({ chain }: { chain: () => any }) =>
                    chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run(),
        } as any;
    },
});
