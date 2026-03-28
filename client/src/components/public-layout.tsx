import { TopNav } from "@/components/top-nav";
import { Footer } from "@/components/footer";
import { BottomTabs } from "@/components/bottom-tabs";

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen w-full">
      <TopNav />

      {/* Main content — full width, bottom padding on mobile for tab bar */}
      <main className="flex-1 pb-14 md:pb-0">
        {children}
      </main>

      <Footer />
      <BottomTabs />
    </div>
  );
}
