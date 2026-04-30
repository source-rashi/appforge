import { redirect } from "next/navigation";

// Root route — immediately redirect to the app.
// /app checks for a token and sends unauthenticated users to /login automatically.
export default function RootPage() {
  redirect("/app");
}
