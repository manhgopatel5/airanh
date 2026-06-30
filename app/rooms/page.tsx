import PublicRoomsClient from "./PublicRoomsClient";

export const revalidate = 30;

export default function PublicRoomsPage() {
  return <PublicRoomsClient />;
}
