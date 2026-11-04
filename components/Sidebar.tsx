"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  FileText,
  HelpCircle,
  Layers,
  MessageSquare,
  BarChart2,
  Settings,
  Home,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Overview", icon: Home },
  { href: "/library", label: "Study Library", icon: BookOpen },
  { href: "/notes", label: "Notes", icon: FileText },
  { href: "/quizzes", label: "Quizzes", icon: HelpCircle },
  { href: "/flashcards", label: "Flashcards", icon: Layers },
  { href: "/chat", label: "Chat with Notes", icon: MessageSquare },
  { href: "/progress", label: "Progress", icon: BarChart2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="btn btn-ghost fixed top-3 left-3 z-50 md:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle navigation"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
        {/* Logo */}
        <div style={{ padding: "1.25rem 1.25rem 0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <div
              style={{
                width: 28, height: 28, background: "var(--color-primary)",
                borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <BookOpen size={15} color="#fff" />
            </div>
            <span style={{ fontSize: "0.9rem", fontWeight: 650, color: "var(--color-text)", letterSpacing: "-0.01em" }}>
              AI Study
            </span>
          </div>
          <p style={{ fontSize: "0.72rem", color: "var(--color-text-3)", paddingLeft: "0.25rem" }}>
            Your personal study assistant
          </p>
        </div>

        <div className="divider" style={{ margin: "0.5rem 1rem" }} />

        {/* Nav */}
        <nav style={{ flex: 1, paddingBottom: "1rem" }}>
          <div className="section-label">WORKSPACE</div>
          {navItems.slice(0, 2).map((item) => (
            <NavItem key={item.href} item={item} active={isActive(item.href)} onClick={() => setMobileOpen(false)} />
          ))}

          <div className="section-label" style={{ marginTop: "1.25rem" }}>TOOLS</div>
          {navItems.slice(2, 7).map((item) => (
            <NavItem key={item.href} item={item} active={isActive(item.href)} onClick={() => setMobileOpen(false)} />
          ))}

          <div className="section-label" style={{ marginTop: "1.25rem" }}>ACCOUNT</div>
          {navItems.slice(7).map((item) => (
            <NavItem key={item.href} item={item} active={isActive(item.href)} onClick={() => setMobileOpen(false)} />
          ))}
        </nav>

        {/* Footer */}
        <div
          style={{
            padding: "0.875rem 1.25rem",
            borderTop: "1px solid var(--color-border)",
            fontSize: "0.72rem",
            color: "var(--color-text-3)",
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontWeight: 500, color: "var(--color-text-2)", marginBottom: "0.15rem" }}>
            Academic prototype
          </div>
          Powered by Gemini AI
        </div>
      </aside>
    </>
  );
}

function NavItem({
  item,
  active,
  onClick,
}: {
  item: (typeof navItems)[0];
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={`nav-item ${active ? "active" : ""}`}
      onClick={onClick}
    >
      <Icon size={16} style={{ flexShrink: 0 }} />
      <span>{item.label}</span>
    </Link>
  );
}

