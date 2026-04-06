import { TextStyle as TextStyleBase } from "@tiptap/extension-text-style";

/** fontSize 속성을 지원하도록 TextStyle 확장 */
export const TeamCommunityTextStyle = TextStyleBase.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            fontSize: {
                default: null,
                parseHTML: (el) => (el as HTMLElement).style.fontSize || null,
                renderHTML: (attrs) =>
                    attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {},
            },
        };
    },
});
