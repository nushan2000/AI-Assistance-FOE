import React, { useEffect, useState } from "react";
import dayjs, { Dayjs } from "dayjs";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import { useTheme } from "@mui/material/styles";
import { getMonthlyLoginDates } from "../../services/usageAPI";
import { UsageMap } from "../../utils/types";

const makeCalendarGrid = (month: Dayjs) => {
  const start = month.startOf("month").startOf("week");
  const days: Dayjs[] = [];
  for (let i = 0; i < 42; i++) {
    days.push(start.add(i, "day"));
  }
  return days;
};

// Simplified: backend returns a map of days where the user logged in; any
// such day is colored brown. No minute/threshold logic on the frontend.

const CalendarUsageMUI: React.FC = () => {
  const [month, setMonth] = useState<Dayjs>(dayjs().startOf("month"));
  const [usage, setUsage] = useState<UsageMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    const year = month.year();
    const mon = month.month() + 1;

    getMonthlyLoginDates(year, mon)
      .then((data) => {
        if (!mounted) return;
        setUsage(data || {});
      })
      .catch(() => {
        if (!mounted) return;
        setUsage({});
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [month]);

  const theme = useTheme();
  const days = makeCalendarGrid(month);
  const brown = "#8B5E3C";
  const brownContrast = "#ffffff";

  return (
    <Box sx={{ mt: 1 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
        <IconButton
          aria-label="prev"
          onClick={() => setMonth((m) => m.subtract(1, "month"))}
          size="small"
        >
          <ArrowBackIosNewIcon fontSize="small" />
        </IconButton>
        <Typography variant="h6" sx={{ flex: 1, textAlign: "center" }}>
          {month.format("MMMM YYYY")}
        </Typography>
        <IconButton
          aria-label="next"
          onClick={() => setMonth((m) => m.add(1, "month"))}
          size="small"
        >
          <ArrowForwardIosIcon fontSize="small" />
        </IconButton>
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: 0.4,
          borderRadius: 2,
          bgcolor: theme.palette.background.paper,
        }}
      >
        <Grid container spacing={0.15} columns={7} sx={{ mb: 0.3 }}>
          {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
            <Grid size={1} key={d} sx={{ textAlign: "center" }}>
              <Typography variant="caption" color="text.secondary">
                {d}
              </Typography>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={0.15} columns={7}>
          {days.map((d) => {
            const key = d.format("YYYY-MM-DD");
            const logged = !!usage[key];
            const isToday = d.isSame(dayjs(), "day");
            const isCurrentMonth = d.isSame(month, "month");

            return (
              <Grid size={1} key={key} sx={{ textAlign: "center" }}>
                <Box
                  sx={{
                    height: 26.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {isCurrentMonth ? (
                    <Box
                      sx={{
                        width: 25,
                        height: 25,
                        borderRadius: "50%",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: logged ? brown : "transparent",
                        color: logged
                          ? brownContrast
                          : theme.palette.text.primary,
                        fontWeight: isToday ? 700 : 600,
                        boxSizing: "border-box",
                        border: isToday
                          ? `2px solid ${theme.palette.primary.main}`
                          : "none",
                      }}
                    >
                      <Typography variant="body2" sx={{ fontSize: 13 }}>
                        {d.date()}
                      </Typography>
                    </Box>
                  ) : (
                    // keep cell empty for days outside the current month
                    <Box sx={{ width: 20, height: 20 }} />
                  )}
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Paper>

      {/* legend removed: simple brown mark indicates the user logged in that day */}

      {loading && <Typography variant="caption">Loading usage…</Typography>}
    </Box>
  );
};

export default CalendarUsageMUI;
