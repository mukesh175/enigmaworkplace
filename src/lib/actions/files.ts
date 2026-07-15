"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// NOTE: This records file *metadata* (name + URL). To store actual binary
// uploads, wire this action to Vercel Blob (see README) and pass the
// resulting blob URL in the `url` field.
export async function addFile(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session) return;

  const name = String(formData.get("name") || "").trim();
  const url = String(formData.get("url") || "").trim();
  if (!name || !url) return;

  await prisma.fileAsset.create({
    data: {
      name,
      url,
      uploadedById: session.user.id,
      projectId: String(formData.get("projectId") || "") || null,
    },
  });

  revalidatePath("/files");
}

export async function deleteFile(id: string) {
  await prisma.fileAsset.delete({ where: { id } });
  revalidatePath("/files");
}
