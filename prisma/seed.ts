import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash("admin123", 10);
  const memberPassword = await bcrypt.hash("member123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@enigma.work" },
    update: {},
    create: {
      name: "Avery Quinn",
      email: "admin@enigma.work",
      password: adminPassword,
      role: "ADMIN",
      title: "Founder",
      avatarColor: "#E8A33D",
      employeeCode: "EMP-01",
      department: "Leadership",
      joiningDate: new Date("2023-01-15"),
      leaveBalanceDays: 18,
      performanceScore: 88,
    },
  });

  const member = await prisma.user.upsert({
    where: { email: "member@enigma.work" },
    update: {},
    create: {
      name: "Jordan Lee",
      email: "member@enigma.work",
      password: memberPassword,
      role: "MEMBER",
      title: "Designer",
      avatarColor: "#60A5FA",
      employeeCode: "EMP-17",
      department: "Design",
      joiningDate: new Date("2026-02-09"),
      leaveBalanceDays: 14.5,
      performanceScore: 63,
    },
  });

  const client = await prisma.client.upsert({
    where: { id: "seed-client-1" },
    update: {},
    create: {
      id: "seed-client-1",
      name: "Northwind Traders",
      company: "Northwind Traders Ltd.",
      email: "hello@northwind.example",
      notes: "Long-standing retail client, quarterly retainer.",
    },
  });

  const project = await prisma.project.upsert({
    where: { id: "seed-project-1" },
    update: {},
    create: {
      id: "seed-project-1",
      name: "Website Relaunch",
      description: "Full redesign and CMS migration.",
      status: "ACTIVE",
      clientId: client.id,
      budget: 25000,
    },
  });

  await prisma.task.createMany({
    data: [
      { title: "Audit current site", projectId: project.id, assigneeId: admin.id, status: "DONE", priority: "MEDIUM" },
      { title: "Design new homepage", projectId: project.id, assigneeId: member.id, status: "IN_PROGRESS", priority: "HIGH" },
      { title: "Migrate content", projectId: project.id, status: "TODO", priority: "MEDIUM" },
    ],
    skipDuplicates: true,
  });

  const conversation = await prisma.conversation.upsert({
    where: { id: "seed-conversation-1" },
    update: {},
    create: {
      id: "seed-conversation-1",
      isGroup: false,
      participants: {
        create: [{ userId: admin.id }, { userId: member.id }],
      },
    },
  });

  await prisma.directMessage.createMany({
    data: [
      { conversationId: conversation.id, userId: admin.id, content: "Welcome to Enigma Workplace 👋" },
      { conversationId: conversation.id, userId: member.id, content: "Excited to get started on the relaunch." },
    ],
    skipDuplicates: true,
  });

  console.log("Seed complete. Admin login: admin@enigma.work / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
