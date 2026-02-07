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

// Lazy load pages for code splitting
const HomePage = lazy(() => import("@/pages/home").then(m => ({ default: m.HomePage })));
const CountryPage = lazy(() => import("@/pages/country").then(m => ({ default: m.CountryPage })));
const NewAnalysisPage = lazy(() => import("@/pages/new-analysis").then(m => ({ default: m.NewAnalysisPage })));
const ReportPage = lazy(() => import("@/pages/report").then(m => ({ default: m.ReportPage })));
const DiscussionPage = lazy(() => import("@/pages/discussion").then(m => ({ default: m.DiscussionPage })));
const PrivacyPage = lazy(() => import("@/pages/privacy").then(m => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import("@/pages/terms").then(m => ({ default: m.TermsPage })));
const LearnMorePage = lazy(() => import("@/pages/learn-more").then(m => ({ default: m.LearnMorePage })));

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
