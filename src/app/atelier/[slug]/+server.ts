// TanStack Start loader for atelier public page
import { createServerData$ } from "@tanstack/start/server";
import { loadPublicAtelierSnapshot } from "$root/src/lib/atelier-repository";

export const loader = async ({ params }: { params: { slug: string } }) => {
  const { slug } = params;
  const snapshot = await loadPublicAtelierSnapshot(slug);
  if (!snapshot.atelier) {
    throw new Response("Not Found", { status: 404 });
  }
  return snapshot;
};
