import React from "react";
import { Outlet } from "react-router-dom";
import LandingPage from "./LandingPage/LandingPage";

interface MainLayoutProps {
  userProfile?: any;
  agents?: any[];
  onLogout?: () => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({
  userProfile,
  agents,
  onLogout,
}) => {
  return (
    <div
      className="landing-page-container"
      style={{ display: "flex", minHeight: "100vh" }}
    >
      <LandingPage
        userProfile={userProfile}
        agents={agents}
        onLogout={onLogout}
      />
      <main className="main-content-area" style={{ flex: 1 }}>
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
