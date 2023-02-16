import { Type } from '@sinclair/typebox';
import { FastifyPluginAsync } from 'fastify';
import { escrow as escrowSchema } from '../schemas/escrow';
import {
  ChainId,
  ESCROW_NETWORKS,
  IEscrowNetwork,
} from '../constants/networks';

export const createEscrow: FastifyPluginAsync = async (server) => {
  let escrowNetwork: IEscrowNetwork;
  let escrowData: typeof escrowSchema.properties;
  let fiat: boolean;

  server.post(
    '/check-escrow',
    {
      preValidation: (request, reply, done) => {
        escrowData = request.body as typeof escrowSchema.properties;
        fiat = escrowData?.fiat
          ? JSON.parse(escrowData?.fiat?.toString())
          : false;
        const chainId = Number(escrowData.chainId) as ChainId;
        if (!chainId) done(new Error('Invalid Chain Id'));
        const network = ESCROW_NETWORKS[chainId];
        if (network) {
          escrowNetwork = network;
          done(undefined);
        } else done(new Error('Chain Id not supported'));
      },
      schema: {
        body: escrowSchema,
        response: {
          200: Type.Boolean(),
        },
      },
    },
    async function (request, reply) {
      const { escrow, web3 } = server;
      let funderAddress: string;
      const web3Client = web3.createWeb3(escrowNetwork);
      const jobRequester = escrowData.jobRequester as unknown as string;
      const token = escrowData.token as unknown as string;
      const fundAmount = web3Client.utils.toWei(
        Number(escrowData.fundAmount).toString(),
        'ether'
      );

      if (fiat) {
        funderAddress = web3Client.eth.defaultAccount as string;
      } else {
        funderAddress = jobRequester;
      }
      if (
        !(await escrow.checkBalance(
          web3Client,
          token,
          funderAddress,
          fundAmount
        ))
      ) {
        return reply
          .status(400)
          .send(`Balance not enough for funding the escrow`);
      }

      const description = escrowData.description as unknown as string;
      const title = escrowData.title as unknown as string;
      if (escrow.checkCurseWords(description) || escrow.checkCurseWords(title))
        return reply
          .status(400)
          .send('Title or description contains curse words');

      return true;
    }
  );

  server.post(
    '/escrow',
    {
      preValidation: (request, reply, done) => {
        escrowData = request.body as typeof escrowSchema.properties;
        fiat = escrowData?.fiat
          ? JSON.parse(escrowData?.fiat?.toString())
          : false;
        const paymentId = escrowData?.paymentId?.toString();
        if (fiat && !paymentId) done(new Error('Invalid Payment Id'));
        const chainId = Number(escrowData.chainId) as ChainId;
        if (!chainId) done(new Error('Invalid Chain Id'));
        const network = ESCROW_NETWORKS[chainId];
        if (network) {
          escrowNetwork = network;
          done(undefined);
        } else done(new Error('Chain Id not supported'));
      },
      schema: {
        body: escrowSchema,
        response: {
          200: Type.Object({
            escrowAddress: Type.String(),
            exchangeUrl: Type.String(),
          }),
        },
      },
    },
    async function (request, reply) {
      const { escrow, s3, web3, stripe, currency } = server;

      let funderAddress: string, fundAmount: string;
      const web3Client = web3.createWeb3(escrowNetwork);
      const jobRequester = escrowData.jobRequester as unknown as string;
      const token = escrowData.token as unknown as string;

      if (fiat) {
        funderAddress = web3Client.eth.defaultAccount as string;
        const payment = await stripe.getPayment(
          escrowData.paymentId.toString()
        );
        if (!payment || payment.status !== 'succeeded') {
          return reply
            .status(400)
            .send('Payment not found or has not yet been made correctly');
        }
        fundAmount = web3Client.utils.toWei(
          (
            await currency.getHMTPrice(payment.amount / 100, payment.currency)
          ).toString(),
          'ether'
        );

        if (
          !(await escrow.checkBalance(
            web3Client,
            token,
            funderAddress,
            fundAmount
          ))
        ) {
          return reply
            .status(400)
            .send(
              `Balance not enough for funding the escrow for payment ${payment.id}`
            );
        }
      } else {
        funderAddress = jobRequester;
        fundAmount = web3Client.utils.toWei(
          Number(escrowData.fundAmount).toString(),
          'ether'
        );
        if (
          !(await escrow.checkApproved(
            web3Client,
            token,
            funderAddress,
            fundAmount
          ))
        ) {
          return reply
            .status(400)
            .send('Balance or allowance not enough for funding the escrow');
        }
      }

      const description = escrowData.description as unknown as string;
      const title = escrowData.title as unknown as string;
      if (escrow.checkCurseWords(description) || escrow.checkCurseWords(title))
        return reply
          .status(400)
          .send('Title or description contains curse words');

      const escrowAddress = await escrow.createEscrow(
        web3Client,
        escrowNetwork.factoryAddress,
        token,
        jobRequester
      );
      await escrow.fundEscrow(
        web3Client,
        token,
        funderAddress,
        escrowAddress,
        fundAmount
      );
      const data = escrow.addOraclesData(escrowData);
      const url = await s3.uploadManifest(data, escrowAddress);
      const fortunesRequested = Number(escrowData.fortunesRequired);
      await escrow.setupEscrow(
        web3Client,
        escrowAddress,
        url,
        fortunesRequested
      );
      return {
        escrowAddress,
        exchangeUrl: `${data.exchangeOracleUrl}?address=${escrowAddress}`,
      };
    }
  );
};
