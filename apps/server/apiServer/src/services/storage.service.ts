import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "fs";
import path from "path";

// ─────────────────────────────────────────────────────────────────────────────
// 인터페이스
// ─────────────────────────────────────────────────────────────────────────────

export interface StorageService {
    /**
     * 파일을 저장하고 공개 URL(또는 상대 경로)을 반환합니다.
     * @param key  저장 경로 키 (예: "avatars/userId.webp")
     */
    upload(key: string, buffer: Buffer, contentType: string): Promise<string>;

    /**
     * upload()가 반환한 URL로 파일을 삭제합니다.
     */
    remove(url: string): Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Local Storage
// ─────────────────────────────────────────────────────────────────────────────

function createLocalStorage(uploadsDir: string): StorageService {
    return {
        async upload(key, buffer) {
            const filePath = path.join(uploadsDir, key);
            mkdirSync(path.dirname(filePath), { recursive: true });
            writeFileSync(filePath, buffer);
            return `/uploads/${key}`;
        },

        async remove(url) {
            // url 예: /uploads/avatars/xxx.webp
            const relative = url.replace(/^\/uploads\//, "");
            const filePath = path.join(uploadsDir, relative);
            if (existsSync(filePath)) {
                unlinkSync(filePath);
            }
        },
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// S3 / 호환 오브젝트 스토리지
// ─────────────────────────────────────────────────────────────────────────────

function createS3Storage(): StorageService {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { S3Client, PutObjectCommand, DeleteObjectCommand } =
        require("@aws-sdk/client-s3") as typeof import("@aws-sdk/client-s3");

    const bucket = process.env.UPLOAD_S3_BUCKET;
    const region = process.env.UPLOAD_S3_REGION ?? "us-east-1";
    const endpoint = process.env.UPLOAD_S3_ENDPOINT;
    const cdnUrl = process.env.UPLOAD_S3_CDN_URL;
    const accessKeyId = process.env.UPLOAD_S3_ACCESS_KEY;
    const secretAccessKey = process.env.UPLOAD_S3_SECRET_KEY;

    if (!bucket) throw new Error("UPLOAD_S3_BUCKET 환경변수가 설정되지 않았습니다.");
    if (!accessKeyId) throw new Error("UPLOAD_S3_ACCESS_KEY 환경변수가 설정되지 않았습니다.");
    if (!secretAccessKey) throw new Error("UPLOAD_S3_SECRET_KEY 환경변수가 설정되지 않았습니다.");

    const client = new S3Client({
        region,
        credentials: { accessKeyId, secretAccessKey },
        ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    });

    function toPublicUrl(key: string): string {
        if (cdnUrl) return `${cdnUrl.replace(/\/$/, "")}/${key}`;
        if (endpoint) return `${endpoint.replace(/\/$/, "")}/${bucket}/${key}`;
        return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    }

    function toKey(url: string): string {
        if (cdnUrl && url.startsWith(cdnUrl)) {
            return url.slice(cdnUrl.replace(/\/$/, "").length + 1);
        }
        // s3 호스팅 URL 에서 key 추출
        const u = new URL(url);
        return u.pathname.replace(/^\//, "").replace(`${bucket}/`, "");
    }

    return {
        async upload(key, buffer, contentType) {
            await client.send(
                new PutObjectCommand({
                    Bucket: bucket,
                    Key: key,
                    Body: buffer,
                    ContentType: contentType,
                }),
            );
            return toPublicUrl(key);
        },

        async remove(url) {
            await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: toKey(url) }));
        },
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// 팩토리
// ─────────────────────────────────────────────────────────────────────────────

export function createStorageService(uploadsDir: string): StorageService {
    const storageType = (process.env.UPLOAD_STORAGE ?? "local").toLowerCase().trim();

    if (storageType === "s3") {
        console.log("[storage] S3 스토리지를 사용합니다.");
        return createS3Storage();
    }

    if (storageType !== "local") {
        console.warn(
            `[storage] 알 수 없는 UPLOAD_STORAGE 값 "${storageType}" → local로 대체합니다.`,
        );
    }

    console.log(`[storage] 로컬 디스크를 사용합니다. (${uploadsDir})`);
    return createLocalStorage(uploadsDir);
}
