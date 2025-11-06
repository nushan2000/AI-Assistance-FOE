import React from "react";
import QuickAccessCard from "./QuickAccessCard";
import GuidanceAnalysisCard from "../GuidanceAnalysisCard/GuidanceAnalysisCard";
import BookingAnalysisCard from "../BookingAnalysisCard/BookingAnalysisCard";

interface DashboardProps {
  // keep props for future use
}

const Dashboard: React.FC<DashboardProps> = () => {
  return (
    <div className="dashboard-section">
      <QuickAccessCard />
      <GuidanceAnalysisCard
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
      />
    </div>
  );
};

export default Dashboard;
