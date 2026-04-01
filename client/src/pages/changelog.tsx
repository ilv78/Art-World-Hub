import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import ReactMarkdown from "react-markdown";
import { Skeleton } from "@/components/ui/skeleton";

export default function Changelog() {
  const { data: markdown, isLoading } = useQuery<string>({
    queryKey: ["/api/changelog"],
    queryFn: async () => {
      const res = await fetch("/api/changelog");
      if (!res.ok) throw new Error("Failed to fetch changelog");
      const text = await res.text();
      return text.replace(/## \[Unreleased\][\s\S]*?(?=## \[)/, "");
    },
  });

  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      <Helmet><title>Changelog — Vernis9</title></Helmet>
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-5/6" />
          <Skeleton className="h-6 w-4/6" />
        </div>
      ) : (
        <article className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-serif prose-a:text-primary">
          <ReactMarkdown>{markdown ?? ""}</ReactMarkdown>
        </article>
      )}
    </div>
  );
}
