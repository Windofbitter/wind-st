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
        </nav>

        <div className="secondary-links">
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
        </div>
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

