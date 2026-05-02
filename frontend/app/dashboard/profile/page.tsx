"use client"
import { getToken, clearToken } from "@/lib/token"

import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { User, Save, Loader2, Sparkles, Lock, Eye, EyeOff, Upload, Camera } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    fetch(`${API_BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data.code === 0 && data.data?.user) {
          const u = data.data.user;
          setUser(u);
          setDisplayName(u.displayName || "");
          setBio(u.bio || "");
          setAvatarUrl(u.avatarUrl || "");
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/api/users/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ displayName, bio, avatarUrl }),
      });
      const data = await res.json();
      if (data.code === 0) {
        alert("保存成功！");
      } else {
        alert(data.message || "保存失败");
      }
    } catch (e) { console.error(e); alert("保存失败"); }
    finally { setSaving(false); }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("请选择图片文件");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("图片大小不能超过5MB");
      return;
    }
    const token = getToken();
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${API_BASE}/api/upload/image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.code === 0 && data.data) {
        setAvatarUrl(data.data);
        alert("头像上传成功！记得点击保存");
      } else {
        alert(data.message || "上传失败");
      }
    } catch (err) {
      console.error(err);
      alert("上传失败");
    }
    e.target.value = "";
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      alert("两次输入的密码不一致");
      return;
    }
    if (newPassword.length < 6) {
      alert("密码长度至少6位");
      return;
    }
    setChangingPassword(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/api/users/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (data.code === 0) {
        alert("密码修改成功！");
        setShowPasswordModal(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        alert(data.message || "修改失败");
      }
    } catch (e) { console.error(e); alert("修改失败"); }
    finally { setChangingPassword(false); }
  };

  if (loading) return <div className="min-h-screen flex flex-col"><Header /><main className="flex-1 flex items-center justify-center"><p>加载中...</p></main><Footer /></div>;
  if (!user) return <div className="min-h-screen flex flex-col"><Header /><main className="flex-1 flex items-center justify-center"><p>请先登录</p></main><Footer /></div>;

  const avatarLetter = displayName ? displayName[0].toUpperCase() : (user.username ? user.username[0].toUpperCase() : "?");

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-float absolute -top-32 right-1/4 h-96 w-96 rounded-full bg-orange-400/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-2xl px-4 py-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg">
              <User className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">个人资料</h1>
              <p className="text-sm text-muted-foreground">管理你的个人信息</p>
            </div>
          </div>

          <div className="rounded-2xl border bg-card/80 backdrop-blur-sm p-6 shadow-sm glow-card">
            <div className="flex items-center gap-6 mb-8 pb-8 border-b">
              <div className="relative">
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt="头像" 
                    className="h-20 w-20 rounded-full object-cover shadow-xl"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`h-20 w-20 rounded-full bg-gradient-to-br from-rose-500 via-pink-500 to-orange-400 flex items-center justify-center text-2xl font-bold text-white shadow-xl ${avatarUrl ? 'hidden' : ''}`}>
                  {avatarLetter}
                </div>
                <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-green-500 border-4 border-card flex items-center justify-center">
                  <Sparkles className="h-3 w-3 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-semibold">{user.username}</h2>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <span className="inline-block mt-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-medium text-rose-500">
                  {user.role === "ADMIN" ? "管理员" : user.role === "AUTHOR" ? "作者" : "读者"}
                </span>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium">显示名称</label>
                <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-xl border bg-muted/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                  placeholder="你的显示名称" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">头像</label>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <label className="cursor-pointer">
                      <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                      <div className="relative group">
                        {avatarUrl ? (
                          <img 
                            src={avatarUrl} 
                            alt="头像" 
                            className="h-20 w-20 rounded-full object-cover shadow-xl"
                          />
                        ) : (
                          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-rose-500 via-pink-500 to-orange-400 flex items-center justify-center text-2xl font-bold text-white shadow-xl">
                            {avatarLetter}
                          </div>
                        )}
                        <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Camera className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    </label>
                  </div>
                  <div className="flex-1">
                    <label className="inline-flex items-center gap-2 cursor-pointer rounded-xl border border-dashed border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors">
                      <Upload className="h-4 w-4" />
                      <span>点击上传头像</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                    </label>
                    <p className="mt-1 text-xs text-muted-foreground">支持 jpg, png, gif, webp，最大 5MB</p>
                  </div>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">个人简介</label>
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4}
                  className="w-full rounded-xl border bg-muted/50 px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                  placeholder="介绍一下自己..." />
              </div>
              <div className="pt-4 flex items-center gap-4">
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-orange-400 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-rose-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" />保存修改</>}
                </button>
                <button onClick={() => setShowPasswordModal(true)}
                  className="flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-5 py-2.5 text-sm font-medium text-orange-600 hover:bg-orange-100 transition-all">
                  <Lock className="h-4 w-4" />修改密码
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowPasswordModal(false)}>
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">修改密码</h3>
              <button onClick={() => setShowPasswordModal(false)} className="rounded-full p-2 hover:bg-muted">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">当前密码</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-xl border bg-muted/50 px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                    placeholder="输入当前密码" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">新密码</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border bg-muted/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                  placeholder="输入新密码（至少6位）" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">确认新密码</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border bg-muted/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                  placeholder="再次输入新密码" />
              </div>
              <button onClick={handleChangePassword} disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50">
                {changingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : "确认修改"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}