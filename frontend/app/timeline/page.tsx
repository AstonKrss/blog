"use client";

import { useState } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Calendar, ChevronDown, ChevronRight, BookOpen, Code, Shield, Terminal, GraduationCap, Award, Sparkles } from "lucide-react";

const timelineData = [
  {
    year: "2026",
    icon: Code,
    gradient: "from-indigo-500 to-purple-500",
    events: [
      { date: "4月", title: "个人博客上线", desc: "使用 Next.js + Spring Boot 搭建全栈博客系统", tags: ["Next.js", "Spring Boot"] },
      { date: "3月", title: "DevSecOps 实践", desc: "学习 CI/CD 流水线与安全集成", tags: ["DevOps", "安全"] },
      { date: "2月", title: "CTF 比赛", desc: "参加网络安全竞赛，获得名次", tags: ["CTF", "Web"] },
    ],
  },
  {
    year: "2025",
    icon: GraduationCap,
    gradient: "from-emerald-500 to-teal-500",
    events: [
      { date: "9月", title: "进入佛山大学", desc: "计算机科学与技术专业", tags: ["大学"] },
      { date: "7月", title: "第一个全栈项目", desc: "完成了一个完整的前后端分离项目", tags: ["React", "Java"] },
      { date: "3月", title: "开始学习网络安全", desc: "接触 CTF，学习 Web 安全基础", tags: ["安全", "CTF"] },
    ],
  },
  {
    year: "2024",
    icon: Terminal,
    gradient: "from-orange-500 to-amber-500",
    events: [
      { date: "12月", title: "学习 Linux", desc: "开始使用 Linux 作为日常开发系统", tags: ["Linux"] },
      { date: "6月", title: "高考结束", desc: "开始接触编程，学习 Python 基础", tags: ["Python"] },
    ],
  },
];

const skills = [
  { category: "前端开发", icon: Code, gradient: "from-blue-500 to-cyan-500", items: [
    { name: "Next.js / React", level: 80 },
    { name: "TypeScript", level: 75 },
    { name: "Tailwind CSS", level: 85 },
    { name: "HTML / CSS", level: 90 },
  ]},
  { category: "后端开发", icon: Terminal, gradient: "from-emerald-500 to-teal-500", items: [
    { name: "Spring Boot", level: 70 },
    { name: "Java", level: 75 },
    { name: "MySQL", level: 65 },
    { name: "RESTful API", level: 80 },
  ]},
  { category: "网络安全", icon: Shield, gradient: "from-red-500 to-rose-500", items: [
    { name: "Web 安全", level: 70 },
    { name: "CTF", level: 60 },
    { name: "渗透测试", level: 55 },
    { name: "代码审计", level: 50 },
  ]},
  { category: "DevOps", icon: BookOpen, gradient: "from-orange-500 to-amber-500", items: [
    { name: "Docker", level: 65 },
    { name: "Linux", level: 70 },
    { name: "Git", level: 85 },
    { name: "CI/CD", level: 55 },
  ]},
];

export default function TimelinePage() {
  const [expandedYear, setExpandedYear] = useState<string | null>("2026");
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);

  const toggleYear = (year: string) => setExpandedYear(expandedYear === year ? null : year);
  const toggleSkill = (category: string) => setExpandedSkill(expandedSkill === category ? null : category);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-float absolute -top-32 right-1/4 h-96 w-96 rounded-full bg-indigo-400/5 blur-3xl" />
          <div className="animate-float-delayed absolute -bottom-32 left-1/4 h-96 w-96 rounded-full bg-purple-400/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-4xl px-4 py-12">
          {/* Header */}
          <div className="mb-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg">
              <Calendar className="h-8 w-8 text-white" />
            </div>
            <h1 className="mb-3 text-4xl font-bold">
              <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">成长轨迹</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              记录学习历程与技术成长
            </p>
          </div>

          {/* Timeline */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              时间线
            </h2>

            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-indigo-500 via-purple-500 to-transparent" />

              <div className="space-y-6">
                {timelineData.map((yearData) => {
                  const Icon = yearData.icon;
                  const isExpanded = expandedYear === yearData.year;

                  return (
                    <div key={yearData.year} className="relative ml-14">
                      {/* Dot */}
                      <div className={`absolute -left-14 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br ${yearData.gradient} shadow-lg ring-4 ring-background`}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>

                      <div className="rounded-2xl border bg-card/80 backdrop-blur-sm shadow-sm overflow-hidden glow-card">
                        <button
                          onClick={() => toggleYear(yearData.year)}
                          className="w-full flex items-center justify-between p-5 hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xl font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">{yearData.year}</span>
                            <span className="text-sm text-muted-foreground">{yearData.events.length} 个事件</span>
                          </div>
                          {isExpanded ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                        </button>

                        {isExpanded && (
                          <div className="border-t px-5 py-4 space-y-4 animate-fade-in">
                            {yearData.events.map((event, i) => (
                              <div key={i} className="flex gap-4">
                                <div className="shrink-0 w-16 text-sm font-medium text-muted-foreground pt-0.5">{event.date}</div>
                                <div className="flex-1">
                                  <h4 className="font-semibold mb-1">{event.title}</h4>
                                  <p className="text-sm text-muted-foreground mb-2">{event.desc}</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {event.tags.map((tag) => (
                                      <span key={tag} className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs text-indigo-500">{tag}</span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Skills */}
          <div>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500">
                <Award className="h-4 w-4 text-white" />
              </div>
              技能树
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              {skills.map((skillGroup) => {
                const Icon = skillGroup.icon;
                const isExpanded = expandedSkill === skillGroup.category;

                return (
                  <div key={skillGroup.category} className="rounded-2xl border bg-card/80 backdrop-blur-sm shadow-sm overflow-hidden glow-card">
                    <button
                      onClick={() => toggleSkill(skillGroup.category)}
                      className="w-full flex items-center justify-between p-5 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${skillGroup.gradient} shadow-md`}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <span className="font-semibold">{skillGroup.category}</span>
                      </div>
                      {isExpanded ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                    </button>

                    {isExpanded && (
                      <div className="border-t px-5 py-4 space-y-4 animate-fade-in">
                        {skillGroup.items.map((skill) => (
                          <div key={skill.name}>
                            <div className="flex justify-between text-sm mb-1.5">
                              <span className="font-medium">{skill.name}</span>
                              <span className="text-muted-foreground">{skill.level}%</span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full rounded-full bg-gradient-to-r ${skillGroup.gradient} transition-all duration-1000`}
                                style={{ width: `${skill.level}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
