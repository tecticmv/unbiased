import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StreamingReportProvider } from "@/contexts/streaming-report";
import { DiscussionProvider } from "@/contexts/discussion-context";
import { CountryProvider } from "@/contexts/country-context";
import { Layout } from "@/components/layout";
import "@/i18n"; // Initialize i18n
import "@/index.css";

// Helper to retry lazy imports on chunk load failures (new deployment)
const lazyRetry = (componentImport: () => Promise<any>) =>
  lazy(() =>
    componentImport().catch((error) => {
      // Check if it's a chunk load error (new deployment)
      const isChunkLoadError =
        error?.name === "ChunkLoadError" ||
        error?.message?.includes("Failed to fetch dynamically imported module") ||
        error?.message?.includes("Importing a module script failed");

      if (isChunkLoadError) {
        // New deployment detected, reload page to get new chunks
        console.log("New deployment detected, reloading page...");
        window.location.reload();
        // Return a promise that never resolves to prevent error boundary
        return new Promise(() => {});
      }
      // Re-throw other errors
      throw error;
    })
  );

// Lazy load pages for code splitting with auto-reload on new deployment
const HomePage = lazyRetry(() => import("@/pages/home").then(m => ({ default: m.HomePage })));
const CountryPage = lazyRetry(() => import("@/pages/country").then(m => ({ default: m.CountryPage })));
const NewAnalysisPage = lazyRetry(() => import("@/pages/new-analysis").then(m => ({ default: m.NewAnalysisPage })));
const ReportPage = lazyRetry(() => import("@/pages/report").then(m => ({ default: m.ReportPage })));
const DiscussionPage = lazyRetry(() => import("@/pages/discussion").then(m => ({ default: m.DiscussionPage })));
const PrivacyPage = lazyRetry(() => import("@/pages/privacy").then(m => ({ default: m.PrivacyPage })));
const TermsPage = lazyRetry(() => import("@/pages/terms").then(m => ({ default: m.TermsPage })));
const LearnMorePage = lazyRetry(() => import("@/pages/learn-more").then(m => ({ default: m.LearnMorePage })));

function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="system" storageKey="unbiased-theme">
      <TooltipProvider>
        <CountryProvider>
          <StreamingReportProvider>
            <DiscussionProvider>
              <BrowserRouter>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {/* Discussion page - standalone layout without navbar/footer */}
                    <Route path=":country/report/:slug/discussion" element={<DiscussionPage />} />

                    {/* Main layout with navbar and footer */}
                    <Route path="/" element={<Layout />}>
                      <Route index element={<HomePage />} />
                      <Route path=":country" element={<CountryPage />} />
                      <Route path=":country/new" element={<NewAnalysisPage />} />
                      <Route path=":country/report/:slug" element={<ReportPage />} />
                      <Route path="learn-more" element={<LearnMorePage />} />
                      <Route path="privacy" element={<PrivacyPage />} />
                      <Route path="terms" element={<TermsPage />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Route>
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </DiscussionProvider>
          </StreamingReportProvider>
        </CountryProvider>
      </TooltipProvider>
    </ThemeProvider>
  </React.StrictMode>
);
