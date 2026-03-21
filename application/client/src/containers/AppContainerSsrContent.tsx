import { Route, Switch } from "wouter";

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

interface AppContainerSsrContentProps {
  activeUser: Models.User | null;
  authModalId: string;
  newPostModalId: string;
  onLogout: () => void;
  onUpdateActiveUser: (user: Models.User) => void;
}

const CrokSsrPlaceholder = () => null;

export const AppContainerSsrContent = ({
  activeUser,
  authModalId,
  newPostModalId,
  onLogout,
  onUpdateActiveUser,
}: AppContainerSsrContentProps) => {
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
          <Route path="/crok" component={CrokSsrPlaceholder} />
          <Route component={NotFoundContainer} />
        </Switch>
      </AppPage>

      <AuthModalContainer id={authModalId} onUpdateActiveUser={onUpdateActiveUser} />
      <NewPostModalContainer id={newPostModalId} />
    </>
  );
};
