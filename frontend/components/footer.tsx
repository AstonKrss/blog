import Link from "next/link";
import { Github, Mail } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t bg-secondary/50">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <h3 className="mb-4 text-lg font-bold gradient-text">Aston&apos;s Blog</h3>
            <p className="text-sm text-muted-foreground">
              DevSecOps 实践与技术分享
            </p>
          </div>
          <div>
            <h4 className="mb-4 font-medium">导航</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/" className="hover:text-foreground">首页</Link></li>
              <li><Link href="/blog" className="hover:text-foreground">博客</Link></li>
              <li><Link href="/archive" className="hover:text-foreground">归档</Link></li>
              <li><Link href="/tags" className="hover:text-foreground">标签</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 font-medium">探索</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/tools" className="hover:text-foreground">安全工具箱</Link></li>
              <li><Link href="/timeline" className="hover:text-foreground">成长轨迹</Link></li>
              <li><Link href="/terminal" className="hover:text-foreground">终端</Link></li>
              <li><Link href="/resources" className="hover:text-foreground">推荐资源</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 font-medium">联系</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="https://github.com/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-foreground">
                  <Github className="h-4 w-4" /> GitHub
                </a>
              </li>
              <li>
                <a href="mailto:astonkrss@gmail.com" className="flex items-center gap-2 hover:text-foreground">
                  <Mail className="h-4 w-4" /> 邮箱
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Aston&apos;s Blog. Built with Next.js + Spring Boot.</p>
        </div>
      </div>
    </footer>
  );
}
