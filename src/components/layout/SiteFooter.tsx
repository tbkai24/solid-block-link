import { useSiteContent } from "../../hooks/useSiteContent";
import { socialIconByLabel } from "../../config/socialIcons";
import { socialLinks } from "../../config/socials";
import { Link } from "react-router-dom";

const menuLinks = [
  { label: "About SBL", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "FAQs", href: "/about#faq" },
  { label: "Updates", href: "/updates" },
  { label: "Donation Lookup", href: "/lookup" },
  { label: "Campaigns", href: "/campaigns" }
];

const fanProjectLinks = [
  { label: "Fan Projects", href: "/fan-projects" },
  { label: "Donation Drive", href: "/#donate" },
  { label: "Donation Lookup", href: "/lookup" },
  { label: "Project Overview", href: "/fan-projects" },
  { label: "Campaign Archive", href: "/campaigns" },
  { label: "Liquidation Records", href: "/updates?tab=liquidation" }
];

function FooterLink({ href, label }: { href: string; label: string }) {
  if (href.startsWith("mailto:") || href.startsWith("http")) {
    return <a href={href}>{label}</a>;
  }

  return <Link to={href}>{label}</Link>;
}

export function SiteFooter() {
  const year = new Date().getFullYear();
  const { content } = useSiteContent();
  const footerSummary = content.footer.summary || "Global A'TIN organization supporting SB19 through fan projects, campaigns, and transparent fundraising.";

  return (
    <footer className="site-footer">
      <div className="shell-row footer-grid">
        <div className="footer-brand-block">
          <p className="footer-wordmark">Solid<br />Block Link</p>
          <p>{footerSummary}</p>
        </div>

        <nav className="footer-column" aria-label="Footer menu">
          <h2>Menu</h2>
          {menuLinks.map((item) => (
            <FooterLink key={item.label} href={item.href} label={item.label} />
          ))}
        </nav>

        <nav className="footer-column" aria-label="Fan project links">
          <h2>Fan Project</h2>
          {fanProjectLinks.map((item) => (
            <FooterLink key={item.label} href={item.href} label={item.label} />
          ))}
        </nav>

        <div className="footer-column footer-social-column">
          <h2>Find Us</h2>
          <div className="social-icons">
            {socialLinks.map((item) => (
              <a key={item.label} href={item.href} target="_blank" rel="noreferrer" aria-label={item.label}>
                <span className="social-badge" aria-hidden="true">
                  {socialIconByLabel[item.label as keyof typeof socialIconByLabel]}
                </span>
              </a>
            ))}
          </div>
          <p className="copyright">Copyright {year} Solid Block Link</p>
        </div>
      </div>
    </footer>
  );
}
