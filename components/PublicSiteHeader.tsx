import Header from "@/components/Header";
import { hasAdminSession } from "@/lib/admin-session-server";

export default async function PublicSiteHeader() {
    const isAdminLoggedIn = await hasAdminSession();
    return <Header isAdminLoggedIn={isAdminLoggedIn} />;
}
