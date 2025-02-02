import React, { FC } from 'react';

import { Button, HorizontalGroup, LoadingPlaceholder, VerticalGroup } from '@grafana/ui';
import { observer } from 'mobx-react';
import { useHistory } from 'react-router-dom';

import { FullPageError } from 'components/FullPageError/FullPageError';
import { RenderConditionally } from 'components/RenderConditionally/RenderConditionally';
import { REQUEST_HELP_URL, PLUGIN_CONFIG } from 'utils/consts';
import { useInitializePlugin } from 'utils/hooks';
import { getIsRunningOpenSourceVersion } from 'utils/utils';

interface PluginInitializerProps {
  children: React.ReactNode;
}

export const PluginInitializer: FC<PluginInitializerProps> = observer(({ children }) => {
  const { isConnected, isCheckingConnectionStatus } = useInitializePlugin();

  if (isCheckingConnectionStatus) {
    return (
      <VerticalGroup justify="center" height="100%" align="center">
        <LoadingPlaceholder text="Loading..." />
      </VerticalGroup>
    );
  }
  return (
    <RenderConditionally
      shouldRender={isConnected}
      backupChildren={<PluginNotConnectedFullPageError />}
      render={() => <>{children}</>}
    />
  );
});

const PluginNotConnectedFullPageError = observer(() => {
  const isOpenSource = getIsRunningOpenSourceVersion();
  const isCurrentUserAdmin = window.grafanaBootData.user.orgRole === 'Admin';
  const { push } = useHistory();

  const getSubtitleExtension = () => {
    if (!isOpenSource) {
      return 'request help from our support team.';
    }
    return isCurrentUserAdmin
      ? 'go to plugin configuration page to establish connection.'
      : 'contact your administrator.';
  };

  return (
    <FullPageError
      title="Plugin not connected"
      subtitle={
        <>
          Looks like OnCall plugin hasn't been connected yet or has been misconfigured. <br />
          Retry or {getSubtitleExtension()}
        </>
      }
    >
      <HorizontalGroup>
        <Button variant="secondary" onClick={() => window.location.reload()}>
          Retry
        </Button>
        {!isOpenSource && <Button onClick={() => window.open(REQUEST_HELP_URL, '_blank')}>Request help</Button>}
        {isOpenSource && isCurrentUserAdmin && <Button onClick={() => push(PLUGIN_CONFIG)}>Open configuration</Button>}
      </HorizontalGroup>
    </FullPageError>
  );
});
