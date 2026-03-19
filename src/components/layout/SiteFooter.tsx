import { useSiteContent } from "../../hooks/useSiteContent";
import { socialIconByLabel } from "../../config/socialIcons";
import { socialLinks } from "../../config/socials";

export function SiteFooter() {
  const year = new Date().getFullYear();
  const { content } = useSiteContent();

  return (
    <footer className="site-footer">
      <div className="shell-row footer-stack">
        <div className="footer-copy">
          <p className="footer-brand">{content.footer.title}</p>
          <p className="muted-text">{content.footer.summary}</p>
          <div className="social-icons">
            {socialLinks.map((item) => (
              <a key={item.label} href={item.href} target="_blank" rel="noreferrer" aria-label={item.label}>
                <span className="social-badge" aria-hidden="true">
                  {socialIconByLabel[item.label as keyof typeof socialIconByLabel]}
                </span>
              </a>
            ))}
          </div>
        </div>
        <p className="copyright">Copyright {year} Solid Block Link</p>
      </div>
    </footer>
  );
}
