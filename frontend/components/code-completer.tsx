"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface TrieNode {
  children: Map<string, TrieNode>;
  isEnd: boolean;
}

class Trie {
  private root: TrieNode;

  constructor() {
    this.root = { children: new Map(), isEnd: false };
  }

  insert(word: string): void {
    let node = this.root;
    for (const char of word.toLowerCase()) {
      if (!node.children.has(char)) {
        node.children.set(char, { children: new Map(), isEnd: false });
      }
      node = node.children.get(char)!;
    }
    node.isEnd = true;
  }

  autocomplete(prefix: string, limit: number = 10): string[] {
    const result: string[] = [];
    let node = this.root;

    for (const char of prefix.toLowerCase()) {
      if (!node.children.has(char)) {
        return result;
      }
      node = node.children.get(char)!;
    }

    this.dfs(node, prefix.toLowerCase(), result, limit);
    return result;
  }

  private dfs(node: TrieNode, current: string, result: string[], limit: number): void {
    if (result.length >= limit) return;

    if (node.isEnd) {
      result.push(current);
    }

    for (const [char, child] of node.children) {
      if (result.length >= limit) break;
      this.dfs(child, current + char, result, limit);
    }
  }
}

// 初始化各语言关键字
const LANGUAGE_KEYWORDS: Record<string, string[]> = {
  java: [
    "abstract", "assert", "boolean", "break", "byte", "case", "catch", "char",
    "class", "const", "continue", "default", "do", "double", "else", "enum",
    "extends", "final", "finally", "float", "for", "goto", "if", "implements",
    "import", "instanceof", "int", "interface", "long", "native", "new",
    "package", "private", "protected", "public", "return", "short", "static",
    "strictfp", "super", "switch", "synchronized", "this", "throw", "throws",
    "transient", "try", "void", "volatile", "while", "true", "false", "null",
    "String", "System", "ArrayList", "HashMap", "Scanner", "Math", "Arrays",
    "Collections", "LinkedList", "HashSet", "TreeMap", "StringBuilder", "StringBuffer",
    "List", "Map", "Set", "Queue", "Stack", "Iterator", "Comparable", "Cloneable",
    "Serializable", "Runnable", "Thread", "Callable", "Future", "Optional",
    "Integer", "Long", "Double", "Float", "Boolean", "Character",
    "BigInteger", "BigDecimal", "LocalDate", "LocalTime", "LocalDateTime",
    "Date", "Calendar", "SimpleDateFormat", "JSONObject", "JSONArray"
  ],
  cpp: [
    "auto", "break", "case", "char", "const", "continue", "default", "do",
    "double", "else", "enum", "extern", "float", "for", "goto", "if", "int",
    "long", "register", "return", "short", "signed", "sizeof", "static",
    "struct", "switch", "typedef", "union", "unsigned", "void", "volatile",
    "while", "class", "public", "private", "protected", "virtual", "inline",
    "namespace", "using", "template", "typename", "new", "delete", "this",
    "friend", "operator", "try", "catch", "throw", "constexpr", "nullptr",
    "bool", "true", "false", "vector", "string", "iostream", "map", "set",
    "algorithm", "memory", "shared_ptr", "unique_ptr", "STL", "pair",
    "list", "deque", "array", "tuple", "forward_list", "unordered_map",
    "unordered_set", "priority_queue", "queue", "stack",
    "cout", "cin", "endl", "std", "ios", "ios_base",
    "stringstream", "fstream", "sstream",
    "begin", "end", "size", "empty", "push_back", "pop_back",
    "push_front", "pop_front", "front", "back", "insert", "erase",
    "find", "count", "clear", "reserve", "capacity", "swap"
  ],
  python: [
    "and", "as", "assert", "async", "await", "break", "class", "continue",
    "def", "del", "elif", "else", "except", "finally", "for", "from",
    "global", "if", "import", "in", "is", "lambda", "nonlocal", "not",
    "or", "pass", "raise", "return", "try", "while", "with", "yield",
    "True", "False", "None", "self", "print", "input", "len", "range",
    "str", "int", "float", "list", "dict", "set", "tuple", "bool",
    "open", "read", "write", "file", "map", "filter", "reduce", "zip",
    "enumerate", "sorted", "reversed", "sum", "min", "max", "abs",
    "round", "pow", "divmod", "isinstance", "issubclass", "hasattr",
    "getattr", "setattr", "delattr", "callable", "type", "object",
    "Exception", "ValueError", "TypeError", "KeyError", "IndexError"
  ],
  javascript: [
    "break", "case", "catch", "continue", "debugger", "default", "delete",
    "do", "else", "export", "extends", "finally", "for", "function",
    "if", "import", "in", "instanceof", "new", "return", "super", "switch",
    "this", "throw", "try", "typeof", "var", "void", "while", "with", "yield",
    "let", "const", "class", "async", "await", "static", "get", "set",
    "true", "false", "null", "undefined", "NaN", "Infinity",
    "console", "window", "document", "Array", "Object", "String", "Number",
    "Boolean", "Function", "Symbol", "Map", "Set", "WeakMap", "WeakSet",
    "Promise", "Proxy", "Reflect", "Math", "JSON", "Date", "RegExp",
    "Error", "TypeError", "ReferenceError", "SyntaxError", "RangeError",
    "addEventListener", "removeEventListener", "querySelector", "getElementById",
    "createElement", "appendChild", "removeChild", "innerHTML", "innerText",
    "classList", "style", "getAttribute", "setAttribute"
  ],
  typescript: [
    "break", "case", "catch", "continue", "debugger", "default", "delete",
    "do", "else", "export", "extends", "finally", "for", "function",
    "if", "import", "in", "instanceof", "new", "return", "super", "switch",
    "this", "throw", "try", "typeof", "var", "void", "while", "with", "yield",
    "let", "const", "class", "async", "await", "static", "get", "set",
    "true", "false", "null", "undefined", "NaN", "Infinity",
    "string", "number", "boolean", "any", "void", "never", "unknown", "object",
    "type", "interface", "enum", "namespace", "declare", "abstract",
    "implements", "public", "private", "protected", "readonly", "optional",
    "keyof", "infer", "require", "is", "as", "satisfies",
    "console", "window", "document", "Array", "Object", "String", "Number",
    "Promise", "Partial", "Required", "Readonly", "Pick", "Omit",
    "Record", "Exclude", "Extract", "NonNullable", "ReturnType"
  ],
  go: [
    "break", "case", "chan", "const", "continue", "default", "defer",
    "else", "fallthrough", "for", "func", "go", "goto", "if", "import",
    "interface", "map", "package", "range", "return", "select", "struct", "switch",
    "type", "var", "true", "false", "nil", "iota",
    "int", "int8", "int16", "int32", "int64", "uint", "uint8", "uint16",
    "uint32", "uint64", "float32", "float64", "complex64", "complex128",
    "byte", "rune", "string", "bool", "error",
    "make", "new", "len", "cap", "append", "copy", "delete",
    "panic", "recover", "print", "println", "fmt", "main"
  ],
  rust: [
    "as", "async", "await", "break", "const", "continue", "crate", "dyn",
    "else", "enum", "extern", "false", "fn", "for", "if", "impl", "in",
    "let", "loop", "match", "mod", "move", "mut", "pub", "ref", "return",
    "self", "Self", "static", "struct", "super", "trait", "true", "type",
    "unsafe", "use", "where", "while", "i8", "i16", "i32", "i64", "i128",
    "isize", "u8", "u16", "u32", "u64", "u128", "usize",
    "f32", "f64", "bool", "char", "str", "String", "Vec", "Option", "Result",
    "Some", "None", "Ok", "Err", "println", "print", "format", "panic",
    "unwrap", "expect", "map", "match", "try", "new", "default"
  ],
  sql: [
    "SELECT", "FROM", "WHERE", "AND", "OR", "NOT", "IN", "BETWEEN", "LIKE",
    "IS", "NULL", "INSERT", "INTO", "VALUES", "UPDATE", "SET", "DELETE",
    "CREATE", "ALTER", "DROP", "TABLE", "DATABASE", "INDEX", "VIEW",
    "JOIN", "LEFT", "RIGHT", "INNER", "OUTER", "FULL", "ON", "AS",
    "ORDER", "BY", "ASC", "DESC", "GROUP", "HAVING", "LIMIT", "OFFSET",
    "UNION", "ALL", "DISTINCT", "COUNT", "SUM", "AVG", "MIN", "MAX",
    "PRIMARY", "KEY", "FOREIGN", "REFERENCES", "CONSTRAINT",
    "DEFAULT", "UNIQUE", "CHECK", "AUTO_INCREMENT", "IDENTITY",
    "CASE", "WHEN", "THEN", "ELSE", "END", "EXISTS", "COUNT",
    "CAST", "CONVERT", "COALESCE", "NULLIF"
  ],
  html: [
    "html", "head", "body", "div", "span", "p", "br", "hr",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "a", "img", "link", "script", "style",
    "ul", "ol", "li", "dl", "dt", "dd",
    "table", "tr", "td", "th", "thead", "tbody", "tfoot",
    "form", "input", "button", "select", "option", "textarea", "label",
    "iframe", "canvas", "audio", "video", "source", "track",
    "meta", "title", "base", "nav", "header", "footer", "main", "section",
    "article", "aside", "details", "summary", "dialog",
    "class", "id", "src", "href", "alt", "title", "style",
    "type", "name", "value", "placeholder", "required", "disabled",
    "readonly", "hidden", "checked", "selected"
  ],
  css: [
    "color", "background", "background-color", "border", "margin", "padding",
    "width", "height", "display", "position", "top", "left", "right", "bottom",
    "float", "clear", "overflow", "visibility", "opacity",
    "font", "font-size", "font-family", "font-weight", "font-style",
    "text-align", "text-decoration", "text-transform", "line-height",
    "letter-spacing", "word-spacing", "white-space",
    "flex", "flex-direction", "justify-content", "align-items",
    "grid", "grid-template", "grid-gap", "grid-column", "grid-row",
    "box-shadow", "text-shadow", "border-radius", "transform",
    "transition", "animation", "keyframes", "cursor",
    "z-index", "important", "hover", "active", "focus", "before", "after",
    "none", "block", "inline", "inline-block", "flex", "grid", "absolute", "relative", "fixed"
  ]
};

