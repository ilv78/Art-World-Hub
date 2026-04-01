import { Helmet } from "react-helmet-async";

interface PageMetaProps {
  title?: string;
  description?: string;
}

const DEFAULT_TITLE = "Vernis9 — Virtual Art Gallery & Marketplace";
const DEFAULT_DESCRIPTION =
  "Experience art like never before. Explore our immersive 3D virtual gallery, discover stunning artworks from talented artists, and participate in exclusive auctions.";

export function PageMeta({
  title,
  description = DEFAULT_DESCRIPTION,
}: PageMetaProps) {
  const fullTitle = title ? `${title} — Vernis9` : DEFAULT_TITLE;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
    </Helmet>
  );
}
