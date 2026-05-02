"use client";

import { useState } from "react";
import { Code, Server, Shield, Cloud, Database, Terminal, Layers, Globe } from "lucide-react";

const skillCategories = [
  {
    name: "前端开发",
    icon: Code,
    color: "from-blue-500 to-cyan-500",
    skills: [
      { name: "Next.js", level: 90 },
      { name: "React", level: 85 },
      { name: "TypeScript", level: 85 },
      { name: "Tailwind CSS", level: 90 },
    ],
  },
  {
    name: "后端开发",
    icon: Server,
    color: "from-green-500 to-emerald-500",
    skills: [
      { name: "Spring Boot", level: 85 },
      { name: "Java", level: 80 },
      { name: "Node.js", level: 75 },
      { name: "Python", level: 70 },
    ],
  },
  {
    name: "安全技术",
    icon: Shield,
    color: "from-red-500 to-orange-500",
    skills: [
      { name: "Web 安全", level: 80 },
      { name: "渗透测试", level: 70 },
      { name: "密码学", level: 75 },
      { name: "CTF", level: 65 },
    ],
  },
  {
    name: "DevOps",
    icon: Cloud,
    color: "from-pink-500 to-pink-500",
    skills: [
      { name: "Docker", level: 85 },
      { name: "Kubernetes", level: 70 },
      { name: "CI/CD", level: 80 },
      { name: "Linux", level: 85 },
    ],
  },
  {
    name: "数据库",
    icon: Database,
    color: "from-amber-500 to-yellow-500",
    skills: [
      { name: "MySQL", level: 85 },
      { name: "Redis", level: 75 },
      { name: "MongoDB", level: 70 },
    ],
  },
];

export function SkillShowcase() {
  const [activeCategory, setActiveCategory] = useState(0);
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null);

  const category = skillCategories[activeCategory];
  const Icon = category.icon;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
      {/* Category tabs */}
      <div className="space-y-3">
        {skillCategories.map((cat, index) => {
          const TabIcon = cat.icon;
          return (
            <button
              key={cat.name}
              onClick={() => setActiveCategory(index)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 ${
                activeCategory === index
                  ? `bg-gradient-to-r ${cat.color} text-white border-transparent shadow-lg`
                  : "bg-card border-border hover:border-rose-500/50 hover:shadow-md"
              }`}
            >
              <div className={`p-2 rounded-xl ${
                activeCategory === index
                  ? "bg-white/20"
                  : `bg-gradient-to-br ${cat.color}`
              }`}>
                <TabIcon className="h-5 w-5" />
              </div>
              <span className="font-medium">{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* Skills display */}
      <div className="relative">
        <div className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-5 rounded-3xl blur-xl`} />
        <div className="relative bg-card/80 backdrop-blur-sm rounded-3xl border p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className={`p-3 rounded-2xl bg-gradient-to-br ${category.color}`}>
              <Icon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg">{category.name}</h3>
              <p className="text-sm text-muted-foreground">点击切换分类</p>
            </div>
          </div>

          <div className="space-y-4">
            {category.skills.map((skill) => (
              <div key={skill.name}>
                <div className="flex justify-between mb-1.5">
                  <span className={`font-medium transition-colors ${
                    hoveredSkill === skill.name ? "text-rose-500" : ""
                  }`}>
                    {skill.name}
                  </span>
                  <span className="text-sm text-muted-foreground">{skill.level}%</span>
                </div>
                <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${category.color} rounded-full transition-all duration-700 ease-out`}
                    style={{ width: `${skill.level}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
