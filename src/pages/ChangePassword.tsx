import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { API_BASE } from "@/config/api";

const ChangePassword = () => {
  const { token, login, user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast({ title: "Invalid password", description: "New password must be at least 8 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", description: "Confirm the new password exactly.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const payload = await res.json().catch(() => null);
      if (res.status === 401) {
        logout();
        throw new Error("Session expired");
      }
      if (!res.ok) {
        throw new Error(payload?.message ?? "Password change failed");
      }

      login({ token: payload.token, user: payload.user });
      toast({ title: "Password updated", description: "You can now access the dashboard." });
      navigate("/", { replace: true });
    } catch (err: any) {
      toast({ title: "Password change failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            {user?.name ? `${user.name}, set a new password before using the dashboard.` : "Set a new password before using the dashboard."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label>Current Password</Label>
              <Input value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} type="password" required />
            </div>
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password" required />
            </div>
            <div className="space-y-2">
              <Label>Confirm New Password</Label>
              <Input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type="password" required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChangePassword;
