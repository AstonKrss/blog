"use client";

import { useState, useEffect } from "react";

const roles = [
  "全栈开发工程师",
  "DevSecOps 实践者",
  "网络安全爱好者",
  "开源项目贡献者",
  "技术博客作者",
  "终身学习者",
];

export function Typewriter() {
  const [displayText, setDisplayText] = useState("");
  const [roleIndex, setRoleIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentRole = roles[roleIndex];
    const typingSpeed = isDeleting ? 50 : 100;
    const pauseBeforeDelete = 2000;
    const pauseBeforeNext = 500;

    let timeout: NodeJS.Timeout;

    if (!isDeleting && displayText === currentRole) {
      timeout = setTimeout(() => setIsDeleting(true), pauseBeforeDelete);
    } else if (isDeleting && displayText === "") {
      setIsDeleting(false);
      setRoleIndex((prev) => (prev + 1) % roles.length);
    } else {
      timeout = setTimeout(() => {
        if (isDeleting) {
          setDisplayText(currentRole.substring(0, displayText.length - 1));
        } else {
          setDisplayText(currentRole.substring(0, displayText.length + 1));
        }
      }, typingSpeed);
    }

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, roleIndex]);

  return (
    <span className="inline-block">
      <span className="text-indigo-500">{displayText}</span>
      <span className="animate-pulse">|</span>
    </span>
  );
}
