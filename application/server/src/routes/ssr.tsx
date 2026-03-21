import { renderToString } from "react-dom/server";
import { Router } from "wouter";
import { SWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import type { SWRInfiniteKeyLoader } from "swr/infinite";

import { AppContainerSsrContent } from "@web-speed-hackathon-2026/client/src/containers/AppContainerSsrContent";

export type SsrPost = Models.Post;

export type SsrComment = Models.Comment;

const INFINITE_LIMIT = 30;

export type SsrFallback = Record<string, unknown>;

function buildPaginatedPath(apiPath: string, offset: number, limit: number): string {
  const [rawPath, rawQuery = ""] = apiPath.split("?");
  const path = rawPath ?? "";
  const params = new URLSearchParams(rawQuery);

  params.set("offset", String(offset));
  params.set("limit", String(limit));

  const query = params.toString();
  return query === "" ? path : `${path}?${query}`;
}

export function buildSsrInfiniteCacheKey(apiPath: string, limit?: number): string {
  const effectiveLimit = limit ?? INFINITE_LIMIT;
  const getKey: SWRInfiniteKeyLoader = (index) => {
    if (apiPath === "") {
      return null;
    }

    return buildPaginatedPath(apiPath, index * effectiveLimit, effectiveLimit);
  };

  return unstable_serialize(getKey);
}

export function getSsrFirstPagePath(apiPath: string, limit?: number): string {
  const effectiveLimit = limit ?? INFINITE_LIMIT;
  return buildPaginatedPath(apiPath, 0, effectiveLimit);
}

/**
 * 全ページ対応の汎用 SSR 関数
 * AppContainer をそのまま SSR する
 * （SWRConfig はクライアント側で wrap される）
 */
export function renderAppSsr(params: {
  location: string;
  activeUser: Models.User | null;
  swrFallback?: SsrFallback;
}) {
  const { location, activeUser, swrFallback = {} } = params;

  // ダミーのコールバック（サーバー側では実行されない）
  const handleLogout = () => { };
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const handleUpdateActiveUser = () => { };

  const url = new URL(location, "http://localhost");

  return renderToString(
    <SWRConfig value={{ fallback: swrFallback }}>
      <Router ssrPath={url.pathname} ssrSearch={url.search}>
        <AppContainerSsrContent
          activeUser={activeUser}
          authModalId="auth-modal"
          newPostModalId="new-post-modal"
          onLogout={handleLogout}
          onUpdateActiveUser={handleUpdateActiveUser}
        />
      </Router>
    </SWRConfig>,
  );
}
