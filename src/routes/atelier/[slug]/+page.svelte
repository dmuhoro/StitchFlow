import { AteliersPublicHero, LookbookGallery } from "$root/src/components";
import type { PageProps } from "@sveltejs/kit";

export default function AtelierPage({ data }: PageProps) {
  const { atelier, lookbook } = data;

  // TODO: add meta tags, OG, structured data here.
  return (
    <section>
      <AteliersPublicHero atelier={atelier} />
      <LookbookGallery items={lookbook} />
    </section>
  );
}
