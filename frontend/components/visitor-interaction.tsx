"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Shuffle, Smile, Meh, Frown, Heart, ArrowRight } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

const moods = [
  { emoji: "😊", label: "开心", icon: Smile, color: "from-green-500 to-emerald-500", votes: 42 },
  { emoji: "😐", label: "一般", icon: Meh, color: "from-amber-500 to-orange-500", votes: 18 },
  { emoji: "😢", label: "难过", icon: Frown, color: "from-blue-500 to-cyan-500", votes: 7 },
];

export function VisitorInteraction() {
  const [randomPost, setRandomPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [voted, setVoted] = useState<string | null>(null);
  const [moodVotes, setMoodVotes] = useState(moods.map(m => m.votes));

  useEffect(() => {
    fetchRandomPost();
  }, []);

  const fetchRandomPost = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/public/posts?page=1&limit=100`);
      const data = await res.json();
      if (data.code === 0 && data.data?.posts?.length > 0) {
        const posts = data.data.posts;
        const random = posts[Math.floor(Math.random() * posts.length)];
        setRandomPost(random);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleVote = (index: number) => {
    if (voted) return;
    setVoted(moods[index].label);
    setMoodVotes(prev => prev.map((v, i) => i === index ? v + 1 : v));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Random Article */}
      <div className="bg-card/80 backdrop-blur-sm rounded-3xl border p-6 shadow-lg hover:shadow-xl transition-shadow">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-gradient-to-br from-rose-500 to-orange-400">
            <Shuffle className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold">随便看看</h3>
            <p className="text-xs text-muted-foreground">随机推荐一篇文章</p>
          </div>
        </div>

        {loading ? (
          <div className="h-24 bg-muted/50 rounded-xl animate-pulse" />
        ) : randomPost ? (
          <div className="space-y-3">
            <h4 className="font-medium line-clamp-2 hover:text-rose-500 transition-colors cursor-pointer">
              {randomPost.title}
            </h4>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {randomPost.excerpt || "暂无摘要"}
            </p>
            <Link
              href={`/blog/${randomPost.slug}`}
              className="inline-flex items-center gap-1 text-sm text-rose-500 hover:text-rose-600"
            >
              阅读全文
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">暂无文章</p>
        )}
      </div>

      {/* Mood Vote */}
      <div className="bg-card/80 backdrop-blur-sm rounded-3xl border p-6 shadow-lg hover:shadow-xl transition-shadow">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500">
            <Heart className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold">今天心情如何？</h3>
            <p className="text-xs text-muted-foreground">点击投票看看大家的状态</p>
          </div>
        </div>

        {voted ? (
          <div className="space-y-3">
            <p className="text-sm text-rose-500 font-medium">感谢你的投票！</p>
            <div className="space-y-2">
              {moods.map((mood, index) => {
                const Icon = mood.icon;
                const percentage = Math.round((moodVotes[index] / moodVotes.reduce((a, b) => a + b, 0)) * 100);
                return (
                  <div key={mood.label} className="flex items-center gap-3">
                    <span className="text-xl">{mood.emoji}</span>
                    <div className="flex-1">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${mood.color} rounded-full transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground w-12 text-right">{percentage}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex justify-around">
            {moods.map((mood, index) => {
              const Icon = mood.icon;
              return (
                <button
                  key={mood.label}
                  onClick={() => handleVote(index)}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-muted/50 transition-colors group"
                >
                  <span className="text-3xl group-hover:scale-110 transition-transform">{mood.emoji}</span>
                  <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">{mood.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
