// Server load for Atelier public page (SSR)
import type { PageServerLoad } from "@sveltejs/kit";
import { loadPublicAtelierSnapshot } from "$root/src/lib/atelier-repository";

export const load: PageServerLoad = async ({ params }) => {
  const { slug } = params;
  try {
    const snapshot = await loadPublicAtelierSnapshot(slug); // built for tenant ID resolution
    if (!snapshot.atelier) {
      return { status: 404, error: new Error("Atelier not found") };
    }
    return { atelier: snapshot.atelier, lookbook: snapshot.lookbook };
  } catch (e) {
    console.error(e);
    return { status: 500, error: new Error("Internal error") };
  }
};
