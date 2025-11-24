import React from "react";
import { useOutletContext } from "react-router-dom";
import QuickAccessCard from "./QuickAccessCard";
import Greeting from "./Greeting";
import GuidanceAnalysisCard from "../GuidanceAnalysisCard/GuidanceAnalysisCard";
import BookingAnalysisCard from "../BookingAnalysisCard/BookingAnalysisCard";
import CalendarUsageMUI from "./CalendarUsageMUI";
import { Card, CardContent, Typography } from "@mui/material";
import { Box } from "@mui/material";
import { useTheme } from "../../context/ThemeContext";

interface DashboardProps {
  // keep props for future use
}

const Dashboard: React.FC<DashboardProps> = () => {
  // receive agents from MainLayout via Outlet context
  const outletContext = useOutletContext<{ agents?: any[] } | undefined>();
  const agents = outletContext?.agents;

  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="dashboard-section">
      <div className="dashboard-banner" role="banner">
        <img
          src="/dashboard_banner.png"
          alt="Dashboard banner"
          className="dashboard-banner-image"
        />
        <div className="dashboard-banner-inner">
          <div className="dashboard-banner-overlay">
            <Greeting />
            <div style={{ height: 8 }} />
            <div style={{ marginLeft: 32 }} />
          </div>
        </div>
      </div>
      <div className="dashboard-top-cards">
        <div
          style={{
            display: "flex",
            gap: 1,
            alignItems: "flex-start",
            width: "100%",
          }}
        >
          <div style={{ flex: 2 }}>
            <QuickAccessCard agents={agents} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="usage-card-wrapper">
              <Card
                elevation={4}
                sx={{
                  borderRadius: 5,
                  p: 2,
                  background: isDark ? "#2c3440" : "#f5f8fa",
                  width: "100%",
                }}
              >
                <CardContent
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                    overflow: "hidden",
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      mb: 2,
                      color: isDark ? "#eaf3ff" : "#1a2332",
                    }}
                  >
                    Usage
                  </Typography>
                  <Box sx={{ flex: 1, overflowY: "auto", py: 0.5 }}>
                    <CalendarUsageMUI />
                  </Box>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      {/* <GuidanceAnalysisCard
        timesCalled={1234}
        dailyUsage={[12, 15, 9, 20, 18, 14, 10]}
        monthlyUsage={[120, 98, 110, 130, 125, 140]}
        dailyLimit={25}
        todayUsage={18}
        lastChats={[
          {
            user: "Alice",
            message: "How do I apply for leave?",
            time: "10:02",
          },
          { user: "Bob", message: "What is the exam schedule?", time: "10:05" },
          {
            user: "Carol",
            message: "Can I get syllabus details?",
            time: "10:10",
          },
          { user: "Dave", message: "How to contact my mentor?", time: "10:15" },
          { user: "Eve", message: "Where is the library?", time: "10:20" },
        ]}
      />
      <BookingAnalysisCard
        upcomingBookings={[
          {
            title: "AI Seminar",
            start: "2025-08-20 10:00",
            end: "2025-08-20 12:00",
            room: "LT1",
          },
          {
            title: "Project Review",
            start: "2025-08-22 14:00",
            end: "2025-08-22 15:30",
            room: "Lab2",
          },
        ]}
        todaysBookings={[
          {
            title: "Faculty Meeting",
            start: "2025-08-15 09:00",
            end: "2025-08-15 10:00",
            room: "LT2",
          },
          {
            title: "Lab Session",
            start: "2025-08-15 11:00",
            end: "2025-08-15 13:00",
            room: "Lab1",
          },
        ]}
        bookingHistory={[
          {
            title: "Math Workshop",
            start: "2025-08-10 09:00",
            end: "2025-08-10 11:00",
            room: "LT2",
          },
          {
            title: "Research Meeting",
            start: "2025-08-12 13:00",
            end: "2025-08-12 14:00",
            room: "Lab1",
          },
        ]}
        calendarRefreshKey={0}
      /> */}
    </div>
  );
};

export default Dashboard;
