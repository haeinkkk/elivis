import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";

import { generatePublicId } from "../src/id";

const prisma = new PrismaClient();

/** SHA-256 기반 단순 해시 (실제 서비스에서는 bcrypt 사용 권장) */
function hashPassword(plain: string): string {
  return createHash("sha256").update(plain).digest("hex");
}

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@elivis.dev";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "admin1234!";

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    console.log(`[seed] SUPER_ADMIN 이미 존재: ${email}`);
    return;
  }

  const admin = await prisma.user.create({
    data: {
      id: generatePublicId(),
      email,
      name: "Super Admin",
      password: hashPassword(password),
      systemRole: "SUPER_ADMIN",
    },
  });

  console.log(`[seed] SUPER_ADMIN 생성 완료:`);
  console.log(`       id    : ${admin.id}`);
  console.log(`       email : ${admin.email}`);
  console.log(`       ⚠️  초기 비밀번호를 반드시 변경하세요.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
