"use client";

// ============================================
// 优化版代码补全 - 用 Set + Filter 代替 Trie
// 对于几百个关键字，Set查找比Trie更快更简单
// ============================================

// 各语言关键字库 - 包含常用关键字和框架/库
const LANGUAGE_KEYWORDS: Record<string, string[]> = {
  java: [
    // 关键字
    "abstract", "assert", "boolean", "break", "byte", "case", "catch", "char",
    "class", "const", "continue", "default", "do", "double", "else", "enum",
    "extends", "final", "finally", "float", "for", "goto", "if", "implements",
    "import", "instanceof", "int", "interface", "long", "native", "new",
    "package", "private", "protected", "public", "return", "short", "static",
    "strictfp", "super", "switch", "synchronized", "this", "throw", "throws",
    "transient", "try", "void", "volatile", "while", "true", "false", "null",
    // 常用类
    "String", "System", "Integer", "Long", "Double", "Float", "Boolean", "Character",
    "Object", "Class", "Math", "Arrays", "Collections", "List", "Map", "Set",
    "ArrayList", "HashMap", "HashSet", "LinkedList", "TreeMap", "TreeSet",
    "StringBuilder", "StringBuffer", "Scanner", "Date", "Calendar",
    // Spring
    "Spring", "Service", "Component", "Repository", "Controller", "Autowired",
    "RequestMapping", "GetMapping", "PostMapping", "PutMapping", "DeleteMapping",
    "RequestBody", "ResponseBody", "PathVariable", "RequestParam",
    // 框架类
    "JSONObject", "JSONArray", "HttpServlet", "Servlet", "Filter", "Interceptor",
    "ApplicationContext", "Bean", "Configuration", "BeanFactory",
    // 常用方法
    "println", "print", "printf", "next", "nextLine", "nextInt", "nextBoolean",
    "getInstance", "getConnection", "executeQuery", "executeUpdate",
    "parseInt", "parseDouble", "parseLong", "valueOf", "toString",
    "equals", "hashCode", "compareTo", "clone", "toArray", "size", "isEmpty",
    "add", "remove", "get", "put", "contains", "clear", "iterator"
  ],
  javascript: [
    // 关键字
    "break", "case", "catch", "continue", "debugger", "default", "delete",
    "do", "else", "export", "extends", "finally", "for", "function",
    "if", "import", "in", "instanceof", "new", "return", "super", "switch",
    "this", "throw", "try", "typeof", "var", "void", "while", "with", "yield",
    "let", "const", "class", "async", "await", "static", "get", "set",
    "true", "false", "null", "undefined", "NaN", "Infinity",
    // 内置对象
    "console", "window", "document", "Array", "Object", "String", "Number",
    "Boolean", "Function", "Symbol", "Map", "Set", "WeakMap", "WeakSet",
    "Promise", "Proxy", "Reflect", "Math", "JSON", "Date", "RegExp", "Error",
    "TypeError", "ReferenceError", "SyntaxError", "RangeError",
    // DOM
    "getElementById", "getElementsByClassName", "getElementsByTagName",
    "querySelector", "querySelectorAll", "createElement", "createTextNode",
    "appendChild", "removeChild", "insertBefore", "cloneNode",
    "addEventListener", "removeEventListener", "dispatchEvent",
    "innerHTML", "innerText", "textContent", "classList", "style",
    "getAttribute", "setAttribute", "removeAttribute",
    // React/Next.js
    "useState", "useEffect", "useCallback", "useMemo", "useRef", "useContext",
    "useReducer", "useLayoutEffect", "useImperativeHandle", "useDebugValue",
    "createContext", "Component", "Fragment", "Suspense", "lazy",
    "React", "ReactDOM", "render", "hydrate", "flushSync",
    "useRouter", "usePathname", "useSearchParams", "useParams",
    "Link", "Image", "Script", "dynamic",
    // 常用方法
    "log", "warn", "error", "info", "debug", "trace", "table",
    "push", "pop", "shift", "unshift", "splice", "slice", "concat",
    "forEach", "map", "filter", "reduce", "find", "findIndex", "some", "every",
    "includes", "indexOf", "split", "join", "replace", "match", "trim",
    "then", "catch", "finally", "all", "race", "resolve", "reject"
  ],
  typescript: [
    // TS 关键字
    "break", "case", "catch", "continue", "debugger", "default", "delete",
    "do", "else", "export", "extends", "finally", "for", "function",
    "if", "import", "in", "instanceof", "new", "return", "super", "switch",
    "this", "throw", "try", "typeof", "var", "void", "while", "with", "yield",
    "let", "const", "class", "async", "await", "static", "get", "set",
    "true", "false", "null", "undefined", "NaN", "Infinity",
    // TS 类型
    "string", "number", "boolean", "any", "void", "never", "unknown", "object",
    "type", "interface", "enum", "namespace", "declare", "abstract",
    "implements", "public", "private", "protected", "readonly", "optional",
    "keyof", "infer", "require", "is", "as", "satisfies", "extends",
    // 内置类型
    "Partial", "Required", "Readonly", "Pick", "Omit", "Record",
    "Exclude", "Extract", "NonNullable", "ReturnType", "Parameters",
    "ConstructorParameters", "InstanceType", "AsyncIterableIterator",
    // React/Next.js
    "FC", "VFC", "ReactNode", "ReactElement", "ReactFragment",
    "useState", "useEffect", "useCallback", "useMemo", "useRef", "useContext",
    "JSX", "Element", "PropsWithChildren", "PropsWithRef",
    "GetStaticProps", "GetStaticPaths", "GetServerSideProps",
    // 常用方法
    "log", "warn", "error", "push", "pop", "map", "filter", "reduce",
    "then", "catch", "finally"
  ],
  python: [
    // 关键字
    "and", "as", "assert", "async", "await", "break", "class", "continue",
    "def", "del", "elif", "else", "except", "finally", "for", "from",
    "global", "if", "import", "in", "is", "lambda", "nonlocal", "not",
    "or", "pass", "raise", "return", "try", "while", "with", "yield",
    "True", "False", "None", "self",
    // 内置函数
    "print", "input", "len", "range", "str", "int", "float", "list", "dict",
    "set", "tuple", "bool", "bytes", "open", "type", "isinstance",
    "issubclass", "hasattr", "getattr", "setattr", "delattr", "callable",
    "hash", "id", "dir", "vars", "locals", "globals", "eval", "exec",
    "compile", "format", "frozenset", "enumerate", "zip", "map", "filter",
    "reduce", "sorted", "reversed", "any", "all", "sum", "min", "max",
    "abs", "round", "pow", "divmod", "hex", "oct", "bin", "chr", "ord",
    // Django/Flask
    "request", "response", "render", "redirect", "url_for", "session",
    "Model", "View", "Template", "Form", "Serializer", "QuerySet",
    // 常用方法
    "append", "extend", "insert", "remove", "pop", "clear", "index",
    "count", "sort", "reverse", "copy", "keys", "values", "items",
    "get", "update", "join", "split", "strip", "replace", "find"
  ],
  cpp: [
    // 关键字
    "auto", "break", "case", "char", "const", "continue", "default", "do",
    "double", "else", "enum", "extern", "float", "for", "goto", "if", "int",
    "long", "register", "return", "short", "signed", "sizeof", "static",
    "struct", "switch", "typedef", "union", "unsigned", "void", "volatile",
    "while", "class", "public", "private", "protected", "virtual", "inline",
    "namespace", "using", "template", "typename", "new", "delete", "this",
    "friend", "operator", "try", "catch", "throw", "constexpr", "nullptr",
    "bool", "true", "false", "explicit", "mutable", "static_cast",
    // STL
    "vector", "string", "list", "deque", "array", "forward_list",
    "map", "set", "multimap", "multiset", "unordered_map", "unordered_set",
    "stack", "queue", "priority_queue", "pair", "tuple",
    "algorithm", "iterator", "functional", "memory", "utility",
    "shared_ptr", "unique_ptr", "weak_ptr", "make_shared", "make_unique",
    // IO
    "cin", "cout", "cerr", "clog", "endl", "printf", "scanf", "sprintf",
    // 常用方法
    "begin", "end", "size", "empty", "push_back", "pop_back", "push_front",
    "pop_front", "front", "back", "insert", "erase", "find", "count",
    "clear", "reserve", "capacity", "resize", "swap"
  ],
  go: [
    // 关键字
    "break", "case", "chan", "const", "continue", "default", "defer",
    "else", "fallthrough", "for", "func", "go", "goto", "if", "import",
    "interface", "map", "package", "range", "return", "select", "struct", "switch",
    "type", "var", "true", "false", "nil", "iota",
    // 类型
    "int", "int8", "int16", "int32", "int64", "uint", "uint8", "uint16",
    "uint32", "uint64", "float32", "float64", "complex64", "complex128",
    "byte", "rune", "string", "bool", "error", "any",
    // 内置函数
    "make", "new", "len", "cap", "append", "copy", "delete",
    "panic", "recover", "print", "println", "close", "complex", "real", "imag",
    // 常用包
    "fmt", "os", "io", "bufio", "strings", "strconv", "bytes", "net",
    "http", "json", "xml", "time", "flag", "log", "context",
    // 常用方法
    "Printf", "Sprintf", "Errorf", "Println", "Fprintln", "Fprintf"
  ],
  rust: [
    // 关键字
    "as", "async", "await", "break", "const", "continue", "crate", "dyn",
    "else", "enum", "extern", "false", "fn", "for", "if", "impl", "in",
    "let", "loop", "match", "mod", "move", "mut", "pub", "ref", "return",
    "self", "Self", "static", "struct", "super", "trait", "true", "type",
    "unsafe", "use", "where", "while", "i8", "i16", "i32", "i64", "i128",
    "isize", "u8", "u16", "u32", "u64", "u128", "usize",
    "f32", "f64", "bool", "char", "str", "String", "Vec", "Option", "Result",
    // 常用方法
    "println", "print", "format", "panic", "unwrap", "expect", "ok", "err",
    "Some", "None", "Ok", "Err", "new", "default", "clone", "copy",
    "push", "pop", "insert", "get", "contains", "len", "is_empty",
    // 常用库
    "Result", "Some", "None", "Ok", "Err", "Box", "Rc", "Arc", "Cell", "RefCell"
  ],
  sql: [
    // 关键字
    "SELECT", "FROM", "WHERE", "AND", "OR", "NOT", "IN", "BETWEEN", "LIKE",
    "IS", "NULL", "INSERT", "INTO", "VALUES", "UPDATE", "SET", "DELETE",
    "CREATE", "ALTER", "DROP", "TABLE", "DATABASE", "INDEX", "VIEW",
    "JOIN", "LEFT", "RIGHT", "INNER", "OUTER", "FULL", "CROSS", "ON",
    "ORDER", "BY", "ASC", "DESC", "GROUP", "HAVING", "LIMIT", "OFFSET",
    "UNION", "ALL", "DISTINCT", "COUNT", "SUM", "AVG", "MIN", "MAX",
    "PRIMARY", "KEY", "FOREIGN", "REFERENCES", "CONSTRAINT",
    "DEFAULT", "UNIQUE", "CHECK", "AUTO_INCREMENT", "IDENTITY",
    "CASE", "WHEN", "THEN", "ELSE", "END", "EXISTS", "CAST", "CONVERT",
    "COALESCE", "NULLIF", "IFNULL", "NVL",
    // MySQL
    "ENGINE", "InnoDB", "MyISAM", "VARCHAR", "INT", "BIGINT", "TEXT",
    "TIMESTAMP", "DATETIME", "BOOLEAN", "JSON", "FLOAT", "DOUBLE",
    "SHOW", "DESCRIBE", "EXPLAIN", "BEGIN", "COMMIT", "ROLLBACK",
    // 常用方法
    "COUNT", "SUM", "AVG", "MAX", "MIN", "ROUND", "DATE", "NOW", "CURDATE"
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
    "class", "id", "src", "href", "alt", "title", "style", "type", "name",
    "value", "placeholder", "required", "disabled", "readonly", "hidden",
    "checked", "selected", "target", "_blank", "rel", "async", "defer",
    "width", "height", "max-width", "max-height", "min-width", "min-height"
  ],
  css: [
    // 属性
    "color", "background", "background-color", "background-image", "background-size",
    "border", "border-radius", "border-width", "border-color", "border-style",
    "margin", "margin-top", "margin-right", "margin-bottom", "margin-left",
    "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
    "width", "height", "max-width", "max-height", "min-width", "min-height",
    "display", "position", "top", "left", "right", "bottom", "z-index",
    "float", "clear", "overflow", "overflow-x", "overflow-y", "visibility", "opacity",
    "font", "font-size", "font-family", "font-weight", "font-style", "font-variant",
    "text-align", "text-decoration", "text-transform", "text-indent", "line-height",
    "letter-spacing", "word-spacing", "white-space", "word-break", "overflow-wrap",
    "flex", "flex-direction", "justify-content", "align-items", "align-content",
    "flex-wrap", "flex-grow", "flex-shrink", "flex-basis", "gap", "order",
    "grid", "grid-template", "grid-template-columns", "grid-template-rows",
    "grid-gap", "grid-column", "grid-row", "grid-area",
    "box-shadow", "text-shadow", "transform", "transition", "animation",
    "cursor", "pointer-events", "outline", "content", "quotes",
    "none", "block", "inline", "inline-block", "flex", "grid", "absolute", "relative", "fixed", "sticky",
    "center", "left", "right", "top", "bottom", "middle", "auto",
    "inherit", "initial", "unset", "revert",
    // 伪类和伪元素
    "hover", "active", "focus", "visited", "link", "first-child", "last-child",
    "nth-child", "before", "after", "not", "root"
  ]
};

