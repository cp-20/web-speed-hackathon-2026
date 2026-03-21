import { memo, useMemo } from "react";

import "katex/dist/katex.min.css";
import Markdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import { CodeBlock } from "@web-speed-hackathon-2026/client/src/components/crok/CodeBlock";
import { TypingIndicator } from "@web-speed-hackathon-2026/client/src/components/crok/TypingIndicator";
import { CrokLogo } from "@web-speed-hackathon-2026/client/src/components/foundation/CrokLogo";

interface Props {
  message: Models.ChatMessage;
  isStreaming?: boolean;
}

const REMARK_PLUGINS = [remarkMath, remarkGfm];
const REHYPE_PLUGINS = [rehypeKatex];

const StableMarkdownBlock = memo(
  ({ content }: { content: string }) => (
    <Markdown
      components={{ pre: CodeBlock }}
      rehypePlugins={REHYPE_PLUGINS}
      remarkPlugins={REMARK_PLUGINS}
    >
      {content}
    </Markdown>
  ),
  (prevProps, nextProps) => prevProps.content === nextProps.content,
);

const FullMarkdown = memo(
  ({ content }: { content: string }) => (
    <Markdown
      components={{ pre: CodeBlock }}
      rehypePlugins={REHYPE_PLUGINS}
      remarkPlugins={REMARK_PLUGINS}
    >
      {content}
    </Markdown>
  ),
  (prevProps, nextProps) => prevProps.content === nextProps.content,
);

type FenceState = {
  marker: "`" | "~";
  length: number;
};

function getFenceInfo(line: string): FenceState | null {
  const trimmed = line.trimStart();
  const fenceMatch = /^(?<marker>`|~)\k<marker>{2,}/.exec(trimmed);
  if (!fenceMatch?.groups?.["marker"]) {
    return null;
  }

  const marker = fenceMatch.groups["marker"] as "`" | "~";
  const repeated = trimmed.match(new RegExp(`^\\${marker}+`))?.[0] ?? "";
  return {
    marker,
    length: repeated.length,
  };
}

function isFenceClosingLine(line: string, fence: FenceState): boolean {
  const trimmed = line.trimStart();
  const repeated = trimmed.match(new RegExp(`^\\${fence.marker}+`))?.[0] ?? "";
  return repeated.length >= fence.length;
}

function splitByBlankLinesOutsideFences(text: string): string[] {
  if (!text) return [];

  const lines = text.split("\n");
  const chunks: string[] = [];
  let fence: FenceState | null = null;
  let chunkStart = 0;
  let absolutePos = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    const maybeFence = getFenceInfo(line);
    if (maybeFence) {
      if (!fence) {
        fence = maybeFence;
      } else if (maybeFence.marker === fence.marker && isFenceClosingLine(line, fence)) {
        fence = null;
      }
    }

    const lineHasTrailingNewline = i < lines.length - 1;
    absolutePos += line.length + (lineHasTrailingNewline ? 1 : 0);

    if (!fence && line === "") {
      const nextChunk = text.slice(chunkStart, absolutePos);
      if (nextChunk.trim()) {
        chunks.push(nextChunk);
      }
      chunkStart = absolutePos;
    }
  }

  const rest = text.slice(chunkStart);
  if (rest.trim()) {
    chunks.push(rest);
  }

  return chunks;
}

function splitStreamingContent(content: string): { stable: string; tail: string } {
  // Promote only complete chunks outside fenced code blocks to stable markdown.
  const lines = content.split("\n");
  let fence: FenceState | null = null;
  let safeBoundary = 0;
  let absolutePos = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    const maybeFence = getFenceInfo(line);
    if (maybeFence) {
      if (!fence) {
        fence = maybeFence;
      } else if (maybeFence.marker === fence.marker && isFenceClosingLine(line, fence)) {
        fence = null;
      }
    }

    const lineHasTrailingNewline = i < lines.length - 1;
    absolutePos += line.length + (lineHasTrailingNewline ? 1 : 0);

    if (!fence && line === "") {
      safeBoundary = absolutePos;
    }
  }

  if (safeBoundary <= 0) {
    return { stable: "", tail: content };
  }

  return {
    stable: content.slice(0, safeBoundary),
    tail: content.slice(safeBoundary),
  };
}

const UserMessage = ({ content }: { content: string }) => {
  return (
    <div className="mb-6 flex justify-end">
      <div className="bg-cax-surface-subtle text-cax-text max-w-[80%] rounded-3xl px-4 py-2">
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
};

const AssistantMessage = ({
  content,
  isStreaming = false,
}: {
  content: string;
  isStreaming?: boolean;
}) => {
  const { stable, tail } = isStreaming
    ? splitStreamingContent(content)
    : { stable: content, tail: "" };
  const stableBlocks = useMemo(() => splitByBlankLinesOutsideFences(stable), [stable]);

  return (
    <div className="mb-6 flex gap-4">
      <div className="h-8 w-8 shrink-0">
        <CrokLogo className="h-full w-full" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-cax-text mb-1 text-sm font-medium">Crok</div>
        <div className="markdown text-cax-text max-w-none">
          {content ? (
            isStreaming ? (
              <>
                {stableBlocks.map((block, index) => (
                  <StableMarkdownBlock content={block} key={`${index}:${block}`} />
                ))}
                {tail && <p className="whitespace-pre-wrap">{tail}</p>}
              </>
            ) : (
              <FullMarkdown content={content} />
            )
          ) : (
            <TypingIndicator />
          )}
        </div>
      </div>
    </div>
  );
};

export const ChatMessage = memo(
  ({ message, isStreaming = false }: Props) => {
    if (message.role === "user") {
      return <UserMessage content={message.content} />;
    }
    return <AssistantMessage content={message.content} isStreaming={isStreaming} />;
  },
  (prevProps, nextProps) =>
    prevProps.message.role === nextProps.message.role &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.isStreaming === nextProps.isStreaming,
);
