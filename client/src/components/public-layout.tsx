import { Link } from "wouter";
import { TopNav } from "@/components/top-nav";

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen w-full">
      <TopNav />

      {/* Main content — full width */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer placeholder — will be built in #238 */}
      <footer className="border-t py-6 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex items-center justify-between text-xs text-muted-foreground">
          <p>Discover. Collect. Create.</p>
          <Link href="/changelog" className="hover:underline">
            Changelog
          </Link>
        </div>
      </footer>
    </div>
  );
}
