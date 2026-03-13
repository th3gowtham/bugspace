import { Navigate, useLocation } from "react-router-dom";
import { getPromoterSession } from "@/lib/promoterService";

export function PromoterRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const session = getPromoterSession();

  if (!session) {
    return <Navigate to="/promoter/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}
