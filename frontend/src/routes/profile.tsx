import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Flame, Trophy } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { fetchLeaderboard, fetchBadges } from "@/lib/courses-api";

export const Route = createFileRoute("/profile")({
  loader: async () => {
    if (typeof window === "undefined") {
      return { leaderboard: [], badges: [] };
    }
    let leaderboard: any[] = [];
    let badges: any[] = [];
    try {
      const [lbData, badgesData] = await Promise.all([
        fetchLeaderboard(),
        fetchBadges()
      ]);
      leaderboard = lbData;
      badges = badgesData;
    } catch {
      // ignore
    }
    return { leaderboard, badges };
  },
  head: () => ({ meta: [{ title: "Profile" }] }),
  component: Profile,
});

function Profile() {
  const loaderData = Route.useLoaderData() as any;
  const badges: any[] = Array.isArray(loaderData?.badges) ? loaderData.badges : (loaderData?.badges?.results || []);
  const leaderboard: any[] = Array.isArray(loaderData?.leaderboard) ? loaderData.leaderboard : (loaderData?.leaderboard?.results || []);
  const { user } = useAuth();
  
  const displayName = user?.full_name || user?.username || "User";
  const initials = user?.avatar_initials || "U";
  const jobTitle = user?.job_title || user?.role?.name || "";
  const region = user?.region || "";
  const email = user?.email || "";
  const points = user?.points ?? 0;
  const level = user?.level ?? 1;
  const streakDays = user?.streak_days ?? 0;

  return (
    <AppShell>
      <div className="flex items-center gap-6 mb-10">
        <div className="size-20 rounded-full bg-brand/15 grid place-items-center text-2xl font-semibold text-brand ring-1 ring-brand/30">
          {initials}
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground mb-1">{displayName}</h1>
          <p className="text-sm text-foreground font-medium">{jobTitle}{jobTitle && region ? " · " : ""}{region}</p>
          <p className="text-xs text-muted-foreground mt-1">{email}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-10">
        <Stat label="Total points" value={points.toLocaleString()} />
        <Stat label="Current level" value={`Lvl ${level}`} />
        <Stat label="Streak" value={`${streakDays} days`} icon={<Flame className="size-4 text-brand" />} />
      </div>

      <h2 className="text-lg font-medium mb-4">Badges</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-10">
        {badges.map((b: any) => (
          <div key={b.id || b.name} className={`rounded-2xl ring-1 ring-border p-4 flex items-center gap-3`}>
            <div className="size-12 rounded-xl bg-brand-light grid place-items-center text-2xl" title={b.name}>{b.icon || "🏆"}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{b.name}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {b.date ? `Earned on ${new Date(b.date).toLocaleDateString()}` : b.description || 'Badge earned'}
              </p>
            </div>
            {b.earned && <span className="text-[10px] uppercase tracking-widest font-semibold text-success">Earned</span>}
          </div>
        ))}
        {(!badges || badges.length === 0) && (
          <p className="text-xs text-muted-foreground">No badges earned yet.</p>
        )}
      </div>

      <h2 className="text-lg font-medium mb-4 flex items-center gap-2"><Trophy className="size-4 text-brand" /> Organization Leaderboard</h2>
      <div className="rounded-2xl ring-1 ring-border bg-card overflow-hidden">
        {leaderboard.map((e: any, i: number) => (
          <div key={e.rank || e.id || i} className={`flex items-center gap-4 px-5 py-3 ${i > 0 ? "border-t border-border" : ""} ${e.isYou ? "bg-brand/5" : ""}`}>
            <span className="text-sm font-medium text-muted-foreground w-8">#{e.rank || i + 1}</span>
            <div className={`size-9 rounded-full grid place-items-center text-xs font-semibold ${e.isYou ? "bg-brand/15 text-brand" : "bg-muted text-muted-foreground"}`}>{e.initials || e.name?.[0] || "U"}</div>
            <div className="flex-1">
              <p className="text-sm font-medium">{e.name}{e.isYou && " (you)"}</p>
              <p className="text-[10px] text-muted-foreground">{e.region || 'Global'}</p>
            </div>
            <span className="text-sm font-medium font-mono">{e.points?.toLocaleString() || 0} pts</span>
          </div>
        ))}
        {(!leaderboard || leaderboard.length === 0) && (
          <div className="px-5 py-4 text-sm text-muted-foreground">No data available yet.</div>
        )}
      </div>
    </AppShell>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl ring-1 ring-border bg-card p-5">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2 flex items-center gap-1">
        {icon} {label}
      </p>
      <p className="text-2xl font-medium">{value}</p>
    </div>
  );
}
