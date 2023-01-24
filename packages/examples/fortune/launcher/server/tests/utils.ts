import Web3 from "web3";
import EscrowFactoryAbi from '@human-protocol/core/abis/EscrowFactory.json' assert { type: "json" };
import HMTokenAbi from '@human-protocol/core/abis/HMToken.json' assert { type: "json" };
import StakingAbi from '@human-protocol/core/abis/Staking.json' assert { type: "json" };
import { IEscrowNetwork } from "../src/constants/networks.js";

export const stake = async (web3: Web3, network: IEscrowNetwork) => {
    const escrowFactoryContract = new web3.eth.Contract(EscrowFactoryAbi as [], network.factoryAddress);
    const stakingAddress = await escrowFactoryContract.methods.staking().call();
    const stakeAmount = web3.utils.toWei('10', 'ether');

    await approve(web3, network, stakingAddress, stakeAmount)

    const stakingContract = new web3.eth.Contract(StakingAbi as [], stakingAddress);
    const gas = await stakingContract.methods
      .stake(stakeAmount)
      .estimateGas({ from: web3.eth.defaultAccount });
    const gasPrice = await web3.eth.getGasPrice();
    await stakingContract.methods
      .stake(stakeAmount)
        .send({ from: web3.eth.defaultAccount, gas, gasPrice });
};
export const approve = async (web3: Web3, network: IEscrowNetwork, to: string, amount: string) => {
    const hmtContract = new web3.eth.Contract(HMTokenAbi as [], network.hmtAddress);
    let gas = await hmtContract.methods
        .approve(to, amount)
        .estimateGas({ from: web3.eth.defaultAccount });
    const gasPrice = await web3.eth.getGasPrice();
    await hmtContract.methods
        .approve(to, amount)
        .send({ from: web3.eth.defaultAccount, gas, gasPrice });
}