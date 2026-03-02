import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ModeProvider } from "@/context/ModeContext";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { RequireAuth } from "@/components/auth/RequireAuth";
import Dashboard from "./pages/Dashboard";
import Targeting from "./pages/Targeting";
import Operations from "./pages/Operations";
import Impact from "./pages/Impact";
import Admin from "./pages/Admin";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import FormPublic from "./pages/FormPublic";

const queryClient = new QueryClient();

const Root = () => (
  <AppLayout>
    <Outlet />
  </AppLayout>
);

const LoginShell = () => <Outlet />;

const router = createBrowserRouter([
  {
    element: <LoginShell />,
    children: [{ path: "login", element: <Login /> }],
  },
  {
    element: <Root />,
    children: [
      { index: true, element: <RequireAuth><Dashboard /></RequireAuth> },
      { path: "targeting", element: <RequireAuth><Targeting /></RequireAuth> },
      { path: "operations", element: <RequireAuth><Operations /></RequireAuth> },
      { path: "impact", element: <RequireAuth><Impact /></RequireAuth> },
      { path: "admin", element: <RequireAuth><Admin /></RequireAuth> },
      { path: "settings", element: <RequireAuth><Settings /></RequireAuth> },
      { path: "*", element: <NotFound /> },
    ],
  },
  {
    // public form routes without app shell / auth
    element: <LoginShell />,
    children: [{ path: "forms/:slug", element: <FormPublic /> }],
  },
]);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ThemeProvider>
        <ModeProvider>
          <AuthProvider>
            <RouterProvider
              router={router}
              future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
            />
          </AuthProvider>
        </ModeProvider>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
