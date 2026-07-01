import { redirect } from "next/navigation";

export default function SettingsProfileRedirect() {
  redirect("/settings/profile-edit");
}
