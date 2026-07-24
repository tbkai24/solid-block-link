import { useLocation } from "react-router-dom";

const SB19_SPOTIFY_EMBED_URL = "https://open.spotify.com/embed/artist/3g7vYcdDXnqnDKYFwqXBJP?utm_source=generator";

export function SpotifyMiniPlayer() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");

  if (isAdminRoute) return null;

  return (
    <aside className="spotify-mini-player" aria-label="SB19 Spotify mini player">
      <iframe
        title="SB19 on Spotify"
        src={SB19_SPOTIFY_EMBED_URL}
        width="100%"
        height="80"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
      />
    </aside>
  );
}
