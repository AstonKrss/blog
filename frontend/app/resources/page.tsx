"use client";

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { BookOpen, Video, Github, MessageSquare, Globe, Code, Shield, Cpu, Database, Terminal, ExternalLink, Star, ArrowRight } from "lucide-react";

const resourceCategories = [
  { name: "学习平台", icon: BookOpen, gradient: "from-blue-500 to-cyan-500", color: "text-blue-500", resources: [
    { name: "freeCodeCamp", desc: "免费编程学习平台", url: "https://www.freecodecamp.org/", icon: Code },
    { name: "Coursera", desc: "全球顶尖在线课程", url: "https://www.coursera.org/", icon: BookOpen },
    { name: "Bilibili 编程", desc: "B站编程学习资源", url: "https://www.bilibili.com/v/knowledge/", icon: Video },
    { name: "MDN Web Docs", desc: "Mozilla 开发者文档", url: "https://developer.mozilla.org/", icon: Globe },
    { name: "菜鸟教程", desc: "中文编程教程", url: "https://www.runoob.com/", icon: BookOpen },
    { name: "LeetCode", desc: "算法刷题平台", url: "https://leetcode.cn/", icon: Cpu },
  ]},
  { name: "开发者社区", icon: MessageSquare, gradient: "from-emerald-500 to-teal-500", color: "text-emerald-500", resources: [
    { name: "GitHub", desc: "全球最大的代码托管平台", url: "https://github.com/", icon: Github },
    { name: "知乎", desc: "中文问答社区", url: "https://www.zhihu.com/", icon: MessageSquare },
    { name: "Stack Overflow", desc: "开发者问答社区", url: "https://stackoverflow.com/", icon: MessageSquare },
    { name: "掘金", desc: "中文技术社区", url: "https://juejin.cn/", icon: Code },
    { name: "V2EX", desc: "创意工作者社区", url: "https://www.v2ex.com/", icon: Globe },
    { name: "Hacker News", desc: "Y Combinator 技术新闻", url: "https://news.ycombinator.com/", icon: Globe },
  ]},
  { name: "网络安全", icon: Shield, gradient: "from-red-500 to-rose-500", color: "text-red-500", resources: [
    { name: "PortSwigger Academy", desc: "Web 安全免费课程", url: "https://portswigger.net/web-security", icon: Shield },
    { name: "HackTheBox", desc: "在线渗透测试平台", url: "https://www.hackthebox.com/", icon: Terminal },
    { name: "TryHackMe", desc: "网络安全学习平台", url: "https://tryhackme.com/", icon: Shield },
    { name: "OWASP", desc: "Web 应用安全指南", url: "https://owasp.org/", icon: Shield },
    { name: "CVE Details", desc: "CVE 漏洞数据库", url: "https://www.cvedetails.com/", icon: Shield },
    { name: "Exploit-DB", desc: "漏洞利用数据库", url: "https://www.exploit-db.com/", icon: Terminal },
  ]},
  { name: "AI 工具", icon: Cpu, gradient: "from-pink-500 to-pink-500", color: "text-pink-500", resources: [
    { name: "ChatGPT", desc: "OpenAI 对话 AI", url: "https://chat.openai.com/", icon: Cpu },
    { name: "Claude", desc: "Anthropic AI 助手", url: "https://claude.ai/", icon: Cpu },
    { name: "GitHub Copilot", desc: "AI 代码补全工具", url: "https://github.com/features/copilot", icon: Code },
    { name: "Cursor", desc: "AI 代码编辑器", url: "https://www.cursor.com/", icon: Terminal },
    { name: "Hugging Face", desc: "开源 AI 模型平台", url: "https://huggingface.co/", icon: Cpu },
    { name: "Perplexity", desc: "AI 搜索引擎", url: "https://www.perplexity.ai/", icon: Globe },
  ]},
  { name: "数据库 & 后端", icon: Database, gradient: "from-orange-500 to-amber-500", color: "text-orange-500", resources: [
    { name: "Spring Boot 文档", desc: "官方文档", url: "https://docs.spring.io/spring-boot/", icon: Code },
    { name: "MySQL 文档", desc: "官方文档", url: "https://dev.mysql.com/doc/", icon: Database },
    { name: "Redis 文档", desc: "官方文档", url: "https://redis.io/docs/", icon: Database },
    { name: "Docker 文档", desc: "容器化平台文档", url: "https://docs.docker.com/", icon: Terminal },
    { name: "Prisma", desc: "现代 ORM 工具", url: "https://www.prisma.io/", icon: Database },
    { name: "Next.js 文档", desc: "React 框架文档", url: "https://nextjs.org/docs", icon: Code },
  ]},
  { name: "在线工具", icon: Star, gradient: "from-yellow-500 to-orange-500", color: "text-yellow-500", resources: [
    { name: "Excalidraw", desc: "手绘风格白板", url: "https://excalidraw.com/", icon: Globe },
    { name: "Carbon", desc: "代码截图美化工具", url: "https://carbon.now.sh/", icon: Code },
    { name: "REGEX101", desc: "正则表达式测试", url: "https://regex101.com/", icon: Terminal },
    { name: "JSON Formatter", desc: "JSON 格式化工具", url: "https://jsonformatter.org/", icon: Code },
    { name: "Can I Use", desc: "浏览器兼容性查询", url: "https://caniuse.com/", icon: Globe },
    { name: "npm trends", desc: "npm 包趋势对比", url: "https://npmtrends.com/", icon: Star },
  ]},
];