// 预构建 Set - 比 Array 查找快 10 倍
const languageSets: Record<string, Set<string>> = {};
const languageLists: Record<string, string[]> = {};

// 初始化
for (const [lang, keywords] of Object.entries(LANGUAGE_KEYWORDS)) {
  languageSets[lang] = new Set(keywords.map(k => k.toLowerCase()));
  languageLists[lang] = keywords;
}

// 快速前缀匹配 - Set + 过滤
export function quickAutocomplete(prefix: string, language: string, limit: number = 8): string[] {
  const set = languageSets[language];
  const list = languageLists[language];
  if (!set || !list) return [];
  
  const lowerPrefix = prefix.toLowerCase();
  const results: string[] = [];
  
  // 先检查 Set 确认有匹配
  if (!set.has(lowerPrefix)) {
    // 快速检查是否有以此前缀开头的词
    let hasMatch = false;
    for (const word of list) {
      if (word.toLowerCase().startsWith(lowerPrefix)) {
        hasMatch = true;
        break;
      }
    }
    if (!hasMatch) return [];
  }
  
  // 收集所有匹配的结果
  for (const word of list) {
    if (word.toLowerCase().startsWith(lowerPrefix)) {
      results.push(word);
      if (results.length >= limit) break;
    }
  }
  
  return results;
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
  { value: "html", label: "HTML", icon: "🌐" },
  { value: "css", label: "CSS", icon: "🎨" }
];

// 导出给编辑器用
export { languageSets, languageLists };
