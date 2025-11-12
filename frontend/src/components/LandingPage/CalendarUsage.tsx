import React, { useEffect, useState } from "react";

interface UsageMap {
  [date: string]: number; // minutes used on that date, YYYY-MM-DD
}

const sampleUsage = (): UsageMap => {
  const m: UsageMap = {};
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    // random sample: some days 0, many small, occasional medium/large
    const r = Math.random();
    if (r < 0.35) m[key] = 0;
    else if (r < 0.7) m[key] = Math.floor(5 + Math.random() * 45); // 5-50m
    else if (r < 0.9) m[key] = Math.floor(20 + Math.random() * 80); // 20-100m
    else m[key] = Math.floor(61 + Math.random() * 140); // heavy day
  }
  return m;
};

const CalendarUsage: React.FC = () => {
  const [FullCalendarComp, setFullCalendarComp] = useState<any | null>(null);
  const [fcPlugins, setFcPlugins] = useState<any[]>([]);
  const [usage, setUsage] = useState<UsageMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    // dynamically import FullCalendar ESM modules to avoid CJS/ESM import issues
    Promise.all([
      import("@fullcalendar/react"),
      import("@fullcalendar/daygrid"),
      import("@fullcalendar/interaction"),
    ])
      .then(([fcMod, dayGridMod, interMod]) => {
        if (!mounted) return;
        setFullCalendarComp(() => fcMod.default || fcMod);
        setFcPlugins([dayGridMod.default || dayGridMod, interMod.default || interMod]);
      })
      // ignore errors; the calendar will fall back to sample rendering if missing
      .catch(() => {
        /* ignore */
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    // try fetching real usage from analytics endpoint; fall back to sample data
    fetch("/api/analytics/usage")
      .then((res) => {
        if (!res.ok) throw new Error("no-analytics");
        return res.json();
      })
      .then((data) => {
        if (!mounted) return;
        // expect object of YYYY-MM-DD -> minutes
        setUsage(data || {});
      })
      .catch(() => {
        if (!mounted) return;
        setUsage(sampleUsage());
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, []);

  const dayClass = (date: Date) => {
    const key = date.toISOString().slice(0, 10);
    const mins = usage[key] || 0;
    if (!mins) return "usage-none";
    if (mins > 60) return "usage-dark";
    if (mins >= 20) return "usage-medium";
    if (mins >= 10) return "usage-light";
    return "usage-light";
  };

  return (
    <div style={{ marginTop: "1.5rem" }}>
      <h3 style={{ margin: "0 0 0.75rem 0" }}>Usage calendar</h3>
      <div style={{ boxShadow: "0 6px 30px rgba(0,0,0,0.06)", borderRadius: 12 }}>
        {FullCalendarComp && fcPlugins.length > 0 ? (
          <FullCalendarComp
            plugins={fcPlugins}
            initialView="dayGridMonth"
            height={420}
            headerToolbar={{ left: "title", center: "", right: "prev,next" }}
            dayCellClassNames={(arg: any) => {
              return [dayClass(arg.date)];
            }}
            dayCellDidMount={(arg: any) => {
              const key = arg.date.toISOString().slice(0, 10);
              const mins = usage[key];
              if (mins && mins > 0) {
                const badge = document.createElement("div");
                badge.style.fontSize = "11px";
                badge.style.opacity = "0.85";
                badge.style.marginTop = "6px";
                badge.style.textAlign = "center";
                badge.style.color = "var(--tab-text, #1a2332)";
                badge.textContent = `${mins}m`;
                arg.el.appendChild(badge);
              }
            }}
          />
        ) : (
          <div style={{ padding: 24 }}>Calendar loading…</div>
        )}
      </div>
      {loading && <div style={{ marginTop: 8 }}>Loading usage…</div>}
    </div>
  );
};

export default CalendarUsage;
