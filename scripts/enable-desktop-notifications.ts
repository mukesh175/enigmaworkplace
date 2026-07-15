// One-time script: turns on the desktopNotifications flag for every existing
// user. New signups already default to true via the schema, but this
// updates accounts created before that change.
// Run with: npx tsx scripts/enable-desktop-notifications.ts
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.user.updateMany({
    where: { desktopNotifications: false },
    data: { desktopNotifications: true },
  });
  console.log(`Updated ${result.count} user(s).`);
}

main().finally(() => prisma.$disconnect());
