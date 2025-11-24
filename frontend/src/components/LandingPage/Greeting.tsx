import React, { useEffect, useState } from "react";
import { Typography, Box } from "@mui/material";
import { useTheme } from "../../context/ThemeContext";
import { fetchUserProfile } from "../../services/authAPI";

function chooseGreeting(date = new Date()) {
  const h = date.getHours();
  if (h >= 0 && h < 12) return "Good Morning";
  if (h >= 12 && h < 15) return "Good Afternoon";
  return "Good Evening";
}

const Greeting: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [name, setName] = useState<string | null>(null);
  const [greeting, setGreeting] = useState(() => chooseGreeting());

  useEffect(() => {
    let mounted = true;
    fetchUserProfile()
      .then((data) => {
        if (!mounted) return;
        const first = data.firstname || data.name || "";
        // const last = data.lastname || '';
        let display = first.trim();
        if (!display) display = data.email ? data.email.split("@")[0] : "";
        setName(display || null);
      })
      .catch(() => {
        // silent fail — greeting will show without a name
      });
    // refresh greeting at next boundary (top of the next hour)
    const now = new Date();
    const msToNextHour =
      (60 - now.getMinutes()) * 60 * 1000 -
      now.getSeconds() * 1000 -
      now.getMilliseconds();
    const t = setTimeout(
      () => setGreeting(chooseGreeting()),
      msToNextHour + 50
    );
    return () => {
      mounted = false;
      clearTimeout(t);
    };
  }, []);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", ml: 8 }}>
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
        <Typography
          variant="h5"
          sx={{ fontWeight: 700, color: isDark ? "#eaf3ff" : "#13202b" }}
        >
          {greeting},
        </Typography>
        <Typography
          variant="h5"
          sx={{ fontWeight: 700, color: "primary.main" }}
        >
          {name ?? ""}!
        </Typography>
      </Box>
    </Box>
  );
};

export default Greeting;
