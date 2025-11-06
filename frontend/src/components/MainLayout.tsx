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
    <div style={{ display: "flex", height: "100vh" }}>
      <LandingPage
        userProfile={userProfile}
        agents={agents}
        onLogout={onLogout}
      />
      <div style={{ flex: 1 }}>
        <Outlet />
      </div>
    </div>
  );
};

export default MainLayout;
