import { useState } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { Link, useSearchParams } from "react-router-dom";
import { LiquidationRecordsPanel } from "../components/updates/LiquidationRecordsPanel";
import { useSiteContent } from "../hooks/useSiteContent";

const LATEST_PAGE_SIZE = 3;
const PAST_PAGE_SIZE = 3;
const updateFilters = ["All", "Announcement", "Campaign", "Fan Project"] as const;

function getPageCount(total: number, pageSize: number) {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function UpdatesPage() {
  const { content, loading, error, hasContent } = useSiteContent();
  const latestUpdates = content.updates.filter((item) => item.label !== "Past Campaign");
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "liquidation" ? "liquidation" : "latest";
  const [activeTab, setActiveTab] = useState<"latest" | "liquidation" | "past">(initialTab);
  const [activeFilter, setActiveFilter] = useState<(typeof updateFilters)[number]>("All");
  const [latestPage, setLatestPage] = useState(0);
  const [pastPage, setPastPage] = useState(0);
  const filteredLatest = activeFilter === "All" ? latestUpdates : latestUpdates.filter((item) => (item.category || item.label) === activeFilter);
  const latestPageCount = getPageCount(filteredLatest.length, LATEST_PAGE_SIZE);
  const completedPastCampaigns = content.pastCampaigns.filter((item) => item.status !== "Active");
  const pastPageCount = getPageCount(completedPastCampaigns.length, PAST_PAGE_SIZE);
  const visibleLatest = filteredLatest.slice(latestPage * LATEST_PAGE_SIZE, latestPage * LATEST_PAGE_SIZE + LATEST_PAGE_SIZE);
  const visiblePast = completedPastCampaigns.slice(pastPage * PAST_PAGE_SIZE, pastPage * PAST_PAGE_SIZE + PAST_PAGE_SIZE);

  function moveLatest(direction: "prev" | "next") {
    if (latestPageCount <= 1) return;

    setLatestPage((current) => {
      if (direction === "prev") {
        return current === 0 ? latestPageCount - 1 : current - 1;
      }

      return current === latestPageCount - 1 ? 0 : current + 1;
    });
  }

  function movePast(direction: "prev" | "next") {
    if (pastPageCount <= 1) return;

    setPastPage((current) => {
      if (direction === "prev") {
        return current === 0 ? pastPageCount - 1 : current - 1;
      }

      return current === pastPageCount - 1 ? 0 : current + 1;
    });
  }

  if (!hasContent && loading && !error) {
    return (
      <section className="page-panel site-loading-panel">
        <p className="eyebrow">Updates</p>
        <h1>Loading campaign updates</h1>
        <p className="page-lead">Featured posts and campaign history are being fetched now.</p>
      </section>
    );
  }

  return (
    <section className="page-shell">
      <div className="page-panel page-hero-panel">
        <p className="eyebrow">Updates</p>
        <h1>Campaign news and selected posts</h1>
        <p className="page-lead">
          Follow featured campaign posts first, then browse the latest updates and the broader record of Solid Block Link activity.
        </p>
      </div>

      <div className="content-section">
        <div className="subtab-row" role="tablist" aria-label="Updates tabs">
          <button
            className={activeTab === "latest" ? "subtab-button active" : "subtab-button"}
            type="button"
            role="tab"
            aria-selected={activeTab === "latest"}
            onClick={() => setActiveTab("latest")}
          >
            Latest Updates
          </button>
          <button
            className={activeTab === "past" ? "subtab-button active" : "subtab-button"}
            type="button"
            role="tab"
            aria-selected={activeTab === "past"}
            onClick={() => setActiveTab("past")}
          >
            Past Campaigns
          </button>
          <button
            className={activeTab === "liquidation" ? "subtab-button active" : "subtab-button"}
            type="button"
            role="tab"
            aria-selected={activeTab === "liquidation"}
            onClick={() => setActiveTab("liquidation")}
          >
            Liquidation Records
          </button>
        </div>

        {activeTab === "latest" ? (
          <div className="subtab-panel" role="tabpanel">
            <div className="updates-slider-head">
              <div>
                <h2>Latest Updates</h2>
                <p className="muted-text">Announcements, campaign activity, fan project updates, and featured posts are collected here in one running feed.</p>
              </div>
              {latestPageCount > 1 ? (
                <div className="updates-slider-controls">
                  <button type="button" className="subtab-button" onClick={() => moveLatest("prev")} aria-label="Previous latest update">
                    <FiChevronLeft />
                  </button>
                  <span className="label">{latestPage + 1} / {latestPageCount}</span>
                  <button type="button" className="subtab-button" onClick={() => moveLatest("next")} aria-label="Next latest update">
                    <FiChevronRight />
                  </button>
                </div>
              ) : null}
            </div>
            <div className="update-filter-row" aria-label="Update categories">
              {updateFilters.map((filter) => (
                <button
                  key={filter}
                  className={activeFilter === filter ? "subtab-button active" : "subtab-button"}
                  type="button"
                  onClick={() => {
                    setActiveFilter(filter);
                    setLatestPage(0);
                  }}
                >
                  {filter}
                </button>
              ))}
            </div>
            <div className="card-grid updates-grid">
              {visibleLatest.map((item) => (
                <article className="feature-card update-list-card" key={item.id}>
                  <div>
                    <div className="post-preview-meta">
                      <span className="chip">{item.category || item.label}</span>
                      <span className="label">{item.date}</span>
                    </div>
                    <h2>{item.title}</h2>
                    <p>{item.summary}</p>
                  </div>
                  {item.href.startsWith("/") ? (
                    <Link className="text-link" to={item.href}>View update</Link>
                  ) : (
                    <a className="text-link" href={item.href} target="_blank" rel="noreferrer">View post</a>
                  )}
                </article>
              ))}
              {!filteredLatest.length ? <p className="muted-text">No updates in this category yet.</p> : null}
            </div>
          </div>
        ) : activeTab === "liquidation" ? (
          <LiquidationRecordsPanel />
        ) : (
          <div className="subtab-panel" role="tabpanel">
            <div className="updates-slider-head">
              <div>
                <h2>Past Campaigns</h2>
                <p className="muted-text">Completed campaigns stay here as part of the broader update history and public track record.</p>
              </div>
              <Link className="button secondary" to="/campaigns">View full campaign archive</Link>
              {pastPageCount > 1 ? (
                <div className="updates-slider-controls">
                  <button type="button" className="subtab-button" onClick={() => movePast("prev")} aria-label="Previous past campaign">
                    <FiChevronLeft />
                  </button>
                  <span className="label">{pastPage + 1} / {pastPageCount}</span>
                  <button type="button" className="subtab-button" onClick={() => movePast("next")} aria-label="Next past campaign">
                    <FiChevronRight />
                  </button>
                </div>
              ) : null}
            </div>
            <div className="card-grid updates-grid">
              {visiblePast.map((item) => (
                <article className="feature-card update-list-card compact-update-card" key={item.id}>
                  <div>
                    <p className="chip">{item.status}</p>
                    <h2>{item.title}</h2>
                    <p>{item.summary}</p>
                  </div>
                  <div className="update-card-actions stacked">
                    <strong>{item.outcome}</strong>
                    <Link className="button secondary compact-button" to={`/campaigns#${item.id}`}>View campaign</Link>
                  </div>
                </article>
              ))}
              {!completedPastCampaigns.length ? <p className="muted-text">No past campaigns yet.</p> : null}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
