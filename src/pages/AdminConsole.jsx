/**
 * AdminConsole — admin dashboard for ArtJudge.
 *
 * Route: /admin-console
 *
 * Access is gated by Google sign-in + email matching VITE_ADMIN_EMAIL.
 * Displays subscribed users, their sessions, and chat messages.
 */

import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import LoginButton from "../components/LoginButton";
import AdminUserTable from "../components/AdminUserTable";
import { adminGetStats } from "../services/api";

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || "";

export default function AdminConsole() {
  const { user, idToken, loading } = useAuth();
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState(null);

  // Fetch stats when admin is authenticated
  useEffect(() => {
    if (!user || !idToken) return;
    if (user.email !== ADMIN_EMAIL) return;

    adminGetStats(idToken)
      .then(setStats)
      .catch((err) => setStatsError(err.message));
  }, [user, idToken]);

  // Loading
  if (loading) {
    return (
      <div className="admin-console">
        <p>Loading...</p>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="admin-console">
        <h1>ArtJudge Admin</h1>
        <p>Sign in with your admin Google account to access the dashboard.</p>
        <LoginButton />
      </div>
    );
  }

  // Logged in but not admin
  if (user.email !== ADMIN_EMAIL) {
    return (
      <div className="admin-console">
        <h1>Access Denied</h1>
        <p>
          You are signed in as <strong>{user.email}</strong>, but this account
          does not have admin privileges.
        </p>
        <a href="/">Back to ArtJudge</a>
      </div>
    );
  }

  // Admin dashboard
  return (
    <div className="admin-console">
      <header className="admin-header">
        <h1>ArtJudge Admin Console</h1>
        <div className="admin-header-user">
          {user.photoURL && (
            <img src={user.photoURL} alt={user.displayName || "Admin"} />
          )}
          <span>{user.displayName || user.email}</span>
          <a href="/" className="admin-back-link">
            Back to App
          </a>
        </div>
      </header>

      {/* Stats cards */}
      {statsError ? (
        <p className="admin-error">Failed to load stats: {statsError}</p>
      ) : stats ? (
        <div className="admin-stats">
          <div className="stat-card">
            <span className="stat-value">{stats.users}</span>
            <span className="stat-label">Users</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.sessions}</span>
            <span className="stat-label">Sessions</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.messages}</span>
            <span className="stat-label">Messages</span>
          </div>
        </div>
      ) : (
        <p>Loading stats...</p>
      )}

      {/* User table */}
      <AdminUserTable />
    </div>
  );
}
