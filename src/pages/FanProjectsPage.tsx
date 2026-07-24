import { useEffect, useState } from "react";
import { FiBarChart2, FiCalendar, FiClock, FiExternalLink, FiGlobe, FiHeart, FiLock, FiMapPin } from "react-icons/fi";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { FanProjectRow } from "../types/supabase";

type FanProjectVisibility = "public" | "private" | "reveal-soon";

type FanProject = {
  title: string;
  category: string;
  region: string;
  addedBy: string;
  description: string;
  eventDate?: string;
  eventTime?: string;
  eventTimezone?: string;
  eventLocation?: string;
  imageUrl: string;
  status: "Active" | "Completed" | "Upcoming";
  visibility: FanProjectVisibility;
  teaserText?: string;
  noteText?: string;
  relatedLink?: string;
};

function toFanProject(row: FanProjectRow): FanProject {
  return {
    title: row.title,
    category: row.category,
    region: row.region,
    addedBy: row.added_by || "Solid Block Link",
    description: row.description,
    eventDate: row.event_date ?? "",
    eventTime: row.event_time ?? "",
    eventTimezone: row.event_timezone ?? "",
    eventLocation: row.event_location ?? "",
    imageUrl: row.image_url || "/sbllogo.jpg",
    status: row.status,
    visibility: row.visibility,
    teaserText: row.teaser_text,
    noteText: row.note_text,
    relatedLink: row.related_link
  };
}

const defaultFanProjectNote =
  "A'TINTION: Share the experience, amplify the campaign, and help more people discover SB19.";

const campaignHighlights = [
  "DAM single promotions, contributing to 4 million YouTube streams within 24 hours",
  "Single release and collaboration promotions with local and international artists",
  "Simula at Wakas album promotions and SAW Kick-Off Concert Day 2 sold-out campaign",
  "SAW World Tour concert promotions and fundraising for Singapore, Alberta, Vancouver, Hawaii, Thailand, New Zealand, and Perth",
  "Anniversary Fanzone event promotional and fundraising support",
  "WAKAS AT SIMULA: SB19 Global Breakout Campaign across US, UK, Canada, Europe, South Africa, Australia, and New Zealand",
  "Temecula Drone Show Project in partnership with West Coast A'TIN"
];

function getVisibleProjects(projects: FanProject[]) {
  return projects.filter((project) => project.visibility !== "private");
}

function isExternalHref(href: string) {
  return /^https?:\/\//i.test(href);
}

function formatProjectDate(value?: string) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function formatProjectTime(value?: string, timezone?: string) {
  if (!value) return "";
  const [hourValue, minuteValue] = value.split(":").map(Number);
  if (Number.isNaN(hourValue) || Number.isNaN(minuteValue)) return timezone ? `${value} ${timezone}` : value;
  const date = new Date();
  date.setHours(hourValue, minuteValue, 0, 0);
  const formatted = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
  return timezone ? `${formatted} ${timezone}` : formatted;
}

