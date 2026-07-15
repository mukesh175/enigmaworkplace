"use server";

import { prisma } from "@/lib/prisma";

export async function quickSearch(query: string) {
  const q = query.trim();
  if (q.length < 2) return { clients: [], projects: [], tasks: [] };

  const [clients, projects, tasks] = await Promise.all([
    prisma.client.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      take: 5,
    }),
    prisma.project.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      take: 5,
    }),
    prisma.task.findMany({
      where: { title: { contains: q, mode: "insensitive" } },
      take: 5,
      include: { project: true },
    }),
  ]);

  return {
    clients: clients.map((c) => ({ id: c.id, label: c.name, href: `/clients/${c.id}` })),
    projects: projects.map((p) => ({ id: p.id, label: p.name, href: `/projects/${p.id}` })),
    tasks: tasks.map((t) => ({ id: t.id, label: `${t.title} — ${t.project.name}`, href: `/tasks/${t.id}` })),
  };
}
