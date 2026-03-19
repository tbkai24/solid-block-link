import { FiFileText, FiHome, FiLayers, FiSend } from "react-icons/fi";
import { NavLink } from "react-router-dom";
import { siteNav } from "../../config/site";
import { useSiteContent } from "../../hooks/useSiteContent";

const navIcons = {
  "/": <FiHome />,
  "/campaigns": <FiSend />,
  "/updates": <FiLayers />,
  "/about": <FiFileText />
};

export function SiteHeader() {
  const { content } = useSiteContent();

  return (
    <header className="site-header">
      <div className="shell-row">
        <NavLink className="brand-mark" to="/">
          {content.logoUrl ? <img className="brand-logo" src={content.logoUrl} alt="Solid Block Link logo" /> : <span className="brand-kicker">SBL</span>}
          <span>Solid Block Link</span>
        </NavLink>
        <nav className="site-nav">
          {siteNav.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
            >
              <span className="nav-icon" aria-hidden="true">
                {navIcons[item.href as keyof typeof navIcons]}
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
