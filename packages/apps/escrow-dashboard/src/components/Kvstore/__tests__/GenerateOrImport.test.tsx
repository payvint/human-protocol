import React from 'react';
import { render, screen } from '@testing-library/react';
import renderer from 'react-test-renderer';
import { act } from 'react-dom/test-utils';
import { GenerateOrImport } from 'src/components/Kvstore/GenerateOrImport';

import { Providers, setupClient, getSigners } from '../../../../tests/utils';
import { MockConnector } from 'wagmi/connectors/mock';

describe('when rendered GenerateOrImport component', () => {
  it('should render `text` prop', async () => {
    const client = setupClient({
      connectors: [
        new MockConnector({
          options: {
            signer: getSigners()[0]!,
            // Turn on `failConnect` flag to simulate connect failure
          },
        }),
      ],
    });
    await act(async () => {
      render(<GenerateOrImport />, {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <Providers client={client}>{children}</Providers>
        ),
      });
    });
    expect(screen.getByText(/Import/)).toBeInTheDocument();
  });
});

it('GenerateOrImport component renders correctly, corresponds to the snapshot', () => {
  const client = setupClient({
    connectors: [
      new MockConnector({
        options: {
          signer: getSigners()[0]!,
          // Turn on `failConnect` flag to simulate connect failure
        },
      }),
    ],
  });
  const tree = renderer
    .create(
      <Providers client={client}>
        <GenerateOrImport />
      </Providers>
    )
    .toJSON();
  expect(tree).toMatchSnapshot();
});
