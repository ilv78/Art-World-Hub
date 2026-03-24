import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen } from "lucide-react";
import type { BlogPostWithArtist } from "@shared/schema";

export default function Blog() {
  const { data: posts, isLoading } = useQuery<BlogPostWithArtist[]>({
    queryKey: ["/api/blog"],
  });

  return (
    <div className="min-h-screen p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="font-serif text-3xl font-bold">Blog</h1>
        <p className="text-muted-foreground">
          Stories, insights, and inspiration from our artists
        </p>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-video rounded-md" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : !posts || posts.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <BookOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-serif text-xl font-semibold mb-2">No blog posts yet</h3>
          <p className="text-muted-foreground">
            Check back soon for stories and insights from our artists.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.id}`}
              className="group bg-card rounded-lg border overflow-hidden hover-elevate transition-shadow"
            >
              {post.coverImageUrl ? (
                <div className="aspect-video overflow-hidden">
                  <img
                    src={post.coverImageUrl}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ) : (
                <div className="aspect-video bg-muted flex items-center justify-center">
                  <BookOpen className="h-10 w-10 text-muted-foreground" />
                </div>
              )}
              <div className="p-4 space-y-2">
                <h2 className="font-serif text-lg font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                  {post.title}
                </h2>
                {post.excerpt && (
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {post.excerpt}
                  </p>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
                  <span>{post.artist.name}</span>
                  <time dateTime={new Date(post.createdAt).toISOString()}>
                    {new Date(post.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </time>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
