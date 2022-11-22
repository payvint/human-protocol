import * as React from 'react';
import { Box } from '@mui/material';

import ViewTitle from 'src/components/ViewTitle';
import { usePollTokenStats } from 'src/state/token/hooks';

import { TokenView } from './TokenView';

interface ITokenContainer {}

export const TokenContainer: React.FC<
  ITokenContainer
> = (): React.ReactElement => {
  usePollTokenStats();

  return (
    <Box mt={{ xs: 4, md: 8 }} id="token">
      <ViewTitle title="Token" iconUrl="/images/token.svg" />
      <Box mt={{ xs: 4, md: 8 }}>
        <TokenView />
      </Box>
    </Box>
  );
};
