import { Outlet } from "react-router-dom";
import { Navbar } from "./navbar";
import { CustomCursor } from "@/components/custom-cursor";

export const DashboardLayout = () => {
  return (
    <div className="min-h-screen bg-background gradient-mesh grid-background">
      <CustomCursor />
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
};
