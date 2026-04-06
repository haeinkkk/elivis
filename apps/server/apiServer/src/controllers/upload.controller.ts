import { randomBytes } from "crypto";
import path from "path";

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { UPLOAD_MAX_FILE_SIZE, storageService } from "../index";
import { badRequest, created } from "../utils/response";

// 허용 MIME 타입 (이미지)
const IMAGE_MIME_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
]);

// 허용 MIME 타입 (일반 파일) - 위험 실행 파일 제외
const BLOCKED_MIME_TYPES = new Set([
    "application/x-msdownload",
    "application/x-executable",
    "application/x-sh",
    "application/x-bat",
]);

function generateFileName(originalName: string): string {
    const ext = path.extname(originalName).toLowerCase();
    const rand = randomBytes(12).toString("hex");
    return `${rand}${ext}`;
}

export function uploadController(_app: FastifyInstance) {
    // ── POST /api/upload ───────────────────────────────────────────────────────
    async function uploadFile(request: FastifyRequest, reply: FastifyReply) {
        const data = await request.file();
        if (!data) return reply.code(400).send(badRequest("파일이 없습니다."));

        const { filename, mimetype } = data;

        if (BLOCKED_MIME_TYPES.has(mimetype)) {
            return reply.code(400).send(badRequest("업로드가 허용되지 않는 파일 형식입니다."));
        }

        // 파일 버퍼 읽기
        const chunks: Buffer[] = [];
        let totalSize = 0;
        for await (const chunk of data.file) {
            totalSize += chunk.length;
            if (totalSize > UPLOAD_MAX_FILE_SIZE) {
                return reply.code(413).send(badRequest(`파일 크기가 너무 큽니다. (최대 ${process.env.UPLOAD_MAX_FILE_SIZE_MB ?? 2}MB)`));
            }
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        const isImage = IMAGE_MIME_TYPES.has(mimetype);
        const folder = isImage ? "team-posts/images" : "team-posts/files";
        const savedName = generateFileName(filename);
        const key = `${folder}/${savedName}`;

        const url = await storageService.upload(key, buffer, mimetype);

        return reply.code(201).send(
            created(
                {
                    url,
                    name: filename,
                    mimeType: mimetype,
                    size: totalSize,
                    isImage,
                },
                "업로드가 완료되었습니다.",
            ),
        );
    }

    return { uploadFile };
}
