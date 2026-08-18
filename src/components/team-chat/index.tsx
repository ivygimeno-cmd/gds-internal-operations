import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import TeamChat from "./team-chat";

export default async function TeamChatContainer() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const admin = createAdminClient();

  const { data: currentUser } =
    await admin
      .from("profiles")
      .select(`
        id,
        full_name,
        username,
        role,
        title,
        profile_picture_url
      `)
      .eq("id", user.id)
      .eq("is_active", true)
      .maybeSingle();

  if (!currentUser) {
    return null;
  }

  const { data: teamMembers } =
    await admin
      .from("profiles")
      .select(`
        id,
        full_name,
        username,
        role,
        title,
        profile_picture_url
      `)
      .eq("is_active", true)
      .order("full_name", {
        ascending: true,
      });

  const { data: messages } =
    await admin
      .from("team_messages")
      .select(`
        id,
        sender_id,
        message,
        is_read,
        created_at
      `)
      .order("created_at", {
        ascending: true,
      })
      .limit(100);

  return (
    <TeamChat
      currentUser={currentUser}
      teamMembers={teamMembers ?? []}
      initialMessages={messages ?? []}
    />
  );
}