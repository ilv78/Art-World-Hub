import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Link, useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { BlogPostWithArtist } from "@shared/schema";
import { ResponsiveImage } from "@/components/responsive-image";
import { BLOG_SIZES } from "@shared/responsive-image";
import { ShareButtons } from "@/components/share-buttons";
import { getCanonicalShareUrl } from "@/lib/share-urls";

export default function BlogPost({ params }: { params: { id: string } }) {
  const [, setLocation] = useLocation();
  const { data: post, isLoading } = useQuery<BlogPostWithArtist>({
    queryKey: [`/api/blog/${params.id}`],
  });

  // Smart back: walk one step up the session history when the user has any
  // prior entry (any in-SPA navigation grows history.length via pushState),
  // so they return to the artist profile / /blog list / search / wherever
  // they came from. Cold landings (shared link, bookmark, search engine, new
  // tab) have history.length === 1 and fall back to the global /blog index.
  // (document.referrer is not reliable here — SPA navigation never updates it.)
  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else {
      setLocation("/blog");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-6 max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="aspect-video rounded-md" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen p-6 flex flex-col items-center justify-center">
        <h2 className="font-serif text-2xl font-semibold mb-2">Post not found</h2>
        <p className="text-muted-foreground mb-4">This blog post doesn't exist or has been removed.</p>
        <Button asChild variant="outline">
          <Link href="/blog">Back to Blog</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto space-y-6">
      <Helmet><title>{`${post.title} — Vernis9 Blog`}</title></Helmet>
      <Button variant="ghost" size="sm" onClick={handleBack}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      {post.coverImageUrl && (
        <div className="aspect-video rounded-lg overflow-hidden">
          <ResponsiveImage
            src={post.coverImageUrl}
            alt={post.title}
            sizes={BLOG_SIZES.hero}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="space-y-2">
        <h1 className="font-serif text-3xl font-bold">{post.title}</h1>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Link
            href={`/artists/${post.artist.slug}`}
            className="hover:text-primary transition-colors"
          >
            {post.artist.name}
          </Link>
          <span>·</span>
          <time dateTime={new Date(post.createdAt).toISOString()}>
            {new Date(post.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>
        </div>
      </div>

      <article className="prose prose-neutral dark:prose-invert max-w-none">
        {post.content.split("\n").map((paragraph, i) =>
          paragraph.trim() ? <p key={i}>{paragraph}</p> : null
        )}
      </article>

      <div className="border-t pt-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
          Share this post
        </p>
        <ShareButtons
          url={getCanonicalShareUrl()}
          itemType="blog"
          itemId={post.id}
          title={post.title}
          description={post.excerpt || undefined}
          imageUrl={post.coverImageUrl || undefined}
        />
      </div>
    </div>
  );
}
