import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { storeRefCodeFromUrl } from "./lib/referralService";
import { primePromoterSignupContext, storePromoCodeFromUrl } from "./lib/promoterService";

// Capture ?ref= query param immediately — before React routing can change the URL.
storeRefCodeFromUrl();
// Capture ?promo= links for promoter campaigns.
storePromoCodeFromUrl();
void primePromoterSignupContext();

createRoot(document.getElementById("root")!).render(<App />);
