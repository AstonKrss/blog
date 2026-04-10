import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Github, Mail, BookOpen, Code, Shield, Terminal, Heart, Sparkles } from "lucide-react";

export default function AboutPage() {
  const techStack = [
    { category: "前端", icon: Code, items: ["Next.js", "React", "TypeScript", "Tailwind CSS"], gradient: "from-indigo-500 to-blue-500" },
    { category: "后端", icon: Terminal, items: ["Spring Boot", "JPA", "MySQL", "Redis"], gradient: "from-emerald-500 to-teal-500" },
    { category: "DevOps", icon: BookOpen, items: ["Docker", "CI/CD", "Linux", "Nginx"], gradient: "from-orange-500 to-amber-500" },
    { category: "安全", icon: Shield, items: ["CTF", "渗透测试", "代码审计", "漏洞分析"], gradient: "from-purple-500 to-pink-500" },
  ];

  const links = [
    { name: "GitHub", url: "https://github.com/", icon: Github, gradient: "from-gray-700 to-gray-900 dark:from-gray-500 dark:to-gray-700" },
    { name: "邮箱", url: "mailto:admin@example.com", icon: Mail, gradient: "from-indigo-500 to-purple-500" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Decorative background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-float absolute -top-32 right-1/4 h-96 w-96 rounded-full bg-indigo-400/5 blur-3xl" />
          <div className="animate-float-delayed absolute -bottom-32 left-1/4 h-96 w-96 rounded-full bg-purple-400/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-4xl px-4 py-12">
          {/* Profile Card */}
          <div className="mb-10 relative overflow-hidden rounded-2xl border bg-card/80 backdrop-blur-sm p-8 shadow-sm glow-card">
            <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-gradient-to-br from-indigo-400/10 to-purple-400/10 blur-2xl" />
            <div className="relative flex flex-col md:flex-row items-center gap-8">
              <div className="relative">
                <div className="h-32 w-32 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-4xl font-bold text-white shadow-xl">
                  A
                </div>
                <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-green-500 border-4 border-card flex items-center justify-center">
                  <Sparkles className="h-3 w-3 text-white" />
                </div>
              </div>
              <div className="text-center md:text-left">
                <h1 className="text-3xl font-bold mb-2">Aston</h1>
                <p className="text-lg text-muted-foreground mb-4">佛山大学计算机专业学生</p>
                <p className="text-muted-foreground max-w-lg">
                  热爱技术，专注于 DevSecOps 实践。这个博客是我分享技术学习心得、项目实践和安全研究的地方。
                </p>
                <div className="flex gap-3 mt-5 justify-center md:justify-start">
                  {links.map((link) => {
                    const Icon = link.icon;
                    return (
                      <a
                        key={link.name}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-2 rounded-xl border bg-muted/50 px-4 py-2.5 text-sm hover:-translate-y-0.5 hover:shadow-md transition-all"
                      >
                        <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${link.gradient}`}>
                          <Icon className="h-3.5 w-3.5 text-white" />
                        </div>
                        <span className="font-medium">{link.name}</span>
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Tech Stack */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg">
                <Code className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold">技术栈</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {techStack.map((tech) => {
                const Icon = tech.icon;
                return (
                  <div key={tech.category} className="group relative overflow-hidden rounded-2xl border bg-card/80 backdrop-blur-sm p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg card-hover glow-card">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${tech.gradient} shadow-lg`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="font-semibold">{tech.category}</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {tech.items.map((item) => (
                        <span key={item} className="rounded-full bg-muted px-3 py-1 text-sm font-medium">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Made with love */}
          <div className="text-center py-8">
            <p className="flex items-center justify-center gap-2 text-muted-foreground">
              用 <Heart className="h-4 w-4 text-red-500 animate-pulse" /> 和代码构建
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
