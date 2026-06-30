import { redirect } from "next/navigation";

export default function SignupPage() {
  redirect("/admin/auth?mode=signup");
}
