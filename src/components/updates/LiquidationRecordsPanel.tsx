import { useEffect, useState } from "react";
import { FiExternalLink, FiX } from "react-icons/fi";
import { supabase } from "../../lib/supabase";
import { formatViewerDateTime } from "../../services/format";
import { LiquidationRow } from "../../types/supabase";

export function LiquidationRecordsPanel() {
  const [posts, setPosts] = useState<LiquidationRow[]>([]);
  const [selectedPost, setSelectedPost] = useState<LiquidationRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadLiquidations() {
      if (!supabase) {
        setError("Supabase is not configured.");
        setLoading(false);
        return;
      }

      const { data, error: requestError } = await supabase
        .from("liquidations")
        .select("id,title,caption,image_url,report_url,published_at,created_at,updated_at")
        .order("published_at", { ascending: false });

      if (ignore) return;

      if (requestError) {
        setError(requestError.message);
        setPosts([]);
      } else {
        setError("");
        setPosts(data ?? []);
      }

      setLoading(false);
    }

    void loadLiquidations();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedPost) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSelectedPost(null);
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedPost]);

  return (
    <section className="subtab-panel" role="tabpanel">
      <div className="updates-slider-head">
        <div>
          <h2>Liquidation Records</h2>
          <p className="muted-text">Browse posted liquidation proof, captions, and supporting report links for completed campaign records.</p>
        </div>
      </div>

      {loading ? <p className="muted-text">Loading liquidation records...</p> : null}
      {error ? <p className="admin-alert danger">{error}</p> : null}

      {posts.length > 0 ? (
        <div className="card-grid liquidation-grid">
          {posts.map((post) => (
            <button
              className="feature-card liquidation-card"
              key={post.id}
              type="button"
              onClick={() => setSelectedPost(post)}
              aria-label={`Open liquidation report: ${post.title}`}
            >
              <img className="liquidation-image" src={post.image_url} alt={post.title} loading="lazy" />
              <div className="liquidation-card-body">
                <p className="chip">{formatViewerDateTime(post.published_at)}</p>
                <h3>{post.title}</h3>
                <p className="card-summary">{post.caption}</p>
              </div>
            </button>
          ))}
        </div>
      ) : !loading && !error ? (
        <p className="muted-text">No liquidation reports have been posted yet.</p>
      ) : null}

      {selectedPost ? (
        <div className="liquidation-viewer" role="dialog" aria-modal="true" aria-labelledby="liquidation-viewer-title">
          <button className="liquidation-viewer-backdrop" type="button" aria-label="Close report" onClick={() => setSelectedPost(null)} />
          <div className="liquidation-viewer-panel">
            <button className="liquidation-viewer-close" type="button" aria-label="Close report" onClick={() => setSelectedPost(null)}>
              <FiX aria-hidden="true" />
            </button>
            <img className="liquidation-viewer-image" src={selectedPost.image_url} alt={selectedPost.title} />
            <div className="liquidation-viewer-copy">
              <p className="chip">{formatViewerDateTime(selectedPost.published_at)}</p>
              <h2 id="liquidation-viewer-title">{selectedPost.title}</h2>
              {selectedPost.report_url ? (
                <a className="button primary liquidation-report-link" href={selectedPost.report_url} target="_blank" rel="noreferrer">
                  <span>View Liquidation Report</span>
                  <FiExternalLink aria-hidden="true" />
                </a>
              ) : null}
              <p className="liquidation-viewer-caption">{selectedPost.caption}</p>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
