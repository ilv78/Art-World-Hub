import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BookOpen } from "lucide-react";
import type { BlogPostWithArtist } from "@shared/schema";

export default function Blog() {
  const { data: posts, isLoading } = useQuery<BlogPostWithArtist[]>({
    queryKey: ["/api/blog"],
  });

  return (
    <div className="min-h-screen p-6 space-y-6">
      <Helmet><title>Blog — Vernis9</title></Helmet>
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
        <div className="space-y-8">
          {/* Lead article — full width, horizontal layout */}
          {posts.length > 0 && (
            <Link
              href={`/blog/${posts[0].id}`}
              className="group bg-card rounded-xl border overflow-hidden hover-elevate transition-shadow block"
            >
              <div className="grid md:grid-cols-5 gap-0">
                {posts[0].coverImageUrl ? (
                  <div className="md:col-span-3 aspect-video md:aspect-auto md:h-full overflow-hidden">
                    <img
                      src={posts[0].coverImageUrl}
                      alt={posts[0].title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                ) : (
                  <div className="md:col-span-3 aspect-video md:aspect-auto md:min-h-[280px] bg-muted flex items-center justify-center">
                    <BookOpen className="h-16 w-16 text-muted-foreground/40" />
                  </div>
                )}
                <div className="md:col-span-2 p-6 sm:p-8 flex flex-col justify-center space-y-3">
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold leading-tight group-hover:text-primary transition-colors">
                    {posts[0].title}
                  </h2>
                  {posts[0].excerpt && (
                    <p className="text-muted-foreground line-clamp-4">
                      {posts[0].excerpt}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-sm text-muted-foreground pt-2">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={posts[0].artist.avatarUrl || undefined} alt={posts[0].artist.name} />
                      <AvatarFallback className="text-xs">{posts[0].artist.name[0]}</AvatarFallback>
                    </Avatar>
                    <span>{posts[0].artist.name}</span>
                    <span>·</span>
                    <time dateTime={new Date(posts[0].createdAt).toISOString()}>
                      {new Date(posts[0].createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </time>
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* Remaining posts */}
          {posts.length > 1 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.slice(1).map((post) => (
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
                        loading="lazy"
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
                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
                      <Avatar className="w-5 h-5">
                        <AvatarImage src={post.artist.avatarUrl || undefined} alt={post.artist.name} />
                        <AvatarFallback className="text-[10px]">{post.artist.name[0]}</AvatarFallback>
                      </Avatar>
                      <span>{post.artist.name}</span>
                      <span>·</span>
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
      )}
    </div>
  );
}