export default function ResourcesPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-float -top-32 right-1/4 h-[500px] w-[500px] rounded-full bg-orange-500/10 blur-[100px]" />
          <div className="animate-float-delayed -bottom-40 left-1/4 h-[400px] w-[400px] rounded-full bg-amber-500/8 blur-[80px]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-14">
          {/* Header */}
          <div className="mb-14 text-center animate-fade-in-up">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 shadow-xl shadow-orange-500/30">
              <Star className="h-8 w-8 text-white" />
            </div>
            <h1 className="mb-4 text-4xl md:text-5xl font-black tracking-tight">
              <span className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 bg-clip-text text-transparent">推荐资源</span>
            </h1>
            <p className="mx-auto max-w-2xl text-base text-muted-foreground">
              精心整理的学习资源、开发工具和在线平台
            </p>
          </div>

          <div className="space-y-14">
            {resourceCategories.map((category, ci) => {
              const Icon = category.icon;
              return (
                <div key={category.name} className="animate-fade-in-up" style={{ animationDelay: `${0.1 * ci}s` }}>
                  <div className="flex items-center gap-4 mb-6">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${category.gradient} shadow-lg transition-transform duration-300 hover:scale-110`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <h2 className="text-2xl font-black">{category.name}</h2>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-container">
                    {category.resources.map((resource, ri) => {
                      const RIcon = resource.icon;
                      return (
                        <a
                          key={resource.name}
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group relative overflow-hidden rounded-2xl glass-card p-5 shadow-sm transition-all duration-400 hover:-translate-y-2 hover:shadow-2xl"
                          style={{ animationDelay: `${0.05 * ri}s` }}
                        >
                          <div className={`absolute inset-0 bg-gradient-to-br ${category.gradient} opacity-0 group-hover:opacity-[0.06] transition-opacity duration-400`} />
                          <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${category.gradient} scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left`} />
                          <div className="relative flex items-start gap-4">
                            <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${category.gradient} shadow-md transition-transform duration-300 group-hover:scale-110`}>
                              <RIcon className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold text-base group-hover:text-[var(--color-primary)] transition-colors">{resource.name}</h3>
                                <ExternalLink className={`h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0 ${category.color}`} />
                              </div>
                              <p className="text-sm text-muted-foreground leading-relaxed">{resource.desc}</p>
                            </div>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}