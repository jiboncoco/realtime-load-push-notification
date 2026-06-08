import { redirect } from "next/navigation";

// Dashboard mengarah ke panel antrian (bisa diakses admin & operator).
export default function DashboardPage() {
  redirect("/queue");
}
