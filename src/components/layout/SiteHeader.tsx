import { useEffect, useState } from "react";
import { FiFileText, FiHome, FiLayers, FiMenu, FiSend, FiX } from "react-icons/fi";
import { NavLink, useLocation } from "react-router-dom";
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
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <header className="site-header">
      <div className="shell-row">
        <NavLink className="brand-mark" to="/">
          {content.logoUrl ? <img className="brand-logo" src={content.logoUrl} alt="Solid Block Link logo" /> : <span className="brand-kicker">SBL</span>}
          <span>Solid Block Link</span>
        </NavLink>
        <button
          type="button"
          className="nav-toggle"
          aria-expanded={menuOpen}
          aria-controls="site-nav"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          onClick={() => setMenuOpen((current) => !current)}
        >
          {menuOpen ? <FiX /> : <FiMenu />}
        </button>
        <nav id="site-nav" className={menuOpen ? "site-nav nav-open" : "site-nav"}>
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
