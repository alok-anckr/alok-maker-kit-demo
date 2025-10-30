import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

import { HomeLayoutPageHeader } from '../_components/home-page-header';
import { InventoryChatContainer } from './_components/inventory-chat-container';

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  const title = i18n.t('account:inventoryChat.pageTitle');

  return {
    title,
  };
};

function InventoryChatPage() {
  return (
    <>
      <HomeLayoutPageHeader
        title={<Trans i18nKey={'common:routes.inventoryChat'} />}
        description={<Trans i18nKey={'account:inventoryChat.description'} />}
      />

      <PageBody className="h-[calc(100vh-200px)]">
        <InventoryChatContainer />
      </PageBody>
    </>
  );
}

export default withI18n(InventoryChatPage);
