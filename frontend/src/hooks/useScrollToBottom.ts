import { useRef } from "react";

export function useScrollToBottom() {
    const bottomRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        // Small timeout to ensure DOM has updated (e.g. new item rendered)
        setTimeout(() => {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    return { bottomRef, scrollToBottom };
}
