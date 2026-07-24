import { UserProfileRow } from "../types/supabase";

type UpdateProfileInput = {
  token: string;
  displayName: string;
  username: string;
  email: string;
};

export async function updateProfileViaApi(input: UpdateProfileInput) {
  const response = await fetch("/api/update-profile", {
    method: "POST",
    headers: {
      "authorization": `Bearer ${input.token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      displayName: input.displayName,
      username: input.username,
      email: input.email
    })
  });

  const payload = await response.json().catch(() => null) as {
    ok?: boolean;
    message?: string;
    profile?: UserProfileRow;
  } | null;

  if (!response.ok || !payload?.ok || !payload.profile) {
    throw new Error(payload?.message || "Profile could not be saved.");
  }

  return payload.profile;
}
