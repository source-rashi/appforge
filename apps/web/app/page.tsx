"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Plus,
  LayoutTemplate,
  Database,
  Server,
  Settings,
  Search,
  Bell,
  Activity,
  ChevronRight,
  Code2,
  LogIn,
  LogOut,
  UserPlus,
  ExternalLink,
} from "lucide-react";

export default function Dashboard() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeNav, setActiveNav] = useState("Applications");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    router.push("/login");
  };

  const apps = [
    {
      id: "crm-app",
      name: "Customer CRM",
      status: "running",
      uptime: "99.9%",
      lastDeploy: "2 hours ago",
      features: ["Auth", "Postgres", "API"],
      color: "from-blue-500 to-cyan-400",
    },
    {
      id: "ecommerce-admin",
      name: "E-Commerce Admin",
      status: "building",
      uptime: "-",
      lastDeploy: "Just now",
      features: ["Auth", "Redis", "Stripe"],
      color: "from-fuchsia-500 to-purple-500",
    },
    {
      id: "internal-tools",
      name: "Internal Toolkit",
      status: "stopped",
      uptime: "0%",
      lastDeploy: "5 days ago",
      features: ["Postgres", "API"],
      color: "from-zinc-500 to-zinc-700",
    },
  ];

  const filteredApps = apps.filter((app) =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100, damping: 15 },
    },
  };

  const navItems = [
    { icon: LayoutTemplate, label: "Applications", route: isLoggedIn ? "/app" : "/login" },
    { icon: Database, label: "Databases", route: "/login" },
    { icon: Server, label: "Deployments", route: "/login" },
    { icon: Activity, label: "Metrics", route: "/login" },
  ];

  const settingsItems = [
    { icon: Settings, label: "Configuration", route: "/login" },
    { icon: Code2, label: "API Keys", route: "/login" },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      {/* Dynamic Background Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px] animate-pulse-slow pointer-events-none" />
      <div
        className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/10 blur-[120px] animate-pulse-slow pointer-events-none"
        style={{ animationDelay: "2s" }}
      />

      {/* Sidebar */}
      <motion.aside
        initial={{ x: -280 }}
        animate={{ x: 0 }}
        className="w-72 glass-panel border-r border-card-border flex flex-col z-10"
      >
        <div className="h-20 flex items-center px-6 border-b border-card-border">
          <button
            onClick={() => router.push("/")}
            className="flex items-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-shadow">
              <LayoutTemplate className="w-5 h-5 text-white" />
            </div>
            <span className="ml-3 font-bold text-xl tracking-tight text-white">
              App<span className="text-primary-foreground/70">Forge</span>
            </span>
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <div className="space-y-1 mb-8">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Platform
            </p>
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  setActiveNav(item.label);
                  router.push(item.route);
                }}
                className={`w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeNav === item.label
                    ? "bg-primary/15 text-primary shadow-sm"
                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                }`}
              >
                <item.icon
                  className={`w-4 h-4 mr-3 ${
                    activeNav === item.label ? "text-primary" : "text-zinc-400"
                  }`}
                />
                {item.label}
              </button>
            ))}
          </div>

          <div className="space-y-1">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Settings
            </p>
            {settingsItems.map((item) => (
              <button
                key={item.label}
                onClick={() => router.push(item.route)}
                className="w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 transition-all"
              >
                <item.icon className="w-4 h-4 mr-3 text-zinc-400" />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Auth section at bottom */}
        <div className="p-4 border-t border-card-border space-y-2">
          {isLoggedIn ? (
            <>
              <button
                onClick={() => router.push("/app")}
                className="w-full glass flex items-center px-3 py-3 rounded-xl hover:bg-zinc-800/50 transition-all group"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary/60 to-purple-600/60 border border-zinc-500 flex items-center justify-center">
                  <LayoutTemplate className="w-4 h-4 text-white" />
                </div>
                <div className="ml-3 text-left flex-1">
                  <p className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">
                    My Apps
                  </p>
                  <p className="text-xs text-zinc-500">Go to dashboard</p>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all"
              >
                <LogOut className="w-4 h-4 mr-3" />
                Sign Out
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => router.push("/login")}
                className="w-full flex items-center justify-center px-3 py-2.5 rounded-lg text-sm font-medium bg-primary/15 text-primary hover:bg-primary/25 transition-all"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Sign In
              </button>
              <button
                onClick={() => router.push("/register")}
                className="w-full flex items-center justify-center px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 transition-all border border-zinc-800"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Create Account
              </button>
            </>
          )}
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col z-10 relative">
        {/* Header */}
        <header className="h-20 glass border-b border-card-border flex items-center justify-between px-8">
          <div className="relative w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search applications, configs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-full py-2 pl-10 pr-4 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all placeholder:text-zinc-600"
            />
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(isLoggedIn ? "/app" : "/login")}
              className="relative p-2 rounded-full hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-200"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />
            </button>
            <button
              onClick={() => router.push(isLoggedIn ? "/app" : "/login")}
              className="bg-white text-black px-4 py-2 rounded-full text-sm font-medium hover:bg-zinc-200 transition-colors flex items-center shadow-[0_0_20px_rgba(255,255,255,0.1)]"
            >
              <Plus className="w-4 h-4 mr-2" />
              New App Config
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="max-w-6xl mx-auto space-y-8"
          >
            {/* Hero Banner */}
            <motion.div
              variants={itemVariants}
              className="glass-panel rounded-3xl p-8 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-[600px] h-full bg-gradient-to-l from-primary/10 to-transparent pointer-events-none" />

              <div className="relative z-10 w-2/3">
                <h1 className="text-4xl font-bold mb-4 tracking-tight">
                  Welcome to <span className="text-gradient">AppForge</span>
                </h1>
                <p className="text-zinc-400 text-lg mb-8 leading-relaxed">
                  Design your application infrastructure using declarative JSON
                  configurations. We handle the boilerplate, APIs, and
                  deployments so you can focus on the logic.
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={() => router.push(isLoggedIn ? "/app" : "/login")}
                    className="bg-primary hover:bg-indigo-600 text-white px-6 py-3 rounded-xl text-sm font-medium transition-all shadow-lg shadow-primary/25 flex items-center group"
                  >
                    <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform duration-200" />
                    {isLoggedIn ? "Create Application" : "Get Started"}
                  </button>
                  <button
                    onClick={() =>
                      window.open(
                        "https://github.com/source-rashi/appforge",
                        "_blank"
                      )
                    }
                    className="glass hover:bg-zinc-800/50 text-zinc-200 px-6 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-2"
                  >
                    View Documentation
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Stats Overview */}
            <motion.div variants={itemVariants} className="grid grid-cols-3 gap-6">
              {[
                {
                  label: "Active Apps",
                  value: "2",
                  trend: "+1 this week",
                  color: "text-green-400",
                },
                {
                  label: "Total Deployments",
                  value: "142",
                  trend: "+24 today",
                  color: "text-primary",
                },
                {
                  label: "Avg Build Time",
                  value: "45s",
                  trend: "-12s improvement",
                  color: "text-purple-400",
                },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="glass rounded-2xl p-6 relative group overflow-hidden hover:border-zinc-700 transition-colors cursor-default"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <p className="text-sm font-medium text-zinc-400 mb-2">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-bold text-white mb-2">
                    {stat.value}
                  </p>
                  <p className={`text-xs font-medium ${stat.color}`}>
                    {stat.trend}
                  </p>
                </div>
              ))}
            </motion.div>

            {/* Applications List */}
            <motion.div variants={itemVariants}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">
                  Your Applications
                </h2>
                <button
                  onClick={() => router.push(isLoggedIn ? "/app" : "/login")}
                  className="text-sm font-medium text-primary hover:text-indigo-400 flex items-center transition-colors"
                >
                  View all <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredApps.map((app) => (
                  <motion.div
                    key={app.id}
                    className="glass rounded-2xl p-6 cursor-pointer border border-card-border hover:border-zinc-600 transition-all group relative overflow-hidden"
                    whileHover={{ y: -4 }}
                    onClick={() =>
                      router.push(isLoggedIn ? "/app" : "/login")
                    }
                  >
                    <div
                      className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${app.color}`}
                    />

                    <div className="flex justify-between items-start mb-4">
                      <div
                        className={`w-10 h-10 rounded-xl bg-gradient-to-br ${app.color} flex items-center justify-center opacity-90 group-hover:opacity-100 transition-opacity`}
                      >
                        <LayoutTemplate className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex items-center space-x-2">
                        {app.status === "running" && (
                          <span className="flex items-center text-xs font-medium text-green-400 bg-green-400/10 px-2.5 py-1 rounded-full border border-green-400/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 mr-1.5 animate-pulse" />
                            Running
                          </span>
                        )}
                        {app.status === "building" && (
                          <span className="flex items-center text-xs font-medium text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20">
                            <span className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mr-1.5" />
                            Building
                          </span>
                        )}
                        {app.status === "stopped" && (
                          <span className="flex items-center text-xs font-medium text-zinc-400 bg-zinc-800 px-2.5 py-1 rounded-full border border-zinc-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 mr-1.5" />
                            Stopped
                          </span>
                        )}
                      </div>
                    </div>

                    <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-primary transition-colors">
                      {app.name}
                    </h3>
                    <p className="text-sm text-zinc-500 mb-6 font-mono text-xs">
                      {app.id}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-6">
                      {app.features.map((feature, i) => (
                        <span
                          key={i}
                          className="text-xs font-medium text-zinc-300 bg-zinc-800/80 px-2 py-1 rounded-md border border-zinc-700/50"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-zinc-800/50">
                      <div className="text-xs text-zinc-500">
                        Updated{" "}
                        <span className="text-zinc-300 font-medium">
                          {app.lastDeploy}
                        </span>
                      </div>
                      <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        Open <ExternalLink className="w-3 h-3" />
                      </span>
                    </div>
                  </motion.div>
                ))}

                {filteredApps.length === 0 && (
                  <div className="col-span-3 text-center py-12 text-zinc-500">
                    No apps match &quot;{searchQuery}&quot;
                  </div>
                )}

                {/* New App Card */}
                <motion.div
                  className="glass rounded-2xl p-6 cursor-pointer border border-dashed border-zinc-700 hover:border-primary/50 transition-all group flex flex-col items-center justify-center min-h-[200px]"
                  whileHover={{ y: -4 }}
                  onClick={() => router.push(isLoggedIn ? "/app" : "/login")}
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Plus className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors">
                    Create New App
                  </p>
                  <p className="text-xs text-zinc-600 mt-1">
                    From a JSON config
                  </p>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
