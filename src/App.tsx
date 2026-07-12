import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Dashboard } from "@/pages/Dashboard";
import { Topics } from "@/pages/Topics";
import { Study } from "@/pages/Study";
import { ProgressPage } from "@/pages/ProgressPage";

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: "/", element: <Dashboard /> },
      { path: "/topics", element: <Topics /> },
      { path: "/progress", element: <ProgressPage /> },
      { path: "/study/:topicId", element: <Study /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
