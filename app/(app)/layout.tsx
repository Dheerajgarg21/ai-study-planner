import Sidebar from "@/components/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-root">
      <Sidebar />
      <div className="main-area">
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}

