"use client";

import { useAuth } from "@/lib/auth-context";

export function LogoutButton() {
  const { logout } = useAuth();

  async function handleLogout() {
    await logout();
  }

  return <button onClick={handleLogout}>Logout</button>;
}