// 预加载所有语言 Trie 树
const languageTries: Record<string, Trie> = {};
for (const [lang, keywords] of Object.entries(LANGUAGE_KEYWORDS)) {
  const trie = new Trie();
  for (const word of keywords) {
    trie.insert(word);
  }
  languageTries[lang] = trie;
}

export const SUPPORTED_LANGUAGES = [
  { value: "java", label: "Java", icon: "☕" },
  { value: "cpp", label: "C++", icon: "C++" },
  { value: "python", label: "Python", icon: "🐍" },
  { value: "javascript", label: "JavaScript", icon: "JS" },
  { value: "typescript", label: "TypeScript", icon: "TS" },
  { value: "go", label: "Go", icon: "Go" },
  { value: "rust", label: "Rust", icon: "🦀" },
  { value: "sql", label: "SQL", icon: "DB" },
  { value: "html", label: "HTML", icon: "HTML" },
  { value: "css", label: "CSS", icon: "CSS" }
];

interface CodeCompleterProps {
  language: string;
  onInsert: (word: string) => void;
  children?: React.ReactNode;
}

export function CodeCompleter({ language, onInsert, children }: CodeCompleterProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const triggerCompletion = useCallback((text: string) => {
    const lastWord = text.match(/[\w$]+$/)?.[0] || "";
    if (lastWord.length >= 1) {
      const trie = languageTries[language];
      if (trie) {
        const results = trie.autocomplete(lastWord, 8);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
        setSelectedIndex(0);
      }
    } else {
      setShowSuggestions(false);
    }
  }, [language]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, getText: () => string) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex(i => (i + 1) % suggestions.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex(i => (i - 1 + suggestions.length) % suggestions.length);
        break;
      case "Tab":
      case "Enter":
        e.preventDefault();
        if (suggestions[selectedIndex]) {
          onInsert(suggestions[selectedIndex]);
          setShowSuggestions(false);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        break;
    }
  }, [showSuggestions, suggestions, selectedIndex, onInsert]);

  return (
    <>
      {children}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 bg-card border rounded-xl shadow-xl py-1 min-w-48 max-h-64 overflow-auto">
          {suggestions.map((word, i) => (
            <button
              key={word}
              onClick={() => {
                onInsert(word);
                setShowSuggestions(false);
              }}
              className={`w-full px-4 py-2 text-left flex items-center justify-between hover:bg-muted transition-colors ${
                i === selectedIndex ? "bg-muted" : ""
              }`}
            >
              <code className="font-mono text-sm">{word}</code>
              {i === selectedIndex && (
                <span className="text-xs text-muted-foreground">Tab</span>
              )}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

export { languageTries, LANGUAGE_KEYWORDS };

export default CodeCompleter;