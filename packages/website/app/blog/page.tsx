import { redirect, RedirectType } from "next/navigation";

export default function BlogPage() {
  redirect("/blog/intro", RedirectType.replace);
}
