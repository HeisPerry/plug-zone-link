import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, ChevronLeft, ChevronRight, Circle, CheckCircle2 } from "lucide-react";
import { addMonths, eachDayOfInterval, endOfMonth, format, getDay, isAfter, isSameDay, isSameMonth, startOfMonth, subMonths } from "date-fns";
import { Page, PageHeader } from "@/components/layout/PageLayout";
import { useAuth } from "@/hooks/useAuth";
import { useCheckIn, useMonthCheckins } from "@/hooks/useCheckIn";
import { useToast } from "@/components/shared/Toast";
import { STREAK_MILESTONES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/checkin")({
  head: () => ({ meta: [{ title: "Daily Check-In — PlugZone" }] }),
  component: CheckInPage,
});

function CheckInPage() {
  const { profile } = useAuth();
  const toast = useToast();
  const checkIn = useCheckIn();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const { data: days } = useMonthCheckins(month);
  const today = new Date();
  const todayKey = format(today, "yyyy-MM-dd");
  const doneToday = profile?.last_check_in === todayKey || days?.has(todayKey);

  const cells = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const lead = (getDay(startOfMonth(month)) + 6) % 7; // Monday first

  return (
    <Page>
      <PageHeader title="Daily Check-In" subtitle="Check in once a day to keep your streak going." />

      <div className="mt-10 grid gap-10 md:grid-cols-[1fr_1.3fr] md:items-start">
        <section>
          <p className="text-sm text-muted-foreground">Current streak</p>
          <p className="font-heading text-[64px] font-bold leading-none">
            {profile?.current_streak ?? 0}
            <span className="ml-2 text-2xl text-muted-foreground">{profile?.current_streak === 1 ? "day" : "days"}</span>
          </p>
          <p className="mt-2 text-[15px] text-muted-foreground">Longest streak: {profile?.longest_streak ?? 0} days</p>

          <button
            className="btn btn-primary btn-lg mt-8 w-full sm:w-auto"
            disabled={doneToday || checkIn.isPending}
            onClick={() =>
              checkIn.mutate(undefined, {
                onSuccess: (r) => toast.success(r.already_checked_in ? "Already checked in today" : `Checked in — ${r.current_streak} day streak!`),
                onError: (e) => toast.error(e.message),
              })
            }
          >
            {doneToday ? (
              <>
                <Check size={18} /> Checked In Today
              </>
            ) : checkIn.isPending ? (
              "Checking in…"
            ) : (
              "Check In"
            )}
          </button>

          <h2 className="mt-12 text-lg">Milestones</h2>
          <ul className="mt-3 space-y-2">
            {STREAK_MILESTONES.map((m) => {
              const hit = (profile?.longest_streak ?? 0) >= m;
              return (
                <li key={m} className={cn("flex items-center gap-2.5 text-[15px]", hit ? "text-foreground" : "text-muted-foreground")}>
                  {hit ? <CheckCircle2 size={18} className="text-primary" /> : <Circle size={18} />}
                  {m}-day streak
                </li>
              );
            })}
          </ul>
        </section>

        <section className="panel p-5">
          <div className="flex items-center justify-between">
            <button className="flex h-11 w-11 items-center justify-center rounded hover:bg-muted" onClick={() => setMonth(subMonths(month, 1))} aria-label="Previous month">
              <ChevronLeft size={18} />
            </button>
            <h2 className="text-lg">{format(month, "MMMM yyyy")}</h2>
            <button
              className="flex h-11 w-11 items-center justify-center rounded hover:bg-muted disabled:opacity-30"
              onClick={() => setMonth(addMonths(month, 1))}
              disabled={isSameMonth(month, today)}
              aria-label="Next month"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {Array.from({ length: lead }).map((_, i) => (
              <span key={`l${i}`} />
            ))}
            {cells.map((d) => {
              const key = format(d, "yyyy-MM-dd");
              const done = days?.has(key) || (isSameDay(d, today) && doneToday);
              const isToday = isSameDay(d, today);
              const future = isAfter(d, today);
              return (
                <div key={key} className="flex aspect-square items-center justify-center">
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full text-sm",
                      done && "bg-primary font-medium text-primary-foreground",
                      !done && isToday && "border-2 border-primary font-medium text-primary",
                      !done && !isToday && future && "text-muted-foreground/50",
                    )}
                  >
                    {format(d, "d")}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </Page>
  );
}
