import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "../../App.css";

function getPageTitle(
  pathname: string,
  t: (key: string) => string,
): string {
  if (pathname.startsWith("/chat")) return t("nav.chat");
  if (pathname.startsWith("/characters")) return t("nav.characters");
  if (pathname.startsWith("/user-personas"))
    return t("nav.userPersonas");
  if (pathname.startsWith("/presets")) return t("nav.presets");
  if (pathname.startsWith("/lorebooks")) return t("nav.lorebooks");
  if (pathname.startsWith("/llm-connections"))
    return t("nav.llmConnections");
  if (pathname.startsWith("/mcp-servers")) return t("nav.mcpServers");
  if (pathname.startsWith("/runs")) return t("nav.runs");
  if (pathname.startsWith("/settings")) return t("nav.settings");
  if (pathname.startsWith("/health")) return t("nav.health");
  return t("nav.chat");
}

function NavGroup({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="nav-group">
      <button
        className={`nav-group-header ${isOpen ? "open" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="nav-group-title">{title}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
            opacity: 0.5,
          }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
      {isOpen && <div className="nav-group-content">{children}</div>}
    </div>
  );
}

export function AppLayout() {
  const location = useLocation();
  const { t } = useTranslation();
  const title = getPageTitle(location.pathname, t);

  return (
    <div className="app-root">
      <aside className="sidebar">
        <div className="logo">Wind ST</div>
        <nav className="nav-links">
          <NavLink
            to="/chat"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            {t("nav.chat")}
          </NavLink>

          <NavGroup title={t("nav.library") || "Library"}>
            <NavLink
              to="/characters"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              {t("nav.characters")}
            </NavLink>
            <NavLink
              to="/presets"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              {t("nav.presets")}
            </NavLink>
            <NavLink
              to="/user-personas"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              {t("nav.userPersonas")}
            </NavLink>
            <NavLink
              to="/lorebooks"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              {t("nav.lorebooks")}
            </NavLink>
          </NavGroup>

          <NavGroup title={t("nav.system") || "System"} defaultOpen={false}>
            <NavLink
              to="/llm-connections"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              {t("nav.llmConnections")}
            </NavLink>
            <NavLink
              to="/mcp-servers"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              {t("nav.mcpServers")}
            </NavLink>
            <NavLink
              to="/runs"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              {t("nav.runs")}
            </NavLink>
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              {t("nav.settings")}
            </NavLink>
            <NavLink
              to="/health"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              {t("nav.health")}
            </NavLink>
          </NavGroup>
        </nav>
      </aside>

      <main className="main-content">
        <header className="header">
          <div className="page-title">{title}</div>
          <div className="header-actions" />
        </header>
        <div className="content-body">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
