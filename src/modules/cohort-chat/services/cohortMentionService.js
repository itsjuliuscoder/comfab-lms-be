const EMAIL_MENTION_PATTERN = /@([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
const NAME_MENTION_PATTERN = /@([A-Za-z][A-Za-z\s.'-]{1,60}?)(?=\s|$|[.,!?])/g;

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

export function parseMentions(content, members = [], senderId) {
  if (!content || !members.length) {
    return [];
  }

  const matchedUserIds = new Set();
  const sender = senderId?.toString();

  const memberLookup = members.map((member) => ({
    userId: member.userId?.toString?.() || member.userId?.toString(),
    name: normalize(member.name),
    email: normalize(member.email),
  }));

  let match;
  while ((match = EMAIL_MENTION_PATTERN.exec(content)) !== null) {
    const email = normalize(match[1]);
    const member = memberLookup.find((item) => item.email === email);
    if (member?.userId && member.userId !== sender) {
      matchedUserIds.add(member.userId);
    }
  }

  while ((match = NAME_MENTION_PATTERN.exec(content)) !== null) {
    const rawName = normalize(match[1]);
    if (!rawName || rawName.includes("@")) continue;

    for (const member of memberLookup) {
      if (!member.name || member.userId === sender) continue;
      if (member.name === rawName || member.name.startsWith(`${rawName} `)) {
        matchedUserIds.add(member.userId);
      }
    }
  }

  return [...matchedUserIds];
}
