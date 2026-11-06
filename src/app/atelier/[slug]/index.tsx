import { Await, createFileRoute, Link } from "@tanstack/start";
import { AtelierLanding, LookbookGallery } from "$root/src/components";

export const Route = createFileRoute("/atelier/$slug")({
  loaderDef: () => loader,
  component: () => {
    const data = useLoaderData<typeof loader>();
    return (
      <div>
        <AtelierLanding atelier={data.atelier} />
        <LookbookGallery items={data.lookbook} />
        <Link to="/contact">Contact Us</Link>
      </div>
    );
  },
  meta: () => [
    { title: data.atelier?.name ?? "Atelier" },
    { name: "description", content: data.atelier?.tagline ?? "" }
  ]
});
