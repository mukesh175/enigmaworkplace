import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conversation = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: {
      participants: true,
      messages: { orderBy: { createdAt: "asc" }, include: { user: true, file: true } },
    },
  });

  if (!conversation || !conversation.participants.some((p) => p.userId === session.user.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    messages: conversation.messages,
    participants: conversation.participants.map((p) => ({
      userId: p.userId,
      lastReadAt: p.lastReadAt,
    })),
  });
}
