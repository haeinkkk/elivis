import { ko } from "./locales/ko";

/**
 * ko/en/ja가 같은 키 구조를 갖고, 값만 번역 문자열로 다르다는 것을 타입으로 표현.
 * (각 로케일의 `as const` 리터럴 타입은 서로 호환되지 않으므로, 리프는 모두 string 으로 통일)
 */
export type DeepStringify<T> = T extends string
    ? string
    : T extends object
      ? { readonly [K in keyof T]: DeepStringify<T[K]> }
      : T;

export type LocaleMessages = DeepStringify<typeof ko>;
