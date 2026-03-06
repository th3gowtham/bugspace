import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { storeRefCodeFromUrl } from "./lib/referralService";

// Capture ?ref= query param immediately — before React routing can change the URL.
storeRefCodeFromUrl();

createRoot(document.getElementById("root")!).render(<App />);