export function FanProjectsPage() {
  const [liveProjects, setLiveProjects] = useState<FanProject[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadFanProjects() {
      setIsLoadingProjects(true);

      // Try client-side Supabase if configured
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from("fan_projects")
            .select("*")
            .eq("featured", true)
            .order("display_order", { ascending: true })
            .order("published_at", { ascending: false });

          if (!error && data && data.length > 0) {
            if (isMounted) {
              setLiveProjects((data as FanProjectRow[]).map(toFanProject));
              setIsLoadingProjects(false);
            }
            return;
          }
        } catch (e) {
          console.warn("Client Supabase fetch failed, falling back to API:", e);
        }
      }

      // Fallback: fetch from /api/site-content
      try {
        const res = await fetch("/api/site-content");
        if (res.ok) {
          const json = await res.json();
          if (json.fanProjects && Array.isArray(json.fanProjects) && json.fanProjects.length > 0) {
            if (isMounted) {
              setLiveProjects(json.fanProjects);
              setIsLoadingProjects(false);
            }
            return;
          }
        }
      } catch (e) {
        console.error("API site-content fanProjects fallback failed:", e);
      }

      if (isMounted) {
        setIsLoadingProjects(false);
      }
    }

    void loadFanProjects();

    return () => {
      isMounted = false;
    };
  }, []);

  const visibleProjects = getVisibleProjects(liveProjects);
  const publicProjects = visibleProjects.filter((project) => project.visibility === "public");
  const revealSoonProjects = visibleProjects.filter((project) => project.visibility === "reveal-soon");

  return (
    <section className="page-shell fan-project-page">
      <section className="fan-project-stage">
        <div className="fan-project-shell">
          <div className="fan-project-hero">
            <p className="eyebrow">SBL Project Board</p>
            <h1>SBL Fan Project Hub</h1>
            <p>
              Get involved in fan projects and promotional campaigns supporting SB19 across the Philippines, USA, Canada, LATAM, Oceania, and allied global markets.
            </p>
          </div>

          <div className="fan-project-board-grid">
            {publicProjects.map((project) => (
              <article className="fan-project-board-card" key={project.title}>
                <div className="fan-project-board-copy">
                  <p className="eyebrow">{project.category}</p>
                  <h2>{project.title}</h2>
                  <div className="fan-project-meta-row">
                    <span><FiCalendar aria-hidden="true" /> {project.status}</span>
                    <span><FiMapPin aria-hidden="true" /> {project.region}</span>
                  </div>
                  {project.eventDate || project.eventTime || project.eventLocation ? (
                    <div className="fan-project-event-row">
                      {project.eventDate ? <span><FiCalendar aria-hidden="true" /> {formatProjectDate(project.eventDate)}</span> : null}
                      {project.eventTime ? <span><FiClock aria-hidden="true" /> {formatProjectTime(project.eventTime, project.eventTimezone)}</span> : null}
                      {project.eventLocation ? <span><FiMapPin aria-hidden="true" /> {project.eventLocation}</span> : null}
                    </div>
                  ) : null}
                </div>
                <div className="fan-project-board-image">
                  <img src={project.imageUrl} alt={project.title} />
                </div>
                <div className="fan-project-board-copy">
                  <p>{project.description}</p>
                  <p className="fan-project-owner">Added by {project.addedBy}</p>
                  <div className="fan-project-note">
                    <FiGlobe aria-hidden="true" />
                    <span>{project.noteText?.trim() || defaultFanProjectNote}</span>
                  </div>
                  {project.relatedLink ? (
                    isExternalHref(project.relatedLink) ? (
                      <a className="fan-project-link" href={project.relatedLink} target="_blank" rel="noreferrer">
                        Visit Project <FiExternalLink aria-hidden="true" />
                      </a>
                    ) : (
                      <Link className="fan-project-link" to={project.relatedLink}>
                        Visit Project <FiExternalLink aria-hidden="true" />
                      </Link>
                    )
                  ) : null}
                </div>
              </article>
            ))}
          </div>

          {!isLoadingProjects && !publicProjects.length && !revealSoonProjects.length ? (
            <div className="fan-project-empty">
              <h2>No fan projects to show yet</h2>
              <p>Public and reveal-soon projects will appear here once an admin adds them from the Fan Projects panel.</p>
            </div>
          ) : null}

          {revealSoonProjects.length ? (
            <div className="fan-project-reveal-list">
              {revealSoonProjects.map((project) => (
                <article className="fan-project-reveal-card" key={project.title}>
                  <h2><FiLock aria-hidden="true" /> {project.title || "Exciting project to be revealed soon"}</h2>
                  {project.eventDate || project.eventTime || project.eventLocation ? (
                    <p>
                      <FiCalendar aria-hidden="true" /> {[formatProjectDate(project.eventDate), formatProjectTime(project.eventTime, project.eventTimezone), project.eventLocation].filter(Boolean).join("  ")}
                    </p>
                  ) : null}
                  <p>{project.teaserText || "Details will be revealed once the campaign timing is cleared."}</p>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="page-panel campaign-highlight-panel">
        <div>
          <p className="eyebrow">Supported Campaigns</p>
          <h2>Selected SBL-backed initiatives</h2>
        </div>
        <div className="campaign-highlight-list">
          {campaignHighlights.map((item, index) => (
            <div className="campaign-highlight-row" key={item}>
              <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <p>{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="page-panel fan-project-map">
        <p className="eyebrow">Regions</p>
        <h2>SBL currently covers the Philippines, USA, Canada, LATAM, and Oceania.</h2>
        <div className="region-pill-row">
          {["Philippines", "USA", "Canada", "LATAM", "Oceania"].map((region) => (
            <span key={region}><FiMapPin aria-hidden="true" /> {region}</span>
          ))}
        </div>
        <p>
          We remain committed to expanding our reach and welcoming more A&apos;TIN into the Solid Block Link family.
        </p>
      </section>

      <section className="page-panel fan-project-method">
        <div>
          <span className="fan-project-card-icon" aria-hidden="true"><FiBarChart2 /></span>
          <h2>How SBL approaches promotions</h2>
        </div>
        <p>
          SBL implements coordinated, multi-platform promotional strategies adapted to local audiences. Efforts are designed to expand cross-market reach, attract new listeners, strengthen global engagement, and sustain visibility beyond release dates.
        </p>
        <div>
          <span className="fan-project-card-icon" aria-hidden="true"><FiHeart /></span>
          <h2>How SBL handles fundraising</h2>
        </div>
        <p>
          Fundraising efforts are managed with transparency, clear goals, and accountability, with each campaign contributing to a shared objective for the market it supports.
        </p>
      </section>
    </section>
  );
}
