import { redirect } from "next/navigation";

export default function Page() {
  redirect("/setting?section=features");
}
