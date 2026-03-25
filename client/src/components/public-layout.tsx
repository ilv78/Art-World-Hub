import { TopNav } from "@/components/top-nav";
import { Footer } from "@/components/footer";

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen w-full">
      <TopNav />

      {/* Main content — full width */}
      <main className="flex-1">
        {children}
      </main>

      <Footer />
    </div>
  );
}
