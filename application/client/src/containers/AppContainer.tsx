import { Suspense, lazy, useCallback, useEffect } from "react";
import { Helmet } from "@web-speed-hackathon-2026/client/src/components/Helmet";
import { Route, Switch, useLocation } from "wouter";
import { useSWRConfig } from "swr";

import { AppPage } from "@web-speed-hackathon-2026/client/src/components/application/AppPage";
import { AuthModalContainer } from "@web-speed-hackathon-2026/client/src/containers/AuthModalContainer";
import { DirectMessageContainer } from "@web-speed-hackathon-2026/client/src/containers/DirectMessageContainer";
import { DirectMessageListContainer } from "@web-speed-hackathon-2026/client/src/containers/DirectMessageListContainer";
import { NewPostModalContainer } from "@web-speed-hackathon-2026/client/src/containers/NewPostModalContainer";
import { NotFoundContainer } from "@web-speed-hackathon-2026/client/src/containers/NotFoundContainer";
import { PostContainer } from "@web-speed-hackathon-2026/client/src/containers/PostContainer";
import { SearchContainer } from "@web-speed-hackathon-2026/client/src/containers/SearchContainer";
import { TermContainer } from "@web-speed-hackathon-2026/client/src/containers/TermContainer";
import { TimelineContainer } from "@web-speed-hackathon-2026/client/src/containers/TimelineContainer";
import { UserProfileContainer } from "@web-speed-hackathon-2026/client/src/containers/UserProfileContainer";
import { useFetch } from "@web-speed-hackathon-2026/client/src/hooks/use_fetch";
import { fetchJSON, sendJSON } from "@web-speed-hackathon-2026/client/src/utils/fetchers";

const CrokContainer = lazy(async () => {
  const module = await import("@web-speed-hackathon-2026/client/src/containers/CrokContainer");
  return { default: module.CrokContainer };
});

/**
 * SSR-safe なコンポーネント（副作用なし）
 * サーバー側で使用
 */
interface AppContainerContentProps {
  activeUser: Models.User | null;
  authModalId: string;
  newPostModalId: string;
  onLogout: () => void;
  onUpdateActiveUser: (user: Models.User) => void;
}

export const AppContainerContent = ({
  activeUser,
  authModalId,
  newPostModalId,
  onLogout,
  onUpdateActiveUser,
}: AppContainerContentProps) => {
  return (
    <>
      <AppPage
        activeUser={activeUser}
        authModalId={authModalId}
        newPostModalId={newPostModalId}
        onLogout={onLogout}
      >
        <Switch>
          <Route path="/" component={TimelineContainer} />
          <Route path="/dm">
            <DirectMessageListContainer activeUser={activeUser} authModalId={authModalId} />
          </Route>
          <Route path="/dm/:conversationId">
            <DirectMessageContainer activeUser={activeUser} authModalId={authModalId} />
          </Route>
          <Route path="/search" component={SearchContainer} />
          <Route path="/users/:username" component={UserProfileContainer} />
          <Route path="/posts/:postId" component={PostContainer} />
          <Route path="/terms" component={TermContainer} />
          <Route path="/crok">
            <Suspense fallback={null}>
              <CrokContainer activeUser={activeUser} authModalId={authModalId} />
            </Suspense>
          </Route>
          <Route component={NotFoundContainer} />
        </Switch>
      </AppPage>

      <AuthModalContainer id={authModalId} onUpdateActiveUser={onUpdateActiveUser} />
      <NewPostModalContainer id={newPostModalId} />
    </>
  );
};

export const AppContainer = () => {
  const [pathname, navigate] = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const { mutate } = useSWRConfig();

  const { data: activeUser, isLoading: isLoadingActiveUser } = useFetch<Models.User>(
    "/api/v1/me",
    fetchJSON,
  );

  const handleLogout = useCallback(async () => {
    await sendJSON("/api/v1/signout", {});
    await mutate("/api/v1/me", null);
    navigate("/");
  }, [navigate, mutate]);

  const handleUpdateActiveUser = useCallback(
    (user: Models.User) => {
      void mutate("/api/v1/me", user);
    },
    [mutate],
  );

  const authModalId = "auth-modal";
  const newPostModalId = "new-post-modal";

  if (isLoadingActiveUser) {
    return (
      <Helmet>
        <title>読込中 - CaX</title>
      </Helmet>
    );
  }

  return (
    <AppContainerContent
      activeUser={activeUser}
      authModalId={authModalId}
      newPostModalId={newPostModalId}
      onLogout={handleLogout}
      onUpdateActiveUser={handleUpdateActiveUser}
    />
  );
};
