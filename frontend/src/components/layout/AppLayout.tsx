import { NavLink, Outlet, useLocation } from "react-router-dom";
import "../../App.css";

function getPageTitle(pathname: string): string {
  if (pathname.startsWith("/chat")) return "Chat";
  if (pathname.startsWith("/characters")) return "Characters";
  if (pathname.startsWith("/presets")) return "Presets";
  if (pathname.startsWith("/lorebooks")) return "Lorebooks";
  if (pathname.startsWith("/llm-connections")) return "LLM Connections";
  if (pathname.startsWith("/mcp-servers")) return "MCP Servers";
  if (pathname.startsWith("/runs")) return "Runs";
  if (pathname.startsWith("/settings")) return "Settings";
  if (pathname.startsWith("/health")) return "Health";
  return "Chat";
}

export function AppLayout() {
  const location = useLocation();
  const title = getPageTitle(location.pathname);

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
            Chat
          </NavLink>
          <NavLink
            to="/characters"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            Characters
          </NavLink>
          <NavLink
            to="/presets"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            Presets
          </NavLink>
          <NavLink
            to="/lorebooks"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            Lorebooks
          </NavLink>
          <NavLink
            to="/llm-connections"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            LLM Connections
          </NavLink>
          <NavLink
            to="/mcp-servers"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            MCP Servers
          </NavLink>
          <NavLink
            to="/runs"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            Runs
          </NavLink>
        </nav>

        <div className="secondary-links">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            Settings
          </NavLink>
          <NavLink
            to="/health"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            Health
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

