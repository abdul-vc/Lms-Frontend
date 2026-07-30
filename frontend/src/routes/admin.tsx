import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/admin")({
  component: AdminRedirect,
});

function AdminRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate({ to: "/org-admin", replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
      Redirecting...
    </div>
  );
}
