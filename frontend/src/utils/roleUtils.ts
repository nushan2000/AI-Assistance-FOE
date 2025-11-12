export type Agent = { id: string; name: string };

export function getAllowedAgents(email?: string): Agent[] {
  const all: Agent[] = [
    { id: "planner", name: "Planner Agent" },
    { id: "guidance", name: "Guidance Agent" },
    { id: "booking", name: "Booking Agent" },
  ];

  if (!email) return all;
  const lower = email.toLowerCase();

  // admin emails: full access
  if (lower === "dean@eng.ruh.ac.lk" || lower === "ar@eng.ruh.ac.lk")
    return all;

  // student domain: only guidance
  if (lower.endsWith("@engug.ruh.ac.lk"))
    return all.filter((a) => a.id === "guidance");

  // lecturer domains: guidance + booking
  const lecturerDomains = [
    "@cee.ruh.ac.lk",
    "@mme.ruh.ac.lk",
    "@eie.ruh.ac.lk",
    "@is.ruh.ac.lk",
  ];
  if (lecturerDomains.some((d) => lower.endsWith(d)))
    return all.filter((a) => a.id !== "planner");

  // default: guidance only
  return all.filter((a) => a.id === "guidance");
}

export function getRoleName(
  email?: string
): "admin" | "lecturer" | "student" | "unknown" {
  if (!email) return "unknown";
  const lower = email.toLowerCase();
  if (lower === "dean@eng.ruh.ac.lk" || lower === "ar@eng.ruh.ac.lk")
    return "admin";
  if (lower.endsWith("@engug.ruh.ac.lk")) return "student";
  const lecturerDomains = [
    "@cee.ruh.ac.lk",
    "@mme.ruh.ac.lk",
    "@eie.ruh.ac.lk",
    "@is.ruh.ac.lk",
  ];
  if (lecturerDomains.some((d) => lower.endsWith(d))) return "lecturer";
  return "unknown";
}
