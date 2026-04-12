"use client";

import { useState, useEffect, Suspense, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/header";
import { useAuth } from "@/components/auth-context";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { languageTries } from "@/components/code-completer";
import { Loader2, Upload } from "lucide-react";

const SUPPORTED_LANGUAGES = [
  { value: "java", label: "Java", icon: "☕" },
  { value: "python", label: "Python", icon: "🐍" },
  { value: "javascript", label: "JavaScript", icon: "JS" },
  { value: "typescript", label: "TypeScript", icon: "TS" },
  { value: "go", label: "Go", icon: "Go" },
  { value: "rust", label: "Rust", icon: "🦀" },
  { value: "sql", label: "SQL", icon: "DB" },
  { value: "html", label: "HTML", icon: "🌐" },
  { value: "css", label: "CSS", icon: "🎨" },
  { value: "cpp", label: "C++", icon: "⚡" }
];

function WritePostContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const postId = searchParams.get("id");
  const editorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'both'>('both');
  const [codeLanguage, setCodeLanguage] = useState("java");
  const [showSettings, setShowSettings] = useState(false);
  
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (postId) {
      setIsEdit(true);
      fetchPostData();
    }
  }, [postId]);

  const getSelectedText = () => {
    const textarea = textareaRef.current;
    if (!textarea) return '';
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    return content.substring(start, end);
  };

  const insertText = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = content.substring(0, start);
    const after = content.substring(end);
    setContent(before + text + after);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  };

  const insertAtLineStart = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const before = content.substring(0, start);
    const lastNewline = before.lastIndexOf('\n');
    const insertPos = lastNewline === -1 ? 0 : lastNewline + 1;
    const beforeLine = content.substring(0, insertPos);
    const afterLine = content.substring(insertPos);
    setContent(beforeLine + prefix + afterLine);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(insertPos + prefix.length, insertPos + prefix.length);
    }, 0);
  };

  const replaceCurrentWord = (newWord: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const textBeforeCursor = content.substring(0, start);
    const lastWordMatch = textBeforeCursor.match(/[\w$]+$/);
    if (!lastWordMatch) return;
    const wordStart = start - lastWordMatch[0].length;
    const before = content.substring(0, wordStart);
    const after = content.substring(start);
    setContent(before + newWord + after);
    setTimeout(() => {
      textarea.focus();
      const newPos = wordStart + newWord.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const isInCodeBlock = () => {
    const textarea = textareaRef.current;
    if (!textarea) return false;
    const pos = textarea.selectionStart;
    const textBeforeCursor = content.substring(0, pos);
    const codeBlockMatch = textBeforeCursor.match(/```[\w]*\s*$/);
    return !!codeBlockMatch;
  };

  const API_BASE = "http://localhost:8080";
  
  const fetchPostData = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const post = data.data?.post || data.data;
        if (post) {
          setTitle(post.title || "");
          setSlug(post.slug || "");
          setExcerpt(post.excerpt || "");
          setContent(post.content || "");
          setCoverImage(post.coverImage || "");
          const postTags = post.tags || [];
          setTags(postTags.map((t: any) => t.tag?.name || t.name || t));
        }
      }
    } catch (e) { console.error(e); }
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slug || !isEdit) {
      setSlug(value.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-").replace(/^-|-$/g, ""));
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag));

  const handleSubmit = async (status: string) => {
    if (!title || !content) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const url = isEdit ? `${API_BASE}/api/posts/${postId}` : `${API_BASE}/api/posts`;
      const method = isEdit ? "PUT" : "POST";
      const bodyData = { 
        title, slug, excerpt, content, coverImage, tags, status
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(bodyData),
      });
      const data = await res.json();
      if (res.ok && data.code === 0) {
        router.push("/dashboard/posts");
      } else {
        alert(data.message || "提交失败");
      }
    } catch (e) { console.error(e); alert("提交失败"); }
    finally { setLoading(false); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 检查文件类型
    if (!file.type.startsWith("image/")) {
      alert("请选择图片文件");
      return;
    }

    // 检查文件大小（最大5MB）
    if (file.size > 5 * 1024 * 1024) {
      alert("图片大小不能超过5MB");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/upload/image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.code === 0 && data.data) {
        // 插入Markdown图片链接
        const fileName = file.name.replace(/\.[^/.]+$/, "");
        insertText(`\n![${fileName}](${data.data})\n`);
      } else {
        alert(data.message || "上传失败");
      }
    } catch (err) {
      console.error(err);
      alert("上传失败");
    }

    // 清空input，允许重复选择同一文件
    e.target.value = "";
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b': e.preventDefault(); insertText('**' + getSelectedText() + '**'); break;
        case 'i': e.preventDefault(); insertText('*' + getSelectedText() + '*'); break;
        case 'k': e.preventDefault(); insertText('[](url)'); break;
        default: return;
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => (i + 1) % suggestions.length);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => (i - 1 + suggestions.length) % suggestions.length);
      return;
    }
    if (e.key === 'Tab') {
      if (showSuggestions && suggestions[selectedIndex]) {
        e.preventDefault();
        replaceCurrentWord(suggestions[selectedIndex]);
        setShowSuggestions(false);
        return;
      }
      e.preventDefault();
      insertText('  ');
      return;
    }
    if (e.key === 'Enter') {
      if (showSuggestions && suggestions[selectedIndex]) {
        e.preventDefault();
        replaceCurrentWord(suggestions[selectedIndex]);
        setShowSuggestions(false);
        return;
      }
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    
    const el = e.target;
    const cursorPos = el.selectionStart;
    const textBeforeCursor = content.substring(0, cursorPos);
    const lastWordMatch = textBeforeCursor.match(/[\w$]+$/);
    
    if (lastWordMatch && lastWordMatch[0].length >= 1 && isInCodeBlock()) {
      const trie = languageTries[codeLanguage];
      if (trie) {
        const results = trie.autocomplete(lastWordMatch[0], 8);
        if (results.length > 0) {
          setSuggestions(results);
          setShowSuggestions(true);
          setSelectedIndex(0);
          
          const rect = el.getBoundingClientRect();
          const lineHeight = 24;
          const lines = textBeforeCursor.split('\n');
          const currentLine = lines.length;
          setCursorPosition({
            top: rect.top + currentLine * lineHeight + 40,
            left: rect.left + 20
          });
        }
      }
    } else {
      setShowSuggestions(false);
    }
  };

  // 粘贴图片处理
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        
        const file = item.getAsFile();
        if (!file) return;

        // 检查文件大小
        if (file.size > 5 * 1024 * 1024) {
          alert("图片大小不能超过5MB");
          return;
        }

        // 上传图片
        const formData = new FormData();
        formData.append("file", file);

        try {
          const token = localStorage.getItem("token");
          const res = await fetch(`${API_BASE}/api/upload/image`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          });
          const data = await res.json();
          if (data.code === 0 && data.data) {
            const fileName = file.name?.replace(/\.[^/.]+$/, "") || "图片";
            insertText(`\n![${fileName}](${data.data})\n`);
          } else {
            alert(data.message || "上传失败");
          }
        } catch (err) {
          console.error(err);
          alert("上传失败");
        }
        return;
      }
    }
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/20">
      <Header />
      <main className="flex-1 flex flex-col">
        
        {/* Top Bar - 类似Typora的顶部工具栏 */}
        <div className="sticky top-16 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-700/60 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-3">
            <button 
              onClick={() => router.push("/dashboard/posts")} 
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            
            <div className="flex-1">
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="输入文章标题..."
                className="w-full border-0 bg-transparent text-xl font-bold placeholder:text-slate-400/60 focus:outline-none text-slate-800 dark:text-slate-100"
              />
            </div>
            
            {/* 视图切换 */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
              <button 
                onClick={() => setViewMode('edit')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'edit' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                编辑
              </button>
              <button 
                onClick={() => setViewMode('both')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'both' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                分屏
              </button>
              <button 
                onClick={() => setViewMode('preview')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'preview' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                预览
              </button>
            </div>
            
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-2" />
            
            <button 
              onClick={() => handleSubmit('DRAFT')} 
              disabled={loading || !title}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-slate-600 dark:text-slate-300"
            >
              草稿
            </button>
            <button 
              onClick={() => handleSubmit('PUBLISHED')} 
              disabled={loading || !title}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:shadow-lg hover:shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              {loading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
              发布
            </button>
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* 工具栏 - 类似于语雀的浮动工具栏 */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200/60 dark:border-slate-700/60">
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-1 overflow-x-auto">
            {/* 标题 */}
            <div className="flex items-center gap-1 mr-2">
              <button onClick={() => insertAtLineStart('# ')} className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-sm font-bold text-slate-700 dark:text-slate-300">H1</button>
              <button onClick={() => insertAtLineStart('## ')} className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-sm font-bold text-slate-700 dark:text-slate-300">H2</button>
              <button onClick={() => insertAtLineStart('### ')} className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-sm font-bold text-slate-700 dark:text-slate-300">H3</button>
            </div>
            
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
            
            {/* 格式 */}
            <button onClick={() => insertText('**' + getSelectedText() + '**')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg" title="粗体 (Ctrl+B)">
              <svg className="w-4 h-4 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
              </svg>
            </button>
            <button onClick={() => insertText('*' + getSelectedText() + '*')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg" title="斜体 (Ctrl+I)">
              <svg className="w-4 h-4 text-slate-600 dark:text-slate-400 italic font-serif" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15 20H6v-2h4.5l-3.5 6H9v2h6v-2h-4.5l3.5-6z" />
              </svg>
            </button>
            <button onClick={() => insertText('~~' + getSelectedText() + '~~')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg" title="删除线">
              <svg className="w-4 h-4 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M3 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
              </svg>
            </button>
            
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
            
            {/* 列表 */}
            <button onClick={() => insertAtLineStart('- ')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg" title="无序列表">
              <svg className="w-4 h-4 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button onClick={() => insertAtLineStart('1. ')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg" title="有序列表">
              <svg className="w-4 h-4 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20h14M7 12h14M7 4h14M3 20v-2m0-4V8m0 4h2m10-4h2" />
              </svg>
            </button>
            <button onClick={() => insertAtLineStart('- [ ] ')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg" title="任务列表">
              <svg className="w-4 h-4 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="5" width="14" height="14" rx="2" strokeWidth={2} />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
              </svg>
            </button>
            
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
            
            {/* 链接图片 */}
            <button onClick={() => insertText('[链接文字](url)')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg" title="链接 (Ctrl+K)">
              <svg className="w-4 h-4 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </button>
            <button onClick={() => insertText('![图片描述](url)')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg" title="图片链接">
              <svg className="w-4 h-4 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
            <label className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer" title="上传图片">
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              <Upload className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            </label>
            <button onClick={() => insertAtLineStart('> ')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg" title="引用">
              <svg className="w-4 h-4 text-slate-600 dark:text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" />
              </svg>
            </button>
            <button onClick={() => insertText('`')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg" title="行内代码">
              <svg className="w-4 h-4 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </button>
            
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
            
            {/* 代码块 */}
            <select 
              value={codeLanguage} 
              onChange={(e) => setCodeLanguage(e.target.value)}
              className="h-8 px-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs border-0 text-slate-600 dark:text-slate-400 cursor-pointer"
            >
              {SUPPORTED_LANGUAGES.map(lang => (
                <option key={lang.value} value={lang.value}>
                  {lang.icon} {lang.label}
                </option>
              ))}
            </select>
            <button 
              onClick={() => insertText(`\n\`\`\`${codeLanguage}\n// 在此编写代码\n\n\`\`\`\n`)} 
              className="px-3 py-1.5 h-8 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs flex items-center gap-1.5 hover:shadow-lg hover:shadow-emerald-500/20 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              代码块
            </button>
            
            {/* 分隔线 */}
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
            
            {/* 表格 */}
            <button 
              onClick={() => insertText('\n| 列1 | 列2 | 列3 |\n|---|---|---|\n| 内容1 | 内容2 | 内容3 |\n')} 
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg" 
              title="表格"
            >
              <svg className="w-4 h-4 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* 编辑器主体 */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full flex">
            {/* 编辑区 */}
            {(viewMode === 'edit' || viewMode === 'both') && (
              <div className={`${viewMode === 'both' ? 'w-1/2' : 'w-full'} flex flex-col border-r border-slate-200/60 dark:border-slate-700/60`}>
                <div className="flex-1 relative overflow-auto p-6">
                  <div className="max-w-3xl mx-auto">
                    <textarea
                      ref={textareaRef}
                      value={content}
                      onChange={handleContentChange}
                      onKeyDown={handleKeyDown}
                      onPaste={handlePaste}
                      wrap="soft"
                      placeholder="开始编写你的文章，支持 Markdown 语法，Ctrl+V 可直接粘贴图片..."
                      className="w-full min-h-[calc(100vh-280px)] bg-transparent border-0 focus:outline-none resize-none text-slate-800 dark:text-slate-200 text-base leading-8 font-mono break-all whitespace-pre-wrap"
                      style={{ caretColor: '#6366f1' }}
                    />
                    
                    {/* 代码补全提示框 - 跟随光标位置 */}
                    {showSuggestions && suggestions.length > 0 && (
                      <div 
                        className="fixed z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 min-w-56 overflow-hidden"
                        style={{ 
                          top: cursorPosition.top, 
                          left: cursorPosition.left 
                        }}
                      >
                        <div className="px-3 py-1.5 text-xs font-medium text-slate-400 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                          代码补全 (Tab 确认)
                        </div>
                        {suggestions.map((word, i) => (
                          <button
                            key={word}
                            onClick={() => { replaceCurrentWord(word); setShowSuggestions(false); }}
                            className={`w-full px-4 py-2 text-left flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${i === selectedIndex ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}
                          >
                            <code className="font-mono text-sm text-slate-700 dark:text-slate-300">{word}</code>
                            {i === selectedIndex && (
                              <span className="text-xs text-indigo-500 bg-indigo-100 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded">Tab</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* 编辑区状态栏 */}
                <div className="h-8 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200/60 dark:border-slate-700/60 px-4 flex items-center text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    已自动保存
                  </span>
                  <span className="mx-4">|</span>
                  <span>{wordCount} 字</span>
                  <span className="mx-4">|</span>
                  <span>{charCount} 字符</span>
                  <div className="flex-1" />
                  <span className="text-slate-500">当前语言: {SUPPORTED_LANGUAGES.find(l => l.value === codeLanguage)?.label}</span>
                </div>
              </div>
            )}
            
            {/* 预览区 */}
            {(viewMode === 'preview' || viewMode === 'both') && (
              <div className={`${viewMode === 'both' ? 'w-1/2' : 'w-full'} flex flex-col`}>
                <div className="flex-1 overflow-auto p-6 bg-white dark:bg-slate-900">
                  <div className="max-w-3xl mx-auto">
                    <div className="prose prose-lg dark:prose-invert max-w-none prose-indigo">
                      <h1 className="text-3xl font-bold mb-8 text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-4">
                        {title || '无标题'}
                      </h1>
                      {content ? (
                        <MarkdownRenderer content={content} />
                      ) : (
                        <p className="text-slate-400">暂无内容</p>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* 预览区状态栏 */}
                <div className="h-8 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200/60 dark:border-slate-700/60 px-4 flex items-center text-xs text-slate-400">
                  <span>预览模式</span>
                  <div className="flex-1" />
                  <span className="text-slate-500">Markdown 实时渲染</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 设置侧边栏 - 精美的滑出面板 */}
      <div className={`fixed inset-y-0 right-0 w-96 z-50 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 shadow-2xl transform transition-transform duration-300 ${showSettings ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-gradient-to-r from-indigo-500/5 to-purple-500/5">
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">文章设置</h3>
            <button 
              onClick={() => setShowSettings(false)} 
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* 链接地址 */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                链接地址
              </label>
              <input 
                type="text" 
                value={slug} 
                onChange={(e) => setSlug(e.target.value)} 
                placeholder="article-slug"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" 
              />
            </div>
            
            {/* 文章摘要 */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                文章摘要
              </label>
              <textarea 
                value={excerpt} 
                onChange={(e) => setExcerpt(e.target.value)} 
                placeholder="简短描述..."
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none" 
              />
            </div>
            
            {/* 封面图 */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                封面图
              </label>
              <input 
                type="text" 
                value={coverImage} 
                onChange={(e) => setCoverImage(e.target.value)} 
                placeholder="https://..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" 
              />
              {coverImage && (
                <div className="mt-3 relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                  <img src={coverImage} alt="Cover" className="w-full h-32 object-cover" />
                  <button 
                    onClick={() => setCoverImage('')}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            
            {/* 标签 */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                标签
              </label>
              <div className="flex gap-2 mb-3">
                <input 
                  type="text" 
                  value={tagInput} 
                  onChange={(e) => setTagInput(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && addTag()} 
                  placeholder="输入标签，按回车添加"
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" 
                />
                <button 
                  onClick={addTag} 
                  className="px-4 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 hover:shadow-lg hover:shadow-indigo-500/20 transition-all"
                >
                  添加
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <span 
                    key={tag} 
                    className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 px-3 py-1.5 text-sm text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-700/50"
                  >
                    {tag}
                    <button 
                      onClick={() => removeTag(tag)} 
                      className="ml-1 hover:text-red-500 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
          
          {/* 底部保存按钮 */}
          <div className="p-5 border-t border-slate-200 dark:border-slate-700">
            <button 
              onClick={() => handleSubmit('DRAFT')} 
              disabled={loading || !title}
              className="w-full py-3 rounded-xl font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-slate-600 dark:text-slate-300"
            >
              保存为草稿
            </button>
          </div>
        </div>
      </div>
      
      {/* 背景遮罩 */}
      {showSettings && (
        <div 
          className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40"
          onClick={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

export default function WritePostPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-slate-500">加载中...</span>
        </div>
      </div>
    }>
      <WritePostContent />
    </Suspense>
  );
}