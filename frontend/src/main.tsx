import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { LanguageProvider } from "./lib/i18n";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <LanguageProvider>
      {/* basename = Vite's BASE_URL, which mirrors vite.config.ts's `base` — "/" locally,
         "/<repo-name>/" when built for GitHub Pages (see .github/workflows/deploy-pages.yml) */}
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <App />
      </BrowserRouter>
    </LanguageProvider>
  </React.StrictMode>
);
