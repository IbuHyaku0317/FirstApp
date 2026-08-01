import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { LoadingState } from "../components/molecules";
import { AppTemplate } from "../components/templates";
import { LanguageProvider, useLanguage } from "../providers/LanguageProvider";
import { SessionProvider, useSession } from "../providers/SessionProvider";
import { AuthPage } from "../pages/AuthPage";
import { CalendarPage } from "../pages/CalendarPage";
import { FeedPage } from "../pages/FeedPage";
import { MemoriesPage } from "../pages/MemoriesPage";
import { NewPostPage } from "../pages/NewPostPage";
import { ProfilePage } from "../pages/ProfilePage";

const queryClient = new QueryClient();

// Guardは画面上のアクセス制御。実際の認可は必ずBEでも実施する。
function Guard({ children }: { children: ReactNode }) {
  const { user, loading } = useSession();
  const { t } = useLanguage();
  if (loading) return <LoadingState text={t.loadingMemories} />;
  return user ? children : <Navigate to="/login" replace />;
}

function AuthenticatedRoutes() {
  return (
    <Guard>
      <AppTemplate>
        <Routes>
          <Route index element={<FeedPage />} />
          <Route path="new" element={<NewPostPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="memories/today" element={<MemoriesPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Routes>
      </AppTemplate>
    </Guard>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <LanguageProvider>
          <SessionProvider>
            <Routes>
              <Route path="/login" element={<AuthPage />} />
              <Route path="/register" element={<AuthPage register />} />
              <Route path="/*" element={<AuthenticatedRoutes />} />
            </Routes>
          </SessionProvider>
        </LanguageProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
