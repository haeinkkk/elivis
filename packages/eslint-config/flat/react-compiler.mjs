import reactCompiler from "eslint-plugin-react-compiler";

/** Next.js 등 기존 Flat 배열에 끼워 넣는 React Compiler 플러그인 블록 */
export function reactCompilerFlat() {
    return [
        {
            plugins: {
                "react-compiler": reactCompiler,
            },
            rules: {
                "react-compiler/react-compiler": "error",
            },
        },
    ];
}
