import { redirect } from "next/navigation";

// Dashboard sementara mengarah ke manajemen outlet (modul aktif).
export default function DashboardPage() {
  redirect("/outlets");
}
