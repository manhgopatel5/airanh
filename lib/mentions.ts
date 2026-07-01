export type MemberInfo = {
  name: string;
  avatar: string;
  username: string;
};

export function findMentionedMemberIds(
  text: string,
  members: string[],
  membersInfo: Record<string, Partial<MemberInfo>> = {}
): string[] {
  if (!text.includes("@")) return [];
  const mentioned = new Set<string>();
  for (const uid of members) {
    const info = membersInfo[uid];
    if (!info) continue;
    const tags = [info.name, info.username].filter(Boolean) as string[];
    for (const tag of tags) {
      if (text.includes(`@${tag}`)) mentioned.add(uid);
    }
  }
  return [...mentioned];
}

export function mentionSuggestions(
  query: string,
  members: string[],
  membersInfo: Record<string, Partial<MemberInfo>>,
  currentUid?: string
): Array<{ uid: string; name: string; avatar: string }> {
  const q = query.toLowerCase();
  return members
    .filter((uid) => uid !== currentUid)
    .map((uid) => {
      const info = membersInfo[uid];
      return {
        uid,
        name: info?.name || "Thành viên",
        avatar: info?.avatar || "",
      };
    })
    .filter((m) => !q || m.name.toLowerCase().includes(q));
}
