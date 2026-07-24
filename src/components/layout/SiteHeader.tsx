import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { FiFileText, FiFlag, FiHome, FiLayers, FiLogIn, FiMenu, FiSearch, FiSend, FiUser, FiX } from "react-icons/fi";
import { siteNav } from "../../config/site";
import { useAuthProfile } from "../../hooks/useAuthProfile";
import { useSiteContent } from "../../hooks/useSiteContent";

const navIcons: Record<string, JSX.Element> = {
  "/": <FiHome />,
  "/fan-projects": <FiFlag />,
  "/lookup": <FiSearch />,
  "/campaigns": <FiSend />,
  "/contact": <FiSend />,
  "/updates": <FiLayers />,
  "/about": <FiFileText />,
  "/login": <FiLogIn />,
  "/account": <FiUser />
};

export function SiteHeader() {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const location = useLocation();
  const { content } = useSiteContent();
  const { session } = useAuthProfile();
  const logoSrc = content.logoUrl || "/sbllogo.jpg";
  const navItems = [
    ...siteNav,
    session ? { label: "Account", href: "/account" } : { label: "Login", href: "/login" }
  ];

  useEffect(() => {
    setIsNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const faviconHref = logoSrc;
    let favicon = document.querySelector<HTMLLinkElement>("link[rel~='icon']");

    if (!favicon) {
      favicon = document.createElement("link");
      favicon.rel = "icon";
      document.head.appendChild(favicon);
    }

    favicon.href = faviconHref;
    favicon.type = "image/jpeg";
  }, [logoSrc]);

  return (
    <header className="site-header">
      <div className="shell-row">
        <NavLink to="/" className="brand-mark" aria-label="Solid Block Link home">
          <img className="brand-logo" src={logoSrc} alt="" />
          <span>Solid Block Link</span>
        </NavLink>

        <button
          className="nav-toggle"
          type="button"
          aria-label={isNavOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={isNavOpen}
          aria-controls="site-navigation"
          onClick={() => setIsNavOpen((current) => !current)}
        >
          {isNavOpen ? <FiX aria-hidden="true" /> : <FiMenu aria-hidden="true" />}
        </button>

        <nav id="site-navigation" className={`site-nav${isNavOpen ? " nav-open" : ""}`} aria-label="Primary navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === "/"}
              className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
            >
              <span className="nav-icon" aria-hidden="true">
                {navIcons[item.href]}
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
